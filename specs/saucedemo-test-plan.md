# SauceDemo Test Plan

**Application Under Test:** https://www.saucedemo.com/  
**Plan Date:** 2026-04-08  
**Prepared By:** playwright-test-planner agent  

## Assumptions

- Tests start from a fresh browser session (no cookies/session state).
- All tests use the public demo credentials unless otherwise stated.
- Known test users: `standard_user`, `locked_out_user`, `performance_glitch_user`, `problem_user` — password `secret_sauce` for all.
- `standard_user` is the baseline user for the happy path.
- Cart state does not persist between scenarios (Reset App State or fresh session).
- The application is publicly accessible at the stated URL with no rate limiting.
- Locator targets are based on observed page structure; run `discover-locators` before first execution to validate any flagged uncertain targets.

---

## Suite 1 — Login

### TC-LOGIN-01 Happy Path Login (standard_user)
**Precondition:** Browser at https://www.saucedemo.com/

| Step | Action | Target | Value | Expected Result |
|------|--------|--------|-------|-----------------|
| 1 | navigate | https://www.saucedemo.com/ | | Login page loads |
| 2 | assertVisible | LoginPage.usernameField | | Username field visible |
| 3 | assertVisible | LoginPage.passwordField | | Password field visible |
| 4 | assertVisible | LoginPage.loginButton | | Login button visible |
| 5 | fill | LoginPage.usernameField | standard_user | |
| 6 | fill | LoginPage.passwordField | secret_sauce | |
| 7 | click | LoginPage.loginButton | | |
| 8 | assertText | | Products | Inventory page loads with "Products" heading |
| 9 | screenshot | after-login | | |

### TC-LOGIN-02 Login with Locked Out User
**Precondition:** Browser at https://www.saucedemo.com/

| Step | Action | Target | Value | Expected Result |
|------|--------|--------|-------|-----------------|
| 1 | navigate | https://www.saucedemo.com/ | | Login page loads |
| 2 | fill | LoginPage.usernameField | locked_out_user | |
| 3 | fill | LoginPage.passwordField | secret_sauce | |
| 4 | click | LoginPage.loginButton | | |
| 5 | assertText | | Epic sadface: Sorry, this user has been locked out | Error message shown |
| 6 | assertVisible | LoginPage.errorMessage | | Error banner visible |

### TC-LOGIN-03 Empty Username Validation
**Precondition:** Browser at https://www.saucedemo.com/

| Step | Action | Target | Value | Expected Result |
|------|--------|--------|-------|-----------------|
| 1 | navigate | https://www.saucedemo.com/ | | |
| 2 | click | LoginPage.loginButton | | |
| 3 | assertText | | Epic sadface: Username is required | Inline validation error shown |

### TC-LOGIN-04 Empty Password Validation
**Precondition:** Browser at https://www.saucedemo.com/

| Step | Action | Target | Value | Expected Result |
|------|--------|--------|-------|-----------------|
| 1 | navigate | https://www.saucedemo.com/ | | |
| 2 | fill | LoginPage.usernameField | standard_user | |
| 3 | click | LoginPage.loginButton | | |
| 4 | assertText | | Epic sadface: Password is required | Inline validation error shown |

### TC-LOGIN-05 Wrong Credentials Validation

| Step | Action | Target | Value | Expected Result |
|------|--------|--------|-------|-----------------|
| 1 | navigate | https://www.saucedemo.com/ | | |
| 2 | fill | LoginPage.usernameField | invalid_user | |
| 3 | fill | LoginPage.passwordField | wrong_password | |
| 4 | click | LoginPage.loginButton | | |
| 5 | assertText | | Username and password do not match | Error message shown |

---

## Suite 2 — Product Inventory

### TC-INV-01 Inventory Page Loads with Products
**Precondition:** Logged in as standard_user

| Step | Action | Target | Value | Expected Result |
|------|--------|--------|-------|-----------------|
| 1 | navigate | https://www.saucedemo.com/ | | |
| 2 | fill | LoginPage.usernameField | standard_user | |
| 3 | fill | LoginPage.passwordField | secret_sauce | |
| 4 | click | LoginPage.loginButton | | |
| 5 | assertText | | Products | |
| 6 | assertVisible | InventoryPage.productList | | Product grid visible |
| 7 | assertText | | Sauce Labs Backpack | At least one product visible |

