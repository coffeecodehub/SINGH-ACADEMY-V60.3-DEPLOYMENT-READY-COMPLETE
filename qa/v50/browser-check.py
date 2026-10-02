from pathlib import Path
import json,base64,sys,os
from playwright.sync_api import sync_playwright
r=Path(sys.argv[1]).resolve() if len(sys.argv)>1 else Path(__file__).resolve().parents[2]; fixtures=r/'qa/v50/fixtures'; shot=r/'qa/v50/screenshots';shot.mkdir(exist_ok=True)
results=[]
with sync_playwright() as p:
 b=p.chromium.launch(executable_path=os.environ.get('CHROMIUM_PATH','/usr/bin/chromium'),headless=True,args=['--no-sandbox'])
 page=b.new_page(viewport={'width':1440,'height':1000},device_scale_factor=1)
 for name in ['admin-overview','super-overview','admin-subscriptions','billing-plans','billing-invoices','billing-payments','crop-editor','certificate-error']:
  for width in [320,390,768,1024,1440]:
   page.set_viewport_size({'width':width,'height':1000})
   page.set_content((fixtures/(name+'.html')).read_text(),wait_until='domcontentloaded');page.wait_for_timeout(70)
   overflow=page.evaluate('({scroll:document.documentElement.scrollWidth,width:innerWidth,body:document.body.scrollWidth})')
   results.append({'fixture':name,'width':width,'pageOverflow':overflow['scroll']>width+1,'measured':overflow})
   if width in [390,1440]:
    if name=='certificate-error': page.locator('#certificateActionError').scroll_into_view_if_needed()
    page.screenshot(path=str(shot/f'{name}-{width}.png'),full_page=(name!='certificate-error'))
  if name=='certificate-error':
   gap=page.evaluate("""()=>{const error=document.querySelector('#certificateActionError').getBoundingClientRect(),input=document.querySelector('input[type=password]').getBoundingClientRect();return {gap:error.top-input.bottom,hasError:!!document.querySelector('#certificateActionError'),passwordDescribed:document.querySelector('input[type=password]').getAttribute('aria-describedby')}}""")
   results.append({'inlineErrorGeometry':gap});assert 0<=gap['gap']<70
 # Actual canvas drawing function, transpiled from the delivered component. No React or upload server.
 page.goto('about:blank');page.add_script_tag(path=str(fixtures/'drawCrop.js'))
 canvas=page.evaluate("""async()=>{
 const src=document.createElement('canvas');src.width=800;src.height=600;const q=src.getContext('2d');
 q.fillStyle='#ff0000';q.fillRect(0,0,400,300);q.fillStyle='#00ff00';q.fillRect(400,0,400,300);q.fillStyle='#0000ff';q.fillRect(0,300,400,300);q.fillStyle='#ffff00';q.fillRect(400,300,400,300);
 const image=new Image();image.src=src.toDataURL();await image.decode();
 const c=document.createElement('canvas'),pixel=(x,y)=>Array.from(c.getContext('2d').getImageData(x,y,1,1).data);
 const list=[];const check=(name,s,expect)=>{drawCrop(c,image,{...defaultCrop,...s},400);const a=pixel(10,10).slice(0,3);if(JSON.stringify(a)!==JSON.stringify(expect))throw Error(name+': '+a);list.push({name,pixel:a,width:c.width,height:c.height});};
 check('default top left',{},[255,0,0]);check('horizontal flip',{flipX:true},[0,255,0]);check('vertical flip',{flipY:true},[0,0,255]);check('90 degree rotation',{rotation:90},[0,0,255]);check('180 degree rotation',{rotation:180},[255,255,0]);check('270 degree rotation',{rotation:270},[0,255,0]);
 for(const aspect of ['4:3','1:1','3:4','16:9','original'])for(const rotation of [0,90,180,270])for(const [x,y] of [[-100,-100],[100,100],[0,0]]){drawCrop(c,image,{...defaultCrop,aspect,rotation,zoom:1.8,x,y},400);for(const p of [[2,2],[c.width-3,2],[2,c.height-3],[c.width-3,c.height-3]]){const v=pixel(...p);if(v[0]>250&&v[1]>250&&v[2]>250)throw Error('Blank exposed edge');}list.push({name:'covered crop bounds',aspect,rotation,x,y,width:c.width,height:c.height});}
 drawCrop(c,image,{...defaultCrop,brightness:60},400);if(pixel(10,10)[0]>=180)throw Error('Brightness control failed');list.push({name:'brightness darkens output',pixel:pixel(10,10)});
 drawCrop(c,image,{...defaultCrop},1200);const blob=await new Promise(resolve=>c.toBlob(resolve,'image/jpeg',.94));if(blob.type!=='image/jpeg'||blob.size===0)throw Error('JPEG export failed');list.push({name:'JPEG export',width:c.width,height:c.height,bytes:blob.size});return list;
 }""")
 results.append({'canvasChecks':canvas})
 b.close()
file=r/'qa/v50/browser-fixtures.json';file.write_text(json.dumps({'scope':'Isolated source-component layout with mocked hooks and data; native Chromium canvas execution. Not a running Next/React/API integration test.','results':results},indent=2))
print('Layout viewport checks:',len([x for x in results if 'width' in x]));print('Overflow:',[x for x in results if x.get('pageOverflow')]);print('Native canvas checks:',len(canvas));print(file)
