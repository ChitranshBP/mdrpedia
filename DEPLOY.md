# MDRPedia Deployment Guide

## 1. Environment Variables
Create a `.env` file in the root directory (or configure in Vercel/Netlify):

```env
# Database (Prisma)
DATABASE_URL="postgresql://user:password@host:5432/mdrpedia?pgbouncer=true"
DIRECT_URL="postgresql://user:password@host:5432/mdrpedia"

# Auth & Admin
ADMIN_ACCESS_KEY="mdr2026"  # CHANGE THIS IN PRODUCTION

# External APIs
NCBI_API_KEY="your_ncbi_key"
CROSSREF_MAILTO="admin@mdrpedia.com"

# Cloudinary (Optional for Image Optimization)
CLOUDINARY_CLOUD_NAME="..."
CLOUDINARY_API_KEY="..."
CLOUDINARY_API_SECRET="..."
```

## 2. Platform Guides

### Vercel (Recommended)
1. Install Vercel CLI: `npm i -g vercel`
2. Run `vercel` in the project root.
3. Select `Astro` as the framework (auto-detected).
4. Add Environment Variables in the Vercel Dashboard.
5. **Important**: Add a "Build Step" to generate Prisma client: `npx prisma generate && astro build`.

### Docker
Build the container:
```bash
docker build -t mdrpedia .
```
Run:
```bash
docker run -p 4321:4321 --env-file .env mdrpedia
```

## 3. Database Migration
Run migration on deployment:
```bash
npx prisma db push
```
*(Note: Use `prisma migrate deploy` for production with migrations history)*

## 4. Post-Deployment Verification
- Visit `/admin?key=mdr2026` to verify admin access.
- Check `/api/admin/config` to ensure system sovereignty.
