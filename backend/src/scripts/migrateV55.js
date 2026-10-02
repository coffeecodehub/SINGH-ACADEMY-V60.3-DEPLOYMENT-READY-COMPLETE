/** V55 additive migration: navigation/media fixes require no data rewrite. */
import 'dotenv/config';
import mongoose from 'mongoose';
if(!process.env.MONGODB_URI)throw new Error('MONGODB_URI is required.');
await mongoose.connect(process.env.MONGODB_URI);
console.log('Singh Academy V55 migration: no destructive data changes required.');
console.log('Existing courses, payments, enrollments, lesson PDFs, videos and thumbnails are preserved.');
await mongoose.disconnect();
