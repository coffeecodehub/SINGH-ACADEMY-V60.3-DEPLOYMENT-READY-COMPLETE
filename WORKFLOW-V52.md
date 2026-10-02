# Singh Academy V52 - behavior notes

## Student registration
- Registration asks for full name, email, password and confirm password with clear placeholders.
- No verification link is required.
- Successful first registration creates only a `student` role and automatically signs the student in.
- A Welcome to Singh Academy email is queued after the session is issued. Email delivery does not delay or roll back account creation.
- Existing-email registration is refused and directs the user to sign in.

## Client Admin activity counters
Client Admin navigation now has badge counters for:
- Students: new student accounts or student login activity since the section was last opened.
- Student subscriptions: new subscription records since last opened.
- Form submissions: new public Contact form messages since last opened.
- Certificates: new course-completion records since last opened.
- Completion notifications: new completion/certificate notifications since last opened.

Opening the matching section marks that navigation counter as seen for that Client Admin account. New activity after that point increments it again.

## Form submissions
The Client Admin has a Form submissions section showing Contact-form name, email, topic, message, date and status. Status can be changed between New, Responded and Closed. Password/reset forms are not exposed as support submissions.

## Team order
The public Team ordering is:
1. Founder
2. Faculty
3. Board of Advisors
4. Core Team

Display order and name sort within the category. Core Team therefore stays last in the All view.

## Learning Continue behavior
- Manual Save Answers remains available.
- Moving to another lesson/module auto-saves dirty answers first.
- Continue / Complete saves the current answers and progress before advancing.
- The previous native `Leave without saving these answers?` lesson-navigation prompt is removed.
- If auto-save fails, the learner stays on the current lesson and receives an in-page status message instead of silently navigating away.
- Real browser/tab-close protection for unsaved work may still be controlled by the browser.

## Certificate
The approved cream/brown double-frame certificate layout, repeated SA shield watermarks, original logo, gold seal and verification details are retained. The supplied blue signature image is embedded in the Authorized By area. The red pointer/dot visible in the visual reference is not part of the generated certificate.

Only newly issued certificates use the current generator. Historical stored PDFs remain unchanged.
