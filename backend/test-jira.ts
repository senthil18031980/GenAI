import { JiraService } from './src/services/jiraService'

async function testJira() {
  const config = {
    baseUrl: 'https://your-jira-instance.atlassian.net',
    emailId: 'your-email@example.com',
    apiKey: 'your-api-key'
  }

  console.log('Testing Jira connection with config:')
  console.log('- Base URL:', config.baseUrl)
  console.log('- Email ID:', config.emailId)
  console.log()

  const jiraService = new JiraService(config)

  try {
    console.log('Attempting authentication...')
    const authenticated = await jiraService.authenticate()
    console.log('✓ Authentication successful!')

    console.log()
    console.log('Fetching stories...')
    const stories = await jiraService.getStories()
    console.log(`✓ Found ${stories.length} stories`)
    
    stories.slice(0, 3).forEach(story => {
      console.log(`  - ${story.key}: ${story.fields.summary}`)
    })
  } catch (error) {
    console.error('✗ Error:', error instanceof Error ? error.message : error)
    process.exit(1)
  }
}

testJira()
