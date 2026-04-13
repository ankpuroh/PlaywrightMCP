# The Internet Test Plan

## Application Overview

Application Under Test: https://the-internet.herokuapp.com/
Plan Date: 2026-04-09
Prepared By: playwright-test-planner agent

Observed during live exploration:
- Home page title is The Internet with headings Welcome to the-internet and Available Examples.
- Form Authentication uses username tomsmith and password SuperSecretPassword! for the positive path.
- Successful login lands on /secure with Secure Area heading and flash text beginning You logged into a secure area!.
- Invalid login remains on /login with flash text beginning Your username is invalid!.
- Add/Remove Elements exposes Add Element and dynamically inserted Delete buttons.
- Dropdown page heading is Dropdown List with options blank, Option 1, and Option 2.
- Checkboxes page initially renders checkbox 1 unchecked and checkbox 2 checked.
- Notification message page uses Click here and produced flash text Action successful during live run.
- Dynamic Controls emitted It's gone! after removing the checkbox and It's enabled! after enabling the text input.
- Dynamic Loading examples 1 and 2 both eventually render Hello World!.
- Key Presses reported You entered: A when the A key was pressed.
- Hovers revealed caption text name: user1 and link text View profile for the first avatar.

Planning notes:
- Tests should start from a fresh browser session.
- Each scenario is independent and can run in any order.
- JavaScript Alerts is intentionally omitted from this recreated plan because the planner interaction layer paused on a native modal during exploration; add it later once dialog-handling is wired into the execution path.
- The site logs browser-console errors on several pages during exploration; these did not prevent functional interaction and are not treated here as blocking application failures.

## Test Scenarios

### 1. Landing And Navigation

**Seed:** `seed.spec.ts`

#### 1.1. TI-HOME-01 Home Page Loads With Example Catalog

**File:** `tests/the-internet/ti-home-01.spec.ts`

**Steps:**
  1. Navigate to https://the-internet.herokuapp.com/
    - expect: The page title is The Internet
    - expect: The heading Welcome to the-internet is visible
    - expect: The heading Available Examples is visible
    - expect: The examples list is present
  2. Review the examples list on the landing page
    - expect: Links for Add/Remove Elements, Checkboxes, Dropdown, Dynamic Controls, Form Authentication, Hovers, Key Presses, and Notification Messages are visible

#### 1.2. TI-HOME-02 Navigate To Add Remove Elements And Back

**File:** `tests/the-internet/ti-home-02.spec.ts`

**Steps:**
  1. Open https://the-internet.herokuapp.com/
    - expect: The landing page is visible
  2. Click Add/Remove Elements from the examples list
    - expect: The Add/Remove Elements page opens
    - expect: The Add Element button is visible
  3. Use browser back navigation
    - expect: The landing page is shown again
    - expect: The Available Examples list is visible again

#### 1.3. TI-HOME-03 Navigate To Form Authentication From Landing Page

**File:** `tests/the-internet/ti-home-03.spec.ts`

**Steps:**
  1. Open https://the-internet.herokuapp.com/
    - expect: The landing page is visible
  2. Click Form Authentication from the examples list
    - expect: The login page opens at /login
    - expect: The Login Page heading is visible
    - expect: Username and password fields are visible

### 2. Form Authentication

**Seed:** `seed.spec.ts`

#### 2.1. TI-AUTH-01 Successful Login And Logout

**File:** `tests/the-internet/ti-auth-01.spec.ts`

**Steps:**
  1. Navigate directly to https://the-internet.herokuapp.com/login
    - expect: The Login Page heading is visible
    - expect: The username field is visible
    - expect: The password field is visible
    - expect: The Login button is visible
  2. Enter {{validUsername}} in the username field and {{validPassword}} in the password field
    - expect: The login form is populated
  3. Submit the login form
    - expect: The browser navigates to /secure
    - expect: The Secure Area heading is visible
    - expect: A flash message beginning You logged into a secure area! is visible
    - expect: A Logout control is visible
  4. Click Logout
    - expect: The browser returns to /login
    - expect: A logout success flash message is visible

#### 2.2. TI-AUTH-02 Invalid Credentials Show Error Flash

**File:** `tests/the-internet/ti-auth-02.spec.ts`

**Steps:**
  1. Navigate directly to https://the-internet.herokuapp.com/login
    - expect: The login page is visible
  2. Enter {{invalidUsername}} in the username field and {{invalidPassword}} in the password field
    - expect: The login form is populated with invalid credentials
  3. Submit the login form
    - expect: The browser remains on /login
    - expect: A flash message beginning Your username is invalid! is visible
    - expect: The secure area is not reached

### 3. Simple Controls

**Seed:** `seed.spec.ts`

#### 3.1. TI-CTRL-01 Add And Remove Dynamic Elements

**File:** `tests/the-internet/ti-ctrl-01.spec.ts`

**Steps:**
  1. Navigate directly to https://the-internet.herokuapp.com/add_remove_elements/
    - expect: The Add/Remove Elements heading is visible
    - expect: The Add Element button is visible
  2. Click Add Element twice
    - expect: Two Delete buttons are inserted into the page
  3. Click both Delete buttons
    - expect: The dynamically added Delete buttons are removed from the page

