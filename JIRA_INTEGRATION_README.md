# Jira Integration Troubleshooting - Complete Guide

This folder contains comprehensive guides for troubleshooting Jira integration issues.

## Files in This Directory

### 1. **JIRA_401_ERROR.md**
**When to use**: If you get a 401 Unauthorized error when connecting to Jira

**Covers:**
- Invalid email address
- Expired or revoked API token
- Incorrect Base URL format
- How to generate fresh API tokens
- Testing credentials in browser

### 2. **FETCH_STORIES_TROUBLESHOOTING.md**
**When to use**: If Jira connection works but "Load Stories" fails

**Covers:**
- No stories exist in Jira
- Permission issues
- Wrong custom field ID
- Network/timeout issues
- How to check what issue types you have
- Workaround: manual story entry

### 3. **JIRA_TROUBLESHOOTING.md** (Original)
**When to use**: General Jira integration issues

**Covers:**
- Invalid credentials
- Firewall/network issues
- Custom field migration guide
- Debugging checklist

---

## Quick Diagnosis Flow

**Step 1: Click "Connect Jira"**
- If you get 401 error → See `JIRA_401_ERROR.md`
- If you get different error → See `JIRA_TROUBLESHOOTING.md`

**Step 2: Click "Load Stories"**
- If it says "No stories found" → See `FETCH_STORIES_TROUBLESHOOTING.md`
- If connection fails → See `JIRA_401_ERROR.md`
- If you get a timeout → See `FETCH_STORIES_TROUBLESHOOTING.md`

---

## Common Solutions

### Problem: 401 Unauthorized
```
✗ Jira authentication error: 401 Request failed with status code 401
```
**Solution:** Check `JIRA_401_ERROR.md` - verify email and API token

### Problem: Stories Won't Load
```
Failed to fetch stories from Jira
```
**Solution:** Check `FETCH_STORIES_TROUBLESHOOTING.md` - verify story types exist

### Problem: Network Error
```
Connection timeout or ENOTFOUND
```
**Solution:** Check internet connection and firewall rules in `JIRA_TROUBLESHOOTING.md`

---

## Verification Checklist

- [ ] Can you login to Jira with your email in a browser?
- [ ] Have you generated a fresh API token from https://id.atlassian.com/manage-profile/security/api-tokens?
- [ ] Is your Base URL exactly `https://your-company.atlassian.net`?
- [ ] Does your Jira instance have any issues of type "Story"?
- [ ] Can you see those stories in Jira's web interface?
- [ ] Does your user account have permission to view stories?

---

## Backend Diagnostics

The backend now provides detailed logging when you attempt to:

**Connect to Jira:**
```
Creating Jira client for: https://your-company.atlassian.net
Authenticating with Jira at: https://your-company.atlassian.net
✓ Jira authentication successful
Authenticated user: John Doe
```

**Load Stories:**
```
--- Fetching Jira Stories ---
JQL Query: type = Story
Endpoint: /rest/api/3/search/jql
Response Status: 200
✓ API returned 5 issues
Total results available: 5
```

If you see errors, they're displayed like:
```
✗ Jira fetch stories error: No issues found
Reasons this might happen:
1. No issues of type "Story" in Jira
...
```

---

## Fallback Behavior

If no "Story" type issues are found:
- The system automatically tries searching for: Story, Task, Epic, Subtask
- This helps if your Jira uses different issue types

---

## Getting Help

When asking for help, provide:

1. **Error Message** (exact text)
2. **Backend Console Output** (copy the full error block)
3. **Your Setup**:
   - Jira Base URL: `https://...`
   - Project Key: (if applicable)
   - Issue Types You Use: Story/Task/Epic/etc.
4. **What You've Tried**: (which guides you've followed)

---

## Quick Links

- **Jira API Token**: https://id.atlassian.com/manage-profile/security/api-tokens
- **Atlassian Migration Guide**: https://developer.atlassian.com/changelog/#CHANGE-2046
- **JQL Syntax Help**: https://www.atlassian.com/software/jira/guides/expand-search/advanced-search

---

**Note**: These guides are automatically generated based on the latest implementation. Backend diagnostics are built-in to help identify issues quickly.
