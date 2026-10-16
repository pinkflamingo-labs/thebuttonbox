# Setting up The Button Box

About an hour for the core (Supabase, Stripe test mode, GitHub and Vercel). The connections in step 7 are optional and
can be added any time: each one switches itself on when its keys are added.

You will need free accounts with **GitHub**, **Vercel**, **Supabase** and **Stripe**. Keep a private note open as you go
to collect the keys; never put them in GitHub.

---

## 1. Supabase: the database, sign-in and photo storage

1. Create a new project at supabase.com. Pick the **Sydney** region and save the database password somewhere safe.
2. Open **SQL Editor**, paste the whole of `supabase/schema.sql`, and select **Run**. It creates every table, the
   security rules, the functions and the private `maker-photos` storage bucket. It is safe to run again after updates.
3. **Authentication > Sign In / Providers > Email**: keep Email on and **Confirm email** on. Set the minimum password
   length to 10.
4. **Authentication > Multi-Factor**: check that **App Authenticator (TOTP)** is switched on (it normally is).
5. **Authentication > URL Configuration** (come back after step 4 when you know your Vercel address):
   - Site URL: `https://YOUR-SITE.vercel.app`
   - Redirect URLs: `https://YOUR-SITE.vercel.app/**` and, for working on your own computer, `http://localhost:3000/**`
6. **Confirmation emails that work on any device (recommended).** Under **Authentication > Emails > Templates >
   Confirm signup**, change the link to
   `{{ .SiteURL }}/auth/confirm?token_hash={{ .TokenHash }}&type=email&next=/security/setup`
   so a maker can sign up on a laptop and confirm on their phone.
7. **Emails.** Supabase's built-in sender only sends a couple of emails an hour, which is fine for you but not for other
   makers. Before inviting anyone, add your own sender under **Authentication > Emails > SMTP Settings** (Resend has a
   free plan and a step-by-step Supabase guide).
8. **Project Settings > API Keys**: copy the **Project URL**, the **publishable key** and the **secret key**.

## 2. Stripe: plans and the joining fee (test mode)

Stay in **Test mode** (the toggle at the top of the Stripe Dashboard). No real money moves.

1. **Product catalogue > Add product**: "The Button Box membership" with two prices in AUD: one **recurring monthly**
   and one **recurring yearly**. Choose the amounts you want; the pricing page reads them from Stripe.
2. Optional joining fee: another product, "Joining fee", with a **one-off** price. It is added to a maker's first payment.
3. Copy the three **price IDs** (they start with `price_`).
4. **Developers > API keys**: copy the **secret key** (`sk_test_...`).
5. **Settings > Billing > Customer portal**: turn it on and allow cancelling **at the end of the billing period** (the
   pricing page promises that), updating the payment method and switching between the monthly and yearly prices.
6. Webhook (after step 4, once you know your Vercel address): **Developers > Webhooks > Add endpoint**
   - Endpoint URL: `https://YOUR-SITE.vercel.app/api/billing/webhook`
   - Events: `checkout.session.completed`, `checkout.session.async_payment_succeeded`,
     `customer.subscription.created`, `customer.subscription.updated`, `customer.subscription.deleted`
   - Copy the **signing secret** (`whsec_...`).
7. To test a payment, use the card `4242 4242 4242 4242`, any future expiry date and any three-digit code.

## 3. GitHub: put the code online

1. Create a new **private** repository, for example `the-button-box`.
2. Upload the contents of the project folder (the folder with `package.json` in it). The GitHub web page accepts drag
   and drop, or use GitHub Desktop.
3. Do not upload a `.env.local` file if you made one. `.gitignore` already keeps it out.

## 4. Vercel: publish the site

1. **Add New > Project**, import the GitHub repository. Vercel recognises Next.js by itself.
2. Before deploying, open **Environment Variables** and add these (names exactly as written):

| Name | Required | Where it comes from |
| --- | --- | --- |
| `NEXT_PUBLIC_SITE_URL` | Yes | Your Vercel address, for example `https://the-button-box.vercel.app` |
| `NEXT_PUBLIC_SUPABASE_URL` | Yes | Supabase Project URL |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | Yes | Supabase publishable key |
| `SUPABASE_SECRET_KEY` | Yes | Supabase secret key (never share it) |
| `STRIPE_SECRET_KEY` | For billing | Stripe secret key |
| `STRIPE_WEBHOOK_SECRET` | For billing | Stripe webhook signing secret |
| `STRIPE_PRICE_MONTHLY`, `STRIPE_PRICE_YEARLY` | For billing | Stripe price IDs |
| `STRIPE_PRICE_JOINING` | Optional | Stripe one-off price ID |
| `AI_PROVIDER`, `AI_BASE_URL`, `AI_API_KEY`, `AI_MODEL` | Optional | See step 7 |
| `NEXT_PUBLIC_ONEDRIVE_CLIENT_ID` | Optional | See step 7 |
| `NEXT_PUBLIC_GOOGLE_CLIENT_ID`, `NEXT_PUBLIC_GOOGLE_API_KEY`, `NEXT_PUBLIC_GOOGLE_APP_ID` | Optional | See step 7 |
| `NEXT_PUBLIC_DROPBOX_APP_KEY` | Optional | See step 7 |
| `RAVELRY_CLIENT_ID`, `RAVELRY_CLIENT_SECRET`, `TOKEN_ENCRYPTION_KEY` | Optional | See step 7 |
| `NEXT_PUBLIC_GOOGLE_SIGN_IN` | Optional | `on` to show "Continue with Google" (set up the Google provider in Supabase first) |

