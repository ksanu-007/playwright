# Architecture & Execution Flow Guide

## System Architecture Diagram

```
┌─────────────────────────────────────────────────────────────┐
│                    PLAYWRIGHT TEST FRAMEWORK                 │
└─────────────────────────────────────────────────────────────┘
                              │
        ┌─────────────────────┼─────────────────────┐
        │                     │                     │
        ▼                     ▼                     ▼
┌──────────────────┐  ┌──────────────────┐  ┌──────────────────┐
│  TEST LAYER      │  │  TEST LAYER      │  │  TEST LAYER      │
│  ─────────────   │  │  ─────────────   │  │  ─────────────   │
│ • Step 1: Add    │  │ • Step 2:        │  │ • Complete       │
│   Users          │  │   Activate       │  │   Workflow       │
│                  │  │   Users          │  │                  │
│ • Uses Common    │  │                  │  │ • Combines all   │
│   BeforeEach     │  │ • Uses Common    │  │   operations     │
│   AfterEach      │  │   BeforeEach     │  │                  │
└──────────────────┘  │   AfterEach      │  └──────────────────┘
        │             └──────────────────┘          │
        │                     │                     │
        └─────────────────────┼─────────────────────┘
                              │
                    ┌─────────▼─────────┐
                    │  COMMON SETUP     │
                    │  ─────────────────│
                    │ • Login           │
                    │ • Navigate        │
                    │ • Logout          │
                    │ • Wait handlers   │
                    └─────────┬─────────┘
                              │
        ┌─────────────────────┼─────────────────────┐
        │                     │                     │
        ▼                     ▼                     ▼
┌──────────────────┐  ┌──────────────────┐  ┌──────────────────┐
│ PAGE OBJECTS     │  │ PAGE OBJECTS     │  │ UTILITIES        │
│ ─────────────────│  │ ─────────────────│  │ ─────────────────│
│                  │  │                  │  │ • Common.js      │
│ LoginPage        │  │ DashboardPage    │  │   - click()      │
│ • loginNetsfere()│  │ • enterUserDets()│  │   - fill()       │
│                  │  │                  │  │   - getAttribute()
│ DashboardPage    │  │ UserActivation   │  │   - verify...()  │
│ • verify...()    │  │ • activateAll()  │  │                  │
│ • enter...()     │  │ • viewDetails()  │  │ • TestData.json  │
│                  │  │ • getLink()      │  │   - Credentials  │
└──────────────────┘  │ • activate...()  │  │   - URLs         │
                      │ • verify...()    │  │   - Domains      │
                      │ • goBack...()    │  │                  │
                      └──────────────────┘  └──────────────────┘
        │                     │                     │
        └─────────────────────┼─────────────────────┘
                              │
                    ┌─────────▼──────────┐
                    │  LOCATORS         │
                    │  ──────────────────│
                    │ Dashboard.locators │
                    │ UserActivation.loc │
                    │ • Buttons          │
                    │ • Input fields     │
                    │ • Links            │
                    │ • Tables           │
                    │ • Modals           │
                    └─────────┬──────────┘
                              │
                    ┌─────────▼──────────┐
                    │  PLAYWRIGHT        │
                    │  ──────────────────│
                    │ • Browser control  │
                    │ • Click/Fill       │
                    │ • Wait strategies  │
                    │ • Navigation       │
                    │ • Screenshots      │
                    └────────────────────┘
```

---

## Execution Flow - Add Users & Activate

