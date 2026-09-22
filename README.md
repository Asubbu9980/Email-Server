# Email Server

A single Node.js (Express + Nodemailer + Gmail) service that handles the **Contact Us** forms of all our websites:

| Site          | Endpoint                          |
| ------------- | --------------------------------- |
| Motivity Labs | `POST /api/contact/motivitylabs`  |
| WeemRide      | `POST /api/contact/weemride`      |
| AnkleIT       | `POST /api/contact/ankleit`       |

For every valid submission it sends two emails:

1. **Team notification** to that site's own recipients (`<SITE>_TO_EMAILS`), with all submitted data. *Reply-To* is set to the visitor, so the team can just hit **Reply**.
2. **Acknowledgement** to the visitor, with a copy of what they submitted.

Each site has its own branded templates in [src/templates/](src/templates/).

Protection built in: per-site CORS allow-list, rate limiting (5 submissions / 15 min per IP per site), a honeypot field for bots, input validation with length limits, HTML escaping, and a 20 KB body limit.

---

## 1. Set up Gmail (one Gmail account per website)

Nodemailer sends mail by logging in to Gmail's SMTP server with each website's Gmail account. Enquiries are delivered to Gmail inboxes too, so no domain email is needed.

For **each** website's Gmail account:

1. Turn on **2-Step Verification**: [myaccount.google.com/security](https://myaccount.google.com/security).
2. Create an **App Password**: [myaccount.google.com/apppasswords](https://myaccount.google.com/apppasswords). Name it "Email Server" and copy the 16-character password.
   Use this as `<SITE>_SMTP_PASS`. Your normal Gmail password will **not** work.
3. Put the Gmail address in `<SITE>_SMTP_USER`.

Emails are then sent **from** that site's Gmail (shown as e.g. *"WeemRide" &lt;weemride.contact@gmail.com&gt;*). Enquiries go **to** `<SITE>_TO_EMAILS`, which can be any Gmail addresses and defaults to the same account.

> **Gmail limits:** a personal Gmail account can send about **500 emails/day**. Each enquiry sends 2 emails (team + visitor), so that's roughly 250 enquiries a day per website.

> **Render plan:** Render's **free** plan blocks outbound SMTP ports (25/465/587), so Gmail can't connect from it. Use the **Starter** plan (paid). [render.yaml](render.yaml) already sets it. On the free plan, the logs will show `❌ SMTP login failed ... ETIMEDOUT`.

Want to use just one Gmail for all sites? Set `SMTP_USER` and `SMTP_PASS` instead of the per-site ones. Any site without its own login falls back to these.

---

## 2. Environment variables

Copy `.env.example` to `.env` for local use. On Render, set these under **Environment**.

`<SITE>` is `MOTIVITYLABS`, `WEEMRIDE` or `ANKLEIT`.

| Variable | Required | Description |
| --- | --- | --- |
| `<SITE>_SMTP_USER` | ✅ | That site's Gmail address (sender) |
| `<SITE>_SMTP_PASS` | ✅ | That Gmail account's App Password |
| `<SITE>_ALLOWED_ORIGINS` | ✅ | Comma-separated website origins allowed to post, e.g. `https://weemride.com,https://www.weemride.com` (no trailing slash) |
| `<SITE>_TO_EMAILS` | – | Comma-separated Gmail inboxes that receive enquiries. Default: `<SITE>_SMTP_USER` |
| `<SITE>_WEBSITE_URL` | – | Used for the button in the visitor's confirmation email |
| `<SITE>_CC_EMAILS` | – | Extra CC recipients |
| `<SITE>_FROM_NAME` | – | Sender display name (default: site name) |
| `<SITE>_REPLY_TO` | – | Where visitor replies to the confirmation go (default: first TO email) |
| `<SITE>_SEND_USER_ACK` | – | `false` to disable the visitor confirmation email |
| `SMTP_USER` / `SMTP_PASS` | – | Shared Gmail login for sites without their own |
| `SMTP_HOST` / `SMTP_PORT` | – | Default `smtp.gmail.com` / `465`. Change only for a non-Gmail provider |
| `RATE_LIMIT_MAX` / `RATE_LIMIT_WINDOW_MIN` | – | Default 5 per 15 minutes |
| `TIMEZONE` | – | For timestamps in emails, default `Asia/Kolkata` |

---

## 3. Deploy to Render

**Option A: Blueprint (recommended)**
1. Push this repo to GitHub.
2. Render dashboard → **New → Blueprint** → select the repo. Render reads [render.yaml](render.yaml).
3. Fill in the prompted values (`*_SMTP_USER`, `*_SMTP_PASS`, `*_TO_EMAILS`, `*_ALLOWED_ORIGINS`, …) and deploy.

**Option B: Manual web service**
- New → **Web Service** → connect repo
- Runtime: **Node** · Instance type: **Starter** · Build: `npm ci` · Start: `npm start`
- Health check path: `/health`
- Add the environment variables from section 2.

After deploying:
- `https://<your-service>.onrender.com/health` should return `{"ok":true}`.
- The logs should show `✅ SMTP login OK for <gmail>` for each account.

If you see `Invalid login` / `535`, the App Password is wrong or 2-Step Verification is off.

---

## 4. Connect each website's contact form

Send JSON to the site's endpoint. Common fields:

| Field | Required | Max |
| --- | --- | --- |
| `name` | ✅ | 100 |
| `email` | ✅ | 254 |
| `message` | ✅ | 5000 |
| `phone` | – | 30 |
| `subject` | – | 200 |

Site-specific optional fields:
- **motivitylabs**: `company`, `service`
- **weemride**: `city`, `enquiryType`
- **ankleit**: `company`, `service`, `budget`

Unknown fields are ignored. Also add a **hidden honeypot input named `website`**. Real users never see or fill it, and submissions where it's filled are silently dropped.

### Example (React / Next.js)

```jsx
const API = 'https://email-server.onrender.com/api/contact/weemride'; // change site id per website

async function handleSubmit(e) {
  e.preventDefault();
  setLoading(true);
  const body = Object.fromEntries(new FormData(e.currentTarget));
  try {
    const res = await fetch(API, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    const json = await res.json();
    if (json.ok) setStatus('Thanks! We will get back to you soon.');
    else setStatus(json.errors ? Object.values(json.errors).join(', ') : json.error);
  } catch {
    setStatus('Network error, please try again.');
  } finally {
    setLoading(false);
  }
}

// In the form:
<input name="name" required />
<input name="email" type="email" required />
<input name="phone" />
<input name="city" />
<textarea name="message" required />
{/* honeypot: keep hidden */}
<input name="website" tabIndex={-1} autoComplete="off" style={{ display: 'none' }} />
```

### Responses

| Status | Body | Meaning |
| --- | --- | --- |
| 200 | `{ ok: true, message }` | Sent |
| 400 | `{ ok: false, errors: { field: "message" } }` | Validation failed |
| 403 | `{ ok: false, error }` | Origin not in `<SITE>_ALLOWED_ORIGINS` |
| 404 | `{ ok: false, error }` | Unknown site id |
| 429 | `{ ok: false, error }` | Rate limited |
| 500 | `{ ok: false, error }` | Site's Gmail login not configured |
| 502 | `{ ok: false, error }` | Gmail rejected/failed sending the team notification |

---

## 5. Local development

```bash
npm install
cp .env.example .env     # fill in real values
npm run dev              # http://localhost:3000
npm test                 # runs the test suite (no real emails sent)
npm run preview          # writes previews/*.html so you can view every template in a browser
```

Gmail works fine from your own machine, so you can test the whole flow locally before deploying. Send a test from the terminal:

```bash
curl -X POST http://localhost:3000/api/contact/ankleit \
  -H 'Content-Type: application/json' \
  -d '{"name":"Test User","email":"you@example.com","message":"Hello from curl"}'
```

---

## Adding another website

1. Create `src/templates/<newsite>.js`. Copy an existing one and change the theme colors and wording.
2. Add an entry in [src/config/sites.js](src/config/sites.js) with `envPrefix: 'NEWSITE'`.
3. Set `NEWSITE_SMTP_USER`, `NEWSITE_SMTP_PASS`, `NEWSITE_TO_EMAILS`, `NEWSITE_ALLOWED_ORIGINS` (and add them to `render.yaml`).

The endpoint `POST /api/contact/newsite` then works automatically.
