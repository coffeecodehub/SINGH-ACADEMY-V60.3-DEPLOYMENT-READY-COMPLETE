import {Router} from 'express';
import TeamMember from '../models/TeamMember.js';
import SiteContent from '../models/SiteContent.js';
import Event from '../models/Event.js';
import {mediaUrl} from '../utils/media.js';
const r=Router();
const teamRank={founder:0,faculty:1,board:2,core:3};
const sortTeam=(a,b)=>(teamRank[a.category]??9)-(teamRank[b.category]??9)||(Number(a.order)||0)-(Number(b.order)||0)||String(a.name||'').localeCompare(String(b.name||''));
r.get('/team',async(req,res)=>{
  const q={active:true};
  if(req.query.category && ['founder','faculty','board','core'].includes(String(req.query.category))) q.category=String(req.query.category);
  const team=(await TeamMember.find(q).lean()).sort(sortTeam);
  res.json({success:true,team:team.map(({imageOriginal,imageOriginalFileId,imageEdit,...m})=>({...m,image:mediaUrl(req,m.imageFileId,m.image)}))});
});
r.get('/events',async(req,res)=>{const events=await Event.find({status:'published'}).sort({date:1,createdAt:-1}).lean();res.json({success:true,events:events.map(e=>({...e,image:mediaUrl(req,e.imageFileId,e.image)}))});});
r.get('/site',async(req,res)=>{
  // Do not expose future private/system settings through this public endpoint.
  const docs=await SiteContent.find({key:{$in:['membershipPlans','footerSocial','websiteContent']}}).lean();
  res.json({success:true,content:Object.fromEntries(docs.map(x=>[x.key,x.key==='membershipPlans'&&Array.isArray(x.value)?x.value.filter(p=>p.active!==false):x.value]))});
});
export default r;
