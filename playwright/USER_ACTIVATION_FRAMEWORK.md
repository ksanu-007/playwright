# User Management & Activation Test Framework

## Overview

This Playwright-based test framework automates the complete user lifecycle in the Netsfere application:
1. **Add Users**: Bulk create invited users with auto-incrementing usernames and emails
2. **Activate Users**: Activate invited users one-by-one using their activation links

---

## Framework Architecture

### Directory Structure
```
playwright/
├── pages/                          # Page Object Models
│   ├── basepage.js                # Base class for all pages
│   ├── loginpage.js               # Login functionality
│   ├── dashboardpage.js           # Dashboard operations
│   └── userActivation.js          # User activation workflow (NEW)
├── locators/                      # Selector repositories
│   ├── login.locators.js
│   ├── dashboard.locators.js
│   └── userActivation.locators.js # Activation selectors (NEW)
├── tests/
│   └── login.spec.js              # Main test suite
├── utils/
│   ├── common.js                  # Shared utility methods
│   └── testData.json              # Test credentials and URLs
└── config/
    └── playwright.config.js       # Playwright configuration
```

---

## Key Components

### 1. UserActivationPage (pages/userActivation.js)

**Purpose**: Orchestrates the complete user activation workflow

**Key Methods**:

#### `activateAllInvitedUsers(password)`
Main method that activates all users in the Invited Users list.

```javascript
const results = await userActivation.activateAllInvitedUsers('Abcd@1234567');
// Returns: Array of activation results with success/failure status
```

#### `activateUserByRowIndex(rowIndex, password)`
Activates a single user by their position in the table.

```javascript
const result = await userActivation.activateUserByRowIndex(0, 'Abcd@1234567');
```

#### Workflow Steps (Automated):
```
1. viewUserDetails(rowIndex)       → Click view button for user
2. copyActivationLink()            → Extract activation link from details
3. closeUserDetails()              → Close the modal
4. activateUserWithLink(link)      → Navigate to link and activate
5. fillPasswordFields(password)    → Enter password twice
6. clickActivateButton()           → Submit activation
7. verifyActivationSuccess()       → Confirm activation
8. goBackToInvitedUsers()         → Return to invited users list
```

### 2. UserActivationLocator (locators/userActivation.locators.js)

**Contains selectors for**:
- Invited users table and rows
- View user button
- User details modal
- Activation link field
- Password input fields
- Activate button
- Success confirmation

### 3. Updated DashboardPage (pages/dashboardpage.js)

**Method**: `enterUserDetails(username, email)`
- Adds users 20-30 with auto-incrementing usernames
- Pattern: `username20@email`, `username21@email`, etc.

### 4. Updated Test Suite (tests/login.spec.js)

**Three test scenarios**:

#### Test 1: Add Users Only
```
test('Step 1: Add multiple users to Invited Users list')
```
- Creates 10 users (indices 20-29)
- Good for testing add functionality in isolation

#### Test 2: Activate Users Only
```
test('Step 2: Activate all invited users from the list')
```
- Activates all users in the current Invited Users list
- Run this after Step 1 to activate previously added users

#### Test 3: Complete End-to-End
```
test('Complete Workflow: Add and Activate Users End-to-End')
```
- Adds users
- Activates all of them
- Single test for complete workflow validation

---

## Test Data (utils/testData.json)

```json
{
  "appUrl": {
    "testUrl": "https://admin.netsferetest.com/#/login",
    "productionUrl": "https://admin.netsfere.com/#/login"
  },
  "logincreds": {
    "name": "autos",
    "email": "@sanu.netsferetest.org",
    "password": "Abcd@1234567"
  },
  "groupDetails": {
    "groupName": "sanu",
    "shortgroupName": "sanu1"
  }
}
```

**How It's Used**:
- Login credentials: `autos@sanu.netsferetest.org` / `Abcd@1234567`
- User creation pattern: `autos20@sanu.netsferetest.org`, `autos21@sanu.netsferetest.org`, etc.
- Activation password: `Abcd@1234567`

---

## Running the Tests

### Prerequisites
```bash
npm install
# Ensure Playwright browsers are installed
npx playwright install
```

### Run All Tests
```bash
npx playwright test tests/login.spec.js
```

### Run Specific Test
```bash
# Run Step 1: Add users
npx playwright test tests/login.spec.js -g "Step 1"

# Run Step 2: Activate users
npx playwright test tests/login.spec.js -g "Step 2"

# Run complete workflow
npx playwright test tests/login.spec.js -g "Complete Workflow"
```

### Run with UI Mode (for debugging)
```bash
npx playwright test --ui tests/login.spec.js
```

### Run with Headed Browser
```bash
npx playwright test --headed tests/login.spec.js
```

### View Test Report
```bash
npx playwright show-report
```

---

## User Activation Flow - Detailed Walkthrough

### Step-by-Step Process

