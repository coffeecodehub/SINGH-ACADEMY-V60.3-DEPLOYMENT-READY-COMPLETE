import 'dotenv/config';
import mongoose from 'mongoose';
import Course from '../models/Course.js';import Module from '../models/Module.js';import Lesson from '../models/Lesson.js';import {courseSeeds} from '../data/courseSeeds.js';
if(!process.env.MONGODB_URI) throw new Error('MONGODB_URI is required');
await mongoose.connect(process.env.MONGODB_URI);
for(const seed of courseSeeds){
  const {modules,...courseData}=seed;
  if(await Course.exists({slug:seed.slug})){console.log(`Preserved existing course: ${seed.slug}`);continue;}
  const course=await Course.create(courseData);
  for(let mi=0;mi<modules.length;mi++){
    const [title,lessons]=modules[mi];const mod=await Module.create({course:course._id,title,order:mi+1,sequential:true});
    for(let li=0;li<lessons.length;li++){
      const [lessonTitle,type='mixed',questions=[],resources=[]]=lessons[li];
      await Lesson.create({module:mod._id,title:lessonTitle,type,order:li+1,questions,resources,completionRequired:true});
    }
  }
  console.log(`Seeded ${seed.title}`);
}
await mongoose.disconnect();console.log('Course seed complete.');
