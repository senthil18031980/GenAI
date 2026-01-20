import { useState } from 'react'
import { generateTests, exportAsCSV, exportAsExcel, exportAsPDF, connectJira, getJiraStories, fetchStoryDetails } from './api'
import { GenerateRequest, GenerateResponse, TestCase } from './types'

function App() {
  const [formData, setFormData] = useState<GenerateRequest>({
    storyTitle: '',
    acceptanceCriteria: '',
    description: '',
    additionalInfo: ''
  })
  const [results, setResults] = useState<GenerateResponse | null>(null)
  const [isLoading, setIsLoading] = useState<boolean>(false)
  const [error, setError] = useState<string | null>(null)
  const [expandedTestCases, setExpandedTestCases] = useState<Set<string>>(new Set())
  const [isExporting, setIsExporting] = useState<string | null>(null)

  // Notification state
  interface Notification {
    type: 'success' | 'error'
    message: string
    id: string
  }
  
  const [notifications, setNotifications] = useState<Notification[]>([])

  // Add notification with auto-dismiss
  const addNotification = (type: 'success' | 'error', message: string) => {
    const id = Date.now().toString()
    const notification: Notification = { type, message, id }
    setNotifications(prev => [...prev, notification])
    
    // Auto-dismiss after 4 seconds
    setTimeout(() => {
      removeNotification(id)
    }, 4000)
  }

  // Remove notification
  const removeNotification = (id: string) => {
    setNotifications(prev => prev.filter(n => n.id !== id))
  }

  // Load Jira config from localStorage
  const loadJiraConfig = () => {
    const stored = localStorage.getItem('jiraConfig')
    if (stored) {
      try {
        return JSON.parse(stored)
      } catch {
        return { baseUrl: '', emailId: '', apiKey: '' }
      }
    }
    return { baseUrl: '', emailId: '', apiKey: '' }
  }

  const loadJiraConnected = () => {
    const stored = localStorage.getItem('jiraConnected')
    return stored === 'true'
  }

  // Jira connection state with localStorage support
  const [showJiraModal, setShowJiraModal] = useState<boolean>(false)
  const [jiraConfig, setJiraConfig] = useState(loadJiraConfig())
  const [jiraConnected, setJiraConnected] = useState<boolean>(loadJiraConnected())
  const [jiraError, setJiraError] = useState<string | null>(null)
  const [jiraConnectTime, setJiraConnectTime] = useState<string | null>(
    localStorage.getItem('jiraConnectTime')
  )

  // User stories state
  interface UserStory {
    id: string
    key: string
    title: string
    description: string
    acceptanceCriteria: string
  }

  const [userStories, setUserStories] = useState<UserStory[]>([])
  const [loadingStories, setLoadingStories] = useState<boolean>(false)
  const [storiesError, setStoriesError] = useState<string | null>(null)
  const [selectedStory, setSelectedStory] = useState<string>('')
  const [jiraFieldsSet, setJiraFieldsSet] = useState<Set<string>>(new Set())
  const [linkingStoryDetails, setLinkingStoryDetails] = useState<boolean>(false)
  const [linkStorySuccess, setLinkStorySuccess] = useState<boolean>(false)

  const toggleTestCaseExpansion = (testCaseId: string) => {
    const newExpanded = new Set(expandedTestCases)
    if (newExpanded.has(testCaseId)) {
      newExpanded.delete(testCaseId)
    } else {
      newExpanded.add(testCaseId)
    }
    setExpandedTestCases(newExpanded)
  }

  const handleInputChange = (field: keyof GenerateRequest, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!formData.storyTitle.trim() || !formData.acceptanceCriteria.trim()) {
      setError('Story Title and Acceptance Criteria are required')
      return
    }

    setIsLoading(true)
    setError(null)
    
    try {
      const response = await generateTests(formData)
      setResults(response)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to generate tests')
    } finally {
      setIsLoading(false)
    }
  }

  const handleExport = async (format: 'csv' | 'excel' | 'pdf') => {
    setIsExporting(format)
    try {
      if (format === 'csv') {
        await exportAsCSV()
        addNotification('success', `✓ CSV file downloaded successfully`)
      } else if (format === 'excel') {
        await exportAsExcel()
        addNotification('success', `✓ Excel file downloaded successfully`)
      } else if (format === 'pdf') {
        await exportAsPDF()
        addNotification('success', `✓ PDF file downloaded successfully`)
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : `Failed to export as ${format.toUpperCase()}`
      setError(errorMessage)
      addNotification('error', `✗ ${errorMessage}`)
    } finally {
      setIsExporting(null)
    }
  }

  // Jira connection handlers
  const handleJiraModalOpen = () => {
    setShowJiraModal(true)
    setJiraError(null)
  }

  const handleJiraModalClose = () => {
    setShowJiraModal(false)
    setJiraError(null)
  }

  const handleJiraInputChange = (field: keyof typeof jiraConfig, value: string) => {
    setJiraConfig((prev: typeof jiraConfig) => ({ ...prev, [field]: value }))
  }

  const handleJiraConnect = async (e: React.FormEvent) => {
    e.preventDefault()
    setJiraError(null)

    // Validation
    if (!jiraConfig.baseUrl.trim() || !jiraConfig.emailId.trim() || !jiraConfig.apiKey.trim()) {
      setJiraError('All Jira connection fields are required')
      return
    }

    // Validate base URL format
    if (!jiraConfig.baseUrl.startsWith('http')) {
      setJiraError('Base URL must start with http:// or https://')
      return
    }

    try {
      setIsLoading(true)
      const response = await connectJira(jiraConfig)
      
      if (response.success) {
        setJiraConnected(true)
        setShowJiraModal(false)
        setError(null)
        
        // Save to localStorage
        localStorage.setItem('jiraConfig', JSON.stringify(jiraConfig))
        localStorage.setItem('jiraConnected', 'true')
        
        const now = new Date().toLocaleString()
        setJiraConnectTime(now)
        localStorage.setItem('jiraConnectTime', now)
      }
    } catch (err) {
      setJiraError(err instanceof Error ? err.message : 'Failed to connect to Jira')
    } finally {
      setIsLoading(false)
    }
  }

  const handleJiraDisconnect = () => {
    setJiraConnected(false)
    setJiraConfig({
      baseUrl: '',
      emailId: '',
      apiKey: ''
    })
    setJiraConnectTime(null)
    
    // Clear localStorage
    localStorage.removeItem('jiraConfig')
    localStorage.removeItem('jiraConnected')
    localStorage.removeItem('jiraConnectTime')
  }

  // Load user stories from Jira
  const handleLoadUserStories = async () => {
    setLoadingStories(true)
    setStoriesError(null)
    console.log('Starting story load...')
    
    try {
      console.log('Calling getJiraStories with config:', jiraConfig)
      const response = await getJiraStories(jiraConfig)
      
      console.log('API Response:', response)
      console.log('Response success:', response.success)
      console.log('Response stories count:', response.stories?.length)
      
      if (response.success) {
        // Convert Jira stories to UserStory format
        const formattedStories = response.stories.map((story) => {
          // Extract plain text from Jira's rich text format if needed
          let description: string = ''
          const desc = story.fields.description as any
          
          if (typeof desc === 'object' && desc !== null) {
            // Jira returns rich text as {type, version, content}
            // Try to extract text from content array
            try {
              if (desc.content && Array.isArray(desc.content)) {
                description = desc.content
                  .map((item: any) => {
                    if (item.content && Array.isArray(item.content)) {
                      return item.content.map((c: any) => c.text || '').join('')
                    }
                    return ''
                  })
                  .join(' ')
                  .trim()
              } else {
                description = JSON.stringify(desc)
              }
            } catch (e) {
              description = 'Unable to parse description'
            }
          } else if (typeof desc === 'string') {
            description = desc
          }
          
          return {
            id: story.key,
            key: story.key,
            title: story.fields.summary,
            description: description || '(No description)',
            acceptanceCriteria: story.fields.acceptance_criteria || ''
          }
        })
        
        console.log('Formatted stories:', formattedStories)
        console.log('Setting userStories with', formattedStories.length, 'items')
        
        setUserStories(formattedStories)
        
        console.log('After setUserStories, length should be:', formattedStories.length)
      } else {
        console.error('API returned success: false')
        setStoriesError('Failed to load stories - API returned error')
      }
    } catch (err) {
      console.error('Error loading stories:', err)
      setStoriesError(err instanceof Error ? err.message : 'Failed to load user stories')
    } finally {
      setLoadingStories(false)
    }
  }

  // Handle user story selection
  const handleSelectStory = (storyId: string) => {
    const story = userStories.find(s => s.id === storyId)
    if (story) {
      setFormData({
        storyTitle: story.title,
        acceptanceCriteria: story.acceptanceCriteria,
        description: story.description,
        additionalInfo: `Selected from Jira: ${story.key}`
      })
      setSelectedStory(storyId)
      setJiraFieldsSet(new Set(['storyTitle', 'acceptanceCriteria', 'description']))
      
      // Auto-scroll to form after a short delay
      setTimeout(() => {
        const formElement = document.querySelector('.form-container')
        if (formElement) {
          formElement.scrollIntoView({ behavior: 'smooth', block: 'start' })
          // Add highlight animation
          formElement.classList.add('form-highlight')
          setTimeout(() => {
            formElement.classList.remove('form-highlight')
          }, 2000)
        }
      }, 100)
    }
  }

  // Handle clear story selection
  const handleClearStory = () => {
    setFormData({
      storyTitle: '',
      acceptanceCriteria: '',
      description: '',
      additionalInfo: ''
    })
    setSelectedStory('')
    setJiraFieldsSet(new Set())
  }

  // Handle link story (fetch latest details from Jira)
  const handleLinkStory = async () => {
    if (!selectedStory) return

    const selectedStoryData = userStories.find(s => s.id === selectedStory)
    if (!selectedStoryData) return

    setLinkingStoryDetails(true)
    setLinkStorySuccess(false)

    try {
      const response = await fetchStoryDetails(jiraConfig, selectedStoryData.key)

      if (response.success && response.story) {
        // Parse description if it's in Jira's rich text format
        let description: string = ''
        const desc = response.story.fields.description as any

        if (typeof desc === 'object' && desc !== null) {
          try {
            if (desc.content && Array.isArray(desc.content)) {
              description = desc.content
                .map((item: any) => {
                  if (item.content && Array.isArray(item.content)) {
                    return item.content.map((c: any) => c.text || '').join('')
                  }
                  return ''
                })
                .join(' ')
                .trim()
            } else {
              description = JSON.stringify(desc)
            }
          } catch (e) {
            description = 'Unable to parse description'
          }
        } else if (typeof desc === 'string') {
          description = desc
        }

        // Update the userStories array with the freshly fetched details
        setUserStories(prevStories =>
          prevStories.map(story =>
            story.id === selectedStory
              ? {
                  ...story,
                  title: response.story.fields.summary,
                  description: description || '(No description)',
                  acceptanceCriteria: response.story.fields.acceptance_criteria || ''
                }
              : story
          )
        )

        // Update form data with fetched details
        setFormData({
          storyTitle: response.story.fields.summary,
          acceptanceCriteria: response.story.fields.acceptance_criteria || '',
          description: description || '(No description)',
          additionalInfo: `Linked from Jira: ${selectedStoryData.key}`
        })

        setJiraFieldsSet(new Set(['storyTitle', 'acceptanceCriteria', 'description']))
        setLinkStorySuccess(true)

        // Auto-dismiss success message after 3 seconds
        setTimeout(() => {
          setLinkStorySuccess(false)
        }, 3000)

        // Auto-scroll to form and highlight it
        setTimeout(() => {
          const formElement = document.querySelector('.form-container')
          if (formElement) {
            formElement.scrollIntoView({ behavior: 'smooth', block: 'start' })
            // Add highlight animation
            formElement.classList.add('form-highlight')
            setTimeout(() => {
              formElement.classList.remove('form-highlight')
            }, 2000)
          }
        }, 100)

        addNotification('success', `✓ Successfully linked story details from ${selectedStoryData.key}`)
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to fetch story details'
      addNotification('error', `✗ ${errorMessage}`)
    } finally {
      setLinkingStoryDetails(false)
    }
  }

  return (
    <div>
      <style>{`
        * {
          box-sizing: border-box;
          margin: 0;
          padding: 0;
        }
        
        body {
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', sans-serif;
          background-color: #f5f5f5;
          color: #333;
          line-height: 1.6;
        }
        
        .container {
          max-width: 95%;
          width: 100%;
          margin: 0 auto;
          padding: 20px;
          min-height: 100vh;
        }
        
        .header {
          text-align: center;
          margin-bottom: 40px;
        }
        
        .title {
          font-size: 2.5rem;
          color: #2c3e50;
          margin-bottom: 10px;
        }
        
        .subtitle {
          color: #666;
          font-size: 1.1rem;
        }

        @media (max-width: 480px) {
          .container {
            max-width: 98%;
            padding: 12px;
          }

          .header {
            margin-bottom: 20px;
          }

          .title {
            font-size: 1.6rem;
            margin-bottom: 6px;
          }

          .subtitle {
            font-size: 0.9rem;
          }
        }
        
        @media (min-width: 481px) and (max-width: 768px) {
          .container {
            max-width: 95%;
            padding: 18px;
          }

          .title {
            font-size: 2rem;
            margin-bottom: 8px;
          }

          .subtitle {
            font-size: 1rem;
          }
        }
        
        .form-container {
          background: white;
          border-radius: 8px;
          padding: 30px;
          box-shadow: 0 2px 10px rgba(0,0,0,0.1);
          margin-bottom: 30px;
        }
        
        .form-group {
          margin-bottom: 20px;
        }
        
        .form-label {
          display: block;
          font-weight: 600;
          margin-bottom: 8px;
          color: #2c3e50;
        }
        
        .form-input, .form-textarea {
          width: 100%;
          padding: 12px;
          border: 2px solid #e1e8ed;
          border-radius: 6px;
          font-size: 14px;
          transition: border-color 0.2s;
        }
        
        .form-input:focus, .form-textarea:focus {
          outline: none;
          border-color: #3498db;
        }
        
        .form-textarea {
          resize: vertical;
          min-height: 100px;
        }
        
        .submit-btn {
          background: #3498db;
          color: white;
          border: none;
          padding: 12px 24px;
          border-radius: 6px;
          font-size: 16px;
          font-weight: 600;
          cursor: pointer;
          transition: background-color 0.2s;
        }
        
        .submit-btn:hover:not(:disabled) {
          background: #2980b9;
        }
        
        .submit-btn:disabled {
          background: #bdc3c7;
          cursor: not-allowed;
        }
        
        .error-banner {
          background: #e74c3c;
          color: white;
          padding: 15px;
          border-radius: 6px;
          margin-bottom: 20px;
        }
        
        .loading {
          text-align: center;
          padding: 40px;
          color: #666;
          font-size: 18px;
        }
        
        .results-container {
          background: white;
          border-radius: 8px;
          padding: 30px;
          box-shadow: 0 2px 10px rgba(0,0,0,0.1);
        }
        
        .results-header {
          margin-bottom: 20px;
          padding-bottom: 15px;
          border-bottom: 2px solid #e1e8ed;
        }
        
        .results-title {
          font-size: 1.8rem;
          color: #2c3e50;
          margin-bottom: 10px;
        }
        
        .results-meta {
          color: #666;
          font-size: 14px;
        }
        
        .table-container {
          overflow-x: auto;
        }
        
        .results-table {
          width: 100%;
          border-collapse: collapse;
          margin-top: 20px;
        }
        
        .results-table th,
        .results-table td {
          padding: 12px;
          text-align: left;
          border-bottom: 1px solid #e1e8ed;
        }
        
        .results-table th {
          background: #f8f9fa;
          font-weight: 600;
          color: #2c3e50;
        }
        
        .results-table tr:hover {
          background: #f8f9fa;
        }
        
        .category-positive { color: #27ae60; font-weight: 600; }
        .category-negative { color: #e74c3c; font-weight: 600; }
        .category-edge { color: #f39c12; font-weight: 600; }
        .category-authorization { color: #9b59b6; font-weight: 600; }
        .category-non-functional { color: #34495e; font-weight: 600; }

        .type-sanity { 
          background-color: #d5f4e6;
          color: #27ae60;
          padding: 4px 12px;
          border-radius: 4px;
          font-weight: 600;
          font-size: 13px;
          display: inline-block;
        }
        
        .type-regression { 
          background-color: #d6eaf8;
          color: #3498db;
          padding: 4px 12px;
          border-radius: 4px;
          font-weight: 600;
          font-size: 13px;
          display: inline-block;
        }
        
        .type-performance { 
          background-color: #fdebd0;
          color: #f39c12;
          padding: 4px 12px;
          border-radius: 4px;
          font-weight: 600;
          font-size: 13px;
          display: inline-block;
        }
        
        .type-security { 
          background-color: #fadbd8;
          color: #e74c3c;
          padding: 4px 12px;
          border-radius: 4px;
          font-weight: 600;
          font-size: 13px;
          display: inline-block;
        }
        
        .test-case-id {
          cursor: pointer;
          color: #3498db;
          font-weight: 600;
          padding: 8px 12px;
          border-radius: 4px;
          transition: background-color 0.2s;
          display: inline-flex;
          align-items: center;
          gap: 8px;
        }
        
        .test-case-id:hover {
          background: #f8f9fa;
        }
        
        .test-case-id.expanded {
          background: #e3f2fd;
          color: #1976d2;
        }
        
        .expand-icon {
          font-size: 10px;
          transition: transform 0.2s;
        }
        
        .expand-icon.expanded {
          transform: rotate(90deg);
        }
        
        .expanded-details {
          margin-top: 15px;
          background: #fafbfc;
          border: 1px solid #e1e8ed;
          border-radius: 8px;
          padding: 20px;
        }
        
        .step-item {
          background: white;
          border: 1px solid #e1e8ed;
          border-radius: 6px;
          padding: 15px;
          margin-bottom: 12px;
          box-shadow: 0 1px 3px rgba(0,0,0,0.05);
        }
        
        .step-header {
          display: grid;
          grid-template-columns: 80px 1fr 1fr 1fr;
          gap: 15px;
          align-items: start;
        }
        
        .step-id {
          font-weight: 600;
          color: #2c3e50;
          background: #f8f9fa;
          padding: 4px 8px;
          border-radius: 4px;
          text-align: center;
          font-size: 12px;
        }
        
        .step-description {
          color: #2c3e50;
          line-height: 1.5;
        }
        
        .step-test-data {
          color: #666;
          font-style: italic;
          font-size: 14px;
        }
        
        .step-expected {
          color: #27ae60;
          font-weight: 500;
          font-size: 14px;
        }
        
        .step-labels {
          display: grid;
          grid-template-columns: 80px 1fr 1fr 1fr;
          gap: 15px;
          margin-bottom: 10px;
          font-weight: 600;
          color: #666;
          font-size: 12px;
          text-transform: uppercase;
          letter-spacing: 0.5px;
        }

        .export-buttons {
          display: flex;
          gap: 12px;
          margin-bottom: 20px;
          flex-wrap: wrap;
          align-items: center;
        }

        .export-btn {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
          background: #27ae60;
          color: white;
          border: none;
          padding: 11px 18px;
          border-radius: 6px;
          font-size: 14px;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.2s ease;
          white-space: nowrap;
          box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
          position: relative;
          outline: 2px solid transparent;
          outline-offset: 2px;
        }

        .export-btn:hover:not(:disabled) {
          background: #229954;
          box-shadow: 0 6px 12px rgba(0, 0, 0, 0.16), 0 3px 6px rgba(0, 0, 0, 0.12);
          transform: translateY(-2px);
        }

        .export-btn:focus:not(:disabled) {
          outline: 2px solid currentColor;
          outline-offset: 2px;
          box-shadow: 0 6px 12px rgba(0, 0, 0, 0.16), 0 3px 6px rgba(0, 0, 0, 0.12);
        }

        .export-btn:active:not(:disabled) {
          transform: translateY(0);
          box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
        }

        .export-btn:disabled {
          background: #bdc3c7;
          cursor: not-allowed;
          opacity: 0.6;
          box-shadow: 0 1px 2px rgba(0, 0, 0, 0.05);
        }

        .export-btn.csv {
          background: linear-gradient(135deg, #3498db 0%, #2980b9 100%);
        }

        .export-btn.csv:hover:not(:disabled) {
          background: linear-gradient(135deg, #2980b9 0%, #1f618d 100%);
          box-shadow: 0 6px 12px rgba(52, 152, 219, 0.4), 0 3px 6px rgba(0, 0, 0, 0.12);
        }

        .export-btn.csv:focus:not(:disabled) {
          outline-color: #3498db;
          box-shadow: 0 6px 12px rgba(52, 152, 219, 0.4), 0 3px 6px rgba(0, 0, 0, 0.12);
        }

        .export-btn.excel {
          background: linear-gradient(135deg, #f39c12 0%, #d68910 100%);
        }

        .export-btn.excel:hover:not(:disabled) {
          background: linear-gradient(135deg, #d68910 0%, #ba4a00 100%);
          box-shadow: 0 6px 12px rgba(243, 156, 18, 0.4), 0 3px 6px rgba(0, 0, 0, 0.12);
        }

        .export-btn.excel:focus:not(:disabled) {
          outline-color: #f39c12;
          box-shadow: 0 6px 12px rgba(243, 156, 18, 0.4), 0 3px 6px rgba(0, 0, 0, 0.12);
        }

        .export-btn.pdf {
          background: linear-gradient(135deg, #e74c3c 0%, #c0392b 100%);
        }

        .export-btn.pdf:hover:not(:disabled) {
          background: linear-gradient(135deg, #c0392b 0%, #a93226 100%);
          box-shadow: 0 6px 12px rgba(231, 76, 60, 0.4), 0 3px 6px rgba(0, 0, 0, 0.12);
        }

        .export-btn.pdf:focus:not(:disabled) {
          outline-color: #e74c3c;
          box-shadow: 0 6px 12px rgba(231, 76, 60, 0.4), 0 3px 6px rgba(0, 0, 0, 0.12);
        }

        /* Loading state for export buttons */
        .export-btn.loading {
          opacity: 0.95;
          cursor: wait;
        }

        .spinner {
          display: inline-block;
          width: 14px;
          height: 14px;
          border: 2px solid rgba(255, 255, 255, 0.3);
          border-radius: 50%;
          border-top-color: white;
          border-right-color: white;
          animation: spin 0.8s linear infinite;
        }

        @keyframes spin {
          to {
            transform: rotate(360deg);
          }
        }

        /* Responsive Design - Mobile First */
        @media (max-width: 480px) {
          .container {
            max-width: 98%;
            padding: 12px;
          }

          .header {
            margin-bottom: 20px;
          }

          .title {
            font-size: 1.8rem;
          }

          .subtitle {
            font-size: 0.95rem;
          }

          .form-container {
            padding: 16px;
            border-radius: 6px;
          }

          .form-group {
            margin-bottom: 14px;
          }

          .form-label {
            font-size: 13px;
            margin-bottom: 6px;
          }

          .form-input, .form-textarea {
            padding: 10px;
            font-size: 13px;
          }

          .export-buttons {
            flex-direction: column;
            gap: 8px;
            margin-bottom: 16px;
          }

          .export-btn {
            width: 100%;
            padding: 13px 12px;
            font-size: 12px;
            gap: 6px;
            min-height: 44px;
            border-radius: 4px;
          }

          .export-btn:hover:not(:disabled) {
            transform: translateY(-1px);
          }

          .spinner {
            width: 12px;
            height: 12px;
            border-width: 1.5px;
          }

          .submit-btn {
            width: 100%;
            padding: 12px 16px;
            font-size: 14px;
          }

          .table-container {
            margin-bottom: 20px;
            border-radius: 4px;
            overflow: hidden;
          }

          .results-table {
            font-size: 12px;
          }

          .results-table th,
          .results-table td {
            padding: 8px 6px;
          }

          .test-case-row-label {
            font-size: 11px;
            padding: 4px;
          }

          .test-case-details {
            padding: 8px;
            font-size: 12px;
            gap: 8px;
          }

          .expand-button {
            padding: 4px 8px;
            font-size: 11px;
          }

          .user-stories-section {
            margin-bottom: 20px;
          }

          .stories-header {
            flex-direction: column;
            gap: 8px;
          }

          .load-stories-btn {
            width: 100%;
            padding: 10px 12px;
            font-size: 12px;
          }

          .story-select {
            font-size: 13px !important;
          }

          .selected-story-details {
            padding: 12px;
            margin-top: 12px;
          }

          .detail-item {
            padding: 6px;
            font-size: 12px;
          }

          .detail-label {
            min-width: 70px;
            font-size: 12px;
          }

          .detail-value {
            font-size: 12px;
          }

          .clear-story-btn {
            width: 100%;
            padding: 9px 12px;
            font-size: 12px;
          }
        }

        @media (min-width: 481px) and (max-width: 768px) {
          .container {
            max-width: 95%;
            padding: 18px;
          }

          .title {
            font-size: 2rem;
          }

          .form-container {
            padding: 20px;
          }

          .export-buttons {
            flex-direction: column;
            gap: 10px;
            margin-bottom: 18px;
          }

          .export-btn {
            width: 100%;
            padding: 12px 16px;
            font-size: 13px;
            min-height: 42px;
          }

          .export-btn:hover:not(:disabled) {
            transform: translateY(-1px);
          }

          .submit-btn {
            width: 100%;
            padding: 12px 20px;
          }

          .results-table {
            font-size: 12px;
          }

          .results-table th,
          .results-table td {
            padding: 10px 8px;
          }

          .stories-header {
            flex-direction: column;
            gap: 10px;
          }

          .load-stories-btn {
            width: 100%;
          }

          .selected-story-details {
            margin-top: 12px;
          }
        }

        @media (min-width: 769px) and (max-width: 1023px) {
          .export-buttons {
            flex-direction: row;
            gap: 10px;
            margin-bottom: 20px;
            justify-content: flex-start;
          }

          .export-btn {
            flex: 1;
            min-width: 140px;
            padding: 11px 14px;
            font-size: 13px;
          }

          .results-table {
            font-size: 13px;
          }

          .stories-header {
            flex-direction: row;
            gap: 12px;
            align-items: center;
          }

          .load-stories-btn {
            width: auto;
          }
        }

        @media (min-width: 1024px) {
          .export-buttons {
            flex-direction: row;
            gap: 12px;
            margin-bottom: 20px;
            flex-wrap: nowrap;
          }

          .export-btn {
            padding: 11px 18px;
            font-size: 14px;
          }

          .stories-header {
            display: flex;
            flex-direction: row;
            gap: 12px;
            align-items: center;
          }

          .load-stories-btn {
            width: auto;
          }
        }

        @media (min-width: 1440px) {
          .export-btn {
            padding: 12px 20px;
            font-size: 14px;
          }
        }

        /* Touch-friendly adjustments for mobile */
        @media (hover: none) and (pointer: coarse) {
          .export-btn,
          .submit-btn,
          .load-stories-btn,
          .clear-story-btn,
          button {
            min-height: 44px;
            min-width: 44px;
          }

          .export-btn {
            padding: 12px 16px;
          }
        }

        /* Dark mode support (optional) */
        @media (prefers-color-scheme: dark) {
          body {
            background-color: #1a1a1a;
            color: #e0e0e0;
          }

          .form-container {
            background: #2a2a2a;
            box-shadow: 0 2px 8px rgba(0, 0, 0, 0.3);
          }

          .form-input, .form-textarea {
            background: #333;
            color: #e0e0e0;
            border-color: #444;
          }

          .form-input:focus, .form-textarea:focus {
            border-color: #3498db;
          }
        }

        /* Reduce motion for accessibility */
        @media (prefers-reduced-motion: reduce) {
          * {
            animation-duration: 0.01ms !important;
            animation-iteration-count: 1 !important;
            transition-duration: 0.01ms !important;
          }

          .export-btn:hover:not(:disabled),
          .export-btn:active:not(:disabled) {
            transform: none;
          }
        }

        /* Jira Connection Styles */
        .jira-button {
          background: #0052cc;
          color: white;
          border: none;
          padding: 10px 16px;
          border-radius: 6px;
          font-size: 14px;
          font-weight: 600;
          cursor: pointer;
          transition: background-color 0.2s;
          margin-right: 10px;
        }

        .jira-button:hover:not(:disabled) {
          background: #003fa3;
        }

        .jira-button.disconnect {
          background: #e74c3c;
        }

        .jira-button.disconnect:hover:not(:disabled) {
          background: #c0392b;
        }

        .jira-status {
          display: inline-block;
          padding: 8px 16px;
          border-radius: 6px;
          font-weight: 600;
          font-size: 13px;
          margin-left: 10px;
        }

        .jira-status.connected {
          background: #d5f4e6;
          color: #27ae60;
        }

        .jira-status.disconnected {
          background: #fadbd8;
          color: #e74c3c;
        }

        .top-bar {
          display: flex;
          align-items: center;
          justify-content: space-between;
          margin-bottom: 30px;
          padding-bottom: 15px;
          border-bottom: 2px solid #e1e8ed;
        }

        .jira-info {
          display: flex;
          flex-direction: column;
          gap: 5px;
          text-align: right;
          font-size: 12px;
        }

        .jira-url {
          color: #2c3e50;
          font-weight: 500;
          max-width: 300px;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }

        .jira-time {
          color: #666;
          font-size: 11px;
        }

        /* User Stories Styles */
        .user-stories-section {
          background: white;
          border-radius: 8px;
          padding: 20px;
          margin-bottom: 20px;
          box-shadow: 0 2px 10px rgba(0,0,0,0.1);
        }

        .stories-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          margin-bottom: 15px;
        }

        .stories-title {
          font-size: 1.2rem;
          font-weight: 600;
          color: #2c3e50;
          display: flex;
          align-items: center;
          gap: 8px;
        }

        .load-stories-btn {
          background: #0052cc;
          color: white;
          border: none;
          padding: 8px 16px;
          border-radius: 6px;
          font-size: 13px;
          font-weight: 600;
          cursor: pointer;
          transition: background-color 0.2s;
        }

        .load-stories-btn:hover:not(:disabled) {
          background: #003fa3;
        }

        .load-stories-btn:disabled {
          background: #bdc3c7;
          cursor: not-allowed;
        }

        .stories-dropdown {
          position: relative;
          margin-bottom: 15px;
          background: white;
          padding: 20px;
          border-radius: 6px;
          border: 1px solid #e1e8ed;
          box-shadow: 0 2px 8px rgba(0,0,0,0.08);
        }

        .story-select {
          padding: 10px 12px !important;
          font-size: 14px !important;
          border: 2px solid #e1e8ed !important;
          border-radius: 6px !important;
          background-color: white !important;
          cursor: pointer;
        }

        .story-select:focus {
          outline: none;
          border-color: #0052cc !important;
          box-shadow: 0 0 0 3px rgba(0, 82, 204, 0.1);
        }

        .story-select option {
          padding: 8px;
          color: #333;
        }

        .selected-story-details {
          margin-top: 20px;
          padding: 15px;
          background: #f0f7ff;
          border: 1px solid #0052cc;
          border-radius: 6px;
        }

        .selected-story-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 15px;
          padding-bottom: 10px;
          border-bottom: 2px solid #0052cc;
        }

        .selected-story-header strong {
          color: #0052cc;
          font-size: 15px;
        }

        .story-details-content {
          display: flex;
          flex-direction: column;
          gap: 10px;
        }

        .detail-item {
          display: flex;
          gap: 10px;
          padding: 8px;
          background: white;
          border-radius: 4px;
          border-left: 3px solid #0052cc;
        }

        .detail-label {
          font-weight: 600;
          color: #2c3e50;
          min-width: 100px;
        }

        .detail-value {
          color: #555;
          flex: 1;
          word-break: break-word;
        }

        .stories-list {
          border: 1px solid #e1e8ed;
          border-radius: 6px;
          max-height: 300px;
          overflow-y: auto;
          background: white;
          box-shadow: 0 4px 12px rgba(0,0,0,0.1);
          display: none;
        }

        .story-item {
          padding: 12px 15px;
          border-bottom: 1px solid #e1e8ed;
          cursor: pointer;
          transition: background-color 0.2s;
          display: none;
        }

        .story-item:hover {
          background: #f8f9fa;
        }

        .story-item.selected {
          background: #e3f2fd;
          border-left: 3px solid #0052cc;
        }

        .story-key {
          font-size: 11px;
          color: #999;
          font-weight: 600;
          text-transform: uppercase;
        }

        .story-title {
          font-weight: 600;
          color: #2c3e50;
          margin: 4px 0;
        }

        .story-description {
          font-size: 13px;
          color: #666;
          margin-top: 4px;
        }

        .stories-error {
          background: #fadbd8;
          color: #c0392b;
          padding: 10px 12px;
          border-radius: 6px;
          font-size: 13px;
          margin-bottom: 15px;
        }

        .stories-loading {
          text-align: center;
          padding: 20px;
          color: #666;
          font-style: italic;
        }

        .selected-story-info {
          background: #d5f4e6;
          border: 1px solid #27ae60;
          border-radius: 6px;
          padding: 12px 15px;
          margin-bottom: 15px;
          font-size: 13px;
          color: #186a3b;
          display: none;
        }

        .selected-story-info strong {
          display: block;
          margin-bottom: 4px;
        }

        .clear-story-btn {
          background: #e74c3c;
          color: white;
          border: none;
          padding: 8px 16px;
          border-radius: 6px;
          font-size: 13px;
          font-weight: 600;
          cursor: pointer;
          transition: background-color 0.2s;
        }

        .clear-story-btn:hover {
          background: #c0392b;
        }

        .clear-story-btn:disabled {
          background: #bdc3c7;
          cursor: not-allowed;
        }

        .link-story-btn {
          background: #27ae60;
          color: white;
          border: none;
          padding: 8px 16px;
          border-radius: 6px;
          font-size: 13px;
          font-weight: 600;
          cursor: pointer;
          transition: background-color 0.2s;
        }

        .link-story-btn:hover:not(:disabled) {
          background: #229954;
        }

        .link-story-btn:disabled {
          background: #bdc3c7;
          cursor: not-allowed;
        }
          margin-bottom: 15px;
        }

        .stories-loading {
          text-align: center;
          padding: 20px;
          color: #666;
          font-style: italic;
        }

        .selected-story-info {
          background: #d5f4e6;
          border: 1px solid #27ae60;
          border-radius: 6px;
          padding: 12px 15px;
          margin-bottom: 15px;
          font-size: 13px;
          color: #186a3b;
        }

        .selected-story-info strong {
          display: block;
          margin-bottom: 4px;
        }

        .clear-story-btn {
          background: #e74c3c;
          color: white;
          border: none;
          padding: 8px 16px;
          border-radius: 6px;
          font-size: 13px;
          font-weight: 600;
          cursor: pointer;
          transition: background-color 0.2s;
          margin-top: 10px;
        }

        .clear-story-btn:hover {
          background: #c0392b;
        }

        .form-highlight {
          animation: highlightPulse 0.6s ease-out;
        }

        @keyframes highlightPulse {
          0% {
            background-color: #fff9e6;
            border: 2px solid #ffa500;
          }
          50% {
            background-color: #fffef0;
          }
          100% {
            background-color: transparent;
            border: 1px solid #ddd;
          }
        }

        @keyframes slideInDown {
          from {
            opacity: 0;
            transform: translateY(-10px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        .link-story-success-message {
          animation: slideInDown 0.3s ease-out;
        }

        .form-header {
          margin-bottom: 15px;
          padding: 12px 15px;
          background: #e3f2fd;
          border-left: 4px solid #0052cc;
          border-radius: 6px;
          font-size: 13px;
          color: #1565c0;
          font-weight: 600;
        }

        .jira-field-indicator {
          display: inline-block;
          margin-left: 6px;
          padding: 2px 8px;
          background: #0052cc;
          color: white;
          border-radius: 3px;
          font-size: 10px;
          font-weight: bold;
          white-space: nowrap;
        }

        /* Modal Styles */
        .modal-overlay {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: rgba(0, 0, 0, 0.5);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 1000;
        }

        .modal-content {
          background: white;
          border-radius: 8px;
          padding: 30px;
          max-width: 500px;
          width: 90%;
          box-shadow: 0 10px 40px rgba(0, 0, 0, 0.3);
        }

        .modal-header {
          font-size: 1.5rem;
          font-weight: 600;
          margin-bottom: 20px;
          color: #2c3e50;
          display: flex;
          align-items: center;
          gap: 10px;
        }

        .modal-form {
          margin-bottom: 20px;
        }

        .modal-form .form-group {
          margin-bottom: 16px;
        }

        .modal-form .form-label {
          margin-bottom: 6px;
          font-size: 13px;
        }

        .modal-form .form-input {
          padding: 10px;
          font-size: 13px;
        }

        .modal-buttons {
          display: flex;
          gap: 10px;
          justify-content: flex-end;
        }

        .modal-btn {
          padding: 10px 20px;
          border-radius: 6px;
          font-size: 14px;
          font-weight: 600;
          border: none;
          cursor: pointer;
          transition: background-color 0.2s;
        }

        .modal-btn.connect {
          background: #0052cc;
          color: white;
        }

        .modal-btn.connect:hover {
          background: #003fa3;
        }

        .modal-btn.cancel {
          background: #e1e8ed;
          color: #2c3e50;
        }

        .modal-btn.cancel:hover {
          background: #cbd5e0;
        }

        .modal-error {
          background: #fadbd8;
          color: #c0392b;
          padding: 10px 12px;
          border-radius: 6px;
          margin-bottom: 15px;
          font-size: 13px;
        }

        /* Notification Styles */
        .notification-container {
          position: fixed;
          top: 20px;
          right: 20px;
          z-index: 9999;
          max-width: 400px;
        }

        .notification {
          background: white;
          border-radius: 8px;
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
          margin-bottom: 10px;
          animation: slideInRight 0.3s ease-out;
          overflow: hidden;
          border-left: 4px solid;
        }

        .notification-success {
          border-left-color: #27ae60;
          background: #f0fdf4;
        }

        .notification-error {
          border-left-color: #e74c3c;
          background: #fef2f2;
        }

        .notification-content {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 14px 16px;
          gap: 12px;
        }

        .notification-message {
          font-size: 14px;
          font-weight: 500;
          flex: 1;
        }

        .notification-success .notification-message {
          color: #15803d;
        }

        .notification-error .notification-message {
          color: #991b1b;
        }

        .notification-close {
          background: none;
          border: none;
          color: #999;
          font-size: 18px;
          cursor: pointer;
          padding: 0;
          width: 24px;
          height: 24px;
          display: flex;
          align-items: center;
          justify-content: center;
          transition: color 0.2s;
          flex-shrink: 0;
        }

        .notification-close:hover {
          color: #333;
        }

        @keyframes slideInRight {
          from {
            transform: translateX(400px);
            opacity: 0;
          }
          to {
            transform: translateX(0);
            opacity: 1;
          }
        }

        @media (max-width: 768px) {
          .notification-container {
            left: 10px;
            right: 10px;
            top: 10px;
            max-width: none;
          }

          .notification {
            margin-bottom: 8px;
          }

          .notification-content {
            padding: 12px 14px;
            font-size: 13px;
          }

          .notification-close {
            width: 20px;
            height: 20px;
            font-size: 16px;
          }
        }
      `}</style>
      
      {/* Notification Container */}
      <div className="notification-container">
        {notifications.map((notification) => (
          <div
            key={notification.id}
            className={`notification notification-${notification.type}`}
          >
            <div className="notification-content">
              <span className="notification-message">{notification.message}</span>
              <button
                className="notification-close"
                onClick={() => removeNotification(notification.id)}
                aria-label="Close notification"
              >
                ✕
              </button>
            </div>
          </div>
        ))}
      </div>
      
      <div className="container">
        <div className="header">
          <h1 className="title">User Story to Tests</h1>
          <p className="subtitle">Generate comprehensive test cases from your user stories</p>
        </div>

        {/* Jira Connection Bar */}
        <div className="top-bar">
          <div>
            {!jiraConnected ? (
              <button
                type="button"
                className="jira-button"
                onClick={handleJiraModalOpen}
              >
                🔗 Connect Jira
              </button>
            ) : (
              <>
                <button
                  type="button"
                  className="jira-button disconnect"
                  onClick={handleJiraDisconnect}
                >
                  🔌 Disconnect
                </button>
              </>
            )}
            <span className={`jira-status ${jiraConnected ? 'connected' : 'disconnected'}`}>
              {jiraConnected ? '✓ Connected' : '✗ Disconnected'}
            </span>
          </div>
          {jiraConnected && (
            <div className="jira-info">
              <div className="jira-url">📍 {jiraConfig.baseUrl}</div>
              {jiraConnectTime && (
                <div className="jira-time">Connected: {jiraConnectTime}</div>
              )}
            </div>
          )}
        </div>

        {/* Jira Connection Modal */}
        {showJiraModal && (
          <div className="modal-overlay" onClick={handleJiraModalClose}>
            <div className="modal-content" onClick={(e) => e.stopPropagation()}>
              <div className="modal-header">
                🔗 Connect to Jira
              </div>
              
              {jiraError && (
                <div className="modal-error">{jiraError}</div>
              )}
              
              <form onSubmit={handleJiraConnect} className="modal-form">
                <div className="form-group">
                  <label htmlFor="baseUrl" className="form-label">
                    Base URL *
                  </label>
                  <input
                    type="text"
                    id="baseUrl"
                    className="form-input"
                    value={jiraConfig.baseUrl}
                    onChange={(e) => handleJiraInputChange('baseUrl', e.target.value)}
                    placeholder="https://your-domain.atlassian.net"
                    required
                  />
                </div>

                <div className="form-group">
                  <label htmlFor="emailId" className="form-label">
                    Email ID *
                  </label>
                  <input
                    type="email"
                    id="emailId"
                    className="form-input"
                    value={jiraConfig.emailId}
                    onChange={(e) => handleJiraInputChange('emailId', e.target.value)}
                    placeholder="your-email@example.com"
                    required
                  />
                </div>

                <div className="form-group">
                  <label htmlFor="apiKey" className="form-label">
                    Jira API Key *
                  </label>
                  <input
                    type="password"
                    id="apiKey"
                    className="form-input"
                    value={jiraConfig.apiKey}
                    onChange={(e) => handleJiraInputChange('apiKey', e.target.value)}
                    placeholder="Enter your Jira API key"
                    required
                  />
                </div>

                <div className="modal-buttons">
                  <button
                    type="button"
                    className="modal-btn cancel"
                    onClick={handleJiraModalClose}
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="modal-btn connect"
                  >
                    Connect
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
        
        {/* User Stories Section */}
        {jiraConnected && (
          <div className="user-stories-section">
            <div className="stories-header">
              <div className="stories-title">
                📋 Jira User Stories
              </div>
              <button
                type="button"
                className="load-stories-btn"
                onClick={handleLoadUserStories}
                disabled={loadingStories}
              >
                {loadingStories ? 'Loading...' : 'Load Stories'}
              </button>
            </div>

            {storiesError && (
              <div className="stories-error">{storiesError}</div>
            )}

            {loadingStories && (
              <div className="stories-loading">Loading user stories from Jira...</div>
            )}

            {userStories.length > 0 && (
              <div className="stories-dropdown">
                <div className="form-group">
                  <label htmlFor="storyDropdown" className="form-label">
                    Select a User Story from Jira
                  </label>
                  <select
                    id="storyDropdown"
                    className="form-input story-select"
                    value={selectedStory}
                    onChange={(e) => {
                      if (e.target.value) {
                        handleSelectStory(e.target.value)
                      } else {
                        handleClearStory()
                      }
                    }}
                  >
                    <option value="">-- Choose a story --</option>
                    {userStories.map((story) => (
                      <option key={story.id} value={story.id}>
                        {story.key} - {story.title}
                      </option>
                    ))}
                  </select>
                </div>

                {selectedStory && (
                  <div className="selected-story-details">
                    <div className="selected-story-header">
                      <strong>✓ Story Details</strong>
                      <div style={{ display: 'flex', gap: '10px' }}>
                        <button
                          type="button"
                          className="link-story-btn"
                          onClick={handleLinkStory}
                          disabled={linkingStoryDetails}
                        >
                          {linkingStoryDetails ? 'Linking...' : 'Link Story'}
                        </button>
                        <button
                          type="button"
                          className="clear-story-btn"
                          onClick={handleClearStory}
                        >
                          Clear Selection
                        </button>
                      </div>
                    </div>
                    {linkStorySuccess && (
                      <div className="link-story-success-message" style={{
                        background: '#d4edda',
                        border: '1px solid #c3e6cb',
                        color: '#155724',
                        padding: '10px 12px',
                        borderRadius: '4px',
                        marginBottom: '12px',
                        fontSize: '13px',
                        fontWeight: '500'
                      }}>
                        ✓ Story details successfully linked and form updated
                      </div>
                    )}
                    {userStories.find(s => s.id === selectedStory) && (
                      <div className="story-details-content">
                        <div className="detail-item">
                          <span className="detail-label">Key:</span>
                          <span className="detail-value">{userStories.find(s => s.id === selectedStory)?.key}</span>
                        </div>
                        <div className="detail-item">
                          <span className="detail-label">Title:</span>
                          <span className="detail-value">{userStories.find(s => s.id === selectedStory)?.title}</span>
                        </div>
                        <div className="detail-item">
                          <span className="detail-label">Description:</span>
                          <span className="detail-value">{userStories.find(s => s.id === selectedStory)?.description}</span>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>
        )}
        
        <form onSubmit={handleSubmit} className="form-container">
          {selectedStory && (
            <div className="form-header">
              Form auto-populated from Jira story <span className="story-key">{userStories.find(s => s.id === selectedStory)?.key}</span>
            </div>
          )}
          <div className="form-group">
            <label htmlFor="storyTitle" className="form-label">
              Story Title *
              {jiraFieldsSet.has('storyTitle') && <span className="jira-field-indicator">Jira</span>}
            </label>
            <input
              type="text"
              id="storyTitle"
              className="form-input"
              value={formData.storyTitle}
              onChange={(e) => handleInputChange('storyTitle', e.target.value)}
              placeholder="Enter the user story title..."
              required
            />
          </div>

          <div className="form-group">
            <label htmlFor="description" className="form-label">
              Description
              {jiraFieldsSet.has('description') && <span className="jira-field-indicator">Jira</span>}
            </label>
            <textarea
              id="description"
              className="form-textarea"
              value={formData.description}
              onChange={(e) => handleInputChange('description', e.target.value)}
              placeholder="Additional description (optional)..."
            />
          </div>
          
          <div className="form-group">
            <label htmlFor="acceptanceCriteria" className="form-label">
              Acceptance Criteria *
              {jiraFieldsSet.has('acceptanceCriteria') && <span className="jira-field-indicator">Jira</span>}
            </label>
            <textarea
              id="acceptanceCriteria"
              className="form-textarea"
              value={formData.acceptanceCriteria}
              onChange={(e) => handleInputChange('acceptanceCriteria', e.target.value)}
              placeholder="Enter the acceptance criteria..."
              required
            />
          </div>
          
          <div className="form-group">
            <label htmlFor="additionalInfo" className="form-label">
              Additional Info
            </label>
            <textarea
              id="additionalInfo"
              className="form-textarea"
              value={formData.additionalInfo}
              onChange={(e) => handleInputChange('additionalInfo', e.target.value)}
              placeholder="Any additional information (optional)..."
            />
          </div>
          
          <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
            <button
              type="submit"
              className="submit-btn"
              disabled={isLoading}
            >
              {isLoading ? 'Generating...' : 'Generate'}
            </button>
            {selectedStory && (
              <button
                type="button"
                className="clear-story-btn"
                onClick={handleClearStory}
              >
                Clear Selection & Start Fresh
              </button>
            )}
          </div>
        </form>

        {error && (
          <div className="error-banner">
            {error}
          </div>
        )}

        {isLoading && (
          <div className="loading">
            Generating test cases...
          </div>
        )}

        {results && (
          <div className="results-container">
            <div className="results-header">
              <h2 className="results-title">Generated Test Cases</h2>
              <div className="results-meta">
                {results.cases.length} test case(s) generated
                {results.model && ` • Model: ${results.model}`}
                {results.promptTokens > 0 && ` • Tokens: ${results.promptTokens + results.completionTokens}`}
              </div>
              <div className="export-buttons">
                <button
                  className={`export-btn csv ${isExporting === 'csv' ? 'loading' : ''}`}
                  onClick={() => handleExport('csv')}
                  disabled={isExporting !== null}
                  title="Download test cases as CSV (comma-separated values, compatible with Excel and text editors)"
                >
                  {isExporting === 'csv' ? (
                    <>
                      <span className="spinner"></span>
                      Downloading...
                    </>
                  ) : (
                    <>
                      📋 Download CSV
                    </>
                  )}
                </button>
                <button
                  className={`export-btn excel ${isExporting === 'excel' ? 'loading' : ''}`}
                  onClick={() => handleExport('excel')}
                  disabled={isExporting !== null}
                  title="Download test cases as Excel (XLSX format, includes formatting and multiple sheets)"
                >
                  {isExporting === 'excel' ? (
                    <>
                      <span className="spinner"></span>
                      Downloading...
                    </>
                  ) : (
                    <>
                      📊 Download Excel
                    </>
                  )}
                </button>
                <button
                  className={`export-btn pdf ${isExporting === 'pdf' ? 'loading' : ''}`}
                  onClick={() => handleExport('pdf')}
                  disabled={isExporting !== null}
                  title="Download test cases as PDF (professional report format with test details and statistics)"
                >
                  {isExporting === 'pdf' ? (
                    <>
                      <span className="spinner"></span>
                      Downloading...
                    </>
                  ) : (
                    <>
                      📄 Download PDF
                    </>
                  )}
                </button>
              </div>
            </div>
            
            <div className="table-container">
              <table className="results-table">
                <thead>
                  <tr>
                    <th>Test Case ID</th>
                    <th>Title</th>
                    <th>Category</th>
                    <th>Type</th>
                    <th>Expected Result</th>
                  </tr>
                </thead>
                <tbody>
                  {results.cases.map((testCase: TestCase) => (
                    <>
                      <tr key={testCase.id}>
                        <td>
                          <div 
                            className={`test-case-id ${expandedTestCases.has(testCase.id) ? 'expanded' : ''}`}
                            onClick={() => toggleTestCaseExpansion(testCase.id)}
                          >
                            <span className={`expand-icon ${expandedTestCases.has(testCase.id) ? 'expanded' : ''}`}>
                              ▶
                            </span>
                            {testCase.id}
                          </div>
                        </td>
                        <td>{testCase.title}</td>
                        <td>
                          <span className={`category-${testCase.category.toLowerCase()}`}>
                            {testCase.category}
                          </span>
                        </td>
                        <td>
                          <span className={`type-${testCase.type.toLowerCase()}`}>
                            {testCase.type}
                          </span>
                        </td>
                        <td>{testCase.expectedResult}</td>
                      </tr>
                      {expandedTestCases.has(testCase.id) && (
                        <tr key={`${testCase.id}-details`}>
                          <td colSpan={5}>
                            <div className="expanded-details">
                              <h4 style={{marginBottom: '15px', color: '#2c3e50'}}>Test Steps for {testCase.id}</h4>
                              <div className="step-labels">
                                <div>Step ID</div>
                                <div>Step Description</div>
                                <div>Test Data</div>
                                <div>Expected Result</div>
                              </div>
                              {testCase.steps.map((step, index) => (
                                <div key={index} className="step-item">
                                  <div className="step-header">
                                    <div className="step-id">S{String(index + 1).padStart(2, '0')}</div>
                                    <div className="step-description">{step}</div>
                                    <div className="step-test-data">{testCase.testData || 'N/A'}</div>
                                    <div className="step-expected">
                                      {index === testCase.steps.length - 1 ? testCase.expectedResult : 'Step completed successfully'}
                                    </div>
                                  </div>
                                </div>
                              ))}
                            </div>
                          </td>
                        </tr>
                      )}
                    </>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

export default App