# User Stories Not Appearing in Dropdown - Diagnostic Guide

## Problem: "Load Stories" button works but dropdown doesn't show stories

Even though the backend confirms fetching 25 stories, they don't appear in the frontend dropdown.

---

## Diagnostic Steps

### Step 1: Check Browser Console for Errors

1. **Open Browser DevTools** (F12 or Ctrl+Shift+I)
2. **Go to Console tab**
3. **Click "Load Stories" button**
4. **Look for console output**

**Expected output:**
```
Starting story load...
Calling getJiraStories with config: {baseUrl: "...", emailId: "...", apiKey: "..."}
API Response: {success: true, stories: Array(25), count: 25}
Response success: true
Response stories count: 25
Formatted stories: Array(25) [...]
Setting userStories with 25 items
```

**If you see errors**, copy them and check the relevant section below.

### Step 2: Check Network Tab

1. **Open DevTools** (F12)
2. **Go to Network tab**
3. **Click "Load Stories"**
4. **Look for request** to `/api/generate-tests/jira/stories`
5. **Check the Response**

**Expected:**
- Status: `200`
- Response includes: `"success": true, "stories": [...], "count": 25`

**If response shows error:**
- Check the error message in the response
- Compare with backend logs

### Step 3: Check Browser's Network Request Headers

In the Network tab, click on the `/jira/stories` request:

**Should see:**
- Method: `POST`
- URL: `/api/generate-tests/jira/stories`
- Request Body contains your Jira credentials
- Response includes the 25 stories

---

## Common Issues & Solutions

### Issue 1: API Returns 200 But Success is False
```
Response: {success: false, error: "..."}
```
**Cause**: Backend returned an error
**Solution**: 
- Check the error message in the response
- Look at backend console for details
- Verify Jira connection is still valid

### Issue 2: Stories Array is Empty
```
Response: {success: true, stories: [], count: 0}
```
**Cause**: Backend successfully called Jira but got no stories
**Solution**:
- Verify Jira has Story-type issues (see `FETCH_STORIES_TROUBLESHOOTING.md`)
- Check if all stories are in a different project
- Verify you have permission to view the stories

### Issue 3: API Call Never Returns
- Stories are fetched, but response never comes to frontend
- "Loading..." button keeps showing

**Cause**: Network timeout or very slow response
**Solution**:
- Check backend logs to see if stories were found
- Check internet connection
- Try again

### Issue 4: Network Error / CORS Error
```
CORS error: Access-Control-Allow-Origin
```
**Cause**: Frontend and backend API configuration mismatch
**Solution**:
- Verify backend is running
- Check API_BASE_URL in `frontend/src/api.ts`
- Should be: `http://localhost:8081/api`
- If backend is on different port, update the URL

### Issue 5: 404 Not Found
```
404: /api/generate-tests/jira/stories
```
**Cause**: Backend route is not registered
**Solution**:
- Restart backend: `npm run dev` in `/backend`
- Verify you're running the updated backend

---

## Verification Checklist

- [ ] Backend is running (`npm run dev` in `/backend`)
- [ ] Backend console shows successful story fetch (25 issues)
- [ ] Frontend is running (`npm run dev` in `/frontend`)
- [ ] Connected to Jira successfully
- [ ] No errors in browser console
- [ ] Network request shows 200 status
- [ ] API response includes stories array

---

## Manual Testing

### Test 1: Check if API Works Directly

In browser DevTools Console, run:
```javascript
fetch('http://localhost:8081/api/generate-tests/jira/stories', {
  method: 'POST',
  headers: {'Content-Type': 'application/json'},
  body: JSON.stringify({
    baseUrl: 'https://your-jira.atlassian.net',
    emailId: 'your-email@company.com',
    apiKey: 'your-api-token'
  })
})
.then(r => r.json())
.then(d => console.log(d))
```

**Expected output:**
```
{success: true, stories: Array(25), count: 25}
```

**If error**, the API endpoint has an issue.

### Test 2: Check Frontend State

The frontend now logs to console. Check:
1. Click "Load Stories"
2. Watch console output for "Formatted stories: Array(X)"
3. If you see `Array(0)`, no stories are being formatted
4. If you see `Array(25)`, stories are formatted but not displaying

---

## If Dropdown Still Doesn't Show

Even if stories are loaded (check console), they might not display if:

1. **CSS is hiding the dropdown**
   - Check `.stories-list` CSS in App.tsx
   - Should have `display: block` or similar

2. **Stories array is being reset**
   - Something might be clearing `userStories` state
   - Check for other `setUserStories` calls

3. **Condition for showing dropdown is wrong**
   - Currently: Shows only if `userStories.length > 0`
   - Check around line 1115 in App.tsx

---

## Getting More Detailed Output

The frontend now includes extensive console logging. When you click "Load Stories":

**You should see in console:**
```
Starting story load...
Calling getJiraStories with config: {baseUrl: "...", emailId: "...", apiKey: "..."}
API Response: {...}
Response success: true
Response stories count: 25
Formatted stories: Array(25) [
  {id: "PROJ-1", key: "PROJ-1", title: "...", description: "...", ...},
  {id: "PROJ-2", key: "PROJ-2", title: "...", description: "...", ...},
  ...
]
Setting userStories with 25 items
```

**If you don't see this exact flow**, identify where it stops and we can debug from there.

---

## Quick Fixes to Try

1. **Hard Refresh Browser**
   - Ctrl+Shift+R (Windows/Linux) or Cmd+Shift+R (Mac)

2. **Restart Frontend**
   - Stop: Ctrl+C in frontend terminal
   - Start: `npm run dev`
   - Refresh browser

3. **Check Backend is Actually Running**
   - Look at backend terminal
   - Should show multiple status lines
   - If nothing, restart: `npm run dev` in `/backend`

4. **Clear Browser Cache**
   - DevTools → Application → Clear Storage → Clear all

---

## Need Help?

When reporting the issue, provide:

1. ✅ Console output from browser (after clicking Load Stories)
2. ✅ Network tab response from `/jira/stories` request
3. ✅ Backend console output (full error message)
4. ✅ Screenshot of the page (showing "Load Stories" button)
5. ✅ Whether Jira connection shows as successful

This will help identify exactly where the issue is!
