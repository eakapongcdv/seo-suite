# Next.js + NextAuth (Google) + SEO Wizard

## Quick Start
1. `pnpm i`
2. copy `.env.example` to `.env.local` and fill GOOGLE & DATABASE
3. `npx prisma migrate dev -n init`
4. `pnpm dev` → open `/signin` then `/app/seo/wizard`

This starter includes:
- Google login with NextAuth v5 (Prisma adapter)
- SEO Wizard (manual/CSV/sitemap import)
- SERP preview, Lighthouse placeholders, Baidu checklist
- Save to DB (Project/Page) via server action
