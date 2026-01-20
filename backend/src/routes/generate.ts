import express from 'express'
import { GroqClient } from '../llm/groqClient'
import { GenerateRequestSchema, GenerateResponseSchema, GenerateResponse, TestCase, JiraConnectRequestSchema, JiraStoriesRequestSchema } from '../schemas'
import { SYSTEM_PROMPT, buildPrompt } from '../prompt'
import { convertToCSV, convertToExcel, convertToPDF } from '../utils/exporters'
import { JiraService } from '../services/jiraService'

export const generateRouter = express.Router()

// Store last generated test cases in memory for export
let lastGeneratedTestCases: TestCase[] = []

generateRouter.post('/', async (req: express.Request, res: express.Response): Promise<void> => {
  try {
    // Validate request body
    const validationResult = GenerateRequestSchema.safeParse(req.body)
    
    if (!validationResult.success) {
      res.status(400).json({
        error: `Validation error: ${validationResult.error.message}`
      })
      return
    }

    const request = validationResult.data

    // Build prompts
    const userPrompt = buildPrompt(request)

    // Create GroqClient instance here to ensure env vars are loaded
    const groqClient = new GroqClient()

    // Generate tests using Groq
    try {
      const groqResponse = await groqClient.generateTests(SYSTEM_PROMPT, userPrompt)
      
      // Parse the JSON content
      let parsedResponse: GenerateResponse
      try {
        parsedResponse = JSON.parse(groqResponse.content)
      } catch (parseError) {
        res.status(502).json({
          error: 'LLM returned invalid JSON format'
        })
        return
      }

      // Validate the response schema
      const responseValidation = GenerateResponseSchema.safeParse(parsedResponse)
      if (!responseValidation.success) {
        res.status(502).json({
          error: 'LLM response does not match expected schema'
        })
        return
      }

      // Add token usage info if available
      const finalResponse = {
        ...responseValidation.data,
        model: groqResponse.model,
        promptTokens: groqResponse.promptTokens,
        completionTokens: groqResponse.completionTokens
      }

      // Store test cases for export
      lastGeneratedTestCases = responseValidation.data.cases

      res.json(finalResponse)
    } catch (llmError) {
      console.error('LLM error:', llmError)
      res.status(502).json({
        error: 'Failed to generate tests from LLM service'
      })
      return
    }
  } catch (error) {
    console.error('Error in generate route:', error)
    res.status(500).json({
      error: 'Internal server error'
    })
  }
})

/**
 * Export test cases as CSV
 */
generateRouter.post('/export/csv', (req: express.Request, res: express.Response): void => {
  try {
    if (!lastGeneratedTestCases || lastGeneratedTestCases.length === 0) {
      res.status(400).json({
        error: 'No test cases to export. Please generate test cases first.'
      })
      return
    }

    const csv = convertToCSV(lastGeneratedTestCases)
    res.setHeader('Content-Type', 'text/csv; charset=utf-8')
    res.setHeader('Content-Disposition', `attachment; filename="test-cases-${Date.now()}.csv"`)
    res.send(csv)
  } catch (error) {
    console.error('Error exporting to CSV:', error)
    res.status(500).json({
      error: 'Failed to export test cases as CSV'
    })
  }
})

/**
 * Export test cases as Excel
 */
generateRouter.post('/export/excel', (req: express.Request, res: express.Response): void => {
  try {
    if (!lastGeneratedTestCases || lastGeneratedTestCases.length === 0) {
      res.status(400).json({
        error: 'No test cases to export. Please generate test cases first.'
      })
      return
    }

    const buffer = convertToExcel(lastGeneratedTestCases)
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet')
    res.setHeader('Content-Disposition', `attachment; filename="test-cases-${Date.now()}.xlsx"`)
    res.send(buffer)
  } catch (error) {
    console.error('Error exporting to Excel:', error)
    res.status(500).json({
      error: 'Failed to export test cases as Excel'
    })
  }
})

/**
 * Export test cases as PDF
 */
generateRouter.post('/export/pdf', async (req: express.Request, res: express.Response): Promise<void> => {
  try {
    if (!lastGeneratedTestCases || lastGeneratedTestCases.length === 0) {
      res.status(400).json({
        error: 'No test cases to export. Please generate test cases first.'
      })
      return
    }

    const buffer = await convertToPDF(lastGeneratedTestCases)
    res.setHeader('Content-Type', 'application/pdf')
    res.setHeader('Content-Disposition', `attachment; filename="test-cases-${Date.now()}.pdf"`)
    res.send(buffer)
  } catch (error) {
    console.error('Error exporting to PDF:', error)
    res.status(500).json({
      error: 'Failed to export test cases as PDF'
    })
  }
})

/**
 * Jira Connection Endpoint
 */
generateRouter.post('/jira/connect', async (req: express.Request, res: express.Response): Promise<void> => {
  try {
    console.log('Jira connect request received')
    const validatedData = JiraConnectRequestSchema.parse(req.body)
    console.log('Validation passed, attempting connection to:', validatedData.baseUrl)
    
    const jiraService = new JiraService({
      baseUrl: validatedData.baseUrl,
      emailId: validatedData.emailId,
      apiKey: validatedData.apiKey
    })
    
    const authenticated = await jiraService.authenticate()
    
    if (authenticated) {
      res.json({
        success: true,
        message: 'Successfully connected to Jira',
        baseUrl: validatedData.baseUrl
      })
    }
  } catch (error: any) {
    console.error('Jira connection error:', error.message)
    res.status(400).json({
      success: false,
      error: error.message || 'Failed to connect to Jira'
    })
  }
})

/**
 * Fetch Jira Stories Endpoint
 */
generateRouter.post('/jira/stories', async (req: express.Request, res: express.Response): Promise<void> => {
  try {
    console.log('Jira stories request received')
    const validatedData = JiraStoriesRequestSchema.parse(req.body)
    console.log('Validation passed, fetching stories from:', validatedData.baseUrl)
    
    const jiraService = new JiraService({
      baseUrl: validatedData.baseUrl,
      emailId: validatedData.emailId,
      apiKey: validatedData.apiKey
    })
    
    const stories = await jiraService.getStories(validatedData.projectKey)
    
    res.json({
      success: true,
      stories: stories,
      count: stories.length
    })
  } catch (error: any) {
    console.error('Jira stories fetch error:', error.message)
    res.status(400).json({
      success: false,
      error: error.message || 'Failed to fetch stories from Jira'
    })
  }
})

/**
 * Fetch Story Details Endpoint
 */
generateRouter.post('/jira/story-details', async (req: express.Request, res: express.Response): Promise<void> => {
  try {
    console.log('Jira story details request received')
    const { baseUrl, emailId, apiKey, storyKey } = req.body
    
    // Validate required fields
    if (!baseUrl || !emailId || !apiKey || !storyKey) {
      res.status(400).json({
        success: false,
        error: 'Missing required fields: baseUrl, emailId, apiKey, storyKey'
      })
      return
    }
    
    console.log('Validation passed, fetching story details from:', baseUrl, 'Story:', storyKey)
    
    const jiraService = new JiraService({
      baseUrl,
      emailId,
      apiKey
    })
    
    const storyDetails = await jiraService.getStoryDetails(storyKey)
    
    res.json({
      success: true,
      story: storyDetails
    })
  } catch (error: any) {
    console.error('Jira story details fetch error:', error.message)
    res.status(400).json({
      success: false,
      error: error.message || 'Failed to fetch story details from Jira'
    })
  }
})