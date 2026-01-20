# Jira 401 Unauthorized Error - Diagnostic Guide

## Error: "Jira authentication error: 401 Request failed with status code 401"

A **401 Unauthorized** error means your Jira credentials are invalid or incomplete.

---

## Quick Checklist

- [ ] **Email Address**: Is it exactly correct? (Case-sensitive)
- [ ] **API Token**: Did you copy the FULL token? (No extra spaces)
- [ ] **API Token**: Is it still valid? (Tokens can expire)
- [ ] **Base URL**: Is it exactly `https://your-company.atlassian.net`?
- [ ] **Jira Account**: Can you login to Jira with this email/password in a browser?

---

## Step-by-Step Verification

### 1. **Verify Your Email Address**

Make sure you're using the EXACT email address associated with your Jira account:

```
❌ WRONG: john.doe@company.com (if registered as john@company.com)
✅ CORRECT: john@company.com (exact match)
```

### 2. **Generate a New API Token**

Your API token may be expired or revoked. Generate a fresh one:

1. Go to: https://id.atlassian.com/manage-profile/security/api-tokens
2. Login with your Jira account
3. Click **Create API token**
4. Give it a name like "Test Generator"
5. **Copy the full token** (it won't be shown again!)
6. Paste into the app

### 3. **Verify Base URL Format**

Your Jira base URL must be EXACTLY:

```
https://your-company.atlassian.net
```

**Do NOT include:**
- `/` at the end
- `/secure`
- `/browse`
- `/issues`
- Any other path

**Examples:**
```
❌ WRONG: https://your-company.atlassian.net/
❌ WRONG: https://your-company.atlassian.net/secure
❌ WRONG: http://your-company.atlassian.net (http not https)
✅ CORRECT: https://your-company.atlassian.net
```

### 4. **Test in Browser**

Test your credentials directly in the browser to verify they work:

1. Go to: `https://your-company.atlassian.net/rest/api/3/myself`
2. When prompted, enter:
   - Username: `your-email@company.com`
   - Password: `your-api-token` (paste the full token)
3. If successful, you'll see JSON with your user details
4. If you get a 401 error, your credentials are invalid

---

## Troubleshooting Steps

### Issue: "Email not recognized"
- **Solution**: Verify the exact email used to register your Jira account
- Check: Is it `john.doe@...` or `john@...`?
- Verify with: https://id.atlassian.com/manage/profile

### Issue: "API Token is incorrect"
- **Solution**: Generate a new token
- **Why**: Tokens can expire after 90 days of inactivity
- **How**: https://id.atlassian.com/manage-profile/security/api-tokens
- Note: Old tokens are automatically shown as "Revoked"

### Issue: "Still getting 401 after fixing credentials"
- **Solution 1**: Clear browser cache and try again
- **Solution 2**: Try connecting in an incognito/private browser window
- **Solution 3**: Verify you can manually authenticate (see "Test in Browser" above)

### Issue: "Can't access Jira instance"
- **Solution**: Check if base URL is correct
- **Verify**: Can you open `https://your-company.atlassian.net` in a browser?
- **Check**: Does your network allow outbound HTTPS to Atlassian?

---

## Working Example

If your Jira setup is:
- Company: Acme Corp
- Jira Instance: acme.atlassian.net
- Your Email: alice@acme.com
- API Token: `ABCDEFGHIJKLMNOPQRSTUvwxyz1234567890ab` (from token manager)

Then enter:
```
Base URL:  https://acme.atlassian.net
Email ID:  alice@acme.com
API Key:   ABCDEFGHIJKLMNOPQRSTUvwxyz1234567890ab
```

---

## Still Getting 401?

1. **Check Backend Logs**:
   - Look at the backend console output
   - It will show diagnostic messages
   - Copy the exact error message

2. **Enable Debug Mode**:
   - Backend console will show:
     - Which URL it's connecting to
     - Auth header length (should be ~60+ characters)
     - Exact status codes

3. **Contact Jira Support**:
   - If credentials work in browser but not here
   - There may be API restrictions on your account

---

## Common Credentials Mistakes

```
❌ Using password instead of API token
❌ API token with extra spaces or newlines
❌ Email with capital letters (john@company.com vs John@company.com)
❌ Incomplete API token (token was cut off)
❌ Revoked or expired token
❌ Wrong Jira instance URL
```

---

## Success Indicators

Once authenticated successfully, you should see:
- ✅ "Successfully connected to Jira" message
- ✅ "Load Stories" button becomes active
- ✅ Can fetch and see user stories
- ✅ No 401 errors in backend logs

---

**Need more help?** Check the backend console logs - they now show detailed diagnostic information about what's being sent and received.
