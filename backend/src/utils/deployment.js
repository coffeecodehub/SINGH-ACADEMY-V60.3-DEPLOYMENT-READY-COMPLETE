import {gatewayConfiguration} from './commerce.js';
/** Pure deployment validation. Never print secret values. */
export function isPlaceholder(value) {
  return !value || /CHANGE[_ -]?ME|YOUR_|REPLACE[_ -]?WITH|GENERAT(?:E|ED)[_ -]?(?:BY|WITH)|example\.(?:com|org|net)/i.test(value);
}
export function envInteger(value, fallback, minimum, maximum) {
  if (value === undefined || value === '') return fallback;
  const number = Number(value);
  if (!Number.isInteger(number) || number < minimum || number > maximum) throw new Error('An environment numeric setting is outside its allowed range.');
  return number;
}
export function checkEnvironment(env = process.env) {
  const errors = [], warnings = [], production = env.NODE_ENV === 'production';
  const secret = env.AUTH_SECRET || env.JWT_SECRET || '';
  if (isPlaceholder(secret) || secret.length < 32 || new Set(secret).size < 8) errors.push('AUTH_SECRET must be a non-placeholder random secret of at least 32 characters. Run npm run setup.');
  if (!/^[a-f\d]{64}$/i.test(env.MFA_ENCRYPTION_KEY || '') || new Set(env.MFA_ENCRYPTION_KEY || '').size < 8) errors.push('MFA_ENCRYPTION_KEY must be 64 random hexadecimal characters. Preserve an existing configured key.');
  const uri = env.MONGODB_URI || env.MONGO_URI || '';
  if (!/^mongodb(?:\+srv)?:\/\//.test(uri) || isPlaceholder(uri)) errors.push('Set an actual MONGODB_URI. Do not use the example URI in production.');
  const origins = (env.FRONTEND_URLS || env.FRONTEND_URL || 'http://localhost:3000').split(',').map(x => x.trim()).filter(Boolean);
  for (const origin of origins) {
    try { const u = new URL(origin); if (u.origin !== origin || !['http:', 'https:'].includes(u.protocol) || u.username || u.password) throw new Error(); if (production && u.protocol !== 'https:') throw new Error(); }
    catch { errors.push('Each FRONTEND_URLS entry must be an exact website origin, without a path or wildcard; HTTPS is required in production.'); }
  }
  try { envInteger(env.PORT, 5000, 1, 65535); envInteger(env.TRUST_PROXY_HOPS, 0, 0, 3); envInteger(env.MAX_UPLOAD_MB, 250, 1, 500); envInteger(env.MONGO_MAX_POOL, 20, 2, 100); }
  catch (error) { errors.push(error.message); }
  if (production) {
    if (env.REQUIRE_ADMIN_MFA !== 'true') errors.push('Production requires REQUIRE_ADMIN_MFA=true. Enrol both administrator accounts before handover.');
    if (!env.SMTP_HOST || isPlaceholder(env.SMTP_HOST) || !env.EMAIL_FROM || /YOUR_|example\./i.test(env.EMAIL_FROM)) errors.push('Production requires configured SMTP_HOST and EMAIL_FROM; the development console is not an email service.');
    if (!env.FRONTEND_URL || !origins.includes(env.FRONTEND_URL)) errors.push('FRONTEND_URL must be one of the allowed HTTPS origins.');
    if (env.PUBLIC_API_URL !== '/api') warnings.push('Use PUBLIC_API_URL=/api with the supplied same-origin reverse proxy. Cross-site frontend/API hosting is unsupported by this deployment.');
    if (env.UPLOAD_SCAN_REQUIRED !== 'true' || !env.CLAMAV_HOST) errors.push('Production uploads require UPLOAD_SCAN_REQUIRED=true and a reachable CLAMAV_HOST.');
    if (/localhost|127\.0\.0\.1/.test(uri) && !/replicaSet=/.test(uri)) warnings.push('A local database must run as a replica set for financial transactions.');
  }
  if(env.ONLINE_PAYMENTS_ENABLED==='true'){
    const methods=gatewayConfiguration(env);
    if(!Object.values(methods).some(m=>m.enabled))errors.push('Online checkout is enabled but no complete Stripe or PayPal configuration is present. Set the provider credentials and webhook settings.');
    if(env.PAYMENTS_REQUIRE_BOTH==='true'&&(!methods.stripe.enabled||!methods.paypal.enabled))errors.push('PAYMENTS_REQUIRE_BOTH=true requires complete Stripe and PayPal configuration.');
    if(methods.stripe.enabled&&methods.paypal.enabled&&methods.stripe.environment!==methods.paypal.environment)errors.push('Stripe and PayPal must use the same payment environment. Do not mix test/sandbox credentials with live credentials.');
    if(production&&Object.values(methods).some(m=>m.enabled&&m.environment!=='live'))errors.push('Production checkout cannot use sandbox/test payment credentials.');
    if(!env.FRONTEND_URL)errors.push('Online checkout requires an explicit FRONTEND_URL for return links.');
    if(!env.PAYMENT_WEBHOOK_BASE_URL)warnings.push('PAYMENT_WEBHOOK_BASE_URL is not set; webhook checks will default to FRONTEND_URL. Set the direct public API origin when frontend and backend use different hosts.');
    if(env.PAYMENT_WEBHOOK_BASE_URL){
      try{const u=new URL(env.PAYMENT_WEBHOOK_BASE_URL);if(u.origin!==env.PAYMENT_WEBHOOK_BASE_URL||!['http:','https:'].includes(u.protocol)||u.username||u.password||(production&&u.protocol!=='https:'))throw new Error();}
      catch{errors.push('PAYMENT_WEBHOOK_BASE_URL must be an exact HTTP/HTTPS origin; HTTPS is required in production.');}
    }
  }
  return {errors: [...new Set(errors)], warnings, production, origins};
}
export function assertEnvironment(env = process.env) {
  const result = checkEnvironment(env);
  if (result.errors.length) throw new Error(result.errors.join('\n'));
  for (const warning of result.warnings) console.warn('Configuration:', warning);
  return result;
}
