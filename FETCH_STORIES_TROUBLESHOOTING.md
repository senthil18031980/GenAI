# Unable to Fetch User Stories - Diagnostic Guide

## Problem: "Failed to fetch stories from Jira" (after successful connection)

Your Jira authentication works, but the story fetch is failing. This guide will help diagnose why.

---

## Reasons Stories Might Not Load

### 1. **No Stories of Type "Story" Exist**
- Your Jira instance might use different issue types (Task, Epic, etc.)
- Check if you have any issues labeled as "Story" type

**To Check:**
1. Go to your Jira instance
2. Click **Filters** → **All Issues**
3. Look for issues with type = "Story"
4. If none exist, use a different type

### 2. **No Access to View Stories**
- Your user account might not have permission to view certain projects
- Check your Jira user permissions

**To Check:**
1. In Jira, go to **Project Settings** → **People**
2. Verify you're listed with access
3. Check your role has "Browse" permission

### 3. **Custom Field ID is Wrong**
- The system looks for `customfield_10000` for Acceptance Criteria
- Your Jira might use a different field ID

**To Find Your Custom Field ID:**
1. Go to Jira → **Project Settings** → **Custom Fields**
2. Find the "Acceptance Criteria" field
3. Note the ID (format: `customfield_XXXXX`)
4. Contact support if you need to update it

### 4. **Project Key Filter Issue**
- If you specified a project key, it might be wrong
- Or that project might have no stories

**To Check:**
1. In Jira, note your project key (e.g., PROJ, ACME, TEST)
2. Try loading stories WITHOUT specifying a project key first
3. If that works, the project key might be incorrect

### 5. **Network or Timeout Issue**
- The Jira API request might be timing out
- Or there's a network connectivity problem

**To Check:**
1. Check backend console for timeout errors
2. Verify you can manually query Jira at:
   `https://your-company.atlassian.net/rest/api/3/search/jql`
3. Check internet connectivity

---

## Diagnostic Steps

### Step 1: Check Backend Console Logs

When you click "Load Stories", the backend will output detailed logs:

```
--- Fetching Jira Stories ---
JQL Query: type = Story
Endpoint: /rest/api/3/search/jql
Response Status: 200
✓ API returned 0 issues
Total results available: 0
```

**What to look for:**
- `Response Status: 200` = API call successful
- `API returned X issues` = Number of stories found
- Any error messages starting with `✗`

### Step 2: Copy Error Message

**From Frontend:**
1. Open browser DevTools (F12 or right-click → Inspect)
2. Go to **Console** tab
3. Look for error messages starting with "Failed to fetch"
4. Copy the complete message

**From Backend:**
1. Look at the backend terminal where `npm run dev` is running
2. Find the most recent error message
3. Copy the complete message

### Step 3: Verify Jira Content

Test if your Jira instance actually has stories:

1. **Method 1: Jira Web UI**
   - Go to your Jira instance
   - Click **Filters** → **All Issues**
   - Search for: `type = Story`
   - Do you see any results?

2. **Method 2: API Test (in Browser)**
   - Go to: `https://your-company.atlassian.net/rest/api/3/search/jql`
   - When prompted, login with your email:apitoken
   - In browser address bar, add: `?jql=type=Story&maxResults=10`
   - Full URL: `https://your-company.atlassian.net/rest/api/3/search/jql?jql=type=Story&maxResults=10`
   - Do you see JSON with issues?

### Step 4: Try Different Issue Types

If you have no "Story" type issues, try fetching different types:

Ask your Jira admin what issue types are used in your instance:
- Story
- Task
- Epic
- Feature
- Bug
- etc.

The system can be adapted to use any issue type.

---

## Common Error Messages & Solutions

### "No issues found"
- **Cause**: Your Jira has no "Story" type issues
- **Solution**: 
  1. Create a test Story in Jira
  2. Or specify a different issue type
  3. Contact support if you need to change the type filter

### "Invalid JQL: Query text"
- **Cause**: The JQL query syntax is wrong
- **Solution**: Likely a project key issue
  - Try without specifying a project key
  - Verify project key is correct (e.g., PROJ not proj)

### "Error 403: Forbidden"
- **Cause**: Your user lacks permission to view issues
- **Solution**:
  1. Check you have "Browse" permission in the project
  2. Ask your Jira admin to grant you access

### "Error 404: Not Found"
- **Cause**: Jira instance URL is wrong
- **Solution**: 
  1. Verify Base URL is exactly correct
  2. Can you access the URL in a browser?

### "Timeout"
- **Cause**: Jira API is slow or network is slow
- **Solution**:
  1. Try again (might be temporary)
  2. Check internet connection
  3. Check if Jira instance is responsive

---

## Testing the Fix

Once you've identified the issue:

1. **If no stories exist:**
   - Create a test Story in Jira
   - Try "Load Stories" again

2. **If wrong custom field:**
   - Contact support with field ID
   - Will update the system

3. **If permission issue:**
   - Ask admin for access to project
   - Try again

4. **If project key wrong:**
   - Try with correct project key
   - Or leave project key blank

---

## Workaround: Manual Entry

If you can't get automatic story fetching to work:

1. Click "Clear Connection" to disconnect
2. Use the form manually:
   - **Story Title**: Type your story title
   - **Acceptance Criteria**: Paste your criteria
   - **Description**: Add any details
   - Click **Generate**

You can still generate test cases without Jira integration!

---

## Enabling Debug Mode

To see MAXIMUM diagnostic information:

1. Restart backend: `npm run dev` in `/backend` directory
2. Click "Connect Jira"
3. Click "Load Stories"
4. Watch the backend console output
5. You'll see:
   - Exact JQL query being sent
   - API response status
   - Number of issues found
   - Any error details

Copy this output and it will help diagnose the issue.

---

## Need More Help?

Provide:
1. ✅ Error message from frontend
2. ✅ Error message from backend console
3. ✅ Your Jira Base URL (without credentials)
4. ✅ Your project key (if you're using one)
5. ✅ Issue type you want to fetch (Story/Task/Epic/etc.)

And we can help fix the issue!