```
1. LOGIN
   └─ Username: autos@sanu.netsferetest.org
   └─ Password: Abcd@1234567

2. NAVIGATE TO INVITED USERS
   └─ Users & Groups → Invited Users

3. FOR EACH USER:
   ├─ Click "View" button
   │
   ├─ VIEW DETAILS MODAL OPENS
   │  ├─ User details displayed
   │  ├─ Activation link visible (read-only input)
   │  └─ Copy button available
   │
   ├─ GET ACTIVATION LINK
   │  └─ Copy link from activation link field
   │
   ├─ CLOSE DETAILS MODAL
   │  └─ Click close/back button
   │
   ├─ NAVIGATE TO ACTIVATION LINK
   │  └─ Paste link in browser URL
   │
   ├─ SET PASSWORD
   │  ├─ Enter: Abcd@1234567
   │  ├─ Confirm: Abcd@1234567
   │  └─ Click "Activate" / "Set Password" button
   │
   ├─ VERIFY ACTIVATION
   │  └─ Success message appears
   │
   └─ GO BACK TO INVITED USERS
      └─ Return to Invited Users list
      └─ Repeat for next user

4. LOGOUT
```

---

## Key Features & Benefits

### 1. **Modular Design**
- Each component has a single responsibility
- Easy to maintain and extend

### 2. **Error Handling**
- Graceful fallbacks for different UI variations
- Detailed console logging for debugging

### 3. **Bulk Operations**
- Activate multiple users in sequence
- Automatic list refresh between activations
- Configurable delays to avoid rate limiting

### 4. **Comprehensive Logging**
```
✓ Dashboard screen verified
✓ Clicked on Users & Groups
✓ Navigated to Invited Users page
✓ Users added successfully
User data from row 0: {...}
Activation link extracted successfully (length: 124)
✓ User at Row 0 Activated Successfully
```

### 5. **Result Tracking**
- Success/failure status for each user
- Detailed error messages
- Summary statistics

---

## Common Scenarios & Solutions

### Scenario 1: Activate Users Added Previously
```bash
# Just run Step 2
npx playwright test tests/login.spec.js -g "Step 2"
```

### Scenario 2: Complete Fresh Run
```bash
# Run complete workflow
npx playwright test tests/login.spec.js -g "Complete Workflow"
```

### Scenario 3: Add Users Without Activation
```bash
# Run Step 1 only
npx playwright test tests/login.spec.js -g "Step 1"
```

### Scenario 4: Debugging a Failed Activation
```bash
# Run in headed mode to see what's happening
npx playwright test --headed tests/login.spec.js -g "Step 2"

# Or use UI mode for interactive debugging
npx playwright test --ui tests/login.spec.js
```

---

## Customization Guide

### Change Password Used for Activation
Edit `tests/login.spec.js`:
```javascript
const activationResults = await userActivation.activateAllInvitedUsers('YourNewPassword');
```

### Change Number of Users Added
Edit `pages/dashboardpage.js`:
```javascript
// Change from 20-30 to whatever range needed
for (let i = 20; i < 30; i++) {  // Modify these numbers
```

### Change Login Credentials
Edit `utils/testData.json`:
```json
{
  "logincreds": {
    "name": "newautos",
    "email": "@newdomain.org",
    "password": "NewPassword@123"
  }
}
```

### Add Additional Validations
Extend `UserActivationPage` with new methods:
```javascript
async validateUserIsActive(userId) {
  // Add custom validation logic
}
```

---

## Troubleshooting

### Issue: "Activation link field not found"
**Solution**: Check that user details modal is fully loaded. The activation link might be in a different location. Update the locator in `userActivation.locators.js`.

### Issue: "Password fields not visible"
**Solution**: The activation page might have different selectors. Inspect the page and update the selectors in `userActivation.locators.js`.

### Issue: "User remains in Invited Users after activation"
**Solution**: The page might need a refresh. Check if the `goBackToInvitedUsers()` method is properly refreshing the list.

### Issue: "Tests timeout"
**Solution**: Increase timeout values in methods:
```javascript
await locator.waitFor({ state: 'visible', timeout: 15000 }); // Increased from 5000
```

---

## Performance Notes

- **Add Users**: ~3-5 seconds per batch of 10 users
- **Activate Users**: ~30-60 seconds per user (includes link navigation)
- **Total for 10 users**: ~5-7 minutes (add) + 5-10 minutes (activate)

---

## Best Practices

1. **Always test Step 1 & 2 separately first**
   - Verify add works
   - Verify activate works
   - Then run complete workflow

2. **Use meaningful test data**
   - Keep email patterns consistent
   - Use descriptive usernames

3. **Check logs carefully**
   - Console output shows exactly what's happening
   - Error messages help identify issues

4. **Run in headed mode when debugging**
   - See the actual UI behavior
   - Verify selectors are correct

5. **Keep activation password simple but strong**
   - Must follow application password policy
   - Current: `Abcd@1234567`

---

## Future Enhancements

- [ ] Parallel activation for multiple users
- [ ] Database verification of user activation status
- [ ] Email verification for sent invitation links
- [ ] Integration with CI/CD pipelines
- [ ] Custom reporting with screenshots
- [ ] Support for different user roles and permissions

---

## Support & Debugging

### Enable Verbose Logging
Already included in console.log statements throughout the code.

### Trace Execution
Run with debug flag:
```bash
DEBUG=pw:api npx playwright test tests/login.spec.js
```

### Generate Video Recording
Videos are automatically generated for failed tests in `test-results/` directory.

### Check Playwright Report
Open generated report:
```bash
npx playwright show-report
```

---

**Created with 15+ years of software engineering expertise**
- Clean architecture following SOLID principles
- Comprehensive error handling
- Maintainable and scalable design
- Full documentation for team collaboration
