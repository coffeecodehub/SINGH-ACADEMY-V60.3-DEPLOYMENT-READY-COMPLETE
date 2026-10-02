export type VideoSource={kind:'embed'|'native'|'external';src:string;provider:string};

const cleanHost=(host:string)=>host.toLowerCase().replace(/^www\./,'');
const videoExt=/\.(?:mp4|webm|ogg|ogv|mov|m4v)(?:$|[?#])/i;
function safeUrl(raw:string){try{return new URL(raw,typeof window==='undefined'?'https://academy.invalid':window.location.origin)}catch{return null}}
function firstMatch(parts:string[],rx:RegExp){return parts.find(x=>rx.test(x))||''}
function youtubeStart(u:URL){const raw=u.searchParams.get('t')||u.searchParams.get('start')||'';if(/^\d+$/.test(raw))return Number(raw);const m=raw.match(/(?:(\d+)h)?(?:(\d+)m)?(?:(\d+)s)?/i);if(!m)return 0;return Number(m[1]||0)*3600+Number(m[2]||0)*60+Number(m[3]||0)}

/** Convert approved public video links into safe player URLs. Unknown HTTPS pages remain usable as external video links. */
export function resolveVideoSource(raw:string=''):VideoSource|null{
 const value=String(raw||'').trim();if(!value)return null;
 if(value.startsWith('/api/media/')||value.startsWith('blob:'))return {kind:'native',src:value,provider:'upload'};
 if(videoExt.test(value)&&!/^https?:\/\//i.test(value))return {kind:'native',src:value,provider:'direct'};
 const u=safeUrl(value);if(!u)return null;const host=cleanHost(u.hostname),parts=u.pathname.split('/').filter(Boolean);
 if(host==='youtu.be'||host.endsWith('youtube.com')||host.endsWith('youtube-nocookie.com')){
  let id='';if(host==='youtu.be')id=parts[0]||'';else if(parts[0]==='watch')id=u.searchParams.get('v')||'';else if(['embed','shorts','live'].includes(parts[0]))id=parts[1]||'';else id=u.searchParams.get('v')||'';
  if(id){const q=new URLSearchParams({rel:'0',playsinline:'1'}),start=youtubeStart(u);if(start>0)q.set('start',String(start));return {kind:'embed',src:`https://www.youtube-nocookie.com/embed/${encodeURIComponent(id)}?${q}`,provider:'youtube'};}
 }
 if(host==='vimeo.com'||host.endsWith('.vimeo.com')){
  const id=firstMatch(parts,/^\d+$/);if(id){const pos=parts.indexOf(id),pathHash=parts[pos+1]&&/^[a-z0-9]{6,}$/i.test(parts[pos+1])?parts[pos+1]:'',hash=u.searchParams.get('h')||pathHash;const q=new URLSearchParams();if(hash)q.set('h',hash);let src=`https://player.vimeo.com/video/${id}${q.toString()?`?${q}`:''}`;const start=(u.hash.match(/(?:^#|[&#])t=(\d+)/)||[])[1];if(start)src+=`#t=${start}s`;return {kind:'embed',src,provider:'vimeo'};}
 }
 if(host==='tiktok.com'||host.endsWith('.tiktok.com')){
  const marker=parts.indexOf('video'),player=parts.indexOf('v1'),id=(marker>=0?parts[marker+1]:player>=0?parts[player+1]:'');if(/^\d+$/.test(id||''))return {kind:'embed',src:`https://www.tiktok.com/player/v1/${id}?controls=1`,provider:'tiktok'};
 }
 if(host==='instagram.com'||host.endsWith('.instagram.com')){
  const kind=parts[0]==='reels'?'reel':parts[0];const code=parts[1]||'';if(['p','reel','tv'].includes(kind)&&code)return {kind:'embed',src:`https://www.instagram.com/${kind}/${encodeURIComponent(code)}/embed/`,provider:'instagram'};
 }
 if(host==='ted.com'||host.endsWith('.ted.com')){
  if(host==='embed.ted.com')return {kind:'embed',src:u.href,provider:'ted'};const i=parts.indexOf('talks');if(i>=0&&parts[i+1])return {kind:'embed',src:`https://embed.ted.com/talks/${encodeURIComponent(parts[i+1])}`,provider:'ted'};
 }
 if(host==='dailymotion.com'||host==='dai.ly'){
  const id=host==='dai.ly'?(parts[0]||''):(parts[0]==='video'?parts[1]||'':'');if(id)return {kind:'embed',src:`https://www.dailymotion.com/embed/video/${encodeURIComponent(id)}`,provider:'dailymotion'};
 }
 if(host==='loom.com'||host.endsWith('.loom.com')){
  const i=parts.findIndex(x=>['share','embed'].includes(x)),id=i>=0?parts[i+1]||'':'';if(id)return {kind:'embed',src:`https://www.loom.com/embed/${encodeURIComponent(id)}`,provider:'loom'};
 }
 if(['http:','https:'].includes(u.protocol)&&videoExt.test(u.pathname))return {kind:'native',src:u.href,provider:'direct'};
 if(['http:','https:'].includes(u.protocol))return {kind:'external',src:u.href,provider:'external'};
 return null;
}

export function autoplayVideoSource(source:VideoSource){if(source.kind!=='embed')return source.src;try{const u=new URL(source.src);if(source.provider==='youtube'||source.provider==='vimeo'||source.provider==='tiktok')u.searchParams.set('autoplay','1');return u.href}catch{return source.src}}
