import axios, { AxiosInstance } from 'axios'

export interface JiraStory {
  key: string
  fields: {
    summary: string
    description: string
    acceptance_criteria?: string
  }
}

export interface JiraConfig {
  baseUrl: string
  emailId: string
  apiKey: string
}

export class JiraService {
  private client: AxiosInstance
  private baseUrl: string

  constructor(config: JiraConfig) {
    this.baseUrl = config.baseUrl
    const encodedAuth = Buffer.from(`${config.emailId}:${config.apiKey}`).toString('base64')
    
    console.log('Creating Jira client for:', config.baseUrl)
    console.log('Auth header length:', encodedAuth.length)
    
    this.client = axios.create({
      baseURL: config.baseUrl,
      headers: {
        'Authorization': `Basic ${encodedAuth}`,
        'Accept': 'application/json',
        'Content-Type': 'application/json'
      },
      timeout: 10000,
      validateStatus: () => true // Don't throw on any status code
    })
  }

  async authenticate(): Promise<boolean> {
    try {
      console.log('Authenticating with Jira at:', this.baseUrl)
      const response = await this.client.get('/rest/api/3/myself')
      
      if (response.status === 401) {
        console.error('Authentication failed - 401 Unauthorized')
        console.error('Possible issues:')
        console.error('1. Email address is incorrect')
        console.error('2. API token is incorrect or expired')
        console.error('3. API token was revoked')
        throw new Error('Invalid email or API token. Please verify credentials at https://id.atlassian.com/manage-profile/security/api-tokens')
      }
      
      if (response.status !== 200) {
        console.error(`Authentication failed with status ${response.status}`)
        console.error('Response:', response.data)
        throw new Error(`Failed to authenticate: ${response.statusText}`)
      }
      
      console.log('✓ Jira authentication successful')
      console.log('Authenticated user:', response.data.displayName)
      return true
    } catch (error: any) {
      console.error('Jira authentication error:', error.message)
      throw error
    }
  }

  async getStories(projectKey?: string): Promise<JiraStory[]> {
    try {
      const jql = projectKey 
        ? `project = "${projectKey}" AND type = Story`
        : 'type = Story'
      
      console.log('\n--- Fetching Jira Stories ---')
      console.log('JQL Query:', jql)
      console.log('Endpoint:', '/rest/api/3/search/jql')
      
      const response = await this.client.post('/rest/api/3/search/jql', {
        jql,
        maxResults: 50,
        fields: ['summary', 'description', 'customfield_10000']
      })

      console.log('Response Status:', response.status)

      if (response.status === 401) {
        throw new Error('Authentication failed - Invalid email or API token')
      }

      if (response.status !== 200) {
        console.error(`API error with status ${response.status}`)
        console.error('Error response:', response.data)
        const errorMsg = response.data?.errorMessages?.[0] || response.data?.message || response.statusText
        throw new Error(`Jira API error (${response.status}): ${errorMsg}`)
      }

      const issues = response.data.issues || []
      console.log(`✓ API returned ${issues.length} issues`)
      
      // Log additional info if available
      if (response.data.total !== undefined) {
        console.log('Total results available:', response.data.total)
      }
      if (response.data.maxResults !== undefined) {
        console.log('Max results per page:', response.data.maxResults)
      }

      if (issues.length === 0) {
        console.warn('⚠ No stories found with current JQL')
        console.warn('Reasons this might happen:')
        console.warn('1. No issues of type "Story" in Jira')
        console.warn('2. All stories are in a different project')
        console.warn('3. Current user lacks permission to view stories')
        console.warn('4. Jira instance uses different issue types (Task, Epic, etc.)')
        
        // Try fetching with different issue types if no stories found
        if (!projectKey) {
          console.log('\nAttempting fallback: searching for all issue types...')
          const fallbackResponse = await this.client.post('/rest/api/3/search/jql', {
            jql: 'type in (Story, Task, Epic, Subtask)',
            maxResults: 50,
            fields: ['summary', 'description', 'customfield_10000']
          })
          
          const fallbackIssues = fallbackResponse.data.issues || []
          console.log(`✓ Fallback search found ${fallbackIssues.length} issues of any type`)
          
          if (fallbackIssues.length > 0) {
            return fallbackIssues.map((issue: any) => ({
              key: issue.key,
              fields: {
                summary: issue.fields.summary,
                description: issue.fields.description || '',
                acceptance_criteria: issue.fields.customfield_10000 || ''
              }
            }))
          }
        }
      }

      return issues.map((issue: any) => ({
        key: issue.key,
        fields: {
          summary: issue.fields.summary,
          description: issue.fields.description || '',
          acceptance_criteria: issue.fields.customfield_10000 || ''
        }
      }))
    } catch (error: any) {
      console.error('\n✗ Jira fetch stories error:', error.message)
      console.error('Full error:', error)
      
      if (error.response?.status === 401) {
        throw new Error('Authentication failed - Invalid email or API token. Check credentials at https://id.atlassian.com/manage-profile/security/api-tokens')
      }
      
      if (error.message.includes('No issues found')) {
        throw new Error('No Jira stories found. Ensure your Jira instance has issues of type "Story", or try a different project.')
      }
      
      throw error
    }
  }

  async getStoryDetails(storyKey: string): Promise<JiraStory> {
    try {
      console.log(`Fetching details for story: ${storyKey}`)
      const response = await this.client.get(`/rest/api/3/issue/${storyKey}`, {
        params: {
          fields: 'summary,description,customfield_10000'
        }
      })

      if (response.status === 404) {
        throw new Error(`Story ${storyKey} not found in Jira`)
      }

      if (response.status !== 200) {
        throw new Error(`Failed to fetch story: ${response.statusText}`)
      }

      console.log(`✓ Retrieved story: ${response.data.key}`)

      return {
        key: response.data.key,
        fields: {
          summary: response.data.fields.summary,
          description: response.data.fields.description || '',
          acceptance_criteria: response.data.fields.customfield_10000 || ''
        }
      }
    } catch (error: any) {
      console.error(`✗ Error fetching story ${storyKey}:`, error.message)
      throw new Error(`Failed to fetch story ${storyKey} from Jira: ${error.message}`)
    }
  }
}