### TC-INV-02 Sort Products by Name Z-A
**Precondition:** Logged in as standard_user, on inventory page

| Step | Action | Target | Value | Expected Result |
|------|--------|--------|-------|-----------------|
| 1 | navigate | https://www.saucedemo.com/ | | |
| 2 | fill | LoginPage.usernameField | standard_user | |
| 3 | fill | LoginPage.passwordField | secret_sauce | |
| 4 | click | LoginPage.loginButton | | |
| 5 | select | InventoryPage.sortDropdown | za | Sort applied |
| 6 | assertText | | Sauce Labs T-Shirt (Red) | First product in Z-A order |
| 7 | screenshot | sort-za | | |

### TC-INV-03 Sort Products by Price Low to High
**Precondition:** Logged in as standard_user

| Step | Action | Target | Value | Expected Result |
|------|--------|--------|-------|-----------------|
| 1 | navigate | https://www.saucedemo.com/ | | |
| 2 | fill | LoginPage.usernameField | standard_user | |
| 3 | fill | LoginPage.passwordField | secret_sauce | |
| 4 | click | LoginPage.loginButton | | |
| 5 | select | InventoryPage.sortDropdown | lohi | Sort applied |
| 6 | assertText | | $7.99 | Cheapest product first |

### TC-INV-04 Sort Products by Price High to Low
**Precondition:** Logged in as standard_user

| Step | Action | Target | Value | Expected Result |
|------|--------|--------|-------|-----------------|
| 1 | navigate | https://www.saucedemo.com/ | | |
| 2 | fill | LoginPage.usernameField | standard_user | |
| 3 | fill | LoginPage.passwordField | secret_sauce | |
| 4 | click | LoginPage.loginButton | | |
| 5 | select | InventoryPage.sortDropdown | hilo | Sort applied |
| 6 | assertText | | $49.99 | Most expensive product first |

### TC-INV-05 View Product Detail Page
**Precondition:** Logged in as standard_user

| Step | Action | Target | Value | Expected Result |
|------|--------|--------|-------|-----------------|
| 1 | navigate | https://www.saucedemo.com/ | | |
| 2 | fill | LoginPage.usernameField | standard_user | |
| 3 | fill | LoginPage.passwordField | secret_sauce | |
| 4 | click | LoginPage.loginButton | | |
| 5 | click | InventoryPage.firstProductLink | | Product detail page opens |
| 6 | assertVisible | ProductDetailPage.productName | | Product name visible |
| 7 | assertVisible | ProductDetailPage.productPrice | | Price visible |
| 8 | assertVisible | ProductDetailPage.addToCartButton | | Add to cart button visible |
| 9 | assertVisible | ProductDetailPage.backButton | | Back button visible |
| 10 | screenshot | product-detail | | |

---

## Suite 3 — Cart Management

### TC-CART-01 Add Single Item to Cart
**Precondition:** Logged in as standard_user

| Step | Action | Target | Value | Expected Result |
|------|--------|--------|-------|-----------------|
| 1 | navigate | https://www.saucedemo.com/ | | |
| 2 | fill | LoginPage.usernameField | standard_user | |
| 3 | fill | LoginPage.passwordField | secret_sauce | |
| 4 | click | LoginPage.loginButton | | |
| 5 | click | InventoryPage.addToCartBackpack | | Button changes to "Remove" |
| 6 | assertText | | 1 | Cart badge shows count 1 |
| 7 | screenshot | cart-badge-1 | | |

### TC-CART-02 Add Multiple Items to Cart
**Precondition:** Logged in as standard_user

| Step | Action | Target | Value | Expected Result |
|------|--------|--------|-------|-----------------|
| 1 | navigate | https://www.saucedemo.com/ | | |
| 2 | fill | LoginPage.usernameField | standard_user | |
| 3 | fill | LoginPage.passwordField | secret_sauce | |
| 4 | click | LoginPage.loginButton | | |
| 5 | click | InventoryPage.addToCartBackpack | | |
| 6 | click | InventoryPage.addToCartBikeLight | | |
| 7 | assertText | | 2 | Cart badge shows count 2 |
| 8 | click | InventoryPage.cartIcon | | Cart page opens |
| 9 | assertText | | Sauce Labs Backpack | First item in cart |
| 10 | assertText | | Sauce Labs Bike Light | Second item in cart |