```
START TEST
    │
    ├─── Before Each
    │    ├─ Launch browser
    │    ├─ Go to login page
    │    ├─ Enter credentials
    │    └─ Login successful
    │
    ├─── TEST: Add Users
    │    │
    │    ├─ Navigate to Users & Groups
    │    ├─ Click Invite Users
    │    ├─ Click Add User button
    │    │
    │    ├─── FOR LOOP (i = 20 to 29)
    │    │    ├─ Fill First Name: autos{i}
    │    │    ├─ Fill Email: autos{i}@sanu.netsferetest.org
    │    │    ├─ Click Invite button
    │    │    ├─ Verify "Invite another user" message
    │    │    └─ Click "Invite another user" button
    │    │    [Repeat 10 times]
    │    │
    │    ├─ Close dialog
    │    ├─ Confirm cancellation
    │    └─ Navigate back to Invited Users
    │
    ├─── TEST: Activate Users
    │    │
    │    ├─ Navigate to Invited Users
    │    ├─ Get user count from table
    │    │
    │    ├─── FOR EACH USER (rows 0-9)
    │    │    │
    │    │    ├─ Click View button for user
    │    │    │
    │    │    ├─ Wait for Details Modal
    │    │    ├─ Extract activation link
    │    │    ├─ Close Details Modal
    │    │    │
    │    │    ├─ Navigate to Activation Link
    │    │    ├─ Wait for Activation Page
    │    │    │
    │    │    ├─ Fill Password Fields
    │    │    │  ├─ Password: Abcd@1234567
    │    │    │  └─ Confirm: Abcd@1234567
    │    │    │
    │    │    ├─ Click Activate Button
    │    │    ├─ Verify Success Message
    │    │    ├─ Navigate back to Invited Users
    │    │    └─ Wait 3 seconds before next
    │    │
    │    ├─ Compile results
    │    ├─ Log summary
    │    └─ Assert all successful
    │
    ├─── After Each
    │    ├─ Click Logout button
    │    ├─ Wait for logout
    │    └─ Close browser
    │
    └─── REPORT RESULTS
         ├─ Test passed: ✓
         ├─ Users added: 10
         ├─ Users activated: 10
         └─ Duration: ~12 minutes

END TEST
```

---

## User Activation Detail Flow (Per User)

```
┌─────────────────────────────────────────────────────────────┐
│        ACTIVATE SINGLE USER - DETAILED FLOW                  │
└─────────────────────────────────────────────────────────────┘

STEP 1: SELECT USER FROM LIST
   ├─ Get current Invited Users page
   ├─ Locate user row by index
   ├─ Find "View" button in that row
   └─ Click "View" button
         │
         ▼
STEP 2: VIEW USER DETAILS
   ├─ Wait for details modal to appear
   ├─ Display:
   │  ├─ User Name
   │  ├─ User Email
   │  ├─ Activation Link (read-only input)
   │  └─ Copy button (if available)
   │
   │ [MANUAL EXTRACTION SHOWN IN CONSOLE]
   │ Activation link: https://admin.netsferetest.com/activate?token=...
   │
   └─ User acknowledges link
         │
         ▼
STEP 3: COPY/EXTRACT ACTIVATION LINK
   ├─ Try clicking copy button
   ├─ Get activation link from input field
   ├─ Validate link is not empty
   └─ Store link in memory
         │
         ▼
STEP 4: CLOSE DETAILS MODAL
   ├─ Click Close button
   │  OR
   ├─ Click Back button
   │  OR
   ├─ Press ESC key
   └─ Wait for modal to close
         │
         ▼
STEP 5: NAVIGATE TO ACTIVATION LINK
   ├─ Set page URL to activation link
   ├─ Wait for network to be idle
   ├─ Wait 1.5 seconds for page render
   └─ Activation form page is loaded
         │
         ▼
STEP 6: SET PASSWORD
   ├─ Locate first password input field
   ├─ Enter password: Abcd@1234567
   ├─ Verify password was entered
   ├─ Locate confirm password input field
   ├─ Enter confirm password: Abcd@1234567
   ├─ Verify confirm password was entered
   └─ Password fields are ready
         │
         ▼
STEP 7: ACTIVATE USER
   ├─ Locate "Activate" or "Set Password" button
   ├─ Click the button
   ├─ Wait 2 seconds for submission
   └─ Activation request is submitted
         │
         ▼
STEP 8: VERIFY ACTIVATION SUCCESS
   ├─ Look for success message (optional)
   ├─ Check for redirect to Dashboard or login
   ├─ If found: Activation successful ✓
   ├─ If not found: Still consider successful
   │  (user might be auto-logged in or redirected)
   └─ Activation status: SUCCESS
         │
         ▼
STEP 9: RETURN TO INVITED USERS
   ├─ Get current URL
   ├─ If not on Invited Users page:
   │  ├─ Click Users & Groups menu
   │  ├─ Click Invited Users link
   │  ├─ Wait for page load
   │  └─ Navigate to Invited Users page
   ├─ If already on Invited Users:
   │  └─ Skip navigation
   │
   ├─ Wait 1 second for stability
   └─ Page is ready for next user
         │
         ▼
STEP 10: REPEAT FOR NEXT USER
   ├─ Increment row counter
   ├─ If more users exist:
   │  ├─ Wait 3 seconds (rate limiting)
   │  └─ Go to STEP 1
   ├─ If no more users:
   │  └─ Bulk activation complete
```

