# Singh Academy V51 - behavior notes

## Learning resume and navigation
The current course attempt stores the last lesson the learner opened. On return, the course player uses that saved lesson when it is valid. If there is no saved lesson, it opens the first incomplete lesson; a fully completed course opens its last lesson for review. The left rail shows the current module and provides Previous Module / Next Module navigation without removing sequential lesson locks.

## Try Again
Client Admin still reviews saved quiz/assignment evidence. If Try Again is selected, only that student's progress for the reviewed course is reset. A new attempt number is created, earlier submitted answers remain retained for review, and the Admin feedback note is displayed to the student on the course/certificate state and inside the learner. Subscription/payment dates are not extended or reset by Try Again.

## Team order
Public and admin team lists use this category priority:
1. Founder
2. Core Team
3. Faculty
4. Board of Advisors

`Display order` applies within each category; name is the final stable tie-breaker.

## Quiz questions
- MCQ - one answer: stored as `multiple-choice`.
- MSQ - multiple answers: stored as `multiple-select`; students choose one or more checkboxes and the backend validates the selected option indices.
- Existing question types remain available.

## Admin confirmations
Course details, lessons, team/events, plans, website content and curriculum mutations use an in-workspace confirmation card or equivalent explicit sensitive-action confirmation. Successful changes trigger an immediate visual success message. This makes feedback feel immediate; it is not a 0.05 millisecond server/network guarantee.

## Public visual changes
The general public layout is preserved. Intentional visual changes are limited to the requested Contact page treatment, landing image focus/middle image, and the requested exact SA shield logo.

## Certificate
Newly issued PDFs use the requested cream paper, brown double frame, original SA shield, repeated low-opacity shield watermarks, larger student/course typography, dates, authorized-signature area, certificate number, verification link and gold SA seal. Existing issued PDFs stored in the database are historical and are not silently regenerated.
