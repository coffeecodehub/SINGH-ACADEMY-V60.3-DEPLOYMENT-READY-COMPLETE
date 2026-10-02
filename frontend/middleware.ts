import {NextRequest,NextResponse} from 'next/server';
/** Fresh document nonces. HTML is never shared-cached; immutable images/JS are cached separately. */
export function middleware(request:NextRequest){
 const nonce=btoa(crypto.randomUUID()),dev=process.env.NODE_ENV!=='production';
 let apiOrigin='';
 try{apiOrigin=new URL(process.env.NEXT_PUBLIC_API_URL||'').origin;}catch{}
 if(apiOrigin==='null')apiOrigin='';
 const csp=["default-src 'self'",`script-src 'self' 'nonce-${nonce}' 'strict-dynamic'${dev?" 'unsafe-eval'":''}`,
  "style-src 'self' 'unsafe-inline'", // Existing responsive components use inline styles.
  `img-src 'self' data: blob: https: ${dev?'http://localhost:5000':''}`,"font-src 'self' data:",
  `connect-src 'self' ${apiOrigin} ${dev?'http://localhost:5000 ws: wss:':''}`,
  `media-src 'self' blob: https: ${dev?'http://localhost:5000':''}`,
  `frame-src 'self' https://www.youtube.com https://www.youtube-nocookie.com https://player.vimeo.com https://www.tiktok.com https://www.instagram.com https://embed.ted.com https://www.dailymotion.com https://www.loom.com ${dev?'http://localhost:5000':''}`,
  "object-src 'none'","base-uri 'self'","form-action 'self'","frame-ancestors 'none'",
  ...(!dev?['upgrade-insecure-requests']:[])
 ].join('; ');
 const headers=new Headers(request.headers);headers.set('x-nonce',nonce);headers.set('Content-Security-Policy',csp);
 const response=NextResponse.next({request:{headers}});
 response.headers.set('Content-Security-Policy',csp);response.headers.set('Cache-Control','private, no-store');
 if(!dev)response.headers.set('Strict-Transport-Security','max-age=31536000');
 return response;
}
export const config={matcher:['/((?!api(?:/|$)|_next/static|_next/image|images/|optimized/|favicon.ico|.*\\.(?:png|jpg|jpeg|webp|svg|ico|woff2)$).*)']};
