# Singh Academy V37 → Professional MongoDB LMS Upgrade

## Architecture
- MongoDB is the only database and media store.
- Course, module, lesson, quiz and CMS metadata are stored in MongoDB/Mongoose.
- Uploaded course covers, videos and documents are stored in MongoDB GridFS (`academyMedia.files` / `academyMedia.chunks`).
- YouTube/Vimeo/TED links remain normal external URLs and are not downloaded into the project.
- No PostgreSQL, Redis, Cloudflare R2 or other database/storage service is required.

## Admin course workflow
1. Admin → Courses → Add Course.
2. Fill title, slug, instructor, category, learning field/path, level, duration, outcomes, prerequisites, skills and tools.
3. Upload a course cover. The upload is saved into MongoDB GridFS and the course stores its file ID + media URL.
4. Save the course.
5. Add modules and lessons.
6. Each lesson can contain theory, YouTube/Vimeo/TED URL, uploaded video, uploaded PDF/DOC/DOCX, duration, assignment/journal instructions and quiz questions.
7. Publish when ready.

## Media API
- `POST /api/admin/upload` — authenticated admin upload to MongoDB GridFS.
- `GET /api/media/:fileId` — public media stream from MongoDB GridFS.

## Important production note
MongoDB-only media is intentionally used because that is the requested architecture. Large videos consume MongoDB/Atlas storage quickly. For a production academy, prefer YouTube/Vimeo for large video libraries and reserve GridFS for course covers, PDFs and smaller uploaded media unless the MongoDB storage plan is sized for the expected video volume.