### TC-CART-03 Remove Item from Cart Page
**Precondition:** Logged in as standard_user, 1 item in cart

| Step | Action | Target | Value | Expected Result |
|------|--------|--------|-------|-----------------|
| 1 | navigate | https://www.saucedemo.com/ | | |
| 2 | fill | LoginPage.usernameField | standard_user | |
| 3 | fill | LoginPage.passwordField | secret_sauce | |
| 4 | click | LoginPage.loginButton | | |
| 5 | click | InventoryPage.addToCartBackpack | | |
| 6 | click | InventoryPage.cartIcon | | |
| 7 | click | CartPage.removeBackpack | | Item removed |
| 8 | assertText | | Your cart is empty | *(or cart list is empty)* |

### TC-CART-04 Continue Shopping from Cart
**Precondition:** Logged in as standard_user

| Step | Action | Target | Value | Expected Result |
|------|--------|--------|-------|-----------------|
| 1 | navigate | https://www.saucedemo.com/ | | |
| 2 | fill | LoginPage.usernameField | standard_user | |
| 3 | fill | LoginPage.passwordField | secret_sauce | |
| 4 | click | LoginPage.loginButton | | |
| 5 | click | InventoryPage.cartIcon | | |
| 6 | click | CartPage.continueShoppingButton | | Returns to inventory page |
| 7 | assertText | | Products | Inventory page visible |

---

## Suite 4 — Checkout

### TC-CHECKOUT-01 Complete Full Checkout Flow
**Precondition:** Logged in as standard_user

| Step | Action | Target | Value | Expected Result |
|------|--------|--------|-------|-----------------|
| 1 | navigate | https://www.saucedemo.com/ | | |
| 2 | fill | LoginPage.usernameField | standard_user | |
| 3 | fill | LoginPage.passwordField | secret_sauce | |
| 4 | click | LoginPage.loginButton | | |
| 5 | click | InventoryPage.addToCartBackpack | | |
| 6 | click | InventoryPage.cartIcon | | |
| 7 | click | CartPage.checkoutButton | | Checkout Step 1 loads |
| 8 | assertText | | Checkout: Your Information | |
| 9 | fill | CheckoutInfoPage.firstNameField | {{firstName}} | |
| 10 | fill | CheckoutInfoPage.lastNameField | {{lastName}} | |
| 11 | fill | CheckoutInfoPage.postalCodeField | {{postalCode}} | |
| 12 | click | CheckoutInfoPage.continueButton | | Checkout Step 2 loads |
| 13 | assertText | | Checkout: Overview | |
| 14 | assertText | | Sauce Labs Backpack | Item shown in overview |
| 15 | assertVisible | CheckoutOverviewPage.subtotalLabel | | Price subtotal visible |
| 16 | assertVisible | CheckoutOverviewPage.taxLabel | | Tax visible |
| 17 | click | CheckoutOverviewPage.finishButton | | Order confirmation page |
| 18 | assertText | | Thank you for your order! | Confirmation shown |
| 19 | screenshot | checkout-complete | | |

### TC-CHECKOUT-02 Checkout Empty First Name Validation

| Step | Action | Target | Value | Expected Result |
|------|--------|--------|-------|-----------------|
| 1 | navigate | https://www.saucedemo.com/ | | |
| 2 | fill | LoginPage.usernameField | standard_user | |
| 3 | fill | LoginPage.passwordField | secret_sauce | |
| 4 | click | LoginPage.loginButton | | |
| 5 | click | InventoryPage.addToCartBackpack | | |
| 6 | click | InventoryPage.cartIcon | | |
| 7 | click | CartPage.checkoutButton | | |
| 8 | click | CheckoutInfoPage.continueButton | | |
| 9 | assertText | | Error: First Name is required | Validation error shown |