#### 3.2. TI-CTRL-02 Dropdown Selection Updates To Option 1 And Option 2

**File:** `tests/the-internet/ti-ctrl-02.spec.ts`

**Steps:**
  1. Navigate directly to https://the-internet.herokuapp.com/dropdown
    - expect: The Dropdown List heading is visible
    - expect: The dropdown contains Please select an option, Option 1, and Option 2
  2. Select Option 1
    - expect: Option 1 becomes the selected value
  3. Select Option 2
    - expect: Option 2 becomes the selected value

#### 3.3. TI-CTRL-03 Checkbox States Can Be Toggled

**File:** `tests/the-internet/ti-ctrl-03.spec.ts`

**Steps:**
  1. Navigate directly to https://the-internet.herokuapp.com/checkboxes
    - expect: The Checkboxes heading is visible
    - expect: Checkbox 1 starts unchecked
    - expect: Checkbox 2 starts checked
  2. Toggle checkbox 1
    - expect: Checkbox 1 changes to checked
  3. Toggle checkbox 2
    - expect: Checkbox 2 changes to unchecked

### 4. Dynamic Behaviors

**Seed:** `seed.spec.ts`

#### 4.1. TI-DYN-01 Dynamic Controls Remove Checkbox

**File:** `tests/the-internet/ti-dyn-01.spec.ts`

**Steps:**
  1. Navigate directly to https://the-internet.herokuapp.com/dynamic_controls
    - expect: The checkbox example is visible
    - expect: The Remove button is visible
  2. Click Remove
    - expect: A status message reading It's gone! appears
    - expect: The checkbox container is removed from the page

#### 4.2. TI-DYN-02 Dynamic Controls Enable Input

**File:** `tests/the-internet/ti-dyn-02.spec.ts`

**Steps:**
  1. Navigate directly to https://the-internet.herokuapp.com/dynamic_controls
    - expect: The input field is initially disabled
    - expect: The Enable button is visible
  2. Click Enable
    - expect: A status message reading It's enabled! appears
    - expect: The text input becomes enabled

#### 4.3. TI-DYN-03 Dynamic Loading Example 1 Completes

**File:** `tests/the-internet/ti-dyn-03.spec.ts`

**Steps:**
  1. Navigate directly to https://the-internet.herokuapp.com/dynamic_loading/1
    - expect: The Start button is visible
    - expect: The completion text is not yet shown
  2. Click Start and wait for the loading sequence to finish
    - expect: The finish area displays Hello World!

#### 4.4. TI-DYN-04 Dynamic Loading Example 2 Completes

**File:** `tests/the-internet/ti-dyn-04.spec.ts`

**Steps:**
  1. Navigate directly to https://the-internet.herokuapp.com/dynamic_loading/2
    - expect: The Start button is visible
    - expect: The completion text is not yet shown
  2. Click Start and wait for the loading sequence to finish
    - expect: The finish area displays Hello World!

### 5. Keyboard And Notifications

**Seed:** `seed.spec.ts`

#### 5.1. TI-KEY-01 Key Press Feedback Updates For Letter A

**File:** `tests/the-internet/ti-key-01.spec.ts`

**Steps:**
  1. Navigate directly to https://the-internet.herokuapp.com/key_presses
    - expect: The key capture input is visible
    - expect: The result area is visible
  2. Focus the key capture input and press the A key
    - expect: The result area updates to You entered: A

#### 5.2. TI-NOTIFY-01 Notification Flash Appears After Trigger

**File:** `tests/the-internet/ti-notify-01.spec.ts`

**Steps:**
  1. Navigate directly to https://the-internet.herokuapp.com/notification_message_rendered
    - expect: The Notification Message heading is visible
    - expect: A Click here trigger link is visible
  2. Click the Click here trigger link
    - expect: A flash message appears near the top of the page
    - expect: The message is one of the known rotating variants for this demo
    - expect: During live exploration one observed variant was Action successful

### 6. Hover Content

**Seed:** `seed.spec.ts`

#### 6.1. TI-HOVER-01 First Avatar Reveals Caption And Profile Link

**File:** `tests/the-internet/ti-hover-01.spec.ts`

**Steps:**
  1. Navigate directly to https://the-internet.herokuapp.com/hovers
    - expect: Three avatar figures are visible
  2. Hover over the first avatar
    - expect: The caption text name: user1 becomes visible
    - expect: A View profile link becomes visible
    - expect: The revealed profile link points to /users/1

#### 6.2. TI-HOVER-02 Each Avatar Reveals Its Own Hover Content

**File:** `tests/the-internet/ti-hover-02.spec.ts`

**Steps:**
  1. Navigate directly to https://the-internet.herokuapp.com/hovers
    - expect: Three avatar figures are visible
  2. Hover over each avatar one at a time
    - expect: Each hovered avatar reveals a user caption and a View profile link
    - expect: Only the active hover target shows its associated overlay content clearly enough for interaction
