import 'dotenv/config';
import mongoose from 'mongoose';
import {connectDB} from '../config/db.js';
import CheckoutOrder from '../models/CheckoutOrder.js';
import {syncCheckout} from '../services/onlineCheckout.js';

const captureApprovedPayPal=process.argv.includes('--capture-approved-paypal');
const limitArg=process.argv.find(x=>x.startsWith('--limit='));
const limit=Math.max(1,Math.min(200,Number(limitArg?.slice(8)||50)||50));
let ok=0,failed=0,paid=0,pending=0;
try{
 await connectDB();
 const rows=await CheckoutOrder.find({status:{$in:['creating','pending']},providerOrderId:{$type:'string'}}).sort({createdAt:1}).limit(limit).select('_id provider status').lean();
 console.log(`Reconciling up to ${rows.length} saved provider order(s). No new checkout is created.`);
 for(const row of rows){
  try{
   const before=row.status,result=await syncCheckout(row._id,{capture:row.provider==='paypal'&&captureApprovedPayPal,verificationSource:'provider_api'});
   ok++;if(result.status==='paid')paid++;else pending++;
   console.log(`OK ${row.provider} ${String(row._id)} ${before} -> ${result.status}`);
  }catch(error){failed++;console.error(`FAIL ${row.provider} ${String(row._id)}: ${error?.message||'provider error'}`);}
 }
 console.log(`Reconciliation complete: ${ok} checked, ${paid} paid, ${pending} still open, ${failed} failed.`);
 if(failed)process.exitCode=1;
}finally{await mongoose.disconnect();}