### TC-CHECKOUT-03 Checkout Empty Last Name Validation

| Step | Action | Target | Value | Expected Result |
|------|--------|--------|-------|-----------------|
| 1 | navigate | https://www.saucedemo.com/ | | |
| 2 | fill | LoginPage.usernameField | standard_user | |
| 3 | fill | LoginPage.passwordField | secret_sauce | |
| 4 | click | LoginPage.loginButton | | |
| 5 | click | InventoryPage.addToCartBackpack | | |
| 6 | click | InventoryPage.cartIcon | | |
| 7 | click | CartPage.checkoutButton | | |
| 8 | fill | CheckoutInfoPage.firstNameField | Test | |
| 9 | click | CheckoutInfoPage.continueButton | | |
| 10 | assertText | | Error: Last Name is required | Validation error shown |

### TC-CHECKOUT-04 Checkout Empty Postal Code Validation

| Step | Action | Target | Value | Expected Result |
|------|--------|--------|-------|-----------------|
| 1 | navigate | https://www.saucedemo.com/ | | |
| 2 | fill | LoginPage.usernameField | standard_user | |
| 3 | fill | LoginPage.passwordField | secret_sauce | |
| 4 | click | LoginPage.loginButton | | |
| 5 | click | InventoryPage.addToCartBackpack | | |
| 6 | click | InventoryPage.cartIcon | | |
| 7 | click | CartPage.checkoutButton | | |
| 8 | fill | CheckoutInfoPage.firstNameField | Test | |
| 9 | fill | CheckoutInfoPage.lastNameField | User | |
| 10 | click | CheckoutInfoPage.continueButton | | |
| 11 | assertText | | Error: Postal Code is required | Validation error shown |

### TC-CHECKOUT-05 Cancel Checkout Returns to Cart

| Step | Action | Target | Value | Expected Result |
|------|--------|--------|-------|-----------------|
| 1 | navigate | https://www.saucedemo.com/ | | |
| 2 | fill | LoginPage.usernameField | standard_user | |
| 3 | fill | LoginPage.passwordField | secret_sauce | |
| 4 | click | LoginPage.loginButton | | |
| 5 | click | InventoryPage.addToCartBackpack | | |
| 6 | click | InventoryPage.cartIcon | | |
| 7 | click | CartPage.checkoutButton | | |
| 8 | click | CheckoutInfoPage.cancelButton | | Returns to cart |
| 9 | assertText | | Your Cart | Cart page still shows item |

---

## Suite 5 — Navigation & Logout

### TC-NAV-01 Hamburger Menu Opens
**Precondition:** Logged in as standard_user

| Step | Action | Target | Value | Expected Result |
|------|--------|--------|-------|-----------------|
| 1 | navigate | https://www.saucedemo.com/ | | |
| 2 | fill | LoginPage.usernameField | standard_user | |
| 3 | fill | LoginPage.passwordField | secret_sauce | |
| 4 | click | LoginPage.loginButton | | |
| 5 | click | InventoryPage.hamburgerMenu | | Side menu opens |
| 6 | assertText | | All Items | Menu item visible |
| 7 | assertText | | About | Menu item visible |
| 8 | assertText | | Logout | Menu item visible |
| 9 | assertText | | Reset App State | Menu item visible |

### TC-NAV-02 Logout
**Precondition:** Logged in as standard_user

| Step | Action | Target | Value | Expected Result |
|------|--------|--------|-------|-----------------|
| 1 | navigate | https://www.saucedemo.com/ | | |
| 2 | fill | LoginPage.usernameField | standard_user | |
| 3 | fill | LoginPage.passwordField | secret_sauce | |
| 4 | click | LoginPage.loginButton | | |
| 5 | click | InventoryPage.hamburgerMenu | | |
| 6 | click | NavMenu.logoutLink | | Redirected to login page |
| 7 | assertVisible | LoginPage.loginButton | | Login page shown |

### TC-NAV-03 Direct URL Access Without Login Redirects to Login Page

| Step | Action | Target | Value | Expected Result |
|------|--------|--------|-------|-----------------|
| 1 | navigate | https://www.saucedemo.com/inventory.html | | |
| 2 | assertText | | Swag Labs | Redirected to login page |
| 3 | assertVisible | LoginPage.loginButton | | Login button present |