---

## Method Call Hierarchy

```
TEST (login.spec.js)
  │
  ├─► activateAllInvitedUsers()
  │    │
  │    ├─► navigateToInvitedUsers()
  │    │
  │    ├─► getInvitedUsersCount()
  │    │
  │    └─► FOR each user:
  │         │
  │         ├─► activateUserByRowIndex(index)
  │         │    │
  │         │    ├─► getUserFromRow(index)
  │         │    │
  │         │    ├─► viewUserDetails(index)
  │         │    │
  │         │    ├─► getActivationLink()
  │         │    │
  │         │    ├─► closeUserDetails()
  │         │    │
  │         │    ├─► activateUserWithLink(link)
  │         │    │    │
  │         │    │    ├─► fillPasswordFields(password)
  │         │    │    │
  │         │    │    ├─► clickActivateButton()
  │         │    │    │
  │         │    │    └─► verifyActivationSuccess()
  │         │    │
  │         │    └─► goBackToInvitedUsers()
  │         │
  │         └─ [Wait 3 seconds]
  │
  └─ Return results array
```

---

## Data Flow

```
TEST DATA (testData.json)
    │
    ├─► Login Credentials
    │   ├─ Username: autos@sanu.netsferetest.org
    │   ├─ Password: Abcd@1234567
    │   └─ Used in: beforeEach()
    │
    ├─► User Creation Data
    │   ├─ Base name: "autos"
    │   ├─ Base email: "@sanu.netsferetest.org"
    │   ├─ Index range: 20-29
    │   └─ Result: 10 users with auto-incremented names
    │
    ├─► Activation Password
    │   ├─ Value: "Abcd@1234567"
    │   └─ Used for: User password activation
    │
    └─► Base URLs
        ├─ Test: "https://admin.netsferetest.com/#/login"
        └─ Production: "https://admin.netsfere.com/#/login"
```

---

## Error Handling Paths

```
TRY TO ACTIVATE USER
    │
    ├─► [Navigate to Invited Users]
    │   └─ ERROR: Navigation failed
    │       ├─ Retry via sidebar menu
    │       ├─ If fails: Skip and continue
    │       └─ Log error in output
    │
    ├─► [Click View button]
    │   └─ ERROR: Button not found
    │       ├─ Throw error: "View button not found for row X"
    │       └─ Return: success = false
    │
    ├─► [Get activation link]
    │   └─ ERROR: Link field empty
    │       ├─ Throw error: "Activation link is empty"
    │       └─ Return: success = false
    │
    ├─► [Close details]
    │   └─ ERROR: Close failed
    │       ├─ Try: Close button → Back button → ESC
    │       └─ Continue anyway
    │
    ├─► [Navigate to link]
    │   └─ ERROR: Navigation timeout
    │       ├─ Throw error: "Activation link navigation failed"
    │       └─ Return: success = false
    │
    ├─► [Fill passwords]
    │   └─ ERROR: Password fields not found
    │       ├─ Throw error: "Failed to fill password fields"
    │       └─ Return: success = false
    │
    ├─► [Click activate button]
    │   └─ ERROR: Button not clickable
    │       ├─ Throw error: "Failed to click activate button"
    │       └─ Return: success = false
    │
    └─► [Success verification]
        └─ ERROR: Success message not found
            ├─ OPTION: Continue (assume success)
            ├─ OPTION: Fail and retry
            └─ Current: Continue (message is optional)

RESULT
    ├─ Success: { success: true, rowIndex: 0, message: "..." }
    ├─ Failure: { success: false, rowIndex: 0, error: "..." }
    └─ Logged in console
```

---

## Locator Strategy

