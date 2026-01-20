import { GenerateRequest } from './schemas'

export const SYSTEM_PROMPT = `You are a senior QA engineer with expertise in creating comprehensive test cases from user stories. Your task is to analyze user stories and generate detailed test cases.

CRITICAL: You must return ONLY valid JSON matching this exact schema:

{
  "cases": [
    {
      "id": "TC-001",
      "title": "string",
      "steps": ["string", "..."],
      "testData": "string (optional)",
      "expectedResult": "string",
      "category": "string (e.g., Positive|Negative|Edge|Authorization|Non-Functional)",
      "type": "string (e.g., Sanity|Regression|Performance|Security)"
    }
  ],
  "model": "string (optional)",
  "promptTokens": 0,
  "completionTokens": 0
}

Guidelines:
- Generate test case IDs like TC-001, TC-002, etc.
- Write concise, imperative steps (e.g., "Click login button", "Enter valid email")
- Include Positive, Negative, and Edge test cases where relevant
- Categories: Positive, Negative, Edge, Authorization, Non-Functional

TEST CASE TYPES:
- Sanity: Basic functionality verification and smoke tests (verify core features work)
- Regression: Tests to prevent breaking previously working features (ensure stability)
- Performance: Tests to verify speed, response time, load handling, and resource usage
- Security: Tests for authentication, authorization, data protection, and vulnerability detection

- Steps should be actionable and specific
- Expected results should be clear and measurable
- Assign appropriate types based on the nature of each test case

Return ONLY the JSON object, no additional text or formatting.`

export function buildPrompt(request: GenerateRequest): string {
  const { storyTitle, acceptanceCriteria, description, additionalInfo } = request
  
  let userPrompt = `Generate comprehensive test cases for the following user story:

Story Title: ${storyTitle}

Acceptance Criteria:
${acceptanceCriteria}
`

  if (description) {
    userPrompt += `\nDescription:
${description}
`
  }

  if (additionalInfo) {
    userPrompt += `\nAdditional Information:
${additionalInfo}
`
  }

  userPrompt += `\nGenerate test cases covering:
1. Positive scenarios - Happy path validations
2. Negative scenarios - Error handling and invalid inputs
3. Edge cases - Boundary conditions and unusual inputs
4. Authorization/Security scenarios - Access control and data protection
5. Non-functional requirements - Performance and usability

For each test case, assign an appropriate type:
- Sanity: For core functionality verification
- Regression: For ensuring stability
- Performance: For speed and load testing
- Security: For authentication, authorization, and data protection

Return only the JSON response with properly categorized and typed test cases.`

  return userPrompt
}