---

## Test Data Placeholders

| Placeholder | Description | Example Value |
|---|---|---|
| `{{firstName}}` | Checkout first name | `Jane` |
| `{{lastName}}` | Checkout last name | `Doe` |
| `{{postalCode}}` | Checkout postal code | `12345` |
| `{{standardUser}}` | Standard login username | `standard_user` |
| `{{lockedUser}}` | Locked account username | `locked_out_user` |
| `{{userPassword}}` | Shared test password | `secret_sauce` |

---

## Locator Assumptions (Flag for Discovery)

The following logical POM targets are assumed based on page structure and should be validated by running `discover-locators` before first execution:

| POM Target | Likely Selector | Uncertainty |
|---|---|---|
| `LoginPage.usernameField` | `input#user-name` | Low |
| `LoginPage.passwordField` | `input#password` | Low |
| `LoginPage.loginButton` | `input#login-button` | Low |
| `LoginPage.errorMessage` | `[data-test="error"]` | Low |
| `InventoryPage.productList` | `.inventory_list` | Low |
| `InventoryPage.sortDropdown` | `.product_sort_container` | Low |
| `InventoryPage.firstProductLink` | `.inventory_item_name:first-of-type` | Medium |
| `InventoryPage.addToCartBackpack` | `[data-test="add-to-cart-sauce-labs-backpack"]` | Low |
| `InventoryPage.addToCartBikeLight` | `[data-test="add-to-cart-sauce-labs-bike-light"]` | Low |
| `InventoryPage.cartIcon` | `.shopping_cart_link` | Low |
| `InventoryPage.hamburgerMenu` | `#react-burger-menu-btn` | Low |
| `CartPage.removeBackpack` | `[data-test="remove-sauce-labs-backpack"]` | **High** — flag for discovery |
| `CartPage.continueShoppingButton` | `[data-test="continue-shopping"]` | Low |
| `CartPage.checkoutButton` | `[data-test="checkout"]` | Low |
| `CheckoutInfoPage.firstNameField` | `[data-test="firstName"]` | Low |
| `CheckoutInfoPage.lastNameField` | `[data-test="lastName"]` | Low |
| `CheckoutInfoPage.postalCodeField` | `[data-test="postalCode"]` | Low |
| `CheckoutInfoPage.continueButton` | `[data-test="continue"]` | Low |
| `CheckoutInfoPage.cancelButton` | `[data-test="cancel"]` | Low |
| `CheckoutOverviewPage.subtotalLabel` | `.summary_subtotal_label` | Medium |
| `CheckoutOverviewPage.taxLabel` | `.summary_tax_label` | Medium |
| `CheckoutOverviewPage.finishButton` | `[data-test="finish"]` | Low |
| `NavMenu.logoutLink` | `#logout_sidebar_link` | Low |
| `ProductDetailPage.productName` | `.inventory_details_name` | Medium |
| `ProductDetailPage.productPrice` | `.inventory_details_price` | Medium |
| `ProductDetailPage.addToCartButton` | `[data-test^="add-to-cart"]` | Medium |
| `ProductDetailPage.backButton` | `[data-test="back-to-products"]` | Low |

---

## Handoff Note to Converter Agent

**Plan file:** `specs/saucedemo-test-plan.md`  
**Suites:** Login, Product Inventory, Cart Management, Checkout, Navigation & Logout  
**Scenarios:** 17 test cases total  

**Required test data file:** `config/TestData/domain.saucedemo.json` with keys: `firstName`, `lastName`, `postalCode`, `standardUser`, `lockedUser`, `userPassword`

**POM file:** `config/locators/pageObjects.json` — add pages: `LoginPage`, `InventoryPage`, `CartPage`, `CheckoutInfoPage`, `CheckoutOverviewPage`, `NavMenu`, `ProductDetailPage`

**⚠ Run `discover-locators` before first execution** — targets marked **High/Medium** uncertainty above (especially `CartPage.removeBackpack`, sort dropdown value options, and product detail selectors) should be resolved by discovery before running the suite.