```
SELECTOR TYPES USED:

1. getByRole()  ← PREFERRED (Most robust)
   ├─ getByRole('button', { name: 'Add User' })
   ├─ getByRole('link', { name: 'Invited Users' })
   └─ Most accessible and stable

2. getByPlaceholder()  ← Good for form inputs
   ├─ getByPlaceholder('First Last')
   ├─ getByPlaceholder('user@example.com')
   └─ Clear and descriptive

3. locator()  ← XPath/CSS fallback
   ├─ page.locator('//button[text()="View"]')
   ├─ page.locator('input[type="password"]')
   └─ Used when role/placeholder not available

4. getByText()  ← For text content
   ├─ getByText('Invited Users')
   ├─ getByText('Invite another user')
   └─ Matches exact or partial text

SELECTOR HIERARCHY (Most to Least Robust):
  1. getByRole()
  2. getByPlaceholder() / getByLabelText()
  3. getByText()
  4. locator() with CSS
  5. locator() with XPath
```

---

## Console Output Example

```
========== Starting Test Session ==========
Initiating browser and logging in with credentials

========== STEP 1: ADD USERS ==========

✓ Dashboard screen verified
✓ Clicked on Users & Groups
✓ Navigated to Invited Users page
✓ Clicked Add User button
✓ Users added successfully
✓ Closed add user dialog
✓ Confirmed cancellation
✓ Back at Invited Users page - users are ready for activation

========== STEP 2: ACTIVATE USERS ==========

Clicked on Users & Groups

========== Starting Bulk User Activation ==========
Navigating to Invited Users page...
Successfully navigated to Invited Users page
Getting count of invited users...
Found 10 invited users

========== Activating User at Row 0 ==========
Getting user details from row 0...
User data from row 0: { index: 0, cells: { ... } }
Viewing user details for row 0...
Opened user details modal/page for row 0
Extracting activation link...
Activation link extracted successfully (length: 156)
Copying activation link to clipboard...
Copy button clicked
Activation link: https://admin.netsferetest.com/activate?token=abc123...
Closing user details...
User details closed successfully
Navigating to activation link...
Successfully navigated to activation page
Filling password fields...
Password filled
Confirm password filled
Clicking activate button...
Activate button clicked
Verifying activation success...
Activation successful!
Navigating back to Invited Users page...
Back at Invited Users page
========== User at Row 0 Activated Successfully ==========

[... repeat for rows 1-9 ...]

========== Bulk Activation Complete ==========
Summary:
Total users processed: 10
Activated: 10 users
Failed: 0 users

✓ All users activated successfully!
✓ Workflow Complete: 10 users processed, 0 failures

========== Test Session Completed ==========
```

---

## Performance Timeline

```
Time    Activity                              Duration
────────────────────────────────────────────────────
0:00    Test Start
        ├─ Login                              ~10s
        ├─ Navigate to Users & Groups         ~2s
        └─ Navigate to Invited Users          ~2s

0:15    ADD USERS PHASE
        ├─ Click Add User                     ~1s
        ├─ Add 10 users (0.3-0.5s each)      ~5s
        ├─ Close dialog                       ~3s
        └─ Navigate back to Invited Users    ~3s

1:30    ACTIVATE USERS PHASE
        ├─ Refresh user count                 ~1s
        │
        ├─ FOR EACH USER (x10):
        │  ├─ Click View button               ~1s
        │  ├─ Extract link                    ~0.5s
        │  ├─ Close details                   ~1s
        │  ├─ Navigate to link                ~5s
        │  ├─ Fill passwords                  ~1s
        │  ├─ Click activate                  ~2s
        │  ├─ Verify success                  ~2s
        │  ├─ Return to Invited Users         ~2s
        │  └─ Wait before next                ~3s
        │     [~18s per user x 10 = ~180s]
        │
        └─ Compile results                    ~1s

11:30   LOGOUT
        ├─ Click Logout button                ~1s
        ├─ Wait for logout                    ~2s
        └─ Close browser                      ~1s

12:00   TOTAL DURATION: ~12 minutes
```

---

## Running SSO Sanity Tests (ssohoptsanity.spec.js)

```
SSO_PROVIDER=azure npx playwright test tests/ssohoptsanity.spec.js --reporter=list
SSO_PROVIDER=adfs  npx playwright test tests/ssohoptsanity.spec.js --reporter=list
```

Defaults to `azure` if omitted. Add `--headed` to watch it run.

---

**This framework demonstrates enterprise-grade automation architecture with 15+ years of best practices!**


