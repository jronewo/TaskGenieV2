Design a complete Authentication Module UI/UX for the TaskGenie project management platform.

IMPORTANT CONTEXT:

* The Dashboard and main application screens already exist.
* Authentication screens must visually match the existing design system.
* Reuse the same color palette, typography, spacing, border radius, button styles, icons, shadows, and layout patterns from the existing dashboard.
* Authentication pages should feel like part of the same product, not a separate template.
* Modern SaaS style.
* Clean, professional, minimal, and realistic.
* Avoid futuristic AI-style designs, neon effects, excessive gradients, glassmorphism, or overly decorative elements.
* Prioritize usability and visual balance.

DESIGN PRINCIPLES:

* Responsive desktop-first design.
* Forms should be visually larger and properly scaled to avoid excessive empty space.
* Center the content vertically and horizontally when appropriate.
* Use a split-layout only if it improves visual balance.
* Maintain consistent spacing and alignment.
* Strong visual hierarchy.
* Accessible contrast and readable typography.
* Professional enterprise project-management product appearance.

AUTHENTICATION FLOW:

1. Login
2. Initiate Registration
3. Verify Registration OTP
4. Registration Success
5. Request Password Reset
6. Verify Password Reset OTP
7. Set New Password
8. Password Reset Success
9. Logout Confirmation Modal

==================================================
SCREEN 1 — LOGIN
================

Components:

* Logo
* Welcome Back title
* Email input
* Password input
* Show/Hide Password
* Remember Me checkbox
* Forgot Password link
* Login button
* Sign Up link

Validation states:

* Invalid email format
* Required fields
* Invalid email or password
* Account deactivated

Behavior:

* Successful login redirects to Dashboard.

==================================================
SCREEN 2 — INITIATE REGISTRATION
================================

Components:

* Full Name
* Email
* Password
* Confirm Password
* Password strength indicator
* Sign Up button
* Back to Login link

Validation:

* Email uniqueness
* Password policy
* Password confirmation

Behavior:

* On success, navigate to OTP Verification screen.

==================================================
SCREEN 3 — VERIFY REGISTRATION OTP
==================================

Components:

* Title: Verify Your Email
* Description explaining OTP was sent
* 6-digit OTP input
* Verify button
* Resend Code button
* Countdown timer

Validation:

* Invalid code
* Expired code

Behavior:

* Successful verification opens Success Modal.

==================================================
SCREEN 4 — REGISTRATION SUCCESS
===============================

Success Modal:

* Success icon
* Message:
  "Your account has been successfully created."

Buttons:

* Go To Login

Behavior:

* Auto redirect to Login after 3 seconds.
* User may also manually continue.

==================================================
SCREEN 5 — REQUEST PASSWORD RESET
=================================

Components:

* Email field
* Send Code button
* Back to Login link

Behavior:

* If email exists, send OTP.
* For privacy reasons always show:
  "If this email exists, a reset code has been sent."

Navigate to OTP Verification screen.

==================================================
SCREEN 6 — VERIFY PASSWORD RESET OTP
====================================

Components:

* 6-digit OTP input
* Verify button
* Resend Code
* Countdown timer

Validation:

* Invalid code
* Expired code

Behavior:

* Successful verification navigates to Set New Password screen.

==================================================
SCREEN 7 — SET NEW PASSWORD
===========================

Components:

* New Password
* Confirm Password
* Password strength indicator
* Reset Password button

Validation:

* Password complexity
* Matching confirmation

Behavior:

* Successful reset opens Success Modal.

==================================================
SCREEN 8 — PASSWORD RESET SUCCESS
=================================

Success Modal:

* Success icon
* Message:
  "Your password has been successfully updated."

Button:

* Return To Login

Behavior:

* Automatically redirect to Login after 3 seconds.

==================================================
SCREEN 9 — LOGOUT CONFIRMATION
==============================

Modal Dialog

Title:
"Sign Out"

Message:
"Are you sure you want to sign out?"

Buttons:

* Cancel
* Logout

Behavior:

* Logout invalidates session.
* Redirect user to Login screen.

==================================================
GLOBAL UI REQUIREMENTS
======================

Include all interaction states:

* Default
* Hover
* Focus
* Disabled
* Error
* Success
* Loading

Include:

* Toast notifications
* Success modals
* Error alerts
* Loading spinners

Use realistic content and labels.

Ensure every screen feels connected to the existing TaskGenie dashboard design system.

Create polished production-ready Figma screens with proper auto-layout, spacing, reusable components, and design consistency.
