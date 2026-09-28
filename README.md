# hugohu.me

Hugo Hu's personal website, with a built-in photography portfolio and an electronic component inventory manager. Other small tools may be added in the future!

**Stack:** Next.js (App Router) · Tailwind CSS · Supabase (PostgreSQL) · Cloudinary · NextAuth · Claude API (Haiku 4.5) · hosted on Vercel

- [Personal Site](#personal-site)
- [Photography Portfolio](#photography-portfolio-v3)
- [Inventory Manager](#inventory-manager)
- [Setup](#setup)

## Personal Site

The site is rendered with Next.js and Tailwind CSS, and is updated semi-routinely. The projects page is also static, and pulls its data from `app/projects/data.tsx`.

The resume page links to a PDF in `public/media`. The source, `Resume.tex`, lives there too: I use a Rover Resume template that renders my resume with LaTeX. `Resume.pdf` is updated each time I compile the LaTeX, so you'll need to push each time you update the resume.

My site is hosted on Vercel, free of charge, and I use Porkbun for my domain.

## Photography Portfolio (v3)

My photography portfolio (version three) at `/photos`. The images live on Cloudinary, and their metadata lives in Supabase.

- **Three views:**
  - **featured** (`/photos`): a curated selection, newest first.
  - **collections** (`/photos/collections`): every photo, grouped by category.
  - **locations** (`/photos/locations`): every photo, grouped by trip.
- **Fast previews:** the grid loads resized, auto-format previews (1200px wide, WebP/AVIF where supported) by inserting a Cloudinary transformation into each image URL. Clicking a photo opens the full-resolution original in a lightbox (`Esc` closes it).
- **EXIF details:** each photo shows its title and shooting details: camera, lens, focal length, aperture, shutter speed, and ISO.
- **Automatic metadata on upload:** when an image is uploaded (`/admin/upload`, or the **upload** link that appears in the photo nav when signed in), the EXIF data is read in the browser with `exifr`. The image goes straight from the browser to Cloudinary. Then the metadata is saved to Supabase, along with the title, location, category, trip, and "featured" flag.
- **Edit and delete in place:** when signed in, the lightbox has **edit** and **delete** buttons. Editing updates the metadata. Deleting removes both the database row and the original image from Cloudinary.
- **Caching:** pages are regenerated at most once a minute, so new uploads show up quickly without querying the database on every visit.

## Inventory Manager

A tracker for the electronic components on my workbench (`/inventory`, sign-in required). Each part stores its manufacturer and distributor part numbers, category, package, quantity, RoHS status, MSL, and optional spec notes.

- **Browse and search** every part by name, category, MPN, or distributor part number.
- **Add and edit** parts by hand. Saving upserts by MPN, so re-entering a part updates it instead of duplicating it.
- **Print bin labels:** each part can be downloaded as a small PDF label with a QR code (`@react-pdf/renderer` + `qrcode-generator`). A label is generated automatically after saving a part.
- **Import an invoice with AI:** upload a distributor invoice or packing slip PDF (Digi-Key, Mouser, LCSC, …) and the new stock is added for you. See below.

Categories and subcategories loosely follow Digi-Key's product categories and are defined in one place, `types/categories.ts`. The dropdowns, validation, and the AI prompt are all generated from it. Category names are stored on each part as plain text, so add freely, but only rename an entry alongside a data migration.

### AI invoice import

`/inventory/import` turns a PDF invoice into inventory updates using Claude Haiku 4.5. The model extracts data only, and human review is required before editing fields in the database.

1. **Extract:** the PDF is sent to Claude with a structured outputs to ensure well-formed JSON responses. Unknown fields are filled as `null`.
2. **Match:** each line is matched against existing parts by MPN (case- and whitespace-insensitive).
3. **Review:** existing components can be updated (new inventory added to count), or inputted as new. Each line part can be unticked with information manually modified before saving.
4. **Apply:** the server re-validates each line, merges duplicate MPNs, then adds the received quantities to existing parts and inserts new ones.

API calls to Claude are minimal with the Haiku 4.5 model, and cost approximately $0.01 per upload.

## Setup

### Running locally

```
pnpm install
pnpm dev
```

The site will be at the localhost address indicated after running those commands. For a production build, run `pnpm build` then `pnpm start`.

Most pages need the cloud services and environment variables below to be set up first.

### Cloud services

Some services on my website, including the photography portfolio and inventory manager, require a database. I use Supabase to host a PostgreSQL instance. If you'd like to use a database host that isn't Supabase, you'll need to swap out the Supabase client calls.

The portfolio also requires a CDN. I use Cloudinary for my image hosting. Their free plan works for my needs (25GB) and allows image uploads up to 10MB, but limits are available at a cost.

The site has authentication built in, using NextAuth and bcrypt. It only allows one user.

The inventory's invoice import uses the Claude API, which needs an Anthropic API key. A Claude API key (usage costs apply) is _not_ required for features that do not use AI.

### Environment variables

Create a `.env.local` file in the project root with the following:

| Variable | Used for |
| - | - |
| `NEXTAUTH_SECRET` | Encrypting NextAuth cookies and JWTs. Generate one with `openssl rand -base64 32` |
| `ALLOWED_EMAIL` | The one email address allowed to sign in, in plain text |
| `ADMIN_PASSWORD_HASHED` | The bcrypt hash of your password (see below) |
| `SUPABASE_URL` | Your Supabase project URL |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase service role key, used only on the server. Never expose it to the browser |
| `SUPABASE_SECRET` | Optional; the photo pages use it in place of the service role key if set |
| `SUPABASE_PHOTO_TABLE_NAME` | Name of the photo table (mine is `images`) |
| `SUPABASE_INV_TABLE_NAME` | Name of the inventory table (mine is `components`) |
| `CLOUDINARY_CLOUD_NAME` | Cloudinary cloud name |
| `CLOUDINARY_API_KEY` | Cloudinary API key |
| `CLOUDINARY_API_SECRET` | Cloudinary API secret |
| `ANTHROPIC_API_KEY` | Claude API key for invoice import |

Anything prefixed `NEXT_PUBLIC_` is visible in the browser.

#### Password hash

Hash your password with:

```
node -e "console.log(require('bcryptjs').hashSync('YOURPASSWORD', 10))"
```

You'll get a different hash every time you run this, even for the same password. This is expected behavior (from bcrypt salting).

The hash contains `$` characters, and the two places you store it treat them differently:

- **In `.env.local`**, escape each `$` with a backslash (`\$2b\$10\$...`). Otherwise Next.js reads `$2b` as a reference to another variable and mangles the hash.
- **In Vercel's dashboard**, paste the hash as-is.

#### Cloudinary

Create a Cloudinary account and a new cloud to store your photos; images are stored directly in your media library. Copy the cloud name, API key, and API secret from the Cloudinary console into the environment variables above.

Uploads are signed.

### Supabase tables

Create a Supabase project with two tables, one for the photography portfolio and one for the inventory manager, and put their names in `SUPABASE_PHOTO_TABLE_NAME` and `SUPABASE_INV_TABLE_NAME`.

#### Photo table

| column name | data type | notes |
| - | - | - |
| id | int8 | primary key, identity |
| url | text | Cloudinary URL of the original image |
| camera_model | text | |
| lens | text | |
| time | timestamptz | when the photo was taken (from EXIF); used for ordering |
| exposure | text | shutter speed, e.g. `1/250s` |
| aperture | text | |
| focal_length | text | |
| iso | text | |
| location | text | |
| title | text | |
| category | text | groups the collections view |
| trip | text | groups the locations view |
| featured | boolean | shown on the featured page |

#### Inventory table

| column name | data type | notes |
| - | - | - |
| id | uuid | primary key, default `gen_random_uuid()` |
| created_at | timestamptz | default `now()` |
| name | text | |
| manufacturer | text | |
| mpn | text | **unique**; parts are matched and upserted by MPN |
| distributor | text | |
| dpn | text | distributor part number |
| category | text | a key from `types/categories.ts` |
| subcategory | text | |
| quantity | integer | |
| package | text | e.g. `0402`, `SOT-23-5` |
| spec | text | optional free-form notes |
| rohs | boolean | |
| msl | integer | moisture sensitivity level |
| datasheet | text | optional URL of the part's datasheet |

### Deploying to Vercel

Add every variable above in your Vercel project under **Settings → Environment Variables**, with the Production environment enabled. _Changes to environment variables only take effect after you redeploy._
