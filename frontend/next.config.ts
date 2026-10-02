import type {NextConfig} from 'next';

function apiProxyTarget(){
 const raw=(process.env.API_PROXY_TARGET||'').replace(/\/$/,'');
 if(!raw)return '';
 try{
  const u=new URL(raw);
  if(u.origin!==raw||!['http:','https:'].includes(u.protocol)||u.username||u.password||(process.env.NODE_ENV==='production'&&u.protocol!=='https:'))throw new Error();
  return u.origin;
 }catch{throw new Error('API_PROXY_TARGET must be an exact HTTP/HTTPS origin; HTTPS is required in production.');}
}
const proxy=apiProxyTarget();
const nextConfig:NextConfig={
 output:'standalone',poweredByHeader:false,compress:true,reactStrictMode:true,
 devIndicators:false,productionBrowserSourceMaps:false,
 // Images are served by the local responsive-image component. No remote fetch proxy is needed.
 images:{unoptimized:true},
 async rewrites(){return proxy?[{source:'/api/:path*',destination:`${proxy}/api/:path*`}]:[];},
 async headers(){return [
  {source:'/:path*',headers:[
   {key:'X-Content-Type-Options',value:'nosniff'},
   {key:'X-Frame-Options',value:'DENY'},
   {key:'Referrer-Policy',value:'strict-origin-when-cross-origin'},
   {key:'Permissions-Policy',value:'camera=(), microphone=(), geolocation=()'}
  ]},
  {source:'/optimized/:path*',headers:[{key:'Cache-Control',value:'public, max-age=31536000, immutable'}]}
 ];}
};
export default nextConfig;
