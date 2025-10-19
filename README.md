# Enterprise SSO Demo (Educational, Client‑Only)

An **enterprise‑style, cyber‑themed Single Sign‑On simulation** that walks users through:

**Step 1:** Credentials → **Step 2:** MFA (TOTP per RFC 6238) → **Step 3:** Signed **JWT (HS256)** → **Step 4:** Redirect success

All logic runs **entirely in the browser (client‑only)** using Web Crypto APIs. **No data is sent to any server.**

---

## Features
- ✅ Cyber IAM UI with enterprise styling (dark, blue/teal, accessible)
- ✅ Real **TOTP** algorithm (SHA‑1, 30‑second window) using Web Crypto
- ✅ Signed **JWT (HS256)** with realistic claims (iss, aud, sub, roles, groups, amr, exp, jti)
- ✅ Token **copy** and **verify signature** buttons
- ✅ Accessible markup (labels, roles, aria‑live, keyboard friendly)
- ✅ Zero external dependencies; works offline

---

## Quick Start (Local)
1. Download the folder and open `index.html` in any modern browser.
2. Enter an email + 8‑character password → enter the rotating 6‑digit code.
3. Inspect the **JWT** and click **Verify Signature**.

> NOTE: TOTP secret and JWT secret are demo values inside `script.js`. You can change them for your environment.

---

## Deploy Instructions

### Option A — GitHub Pages (recommended)
1. Create a new public repo, e.g. **`enterprise-sso-demo`**.
2. Upload these files into the **repo root**: `index.html`, `styles.css`, `script.js`, `README.md`.
3. In your repo, go to **Settings → Pages → Build and deployment**:
   - **Source:** *Deploy from a branch*
   - **Branch:** `main` (or `master`), **Folder:** `/ (root)`
4. Save. GitHub will host it at: `https://<your-username>.github.io/enterprise-sso-demo/`

### Option B — Netlify (drag‑and‑drop)
1. Go to **app.netlify.com** → **New site from Git** (or drag‑and‑drop the folder).
2. Set build command: *(none)*, publish directory: `/`.
3. Deploy → you’ll get a `https://<random>.netlify.app` URL.

### Option C — Cloudflare Pages
1. Create a new Pages project, connect your repo.
2. **Framework preset:** None; **Build command:** *(empty)*; **Build output directory:** `/`.
3. Deploy → URL like `https://<project>.pages.dev`.

---

## Embed in Notion
- In your Notion portfolio page, type **/embed** and paste your live URL.
- Title suggestion: **“Try SSO Flow Demo (Mock)”**
- Add a one‑liner: *“Credentials → MFA (TOTP) → Signed JWT → Redirect.”*

---

## Configuration (Optional)
Edit `script.js`:
- `state.totpSecret` — Base32 secret for TOTP (default `JBSWY3DPEHPK3PXP`).
- `state.jwtSecret` — HS256 signing secret (string). For production demos, read from an env or obfuscate at build time.
- Claims under `payload` — add `roles`, `groups`, or custom `appId`.

> ⚠️ Security Note: This is an **educational demo**. Do not reuse secrets or expect production security. Real IdPs use asymmetric keys (RS256/ES256) and server‑side signing with secure storage.

---

## Theming
- Colors and layout live in `styles.css`. Tune to match your brand or LinkedIn banner.
- All components are vanilla HTML/CSS/JS (no frameworks).

---

© 2025 Andrew Symister · IAM & PAM Portfolio
