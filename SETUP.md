# Hosting B Cube yourself (own Supabase + own server)

This guide moves the site off Lovable completely: your own Supabase project for
the database, login, orders and media, and your own hosting for the website.
Nothing in the code is tied to Lovable any more — the only things it needs are
the environment variables in `.env`.

Follow the parts in order. Steps marked **(developer)** need someone comfortable
with a terminal; everything else is dashboard clicking.

---

## 1. Create your Supabase project

1. Sign up at supabase.com and create a new project. Keep the database password
   somewhere safe.
2. Open **Project Settings → API** and note:
   - Project URL — `https://xxxx.supabase.co`
   - Publishable / anon key (public, safe in the browser)
   - Service role key (secret — never put this in the website code)

## 2. Create the database

In the Supabase dashboard, open **SQL Editor → New query**, then run the files
from `supabase/self-host/` in this order:

| File                | What it does                                                                                             |
| ------------------- | -------------------------------------------------------------------------------------------------------- |
| `01_schema.sql`     | Creates every table, all the security rules, and both storage buckets (`site-media`, `product-uploads`). |
| `02_seed.sql`       | Adds the starting products, prices, media slots and site text.                                           |
| `03_make_admin.sql` | Gives your account the admin role (run it after you have signed up on the site).                         |

Before running `02_seed.sql`, use your editor's find-and-replace to swap every
`__MEDIA_BASE__` for your bucket's public base URL:

```
https://YOUR-PROJECT.supabase.co/storage/v1/object/public/site-media
```

## 3. Move the images and videos into Supabase **(developer)**

All 73 images/videos the site ships with are listed in `src/data/media-map.ts`.
Upload them to the public `site-media` bucket, keeping the exact file names.

Either drag-and-drop them in **Storage → site-media**, or run the helper script:

```bash
bun install

SUPABASE_URL="https://YOUR-PROJECT.supabase.co" \
SUPABASE_SERVICE_ROLE_KEY="service-role-key" \
SOURCE_BASE="https://your-current-live-site.com" \
bun scripts/upload-media.ts
```

`SOURCE_BASE` is the site the files are downloaded from (the current live/preview
site). If you already have the files in a folder locally, use
`SOURCE_DIR=./media` instead.

The script prints the `VITE_MEDIA_BASE_URL` value to use in the next step.

## 4. Configure the website

Copy `.env.example` to `.env` and fill in your values:

```
VITE_SUPABASE_URL=...
VITE_SUPABASE_PUBLISHABLE_KEY=...
VITE_SUPABASE_PROJECT_ID=...
VITE_MEDIA_BASE_URL=https://YOUR-PROJECT.supabase.co/storage/v1/object/public/site-media
SUPABASE_URL=...
SUPABASE_PUBLISHABLE_KEY=...
SUPABASE_PROJECT_ID=...
```

`VITE_MEDIA_BASE_URL` is the switch: with it set, every image and video comes
from your Supabase bucket. Leave it empty and the site falls back to the copies
bundled today, which is handy while you are still migrating.

## 5. Turn on login

In Supabase: **Authentication → Providers**.

- **Email** — on by default.
- **Google** — enable it and paste a Google OAuth client ID + secret
  (Google Cloud Console → Credentials). Add
  `https://YOUR-PROJECT.supabase.co/auth/v1/callback` as the authorised redirect URI.
- **Facebook** — same idea, from a Facebook app.

Then in **Authentication → URL Configuration** set the Site URL to your real
domain and add it to the redirect allow-list.

## 6. Build and deploy the site **(developer)**

The site is a TanStack Start app: it needs Node.js to run (it renders pages on
the server). GoDaddy _shared_ hosting cannot run Node — use a VPS, or a Node
host such as Railway, Render, Fly.io, Netlify or Vercel, and point your GoDaddy
domain at it.

```bash
bun install
bun run build:node     # produces a Node server build in .output/
node .output/server/index.mjs
```

Put it behind nginx/Caddy on port 80/443, or let the platform handle it. Set the
same environment variables from step 4 in the hosting dashboard.

## 7. Become the admin

1. Open your live site and sign up on the **Login** page.
2. Edit `03_make_admin.sql`, replacing `you@example.com` with the email you used,
   and run it in the Supabase SQL editor.
3. Reload the site — an **Admin** link appears in the header. From there you can
   change images/videos, product details and descriptions, prices, the About
   page text, and see orders and enquiries.

---

## What lives where

| Thing                                                 | Where it lives after this migration                 |
| ----------------------------------------------------- | --------------------------------------------------- |
| Website code                                          | Your GitHub repository                              |
| Fonts                                                 | In the repo, at `public/fonts/`                     |
| Images and videos                                     | Supabase Storage — public bucket `site-media`       |
| Customer artwork uploads                              | Supabase Storage — private bucket `product-uploads` |
| Products, prices, site text, orders, enquiries, carts | Supabase database                                   |
| Accounts and login                                    | Supabase Auth                                       |

## Still to build (not part of this migration)

- **Payments** — checkout records the order but takes no money yet.
- **Order/enquiry emails** — nothing is emailed today; the admin dashboard is
  the only notification.
  See `HANDOFF.md` for the full technical rundown of the backend.
