import {test,expect} from '@playwright/test';
for(const width of [320,390,768,1440])for(const route of ['/','/login','/admin/login','/super-admin/login','/contact']){
 test(`real frontend ${route} at ${width}px`,async({page})=>{
  await page.setViewportSize({width,height:900});const failures:string[]=[];page.on('pageerror',e=>failures.push(e.message));
  const response=await page.goto(route,{waitUntil:'networkidle'});expect(response?.status()).toBe(200);
  await expect(page.locator('main').first()).toBeVisible();
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1)).toBe(true);
  expect(failures).toEqual([]);const csp=response?.headers()['content-security-policy']||'';expect(csp).toContain("'nonce-");expect(csp).toContain("frame-ancestors 'none'");
  if(route.endsWith('/login'))await expect(page.locator('input[type=password]')).toBeVisible();
 });
}
test('public navigation does not advertise internal administrative portals',async({page})=>{await page.goto('/');await expect(page.locator('header a[href="/super-admin/login"],header a[href="/admin/login"]')).toHaveCount(0);});
test('retired resource routes return 404 rather than demo content',async({page})=>{const response=await page.goto('/free-resources');expect(response?.status()).toBe(404);});
test('home retains responsive image sources without oversized implicit heights',async({page})=>{await page.goto('/');const images=page.locator('img[src*="/optimized/"]');expect(await images.count()).toBeGreaterThan(0);const first=images.first();expect(await first.getAttribute('srcset')).toBeTruthy();await expect(first).toBeVisible();expect(await first.evaluate(img=>{const r=img.getBoundingClientRect();return r.width>0&&r.height>0&&r.height<2000;})).toBe(true);});
