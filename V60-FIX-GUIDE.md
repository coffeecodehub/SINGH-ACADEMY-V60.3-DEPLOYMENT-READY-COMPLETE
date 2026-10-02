# Singh Academy V60 Fix Guide

### Enrollment duplicate error
The application schema already intends Enrollment uniqueness per `user + courseSlug`. V60 adds a database migration that detects and removes only legacy single-field **unique** indexes on `courseSlug` or `user`, then ensures `user_1_courseSlug_1` exists. This matches the symptom where the first account can enroll but a different account receives MongoDB duplicate-key error 11000.

### Empty lesson video block
The learner page now renders the main video stage only when `lesson.videoUrl` exists. A lesson can therefore be theory/quiz/mixed without showing a fake video placeholder.

### Video URLs
One shared resolver is used by learner playback and the Client Admin lesson preview. It supports YouTube, Vimeo unlisted hashes, TikTok, Instagram posts/reels, TED talks, Dailymotion, Loom, uploaded/direct media, plus an external link fallback when a provider blocks standard iframe playback.

### Contact/footer
Requested contact values are defaults in both the editable website text slots and frontend fallbacks. V60 migration also fills those contact keys when an existing website-content record has them blank. Existing non-empty custom values are not overwritten.
