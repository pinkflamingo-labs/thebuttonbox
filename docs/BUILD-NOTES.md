# The Button Box: build notes for anyone adding to the code

The Button Box is a makers' studio for every craft: a pattern library, makes journal, stash, "What can I make?",
planner, shopping list, measurements, toolbox and four painted rooms covering 16 crafts. It is a multi-user,
subscription-ready web app.

## Stack
- Next.js 16 App Router, **JavaScript with JSX** (no TypeScript), deployed on Vercel.
- Supabase: Postgres with row-level security, Auth (email and password, Google, required MFA with an authenticator
  app), private Storage bucket `maker-photos`.
- Stripe for subscriptions (test mode first). Billing can be switched off in admin settings (everyone gets access).
- Optional AI reading (any OpenAI-compatible service, including Azure OpenAI) for pattern PDFs and snapped labels.
- No other npm packages are available. Do not add dependencies. Use plain React, the Supabase clients and fetch.

## Next.js 16 rules
- `params` and `searchParams` are Promises: `export default async function Page({ params }) { const { id } = await params }`.
- `cookies()` and `headers()` are async.
- Route handlers: `export async function POST(request) { ... return Response.json(...) }`.
- `proxy.js` (formerly middleware) already guards `/studio`, `/account` and `/security` (sign-in, then the second step).
- Client components start with `'use client'`. Server components fetch data and pass plain objects to client components.
- Use `next/link` for links and `next/navigation` (`useRouter`, `usePathname`, `redirect`, `notFound`).

## Data access
- Server components: `const { supabase, user, profile, access } = await requireMaker()` from `@/lib/access`
  (only inside `/studio` and `/account`). Then query with `supabase.from('table')`.
- Client components: `supabaseBrowser()` from `@/lib/supabase/client`. RLS limits every query to the maker's own rows,
  so never filter by user id for security (it is fine to rely on RLS); `user_id` defaults to `auth.uid()` on insert, so do
  not send it.
- API routes: start with `const g = await requireApiMaker({ needAccess: true }); if (g.error) return g.error` from
  `@/lib/api-guard` (signed in, second step done, and access to add things when `needAccess`), and reject other sites
  with `if (!sameOrigin(request)) return Response.json({ error: 'Not allowed' }, { status: 403 })`.
- Server-only secret client: `supabaseAdmin()` from `@/lib/supabase/admin` (webhooks, account deletion, tokens). Never
  import it from a client component.
- Photos: upload with `uploadPhoto(blob, folder)` and shrink with `shrinkImage(file)` from `@/lib/photos-client`;
  show them with signed links: server `signPaths(supabase, paths)` from `@/lib/photos`, or client `signedUrl(path)`.
  `components/PhotoField.js` does pick, shrink, upload and preview.
- Inserts and updates fail with a row-level security error when the maker has no access (trial over, no subscription).
  Turn any Supabase error into plain words with `friendlyError(error)` from `@/lib/errors` (it covers read-only,
  duplicates, bad values, dropped connections and expired sign-ins) and show it with `useToast` or a `notice error`.

## Tables (see supabase/schema.sql for every column)
`profiles`, `app_settings` (billing_enabled, require_mfa, trial_days), `crafts`, `patterns` (size_chart jsonb,
supplies jsonb array of { name, optional }, details jsonb), `pattern_files`, `requirements` (per variation and size
range: material, amount, unit, width_cm), `projects` (stage: daydream, planned, cut, making, finished, loved),
`shopping_items`, `stash_items` (kind, room, quantity, unit, width_cm, stretch_pct, yarn_weight, metres_per_unit...),
`makes` (pattern_id, finished_on, size_made, changes, thoughts, next_time, would_make_again, rating, photo_path,
stash_ids), `measurement_profiles` (one called "Me" is created at sign-up, is_me true), `measurements`,
`billing_customers`, `subscriptions`, `connections` (server only), `usage_events`, `audit_log`.
RPCs: `my_connections()`, `count_recent_usage(p_kind, p_minutes)`, `admin_overview()`,
`admin_update_settings(p_billing, p_mfa, p_trial)`.

## Shared code you should reuse
- `lib/crafts.js`: ROOMS (key, name, family, tone, art, alt, blurb), ROOM, CRAFTS (slug, name, short, room, icon),
  CRAFT, craftsInRoom, familyOf, roomOf, SHARED, STASH_KINDS (per room: key, label, unit, fields), STASH_KIND,
  FIELD_LABELS, UNITS, YARN_WEIGHTS, STAGES, stageLabel(stage, craft), TOOLS (per room), SNAP_TYPES.
- `lib/format.js`: toMetres, lengthLabel, amountLabel, cmLabel, dateLabel, dayLabel, daysUntil, plural, money, num.
- `lib/sizing.js`: workOutSize(chart, measurements), requirementsFor(chart, rows, size), easeNote, latestMeasurements, hasChart.
- `lib/match.js`: whatCanIMake({ patterns, requirements, stash, measurements, focusStashId }), shoppingFor(...), cover().
- `lib/access.js`: getMaker, requireMaker, computeAccess. `lib/billing.js`: Stripe helpers. `lib/ai.js`: aiJSON.
  `lib/usage.js`: allowUse(supabase, kind) for fair-use limits.
- Components: `Icons` (IconSprite is already in the layout; use `<svg><use href="#i-name"/></svg>` or `<Icon name="i-name"/>`),
  `PageHead` (kicker, title, lede, family, actions as children), `Empty`, `Seam`, `NeedleLoader`, `Stars`, `Drawer`,
  `useToast` (from `components/Toast.js`), `PinButton`, `TapeMeasure`, `PhotoField`, `HeroStage`, `CalmSwitch`, `Selvedge`.
