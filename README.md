# BTbiz Pharmacy Communication System

Multi-tenant platform that connects a pharmacy with its patients over WhatsApp. Patients chat on WhatsApp. Pharmacists use a web dashboard for the inbox, orders, medicines, patients, and store settings.

Repository: [alok-0404/Pharmacy_System](https://github.com/alok-0404/Pharmacy_System)

## What it does

- WhatsApp bot with a service menu: prescription upload, order status, refill, medicine lookup, repeat last order, store location, FAQ, and talk to a pharmacist.
- Prescription image or PDF creates an order and lands in the inbox.
- Order lifecycle with WhatsApp notifications on status changes. Payment pending sends a payment link and QR.
- Medicine catalog used by the bot for price and stock replies.
- Daily refill reminder for completed orders (30 days after completion, 9:00 AM server time).
- Dashboard analytics for orders, patients, and revenue.

The full map — latest commit, how to start from it, where every module lives, and what is still unfinished — is in [docs/PROJECT-HANDBOOK.md](docs/PROJECT-HANDBOOK.md).

Product behaviour is in [docs/WORKING-GUIDE.md](docs/WORKING-GUIDE.md), [docs/FLOW-STRUCTURE.md](docs/FLOW-STRUCTURE.md), [docs/PRD.md](docs/PRD.md), and [docs/USP.md](docs/USP.md).

## Current tip

`main` at the time of this README is `37892ac` (2026-07-06), a merge. The last feature commit under it is `e372807` (`whatsapp icon add`): a shared WhatsApp icon on the landing page, the public `wa.me` link in `Frontend/src/config/whatsapp.ts`, and demo videos in `Btbiz_Pharmacy_demo_video/`. The API and dashboard logic were not changed in that commit.

A fresh clone of `main` is the right starting point. If `git log -1` shows a newer hash, read that commit and the handbook before you assume the file map is unchanged.

## Local setup

Start from the latest `main`:

```bash
git clone https://github.com/alok-0404/Pharmacy_System.git
cd Pharmacy_System
git checkout main
```

You need Node.js 20 (the API allows 18+), npm, and MongoDB. WhatsApp env values are required for the API to boot.

1. Install dependencies.

```bash
cd Backend && npm install
cd ../Frontend && npm install
```

2. Create `Backend/.env` from `Backend/.env.example`. `MONGODB_URI`, `JWT_SECRET`, `META_ACCESS_TOKEN`, and `META_VERIFY_TOKEN` are required at startup even if you only open the dashboard.

3. Start the API (port **5000**).

```bash
cd Backend && npm run dev
```

4. Start the dashboard (port **3000**). Vite proxies API and uploads to `http://localhost:5000`.

```bash
cd Frontend && npm run dev
```

5. Open `http://localhost:3000`, register a pharmacy, then sign in. The session stores the pharmacy id in `sessionStorage` and sends it as `x-tenant-id`. Closing the tab ends the session.

Health check: `GET http://localhost:5000/api/v1/health`

On Replit, do not use these ports. `REPL_ID` switches the dashboard to **5000** and the API to **3001**. `.replit` runs both workflows together.

## Architecture

```
Patient (WhatsApp)
        │
        ▼
Meta WhatsApp Cloud API
        │  webhook  GET/POST /api/v1/webhook
        ▼
Express API  (Backend/)
  ├── Bot router (ACTIVE_BOT)
  ├── Pharmacy bot: intent, menu, auto-replies
  ├── Orders, payments, notifications
  ├── Inbox messages
  └── MongoDB (one database, isolated by pharmacyId)
        ▲
        │  REST /api/v1   header: x-tenant-id
React dashboard  (Frontend/)
```

In production the API serves the built dashboard from the same process. In development Vite proxies `/api` and `/uploads` to the API.

Tenant isolation is the `x-tenant-id` header (the pharmacy id). Incoming WhatsApp traffic is matched to a pharmacy by Meta `phone_number_id`.

`ACTIVE_BOT` selects the webhook handler. Only `PHARMACY` is implemented. `LEAD` and `HEALTHCARE` accept the webhook and do not run the pharmacy flow.

## Stack

| Layer | Choice |
| --- | --- |
| Dashboard | React 19, Vite, TypeScript, Tailwind CSS 4, React Router 7 |
| API | Node.js, Express 4, TypeScript |
| Database | MongoDB (Mongoose 8) |
| Messaging | Meta WhatsApp Cloud API |
| Validation | Zod |
| Jobs | `node-cron` |
| Logs | Winston |

Node.js 20 or newer. The API package allows Node 18+.

## Repository layout

About 221 tracked files. Application source is roughly 6,000 lines in `Backend/src` (100 TypeScript files) and 6,100 lines in `Frontend/src` (71 files). There is no root `package.json`.

```
Frontend/                 React dashboard and landing page
  src/pages/              Landing, dashboard, inbox, orders, patients, medicines, settings
  src/api/                Fetch clients. client.ts sends x-tenant-id
  src/components/landing/ Marketing sections and the floating WhatsApp button
  src/components/chat/    Inbox thread, media, payment dialog
  src/config/whatsapp.ts  Public wa.me link for the marketing site only
Backend/
  src/server.ts           Mongo, refill cron, then the HTTP app
  src/app.ts              Route table and production SPA hosting
  src/modules/            auth, pharmacy, patient, conversation, message,
                          order, medicine, faq, dashboard, whatsapp, notification
  src/bot/                Menu, intents, replies, store info, pharmacist handoff
  src/jobs/               Daily 09:00 refill reminder
  uploads/                Prescription and image files (runtime, not in git)
docs/                     Handbook, PRD, flows, working guide, USP
Btbiz_Pharmacy_demo_video/  Demo recordings added in e372807 (not loaded by the app)
```

`pages/SetupPage.tsx` and `lib/auth.ts` are in the frontend tree and are not used by the routes in `App.tsx`. Live login is `components/auth/RegisterModal.tsx` plus `api/auth.ts`.

The largest files to open first: `Backend/src/modules/whatsapp/whatsapp.service.ts`, `Backend/src/modules/dashboard/dashboard.service.ts`, `Frontend/src/pages/OrdersPage.tsx`, `Frontend/src/pages/DashboardHomePage.tsx`, `Frontend/src/pages/SettingsPage.tsx`.

Dashboard routes:

| Path | Screen |
| --- | --- |
| `/` | Landing, login, register |
| `/dashboard` | Overview |
| `/dashboard/inbox` | Conversations |
| `/dashboard/orders` | Order list and status changes |
| `/dashboard/patients` | Patient records |
| `/dashboard/medicines` | Catalog |
| `/dashboard/settings` | Store, FAQ, payment link and QR |

## Environment variables

Defined in `Backend/.env`. The process exits if validation fails.

| Variable | Purpose |
| --- | --- |
| `NODE_ENV` | `development` or `production` |
| `PORT` | API port. Default `5000`. On Replit dev this is `3001`. |
| `API_PREFIX` | Default `/api/v1` |
| `ACTIVE_BOT` | `PHARMACY` (default), `LEAD`, or `HEALTHCARE` |
| `APP_PUBLIC_URL` | Public origin Meta uses to fetch media. Use an ngrok (or similar) HTTPS URL in local dev. |
| `MONGODB_URI` | MongoDB connection string |
| `JWT_SECRET` | Required by env validation. API auth does not issue JWTs yet. |
| `JWT_EXPIRES_IN` | Default `7d` (reserved) |
| `LOG_LEVEL` | `error`, `warn`, `info`, `http`, or `debug` |
| `META_ACCESS_TOKEN` | WhatsApp Cloud API token |
| `META_VERIFY_TOKEN` | String you choose; Meta sends it when verifying the webhook |
| `META_API_VERSION` | Default `v21.0` |
| `USE_META_TEMPLATES` | `true` to send approved template messages for order updates |
| `META_TEMPLATE_LANGUAGE` | Default `en` |

Pharmacy-level settings (store address, hours, greeting image, payment link, QR, WhatsApp phone number id, business account id) live on the pharmacy document, not in env.

Registration stores placeholder WhatsApp ids (`pending-wa-…`, `pending-biz-…`) until a real Meta phone number id and business account id are saved. The inbox shows WhatsApp as connected only when both server tokens and those pharmacy ids are real.

## WhatsApp webhook

Callback URL:

```
https://<public-host>/api/v1/webhook
```

- `GET` answers Meta verification (`hub.mode`, `hub.verify_token`, `hub.challenge`). The verify token must match `META_VERIFY_TOKEN`.
- `POST` accepts the payload, returns `200` immediately, and processes the message asynchronously.
- The payload `phone_number_id` must match `pharmacy.whatsappPhoneNumberId`. Unknown numbers are logged and ignored.
- Outbound media URLs are built from `APP_PUBLIC_URL`. That host must be reachable by Meta.

Local webhook testing needs a public HTTPS tunnel to the API port.

## API surface

Base path: `/api/v1`. Tenant routes expect `x-tenant-id`.

| Area | Endpoints |
| --- | --- |
| Health | `GET /health` |
| Auth | `POST /auth/pharmacy-register`, `POST /auth/login` |
| Pharmacy | `POST /pharmacies`, `GET /pharmacies/:id`, payment settings, store settings, asset upload |
| Patients | `GET /patients`, `POST /patients` |
| Conversations | `GET /conversations`, `POST /conversations`, send payment details |
| Messages | `GET /messages`, `POST /messages` |
| Orders | list, stats, activity, `GET /orders/:id`, `PATCH /orders/:id/status`, `POST /orders/:id/send-payment` |
| Medicines | CRUD |
| FAQs | CRUD |
| Dashboard | `GET /dashboard/analytics?range=7d\|30d\|90d` |
| Webhook | `GET /webhook`, `POST /webhook` |
| WhatsApp | `POST /whatsapp/send` |

Passwords are hashed with scrypt. Login returns the pharmacy id. It does not return a bearer token. `authMiddleware` is still a pass-through; do not expose this API on the public internet without adding real authentication.

Responses use `{ success, message, data }`.

## Order lifecycle

Statuses are enforced. A change outside the allowed transition is rejected.

`prescription_received` → `order_verified` → `order_accepted` → `payment_pending` → `payment_confirmed` → `order_processing` → `order_ready_pickup` or `order_ready_delivery` → `out_for_delivery` → `order_completed`

`prescription_rejected` and `order_cancelled` can end the flow from the early and mid states. Completing an order sets `refillDueAt` to 30 days later unless one was already set. The cron job then moves due orders to `refill_reminder` and notifies the patient.

Payment collection is a link plus QR sent on WhatsApp. There is no payment-gateway webhook; staff mark payment confirmed in the dashboard.

## Scripts

**Backend**

| Script | Action |
| --- | --- |
| `npm run dev` | `tsx watch src/server.ts` |
| `npm run build` | `tsc` → `Backend/dist` |
| `npm start` | `node dist/server.js` |
| `npm run typecheck` | `tsc --noEmit` |

**Frontend**

| Script | Action |
| --- | --- |
| `npm run dev` | Vite dev server |
| `npm run build` | `tsc -b && vite build` → `Frontend/dist` |
| `npm run preview` | Preview the production build |

## Deployment

The repo is set up as a Replit VM deployment so the webhook stays up.

- **Build:** install and build `Frontend`, then install and build `Backend` (see `.replit`).
- **Run:** `cd Backend && npm start`
- **Production env:** `NODE_ENV=production`. The API listens on its `PORT` and serves `Frontend/dist` for non-API routes, with an SPA fallback. `/uploads` is still served by the API.
- **Public URL:** set `APP_PUBLIC_URL` to the deployed origin (the Replit config uses `https://pharmacy-system.replit.app`). Point the Meta webhook at `https://<that-host>/api/v1/webhook`.

Replit development runs two processes: dashboard on port 5000 (public) and API on port 3001. Vite detects `REPL_ID` and switches to that layout. Local development is the opposite: dashboard `3000`, API `5000`.

On any other host:

```bash
cd Frontend && npm install && npm run build
cd ../Backend && npm install && npm run build
NODE_ENV=production node dist/server.js
```

Run that from `Backend/`, with `Backend/.env` or real environment variables present. Uploaded files are stored on local disk under `Backend/uploads`. A redeploy that does not keep that directory will drop prescription files and images. Put the process behind HTTPS.

## Technical notes

- Models use a soft-delete plugin (`deletedAt`) rather than hard deletes.
- Webhook media is downloaded from Meta and saved under `uploads` before the inbox message and order are created.
- Pharmacist replies from the inbox are saved, then sent through the Cloud API when the pharmacy WhatsApp config is complete.
- Dashboard lists poll the API; there is no websocket channel.
- User roles (`admin`, `pharmacist`, `staff`) are stored on the user document. Routes do not enforce them yet.
- Optional order templates are mapped in `Backend/src/config/whatsapp-templates.config.ts`. Template body parameters must match the approved Meta template exactly. If Meta rejects a template, the notifier falls back to a text message.
