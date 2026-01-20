import { z } from 'zod'

export const GenerateRequestSchema = z.object({
  storyTitle: z.string().min(1, 'Story title is required'),
  acceptanceCriteria: z.string().min(1, 'Acceptance criteria is required'),
  description: z.string().optional(),
  additionalInfo: z.string().optional()
})

export const TestCaseSchema = z.object({
  id: z.string(),
  title: z.string(),
  steps: z.array(z.string()),
  testData: z.string().optional(),
  expectedResult: z.string(),
  category: z.string(),
  type: z.enum(['Sanity', 'Regression', 'Performance', 'Security'])
})

export const GenerateResponseSchema = z.object({
  cases: z.array(TestCaseSchema),
  model: z.string().optional(),
  promptTokens: z.number(),
  completionTokens: z.number()
})

// Jira-related schemas
export const JiraConfigSchema = z.object({
  baseUrl: z.string().url('Invalid Jira base URL'),
  emailId: z.string().email('Invalid email format'),
  apiKey: z.string().min(1, 'API key is required')
})

export const JiraConnectRequestSchema = z.object({
  baseUrl: z.string().url('Invalid Jira base URL'),
  emailId: z.string().email('Invalid email format'),
  apiKey: z.string().min(1, 'API key is required')
})

export const JiraStoriesRequestSchema = z.object({
  baseUrl: z.string().url('Invalid Jira base URL'),
  emailId: z.string().email('Invalid email format'),
  apiKey: z.string().min(1, 'API key is required'),
  projectKey: z.string().optional()
})

export const JiraStorySchema = z.object({
  key: z.string(),
  fields: z.object({
    summary: z.string(),
    description: z.string(),
    acceptance_criteria: z.string().optional()
  })
})

// Type exports
export type GenerateRequest = z.infer<typeof GenerateRequestSchema>
export type TestCase = z.infer<typeof TestCaseSchema>
export type GenerateResponse = z.infer<typeof GenerateResponseSchema>
export type JiraConfig = z.infer<typeof JiraConfigSchema>
export type JiraStory = z.infer<typeof JiraStorySchema>
