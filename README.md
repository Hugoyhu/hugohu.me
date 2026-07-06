# hugohu.me

Hugo Hu's personal website with a built-in photography portfolio and electronic component inventory manager. Other small tools may be added in the future!

## Personal Site

This static site is rendered with Next.js and tailwindcss. It is updated semi-routinely. The projects page of this site is also static, and pulls data from a ```.tsx``` file found under ```app/projects/data.tsx```.

The resume page links to a PDF found in ```public/media```. A file can be found there by the name of ```Resume.tex```, as I use a Rover Resume template that renders my resume with LaTeX. The ```Resume.pdf``` file linked on this site is updated each time I compile the LaTeX. You will need to push each time you update the resume.

With minimal setup, this site may be deployed locally:

```
pnpm build
pnpm run dev
```

My site is hosted on Vercel, free of charge, and I use Porkbun for my domain.

## Photography Portfolio (v3)

My photography portfolio (version three) fetches reduced-size previews from Cloudinary each time it is loaded. The EXIF data is shown for each photograph, as well as its title. Photographs may be viewed in one of three ways: a small "featured" subset, or grouped by collection or category.

## ```.env``` and cloud setup

Some services on my website, including my photography portfolio, requires the use of a database. I use Supabase to host a PostgreSQL instance, and I have shared query API wrappers that interface with Supabase.

If you'd like to use a database hosting service that isn't Supabase, you can simply alter the wrapper APIs.

The portfolio also requires the use of a CDN. I use Cloudinary for my image hosting. Their free plan works for my needs (25GB) and offers image uploads up to 10MB. They may have higher limits available at a cost.

This website also has authentication built-in, and uses NextAuth and bcrypt for that.

As a result, there are certain environment variables you will need to setup in a ```.env``` file you must create.

### Authentication

```NEXTAUTH_SECRET```: NextAuth uses a cryptographically secure random string to encrypt cookies and JWTs. You can generate a secret in your command line: on macOS and Linux, you can use ```openssl rand -base64 32```

```ALLOWED_EMAIL```: The website only allows for one authenticated user. This field should be populated with a plaintext record for the user's email.

```ADMIN_PASSWORD_HASHED```: The _hashed_ password should be populated in this field to be stored in the .env file. You can use the following command to hash your password: ```node -e "console.log(require('bcryptjs').hashSync('YOURPASSWORD', 10))"```

### Cloudinary

You should create a Cloudinary account and a cloud to store your photos. You should create a new one- images store directly into your media library. You should store the following fields from your Cloudinary account and cloud settings:

```CLOUDINARY_API_KEY```

```CLOUDINARY_API_SECRET```

```NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME```

```NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET``` - I set this to 'unsigned_preset', with the following configurations:

```
"unsigned_preset"

Overwrite: false
Use filename: false
Unique filename: false
Use filename as display name: false
Use asset folder as public id prefix: false
Type: upload
```

### Supabase

You should create a Supabase account and a project. In there, you should create tables for both the photography portfolio and the inventory manager. Store the names of the tables in the .env fields ```SUPABASE_PHOTO_TABLE_NAME``` and ```SUPABASE_INV_TABLE_NAME```, respectively. I used "images" and "components".

You'll also need to setup the tables with the following columns:

#### Photo Table

| column name | data type |
|-|-|
| url | text |
| camera_model | text |
| lens | text |
| times | text |
| exposure | text |
| aperture | text |
| focal_length | text |
| iso | text |
| location | text |
| title | text |
| category | text |
| trip | text |
| featured | boolean |

#### Inventory Table

| column name | data type |
|-|-|
| name | text |
| category | text |
| subcategory | text |
| manufacturer | text |
| mpn | text |
| distributor | text |
| dpn | text |

```SUPABASE_URL```, ```SUPABASE_API```, ```SUPABASE_SECRET```, ```SUPABASE_ANON_KEY```, and ```SUPABASE_SERVICE_ROLE_KEY``` should be populated from your Supabase account and project settings.
