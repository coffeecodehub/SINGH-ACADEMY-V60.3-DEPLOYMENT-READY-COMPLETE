# Singh Academy V39 — Professional Editable Course Content

## Course structure supported

Course → Module → Lesson → ordered content blocks.

A lesson can contain any combination and order of:
- Rich text / theory
- YouTube / Vimeo / TED / external video URL
- Uploaded video stored in MongoDB GridFS
- PDF / DOC / DOCX upload stored in MongoDB GridFS
- External reading/resource link
- Uploaded image
- Embed URL
- Reflection / journal prompt
- Assignment instructions
- Quiz / self-assessment questions
- Resource list with multiple links

Legacy lesson fields remain supported for existing courses, so old content is not discarded.

## Why this matches the real Singh Academy courses

The supplied course material contains lessons that mix explanation, videos, interviews, readings, external articles, journal questions, self-reflection, homework, assignments, and multiple resources in one learning sequence. A single `videoUrl` + `textNotes` field is therefore not enough.

The new `contentBlocks` array allows an administrator to build a lesson such as:

1. Intro text
2. Dr. Singh video
3. Reflection question
4. JAMS reading link
5. Homework instructions
6. Judge interview video
7. PDF/sample agreement
8. Final self-assessment

without changing source code.

## MongoDB-only media

All uploaded media continues to use MongoDB GridFS. No PostgreSQL, Redis, Cloudflare R2, or other database/storage service is required.

For large training videos, external YouTube/Vimeo links are still preferable for performance, but direct uploads are supported when required.
