# BMO Digital Banking Web Test Plan

## Application Overview

Comprehensive functional test plan for BMO Digital Banking public entry flows, focusing on login, credential recovery, enrollment entry, global support navigation, and persistent footer links. All scenarios assume a fresh session and blank browser state.

## Test Scenarios

### 1. Login Experience

**Seed:** `seed.spec.ts`

#### 1.1. Login page loads with required controls

**File:** `tests/plans/login-page-load.spec.ts`

**Steps:**
  1. Open the seeded application URL in a fresh browser session.
    - expect: Sign-in page is displayed with title indicating BMO Digital Banking login.
    - expect: User ID and Password fields are visible.
    - expect: Sign In button, Remember me checkbox, FORGOT USER ID?, FORGOT PASSWORD?, and Register links are visible.
  2. Review header and assist links on the same page.
    - expect: Top navigation includes Login and Contact & support.
    - expect: BMO Assist, Contact us, and ATM & Branch quick links are present.

#### 1.2. Blank sign-in submission shows validation

**File:** `tests/plans/login-empty-submit-validation.spec.ts`

**Steps:**
  1. From fresh login page with no input, click Sign In.
    - expect: A page-level error banner appears indicating missing required fields.
    - expect: User ID required validation message appears.
    - expect: Password required validation message appears.
    - expect: User remains on login page and sign-in is not submitted.

#### 1.3. Password visibility toggle behavior

**File:** `tests/plans/login-password-visibility.spec.ts`

**Steps:**
  1. Enter a sample password value in Password field.
    - expect: Password input masks characters by default.
  2. Click Show Password toggle.
    - expect: Password becomes visible in plain text.
    - expect: Toggle control state changes to indicate visibility mode.
  3. Toggle again to hide password.
    - expect: Password is masked again.
    - expect: No field data is lost while toggling.

#### 1.4. Remember me option persists selection within current page state

**File:** `tests/plans/login-remember-me.spec.ts`

**Steps:**
  1. Click Remember me checkbox once.
    - expect: Checkbox becomes selected.
  2. Click Remember me checkbox again.
    - expect: Checkbox becomes unselected.
    - expect: No unexpected validation or navigation occurs.

### 2. Credential Recovery

**Seed:** `seed.spec.ts`

#### 2.1. Forgot User ID page structure and required fields

**File:** `tests/plans/forgot-user-id-structure.spec.ts`

**Steps:**
  1. From login page, click FORGOT USER ID?.
    - expect: Forgot User ID page opens.
    - expect: Form includes Account type selector, Account number field, SSN/TIN radio choices, and Continue/Cancel actions.
    - expect: Verify another way link is visible in help section.

#### 2.2. Forgot User ID empty submission validation

**File:** `tests/plans/forgot-user-id-empty-validation.spec.ts`

**Steps:**
  1. On Forgot User ID page, leave all fields blank and click Continue.
    - expect: Page-level validation banner appears.
    - expect: Account type required message appears.
    - expect: Account number validation message appears.
    - expect: SSN validation message appears with expected format guidance.
    - expect: User remains on page.

#### 2.3. Verify another way path validation

**File:** `tests/plans/forgot-user-id-verify-another-way.spec.ts`

**Steps:**
  1. On Forgot User ID page, click Verify another way.
    - expect: Alternate Forgot User ID form opens requiring Email and SSN/TIN details.
    - expect: Back-to-previous-page control is present.
  2. Without entering data, click Continue.
    - expect: Page-level validation banner appears.
    - expect: Email required/format validation message appears.
    - expect: SSN validation message appears.
    - expect: No progression to next step occurs.

#### 2.4. Forgot Password page structure and cancel navigation

**File:** `tests/plans/forgot-password-structure-cancel.spec.ts`

**Steps:**
  1. From login page, click FORGOT PASSWORD?.
    - expect: Forgot Password page opens.
    - expect: Form includes User ID, SSN/TIN options, Continue and Cancel buttons.
  2. Click Cancel.
    - expect: User returns to login page.
    - expect: Login header and sign-in controls are visible again.

### 3. Enrollment Entry

**Seed:** `seed.spec.ts`

#### 3.1. Register link opens enrollment start

**File:** `tests/plans/register-navigation.spec.ts`

**Steps:**
  1. From login page, click Register.
    - expect: Set up your online account page opens.
    - expect: Enrollment heading and progress indicator are visible.
    - expect: Initial enrollment detail fields are present for first step.

### 4. Global Navigation And Footer

**Seed:** `seed.spec.ts`

#### 4.1. Contact & support menu exposes all options

**File:** `tests/plans/contact-support-menu.spec.ts`

**Steps:**
  1. Click Contact & support in top navigation.
    - expect: Support menu expands.
    - expect: Menu includes Frequently Asked Questions, Find a branch or ATM, and Call BMO options.
    - expect: Menu can be interacted with via visible menuitems.

#### 4.2. Footer legal and social links presence

**File:** `tests/plans/footer-link-presence.spec.ts`

**Steps:**
  1. Scroll to footer area on login page and on one secondary flow page (e.g., Forgot Password or Enrollment).
    - expect: Legal links (Privacy, Legal, Security, Member FDIC, Digital Banking Agreement, NMLS) are visible.
    - expect: Social links (Facebook, Twitter, YouTube, LinkedIn) are visible.
    - expect: Links indicate opening in a new window where expected.

#### 4.3. App version control visibility

**File:** `tests/plans/app-version-visibility.spec.ts`

**Steps:**
  1. Inspect footer utility controls.
    - expect: App version button is visible.
    - expect: Version value is displayed in semantic format and does not overlap footer content.