3. **Deploy.** When it finishes, copy the address, then finish step 1.5 (Supabase URLs) and step 2.6 (Stripe webhook).
   If the address differs from `NEXT_PUBLIC_SITE_URL`, update it and redeploy.

## 5. First visit

1. Open the site, select **Start free** and sign up with your email.
2. Confirm your email from the message Supabase sends, then set up your authenticator app (Microsoft Authenticator or
   similar) by scanning the code.
3. Make yourself the admin: in Supabase **SQL Editor** run, with your email:
   ```
   update public.profiles set is_admin = true
    where id = (select id from auth.users where email = 'you@example.com');
   ```
   Sign out and back in. **Admin** now appears in your account menu.
4. The **Admin** page shows a checklist of what is connected, and three settings:
   - **Billing**: off means everyone has full access (handy for a showcase); on means trials and subscriptions apply.
   - **Two-step sign-in required**: leave this on.
   - **Trial length** in days.

## 6. Try the whole journey

Sign up as a second maker in a private window, run out the trial (set the trial to 0 days in Admin), choose a plan with
the test card, open **Manage billing** to see the Stripe portal, then cancel and watch the studio turn read-only while
everything stays viewable and exportable.

## 7. Optional connections

Each connection appears on the Import page as soon as its keys are in Vercel (redeploy after adding them).

**AI reading (pattern PDFs and snapped labels).** Any OpenAI-compatible service with vision.
For Azure OpenAI: `AI_PROVIDER=azure`, `AI_BASE_URL=https://YOUR-RESOURCE.openai.azure.com/openai/v1`,
`AI_MODEL=` your deployment name, `AI_API_KEY=` the resource key. Choose a model that reads images. Text and photos are
sent for reading only; the studio keeps the details the maker approves. Each maker has an hourly fair-use limit.

**OneDrive.** In the Microsoft Entra admin centre: **App registrations > New registration**, supported accounts
"any organisational directory and personal Microsoft accounts", platform **Single-page application** with the redirect
`https://YOUR-SITE.vercel.app/studio/import`. Under **API permissions** add Microsoft Graph delegated **Files.Read**.
Copy the **Application (client) ID** into `NEXT_PUBLIC_ONEDRIVE_CLIENT_ID`. Work accounts in other organisations may need
their admin's consent, and Microsoft asks for publisher verification before apps are widely used across organisations.

**Google Drive.** In Google Cloud console: a new project, enable the **Google Drive API** and **Google Picker API**,
set up the OAuth consent screen with the `drive.file` scope (the app only sees files a maker picks), and add yourself as a
test user. Create an **OAuth client ID** (web application) with your site as an authorised JavaScript origin, and an
**API key** restricted to the Picker API and your site. The **App ID** is the project number.

**Dropbox.** In the Dropbox App Console create an app, then under **Chooser / Saver / Embedder domains** add your site's
domain. Copy the **App key** into `NEXT_PUBLIC_DROPBOX_APP_KEY`.

**Ravelry.** Create an OAuth 2.0 app at `ravelry.com/pro/developer` with the redirect
`https://YOUR-SITE.vercel.app/api/ravelry/callback`. Copy the client ID and secret. For `TOKEN_ENCRYPTION_KEY` use a
long random string of 40 or more characters from a password manager. Changing it later disconnects every maker's
Ravelry link (they can reconnect).

**Google sign-in.** In Supabase **Authentication > Sign In / Providers > Google**, add the Google OAuth client, then set
`NEXT_PUBLIC_GOOGLE_SIGN_IN=on` in Vercel.

## 8. Before taking real payments

The Button Box is set up as a showcase in Stripe test mode. Before charging real money:

- Vercel's free Hobby plan is for personal, non-commercial use; a paid service needs Vercel Pro.
- Activate Stripe live mode (business details and bank account), create live prices and a live webhook, and swap the keys.
- Fill in the placeholders on the Privacy and Terms pages ([Business name], [ABN], [Contact email]) and have them checked.
- Register for GST once turnover reaches the ATO threshold.
- Google, Microsoft and Dropbox each have an app review before an app is open to everyone; allow a few weeks.
- As a Microsoft employee, check the Outside Work policy with your manager before running a paid business.

## When a maker loses their phone

Their authenticator app goes with it. Check it is really them (for example, reply from the email on their account),
then in Supabase open **Authentication > Users**, select the maker and remove their MFA factor. Next time they sign in,
they set up a new authenticator.

## When something does not work

- **Signed in but sent back to sign in:** the Supabase Site URL or Redirect URLs (step 1.5) do not match your address.
- **No confirmation email:** check spam, then the Supabase email rate limit (step 1.7).
- **Pricing says billing is not switched on:** the Stripe keys or price IDs are missing, or Billing is off in Admin.
- **Payment worked but the plan did not change:** the webhook address or signing secret (step 2.6). Stripe shows each
  delivery attempt under the webhook, with the reply from the site.
- **A connection is missing on the Import page:** its keys are not in Vercel yet, or the site was not redeployed after
  adding them.