- Icon names: craft icons `i-sewing i-quilt i-embroidery i-mending i-cosplay i-knitting i-crochet i-macrame i-weaving
  i-punch i-scrapbook i-card i-cutting i-jewellery i-candle i-general`; UI `i-home i-library i-stash i-spark i-planner
  i-journal i-rooms i-toolbox i-upload i-camera i-person i-key i-signout i-plus i-search i-edit i-trash i-link i-file
  i-cloud i-check i-close i-chev i-back i-flip i-copy i-lock i-shield i-heart i-measure i-basket i-ext i-pin i-spool
  i-thimble i-button i-needle i-yarnball i-tin`.

## Page addresses (link between features with these)
- `/studio` home, `/studio/library` (filters: `?craft=<slug>&room=<key>&q=<text>&status=owned|wishlist&made=yes|no`),
  `/studio/library/new`, `/studio/library/<id>` (pattern card with Details, Files, Makes and Plan tabs).
- `/studio/stash` (`?room=<key>&kind=<kind>&add=1`), `/studio/make` (`?stash=<stash id>` focuses one stash item).
- `/studio/planner` (`?pattern=<pattern id>` opens a new project for that pattern), `/studio/makes`
  (`?pattern=<pattern id>&new=1` opens a new journal entry for that pattern).
- `/studio/measurements`, `/studio/rooms`, `/studio/rooms/<fabric|yarn|paper|studio>`, `/studio/toolbox#<tool key>`.
- `/studio/import`, `/studio/snap`, `/studio/admin`, `/account`, `/pricing`, `/sign-in`, `/sign-up`, `/forgot`, `/reset`,
  `/security/setup`, `/security/verify`, `/privacy`, `/terms`.

## Look and feel (app/globals.css): use these classes, do not invent a new look
Depth comes from layers: the page ambience, glass panels with a reflection, layered pastel shadows, halos behind
cards, lit jewels and gradient ink. Every surface should feel lit and lifted.
- Family colour scope: add `fam-pink` (fabric), `fam-pur` (yarn), `fam-blu` (paper) or `fam-grn` (studio) to any element;
  children then use `var(--f1)` (light), `var(--f2)` (deeper), `var(--fi)` (ink) and `rgba(var(--fglow), .5)` (glow).
  `familyOf(craftOrRoom)` returns the family key.
- Surfaces: `glass` (panel with reflection), add `pad` or `pad-lg`; `panel` adds the spotlight behind major sections
  (`spot-blu`, `spot-pink`, `spot-grn` vary it); `lift` lifts and glows on hover; `sheen` sweeps a light band on hover;
  `rib` adds a family ribbon on the left edge; wrap a card in `<div className="backlit fam-x">` to light it from behind.
- Paintings: `painting` (staged, rim light); cut-outs: `cutout`.
- Type: `display h1` / `display h2` (gradient ink), `kicker` (with a glowing bead, uses the family ink), `lede`,
  `small`, `muted`, `hand` (handwriting notes), `label`, `num`.
- Layout: `wrap`, `section`, `stack`, `row`, `spread`, `cards` (auto grid, set `--min`), `g2`, `g3`, `g4`, `split`, `page-head`.
- Controls: `btn` (plum, stitched), `btn soft`, `btn fam` (family ink), `btn ghost`, `btn danger`, `btn small`, `btn tiny`,
  `icon-btn`, `pill` with `aria-pressed` for filters (`pills` wrapper), `chip`, `tag` (jewel pill in family colour),
  `jewel` (lit gem circle for icons, size with `--js`), `dot`.
- Forms: `field` (a label wrapper: `<label className="field"><span>Name</span><input/></label>`), `form-grid`,
  `form-actions`, `check`, `notice` (`warn`, `error`). Inputs, selects and textareas are styled globally.
- Cards: `room-card` (pic + body), `craft-tile`, `stat` (`n` number, `l` label), `pcard` (pattern card), `envelope`,
  `swatch-card` + `swatch` (pinked fabric edge, set `--sw` to a colour), `hoop` (makes framed in a hoop, `--hs` size),
  `note-paper` (handwritten note on dotted pattern paper), `rows` + `row-item`.
- Sewing touches: `Seam` component between sections, `TapeMeasure`, `NeedleLoader`, `PinButton`, `Stars`, `tabs`.
- Entrance: add `rise` with `style={{ '--d': '.08s' }}` for a staggered entrance.
- Calm mode (`html.calm`) and reduced motion stop all movement; do not add motion that ignores it.

## Writing rules for anything a maker reads
- Australian English (colour, metres, favourite, organise). Plain, warm, specific. No buzzwords.
- **Never use em or en dashes** (the characters U+2014 and U+2013). Use commas, colons or full stops. `node qa/check.mjs` fails on them.
- No made-up facts, numbers, testimonials or prices. Prices come from Stripe.
- Every button says what happens. Errors say what went wrong and what to do next.
- Accessibility: real labels on inputs, `aria-pressed` on toggles, alt text on paintings and photos, keyboard reachable,
  visible focus (already styled).

## Area stylesheets and saved settings
- Each area has its own stylesheet in `styles/` with its own class prefix: `library.css`, `studio.css` (`st-`),
  `rooms-tools.css` (`rt-`), `import.css` (`imp-`) and `public.css` (landing, sign-in, pricing, account and legal pages). Shared looks belong in `app/globals.css`.
- Browser storage keys: `bb-calm` (calm mode) and `bb-counters` (toolbox row and stitch counters).
- Patterns and makes without a craft count in the Studio room.

## Check your work
Run `node qa/check.mjs` from the project folder after every few files. It bundles everything with esbuild (packages
external) and fails on syntax errors, missing files, missing exports and dashes.
