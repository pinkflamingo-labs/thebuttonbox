# The Button Box

A makers' studio for every craft: sewing, quilting, embroidery, mending, cosplay, knitting, crochet, macramé, weaving,
punch needle, scrapbooking, cards and junk journals, cutting machine projects, jewellery, candles and soap, and anything
else. Each maker keeps their patterns, makes, stash, measurements and plans in one place, in four painted rooms.

Built as a showcase by Charlie Marie Shanks with Microsoft Copilot Cowork.

## What it does

- **Library.** Every pattern as a flip-over envelope: the cover on the front, and on the back the size to cut, where to
  grade, how much fabric or yarn for that size, what it is rated for, the supplies and the fit, worked out from the
  maker's own measurements. Details, files, makes and plans for each pattern, plus "Last time you said".
- **Bring patterns in.** From a computer folder, OneDrive, Google Drive, Dropbox or Ravelry. PDFs are read in the
  browser; the files stay where they are and the studio keeps a link, the details and a small cover picture.
- **Snap a label.** Photograph a pattern envelope, fabric bolt, yarn band or notion packet and the details fill
  themselves in (when AI reading is switched on).
- **Stash.** Fabric, thread, notions, yarn, paper, beads, wax and more, with pinked swatches and where each thing lives.
- **What can I make?** Matches the stash against every pattern for the maker's size, with near misses and tips.
- **Planner and shopping list.** Projects move along a tape measure from daydream to worn and loved; the shopping list
  fills itself from what each plan still needs.
- **Makes journal.** Photos in embroidery hoops, what was changed, thoughts, ratings and notes for next time.
- **Measurements, rooms and toolbox.** Measurement history for each person you sew for, a room for each family of crafts,
  and calculators (conversions, circle skirts, bias binding, quilt backing, counters, tension, yarn swaps and more).
- **Accounts and subscriptions.** Sign-up with a free trial, a required authenticator app, Stripe subscriptions with an
  optional joining fee, a customer portal, data export and account deletion, and an admin page.

## How it is built

| Part | What it uses |
| --- | --- |
| Website | Next.js 16 (App Router, JavaScript) on Vercel |
| Data and sign-in | Supabase: Postgres with row-level security, Auth with required MFA, private photo storage |
| Payments | Stripe Checkout, Billing and the customer portal (test mode first) |
| Reading PDFs | pdf.js in the browser |
| Reading photos and patterns | Any OpenAI-compatible service, including Azure OpenAI (optional) |
| Connections | Microsoft Graph (OneDrive), Google Picker (Drive), Dropbox Chooser, Ravelry OAuth 2.0 (all optional) |

### Security in short

- Every table has row-level security: a maker can only ever see and change their own rows.
- The second sign-in step (an authenticator app) is required by default, and enforced in the database as well as on
  the pages, so a stolen password alone cannot read anything.
- Adding and changing things needs an active trial or subscription, checked in the database.
- Pattern files are never uploaded. Photos are private and shown with links that expire.
- Ravelry sign-in tokens are encrypted before they are stored, and only the server can read them.
- Strict security headers (content security policy, HSTS, no framing).

## Folders

```
app/            pages and API routes (studio pages live under app/studio)
components/     shared interface pieces (envelope, drawers, tape measure, icons and more)
lib/            data, sizing, matching, billing, AI and security helpers
styles/         page styles; app/globals.css holds the design system
supabase/       schema.sql: tables, security rules, functions and storage, run once in Supabase
public/art/     the watercolour paintings
docs/           SETUP.md (step by step) and BUILD-NOTES.md (for anyone changing the code)
qa/             the code checker
```

## Getting it running

Follow **docs/SETUP.md**. In short: run `supabase/schema.sql` in a new Supabase project, create the Stripe test products,
put the code on GitHub, import it into Vercel with the environment variables from `.env.example`, then sign up and make
yourself the admin.

## Working on the code

```
npm install        # also copies pdf.js into public/pdfjs
npm run dev        # http://localhost:3000
npm run check      # bundles every file and checks the Next.js rules and the writing rules
npm run build
```

Read `docs/BUILD-NOTES.md` before adding pages: it lists the helpers, components and design classes to reuse.
