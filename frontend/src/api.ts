import { GenerateRequest, GenerateResponse } from './types'

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8081/api'

export interface JiraConfig {
  baseUrl: string
  emailId: string
  apiKey: string
}

export interface JiraStory {
  key: string
  fields: {
    summary: string
    description: string
    acceptance_criteria?: string
  }
}

export async function generateTests(request: GenerateRequest): Promise<GenerateResponse> {
  try {
    const response = await fetch(`${API_BASE_URL}/generate-tests`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(request),
    })

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ error: 'Unknown error' }))
      throw new Error(errorData.error || `HTTP error! status: ${response.status}`)
    }

    const data: GenerateResponse = await response.json()
    return data
  } catch (error) {
    console.error('Error generating tests:', error)
    throw error instanceof Error ? error : new Error('Unknown error occurred')
  }
}

/**
 * Connect to Jira
 */
export async function connectJira(config: JiraConfig): Promise<{ success: boolean; message: string; baseUrl: string }> {
  try {
    const response = await fetch(`${API_BASE_URL}/generate-tests/jira/connect`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(config)
    })

    if (!response.ok) {
      const error = await response.json()
      throw new Error(error.error || 'Failed to connect to Jira')
    }

    return await response.json()
  } catch (error) {
    console.error('Error connecting to Jira:', error)
    throw error instanceof Error ? error : new Error('Unknown error occurred')
  }
}

/**
 * Fetch Jira Stories
 */
export async function getJiraStories(config: JiraConfig, projectKey?: string): Promise<{ success: boolean; stories: JiraStory[]; count: number }> {
  try {
    const response = await fetch(`${API_BASE_URL}/generate-tests/jira/stories`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        ...config,
        projectKey
      })
    })

    if (!response.ok) {
      const error = await response.json()
      throw new Error(error.error || 'Failed to fetch stories from Jira')
    }

    return await response.json()
  } catch (error) {
    console.error('Error fetching Jira stories:', error)
    throw error instanceof Error ? error : new Error('Unknown error occurred')
  }
}

/**
 * Fetch Story Details
 */
export async function fetchStoryDetails(config: JiraConfig, storyKey: string): Promise<{ success: boolean; story: JiraStory }> {
  try {
    const response = await fetch(`${API_BASE_URL}/generate-tests/jira/story-details`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        ...config,
        storyKey
      })
    })

    if (!response.ok) {
      const error = await response.json()
      throw new Error(error.error || 'Failed to fetch story details from Jira')
    }

    return await response.json()
  } catch (error) {
    console.error('Error fetching story details:', error)
    throw error instanceof Error ? error : new Error('Unknown error occurred')
  }
}

/**
 * Export test cases as CSV
 */
export async function exportAsCSV(): Promise<void> {
  try {
    const response = await fetch(`${API_BASE_URL}/generate-tests/export/csv`, {
      method: 'POST',
    })

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ error: 'Unknown error' }))
      throw new Error(errorData.error || `HTTP error! status: ${response.status}`)
    }

    const blob = await response.blob()
    downloadFile(blob, `test-cases-${Date.now()}.csv`, 'text/csv')
  } catch (error) {
    console.error('Error exporting as CSV:', error)
    throw error instanceof Error ? error : new Error('Failed to export as CSV')
  }
}

/**
 * Export test cases as Excel
 */
export async function exportAsExcel(): Promise<void> {
  try {
    const response = await fetch(`${API_BASE_URL}/generate-tests/export/excel`, {
      method: 'POST',
    })

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ error: 'Unknown error' }))
      throw new Error(errorData.error || `HTTP error! status: ${response.status}`)
    }

    const blob = await response.blob()
    downloadFile(blob, `test-cases-${Date.now()}.xlsx`, 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet')
  } catch (error) {
    console.error('Error exporting as Excel:', error)
    throw error instanceof Error ? error : new Error('Failed to export as Excel')
  }
}

/**
 * Export test cases as PDF
 */
export async function exportAsPDF(): Promise<void> {
  try {
    const response = await fetch(`${API_BASE_URL}/generate-tests/export/pdf`, {
      method: 'POST',
    })

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ error: 'Unknown error' }))
      throw new Error(errorData.error || `HTTP error! status: ${response.status}`)
    }

    const blob = await response.blob()
    downloadFile(blob, `test-cases-${Date.now()}.pdf`, 'application/pdf')
  } catch (error) {
    console.error('Error exporting as PDF:', error)
    throw error instanceof Error ? error : new Error('Failed to export as PDF')
  }
}

/**
 * Helper function to trigger file download
 */
function downloadFile(blob: Blob, filename: string, mimeType: string): void {
  const url = window.URL.createObjectURL(new Blob([blob], { type: mimeType }))
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  window.URL.revokeObjectURL(url)
}