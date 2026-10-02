/** Pure CMS validation, shared with dependency-free regression tests. */
export function httpError(status, message) { return Object.assign(new Error(message), {status}); }
export function slugify(value) { return String(value || '').normalize('NFKD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, ''); }
export function safeUrl(value, label = 'URL') {
  if (value == null || value === '') return '';
  if (typeof value !== 'string') throw httpError(400, `${label} must be text.`);
  const url = value.trim();
  if (/^\/(?!\/)[a-zA-Z0-9_./%-]+$/.test(url)) return url;
  try { const parsed = new URL(url); if (['http:', 'https:'].includes(parsed.protocol) && !parsed.username && !parsed.password) return url; } catch {}
  throw httpError(400, `${label} must be a valid HTTP or HTTPS link.`);
}
const fields = {
  courses: 'title slug shortDescription description instructor thumbnail thumbnailFileId thumbnailFit thumbnailPositionX thumbnailPositionY thumbnailZoom gallery introVideoUrl learningField learningPath category level durationMinutes estimatedWeeks creditHours prerequisites tools skills learningOutcomes currency accessType price salePrice accessMonths pricing certificate seoTitle seoDescription published featured',
  team: 'name slug category role country bio image imageFileId imageOriginal imageOriginalFileId imageEdit order active',
  events: 'title slug date location description image imageFileId mapUrl status',
  reviews: 'name rating message status',
  modules: 'title description order sequential',
  lessons: 'title order type description videoUrl videoProvider videoFileId videoThumbnailUrl videoThumbnailFileId pdfUrl pdfFileId textNotes durationMinutes questions resources assignmentInstructions contentBlocks preview completionRequired passingScore published'
};
export function payloadFor(kind, body, {creating = false, previous = null} = {}) {
  if (!fields[kind]) throw httpError(404, 'Unknown content type.');
  if (!body || typeof body !== 'object' || Array.isArray(body)) throw httpError(400, 'Provide a valid form.');
  // A field allow-list also prevents MongoDB update operators and parent reassignment.
  const out = Object.fromEntries(fields[kind].split(' ').filter(k => Object.hasOwn(body, k)).map(k => [k, body[k]]));
  const titleKey = ['team','reviews'].includes(kind) ? 'name' : 'title';
  if (creating || Object.hasOwn(out, titleKey)) {
    if (typeof out[titleKey] !== 'string' || !out[titleKey].trim()) throw httpError(400, `${titleKey === 'name' ? 'Name' : 'Title'} is required.`);
    out[titleKey] = out[titleKey].trim();
  }
  if (['courses', 'team', 'events'].includes(kind)) {
    if (creating || Object.hasOwn(out, 'slug')) {
      out.slug = slugify(out.slug || out[titleKey] || previous?.[titleKey]);
      if (!out.slug) throw httpError(400, 'Enter a URL slug using letters or numbers.');
      if (kind === 'courses' && previous?.slug && out.slug !== previous.slug) throw httpError(409, 'Course URL is locked after creation to protect existing purchases. You can still change the course title.');
    }
  }
  for (const key of ['published','featured','active','sequential','preview','completionRequired']) {
    if (key in out && typeof out[key] !== 'boolean') throw httpError(400, `${key} must be true or false.`);
  }
  for (const key of ['price','salePrice','accessMonths','durationMinutes','estimatedWeeks','creditHours','order','passingScore','thumbnailPositionX','thumbnailPositionY','thumbnailZoom','rating']) {
    if (!(key in out)) continue;
    if (key === 'salePrice' && (out[key] === null || out[key] === '')) { out[key] = null; continue; }
    const n = Number(out[key]); if (!Number.isFinite(n) || n < 0) throw httpError(400, `${key} must be a non-negative number.`); out[key] = n;
  }
  if ('passingScore' in out && out.passingScore > 100) throw httpError(400, 'Passing score cannot exceed 100.');
  if ('accessMonths' in out && (!Number.isInteger(out.accessMonths) || out.accessMonths < 1 || out.accessMonths > 120)) throw httpError(400, 'Course access term must be a whole number of months from 1 to 120.');
  for (const key of ['thumbnail', 'image', 'imageOriginal', 'mapUrl', 'introVideoUrl', 'videoUrl', 'videoThumbnailUrl', 'pdfUrl']) if (key in out) out[key] = safeUrl(out[key], key);
  if(kind==='team'&&'imageOriginalFileId' in out&&out.imageOriginalFileId!=null&&out.imageOriginalFileId!==''&&!/^[a-f0-9]{24}$/i.test(out.imageOriginalFileId))throw httpError(400,'Invalid original image identifier.');
  if(kind==='team'&&'imageEdit' in out&&out.imageEdit!==null){
    const e=out.imageEdit;if(!e||typeof e!=='object'||Array.isArray(e))throw httpError(400,'Invalid photo edits.');
    const clean={};for(const [key,min,max] of [['zoom',1,3],['x',-100,100],['y',-100,100],['brightness',60,140],['contrast',60,140]]){if(typeof e[key]!=='number'||!Number.isFinite(e[key])||e[key]<min||e[key]>max)throw httpError(400,'Invalid photo '+key+'.');clean[key]=e[key];}
    if(!['4:3','1:1','3:4','16:9','original'].includes(e.aspect)||![0,90,180,270].includes(e.rotation)||typeof e.flipX!=='boolean'||typeof e.flipY!=='boolean')throw httpError(400,'Invalid photo crop settings.');
    out.imageEdit={...clean,aspect:e.aspect,rotation:e.rotation,flipX:e.flipX,flipY:e.flipY};
  }
  if ('date' in out) {
    if (!out.date) out.date = null;
    else { const d = new Date(out.date); if (Number.isNaN(d.getTime())) throw httpError(400, 'Choose a valid event date.'); out.date = d.toISOString(); }
  }
  for (const key of ['prerequisites','tools','skills','learningOutcomes']) if (key in out && (!Array.isArray(out[key]) || out[key].some(x=>typeof x !== 'string'))) throw httpError(400, `${key} must be a list of text entries.`);
  for (const key of ['gallery','resources','contentBlocks','pricing','questions']) if (key in out && !Array.isArray(out[key])) throw httpError(400, `${key} must be a list.`);
  const checkItems = items => (items || []).map(item => {
    if (!item || typeof item !== 'object' || Array.isArray(item)) throw httpError(400, 'Invalid content item.');
    const copy = {...item}; if ('url' in copy) copy.url = safeUrl(copy.url);
    if ('items' in copy) { if (!Array.isArray(copy.items)) throw httpError(400, 'Resources must be a list.'); copy.items = checkItems(copy.items); }
    if ('questions' in copy) copy.questions = checkQuestions(copy.questions);
    return copy;
  });
  function checkQuestions(questions) {
    if (!Array.isArray(questions)) throw httpError(400, 'Questions must be a list.');
    return questions.map(q => {
      if (!q || typeof q !== 'object' || typeof q.prompt !== 'string' || !q.prompt.trim()) throw httpError(400, 'Each question needs a prompt.');
      if (['multiple-choice','multiple-select'].includes(q.kind) && (!Array.isArray(q.options) || q.options.filter(x=>String(x).trim()).length < 2)) throw httpError(400, 'MCQ/MSQ questions need at least two options.');
      return {...q, prompt:q.prompt.trim()};
    });
  }
  for (const key of ['gallery','resources','contentBlocks']) if (key in out) out[key] = checkItems(out[key]);
  if ('questions' in out) out.questions = checkQuestions(out.questions);
  if ('pricing' in out) out.pricing = out.pricing.map((x,i)=>{
    if (!x || typeof x !== 'object' || !String(x.label||'').trim() || !Number.isFinite(Number(x.price)) || Number(x.price)<0) throw httpError(400, 'Each pricing option needs a label and non-negative price.');
    const months=Number(x.durationMonths ?? (Number(x.accessDays)>0?Math.max(1,Math.ceil(Number(x.accessDays)/30)):out.accessMonths||previous?.accessMonths||1));
    if(!Number.isInteger(months)||months<1||months>120)throw httpError(400,'Each course price option needs a whole-number access term from 1 to 120 months.');
    return {...x,key:slugify(x.key||x.label)||`option-${i+1}`,price:Number(x.price),durationMonths:months,billing:'one-time'};
  });
  for(const key of ['thumbnailFileId','imageFileId','imageOriginalFileId','videoFileId','videoThumbnailFileId','pdfFileId'])if(out[key]==='')out[key]=null;
  return out;
}
export function siteValue(key, value) {
  if (key === 'membershipPlans') {
    if (!Array.isArray(value)) throw httpError(400, 'Academy Plans must be a list.');
    const keys = new Set();
    return value.map((p,i) => {
      if (!p || typeof p.name !== 'string' || !p.name.trim()) throw httpError(400, `Plan ${i+1} needs a name.`);
      const price = Number(p.price), months = Number(p.durationMonths ?? (p.period === 'year' ? 12 : 1));
      if (!Number.isFinite(price) || price < 0 || !Number.isInteger(months) || months < 1) throw httpError(400, 'Plans need a non-negative price and a whole-number duration of at least one month.');
      const key = slugify(p.key || p.name); if (!key || keys.has(key)) throw httpError(400, 'Plan identifiers must be unique.'); keys.add(key);
      return {key,name:p.name.trim(),price,durationMonths:months,billing:'one-time',description:String(p.description||''),features:Array.isArray(p.features)?p.features.map(String):[],active:p.active!==false};
    });
  }
  if (key === 'footerSocial') {
    if (!value || typeof value !== 'object' || Array.isArray(value)) throw httpError(400, 'Provide social links.');
    return Object.fromEntries(['facebook','instagram','linkedin','youtube','x','tiktok','threads','pinterest','whatsapp'].map(k=>{const url=safeUrl(value[k],k);if(url&&!/^https?:\/\//i.test(url))throw httpError(400,`${k} needs a complete HTTP or HTTPS profile link.`);return [k,url];}));
  }
  throw httpError(404, 'This site setting is not editable in this CMS.');
}
export function parseByteRange(range, total) {
  const match = /^bytes=(\d*)-(\d*)$/.exec(range || '');
  if (!match || (!match[1] && !match[2]) || total <= 0) return null;
  const start = match[1] ? Number(match[1]) : Math.max(0, total - Number(match[2]));
  const end = match[1] ? (match[2] ? Math.min(Number(match[2]), total-1) : total-1) : total-1;
  return Number.isSafeInteger(start) && Number.isSafeInteger(end) && start >= 0 && start <= end && start < total ? {start,end} : null;
}
