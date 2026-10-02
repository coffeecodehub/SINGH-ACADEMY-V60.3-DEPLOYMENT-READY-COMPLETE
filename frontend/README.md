# V45 frontend

See `../START-HERE-V45.md` for the complete two-process setup, separate portals and environment configuration.

```bat
npm install
if not exist .env.local copy .env.example .env.local
npm run dev
```

The frontend uses `NEXT_PUBLIC_API_URL=http://localhost:5000/api`. Database and security secrets belong only in backend/.env. A real `npm run typecheck` and `npm run build` are required before deployment; these could not be verified in the delivery environment because npm DNS failed.
