from playwright.sync_api import sync_playwright
from pathlib import Path
import json
root=Path(__file__).resolve().parents[1]
results=[]
with sync_playwright() as p:
    browser=p.chromium.launch(executable_path='/usr/bin/chromium',headless=True,args=['--no-sandbox','--disable-dev-shm-usage'],timeout=15000)
    for mode in ('billing','review'):
        for width in (320,390,768,1024,1440):
            page=browser.new_page(viewport={'width':width,'height':1100})
            page.route('http**/*',lambda route:route.abort())
            page.set_content((root/(mode+'-static.html')).read_text(),wait_until='domcontentloaded',timeout=10000)
            page.evaluate("() => { const d=document.querySelector('dialog'); if(d){d.removeAttribute('open');d.showModal();} }")
            page.screenshot(path=str(root/f'{mode}-{width}.png'),full_page=True,timeout=15000)
            result=page.evaluate('({viewport:innerWidth,width:document.documentElement.scrollWidth,overflow:document.documentElement.scrollWidth>innerWidth+1})')
            results.append({'fixture':mode,**result})
            page.close()
    browser.close()
(root/'static-layout-results.json').write_text(json.dumps({'scope':'Actual Chromium rendering of static sample TSX/CSS with mocked hooks and records. Not real React/Next application testing.','results':results},indent=2))
print(json.dumps(results,indent=2))
