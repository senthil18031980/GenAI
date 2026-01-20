# Jira Integration Troubleshooting Guide

## Error: "Failed to fetch stories from Jira"

This error typically indicates one of the following issues:

### 1. **Invalid Jira Credentials**

**Check:**
- Is your Jira email ID correct?
- Is your API Key correct and still valid?
- Are you connecting to the correct Jira instance?

**Solution:**
1. Go to https://id.atlassian.com/manage-profile/security/api-tokens
2. Create a new API token if yours has expired
3. Copy the exact email and API token
4. Ensure Base URL matches your Jira instance (e.g., `https://your-company.atlassian.net`)

### 2. **Invalid Base URL Format**

**Check:**
- Base URL must start with `https://` (not `http://`)
- Base URL should NOT have `/browse`, `/issues`, etc.
- Format: `https://your-company.atlassian.net`

**Invalid Examples:**
- `https://your-company.atlassian.net/` (trailing slash is OK but not required)
- `https://your-company.atlassian.net/secure` (extra path)
- `http://your-company.atlassian.net` (http instead of https)

### 3. **Jira API Permissions**

**Check:**
- Verify your API token has permission to read issues
- Ensure you have access to the project containing stories

**Solution:**
1. Login to Jira with your account
2. Try to view issues directly in the UI
3. If you can't see them, your account lacks permissions

### 4. **Custom Field Issues**

The system uses a default custom field ID `customfield_10000` for "Acceptance Criteria".

**Check:**
- Does your Jira instance have a custom field for Acceptance Criteria?
- What is the exact field ID?

**To find your field ID:**
1. Go to Project Settings → Custom Fields
2. Look for "Acceptance Criteria" field
3. The ID will be like `customfield_XXXXX`

**If field ID is different:**
- Edit `backend/src/services/jiraService.ts`
- Replace `customfield_10000` with your field ID (appears 3 times)
- Rebuild: `npm run build`

### 5. **Testing Your Connection**

**Step 1: Check Backend Logs**
- Run: `npm run dev` in the backend directory
- Look for console output when you click "Load Stories"
- Check for specific error messages

**Step 2: Manual Test**
1. Edit `backend/test-jira.ts` with your credentials
2. Run: `npx tsx test-jira.ts`
3. Check output for detailed error information

### 6. **Network/Firewall Issues**

**Check:**
- Can your network reach `*.atlassian.net`?
- Is there a corporate firewall blocking the connection?
- Try accessing `https://your-company.atlassian.net/rest/api/3/myself` in browser

**Solution:**
- Contact your IT team to allow outbound HTTPS to Atlassian
- Or use VPN if required

---

## Common Error Messages & Solutions

### "Failed to authenticate with Jira"
- **Cause:** Invalid email or API key
- **Solution:** Verify credentials at https://id.atlassian.com/manage-profile/security/api-tokens

### "invalid request"
- **Cause:** Malformed Jira instance URL
- **Solution:** Check Base URL format (must be `https://instance.atlassian.net`)

### "no stories found" or empty list
- **Cause:** No stories in your Jira instance, or issue with project filter
- **Solution:** 
  1. Check if you have stories in your Jira project
  2. Try without specifying a project key

### "CORS error" or "network error"
- **Cause:** Network connectivity issue
- **Solution:**
  1. Check internet connection
  2. Verify Jira instance is accessible
  3. Check firewall rules

---

## Debugging Checklist

- [ ] Base URL format is correct (https://instance.atlassian.net)
- [ ] Email ID matches your Jira account
- [ ] API token is current and not expired
- [ ] You can login to Jira with these credentials
- [ ] You have permission to view issues
- [ ] Backend is running (`npm run dev`)
- [ ] Frontend is connected to correct backend
- [ ] Check browser console for detailed errors
- [ ] Check backend logs for error details

---

## Getting Help

If the error persists:
1. Check the backend console logs when you click "Load Stories"
2. The error message will indicate the specific problem
3. Verify your Jira credentials and permissions
4. Ensure Base URL is exactly correct

**Example working configuration:**
```
Base URL: https://acme.atlassian.net
Email: john.doe@acme.com
API Key: (from https://id.atlassian.com/manage-profile/security/api-tokens)
```
