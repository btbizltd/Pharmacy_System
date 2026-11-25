# Project Handbook

Full map of the BTbiz Pharmacy Communication System as it stands on `main`. Use this when you clone the repo, pick up the latest commit, or need to know which file owns a feature.

Short setup and deploy steps also live in the root [README](../README.md). Product behaviour is in [WORKING-GUIDE.md](WORKING-GUIDE.md), [FLOW-STRUCTURE.md](FLOW-STRUCTURE.md), [PRD.md](PRD.md), and [USP.md](USP.md).

## 1. What this project is

A multi-tenant pharmacy desk. The patient stays on WhatsApp. The pharmacist uses a React dashboard. One Express process talks to Meta’s WhatsApp Cloud API and to MongoDB. Each pharmacy is a tenant, keyed by `pharmacyId` and the header `x-tenant-id`.

There is no separate patient app. There is no payment-gateway webhook. There is no enforced staff-role check yet.

## 2. Latest commit you start from

Remote: `https://github.com/alok-0404/Pharmacy_System.git`  
Branch: `main`

| Commit | Date | What it is |
| --- | --- | --- |
| `37892ac` | 2026-07-06 | **HEAD.** Merge of local `main` with `origin/main`. This is the commit a fresh clone checks out. |
| `e372807` | 2026-07-06 | Last feature commit: `whatsapp icon add`. |

That feature commit changed only the marketing site and added demo media:

- `Frontend/src/components/icons/WhatsAppIcon.tsx` — shared icon
- `Frontend/src/components/landing/FloatingWhatsAppButton.tsx` — floating button uses the icon
- `Frontend/src/components/landing/FinalCTASection.tsx` — final call-to-action uses the icon
- `Frontend/src/config/whatsapp.ts` — public `wa.me` number for the marketing site (`BOT_WHATSAPP_DISPLAY`, `BOT_WHATSAPP_E164`, `BOT_WHATSAPP_URL`)
- `Btbiz_Pharmacy_demo_video/` — seven demo recordings and one still (about 44 MB). These are product demos, not used by the running app.

Nothing in the API, bot, orders, or dashboard logic changed in that commit. The running system is the code built up through June 2026 (inbox, orders, payments, medicines, dashboard analytics, refill cron) plus this marketing-icon pass.

Older history on `main` is a mix of local commits (`alok`) and `Replit Agent` publish commits. Do not treat a “Published your App” commit as a feature list; open the diff if you need that publish’s file set.

## 3. Start from that commit

You need Node.js 20 (18+ is the API minimum), npm, and a MongoDB database. WhatsApp credentials are required for the API process to boot, even if you only click around the dashboard.

```bash
git clone https://github.com/alok-0404/Pharmacy_System.git
cd Pharmacy_System
git checkout main
git log -1 --oneline
```

`git log -1` should show `37892ac` or a newer commit on `main` if someone has pushed since this handbook was written. If it is newer, read that commit before you assume the map below is exact.

```bash
cd Backend
npm install
copy .env.example .env
```

On macOS or Linux use `cp .env.example .env`. Fill `Backend/.env` before the API will start. Required values: `MONGODB_URI`, `JWT_SECRET`, `META_ACCESS_TOKEN`, `META_VERIFY_TOKEN`. Placeholder tokens let the process boot; live WhatsApp send and receive need real Meta values plus a pharmacy phone-number id that is not a `pending-wa-` placeholder.

```bash
cd Backend
npm run dev
```

API listens on port **5000**. Check `GET http://localhost:5000/api/v1/health`.

Second terminal:

```bash
cd Frontend
npm install
npm run dev
```

Dashboard listens on port **3000**. Vite proxies `/api` and `/uploads` to `http://localhost:5000`. Open `http://localhost:3000`, register a pharmacy, and sign in.

Session behaviour:

- Login calls `POST /api/v1/auth/login` and returns `pharmacyId`. No JWT is issued.
- `Frontend/src/context/PharmacyContext.tsx` stores that id in `sessionStorage` under `btbiz_pharmacy_id`.
- Every tenant request sends `x-tenant-id`.
- Closing the browser tab clears the session.

Replit is different from a laptop. If `REPL_ID` is set, Vite uses port **5000** for the dashboard and proxies to the API on **3001**. `.replit` starts those two workflows in parallel. Do not use the laptop ports on Replit or the Replit ports on a laptop.

## 4. How big it is

Counted from source on this tree (blank-line measure, so totals are slightly under raw line counts):

| Area | Files | Lines |
| --- | --- | --- |
| `Backend/src` TypeScript | 100 | ~6,000 |
| `Frontend/src` TypeScript / TSX | 71 | ~6,100 |
| `docs/` markdown (before this handbook) | 4 | ~780 |
| Git-tracked files on `37892ac` | 221 | — |

The two largest backend files are `whatsapp.service.ts` (~29 KB) and `dashboard.service.ts` (~28 KB). The largest screens are `OrdersPage.tsx`, `DashboardHomePage.tsx`, and `SettingsPage.tsx`.

Not source, but in git: demo videos under `Btbiz_Pharmacy_demo_video/` (about 44 MB). `node_modules/` and `dist/` are not committed. `Backend/.env` is gitignored.

## 5. Top of the repo

| Path | What it is |
| --- | --- |
| `Frontend/` | React 19 + Vite dashboard and landing page |
| `Backend/` | Express API, WhatsApp bot, cron, Mongo models |
| `docs/` | PRD, flows, working guide, USP, this handbook |
| `Btbiz_Pharmacy_demo_video/` | Marketing recordings from commit `e372807` |
| `attached_assets/` | Scratch screenshots and pasted logs. Not part of the app. |
| `.agents/memory/` | Agent notes, including WhatsApp template parameter order |
| `.replit` | Replit workflows, ports, and VM deploy command |
| `replit.md` | Short Replit architecture note |
| `README.md` | Setup, architecture, deploy |
| `Backend/.env.example` | Env template |

There is no root `package.json`. Install and run `Frontend` and `Backend` separately.

## 6. One request, end to end

Patient sends “Hi” on WhatsApp:

1. Meta calls `POST /api/v1/webhook`.
2. `whatsapp.controller.ts` checks `object === whatsapp_business_account`, returns 200, and hands the body to `bot-router.service.ts`.
3. `ACTIVE_BOT=PHARMACY` calls `whatsapp.service.ts`. `LEAD` and `HEALTHCARE` log and return.
4. The service finds the pharmacy by `metadata.phone_number_id`. No match means the message is logged and dropped.
5. The patient is created from the phone number if new. A conversation is opened.
6. `bot-flow.service.ts` plus `intent-detector.ts` and `auto-reply.ts` send the welcome text, greeting image, then the service menu.
7. The same messages are stored and show up in Dashboard → Inbox. The inbox polls; it does not use websockets.

Pharmacist replies in the inbox:

1. `POST /api/v1/messages` with `x-tenant-id`.
2. `message.service.ts` saves the message, then `whatsapp.service.ts` sends it on the Cloud API if the pharmacy WhatsApp config is real.

Prescription photo or PDF:

1. Media is downloaded from Meta and saved under `Backend/uploads` (`utils/mediaStorage.ts`).
2. A message row is stored.
3. An order is created at `prescription_received`.
4. The patient gets a WhatsApp confirmation with an order reference.

Public media links use `APP_PUBLIC_URL`. Meta must be able to fetch that host. On a laptop that means an HTTPS tunnel, not `localhost`.

## 7. Frontend — where each screen lives

Entry: `Frontend/src/main.tsx` → `App.tsx`.

Routes that are actually mounted:

| URL | File | Calls |
| --- | --- | --- |
| `/` | `pages/LandingPage.tsx` | Login and register modals. Logged-in users are sent to `/dashboard`. |
| `/dashboard` | `pages/DashboardHomePage.tsx` | `api/dashboard.ts` |
| `/dashboard/inbox` | `pages/InboxPage.tsx` | conversations, messages, payment dialog |
| `/dashboard/orders` | `pages/OrdersPage.tsx` | `api/orders.ts` |
| `/dashboard/patients` | `pages/PatientsPage.tsx` | `api/patients.ts` |
| `/dashboard/medicines` | `pages/MedicinesPage.tsx` | `api/medicines.ts` |
| `/dashboard/settings` | `pages/SettingsPage.tsx` | pharmacy settings, FAQ, image upload |

Shell around those pages: `components/layout/DashboardLayout.tsx`.

Landing sections under `components/landing/`: Hero, Problem, Solution, How it works, Product showcase, Why BTbiz, Trust, Testimonials, Pricing, FAQ, Final CTA, navbar, footer, back-to-top, floating WhatsApp button. Pricing numbers on the page are marketing copy. The API does not enforce plan limits.

Chat pieces under `components/chat/`: `ChatView.tsx`, `MessageBubble.tsx`, `MediaAttachment.tsx`, `SendPaymentDialog.tsx`, `SimulatePatientDialog.tsx`. Simulate-patient writes an inbox message only. It does not hit WhatsApp and does not run the bot.

Dashboard pieces: `KpiCard.tsx`, `RevenueSection.tsx`, `DrilldownDialog.tsx`. Polling interval for the overview is 30 seconds (`usePolling.ts`).

API clients in `Frontend/src/api/`: `client.ts` (fetch wrapper and `x-tenant-id`), `auth.ts`, `pharmacy.ts`, `patients.ts`, `conversations.ts`, `messages.ts`, `orders.ts`, `medicines.ts`, `faq.ts`, `dashboard.ts`.

Present in the tree but not wired into `App.tsx`:

- `pages/SetupPage.tsx` — alternate pharmacy create/connect form. Registration used by the site is `components/auth/RegisterModal.tsx`.
- `lib/auth.ts` — old localStorage user store. Nothing imports it. Real login is the API.

Marketing WhatsApp link: `Frontend/src/config/whatsapp.ts`. That number is for the public site button. It is not the per-pharmacy Cloud API phone-number id.

## 8. Backend — where each module lives

Boot: `src/server.ts` connects Mongo, starts the refill cron, then `src/app.ts`.

`app.ts` mounts:

| Mount | Module |
| --- | --- |
| `GET /api/v1/health` | inline |
| `/api/v1/auth` | `modules/auth` |
| `/api/v1/pharmacies` | `modules/pharmacy` |
| `/api/v1/patients` | `modules/patient` |
| `/api/v1/conversations` | `modules/conversation` |
| `/api/v1/messages` | `modules/message` |
| `/api/v1/orders` | `modules/order` |
| `/api/v1/faqs` | `modules/faq` |
| `/api/v1/medicines` | `modules/medicine` |
| `/api/v1/dashboard` | `modules/dashboard` |
| `/api/v1/webhook` | `modules/whatsapp` webhook router |
| `/api/v1/whatsapp` | `POST /send` |
| `/uploads` | static files from `Backend/uploads` |

In `NODE_ENV=production` the same process serves `Frontend/dist` and falls back to `index.html` for non-API routes.

Bot code in `src/bot/`:

| File | Role |
| --- | --- |
| `service-menu.ts` | Eight menu rows and their button ids |
| `intent-detector.ts` | Greeting, status, refill, repeat, medicine keywords |
| `bot-flow.service.ts` | Turns a detected intent into the next step |
| `auto-reply.ts` | Text the patient receives |
| `store-location.ts` | Address, hours, map from the pharmacy document |
| `handoff.ts` | Talk-to-pharmacist flag |
| `bot.service.ts` | Shared bot helpers |

Menu options: Upload Prescription, Order Status, Refill Medicine, Check Medicine, Repeat Last Order, Store Location, FAQ Support, Talk to Pharmacist.

Notifications:

- `modules/notification/order-notification.service.ts` — status text, or a Meta template when `USE_META_TEMPLATES=true`
- `modules/notification/payment-notification.service.ts` — payment link and QR
- `config/whatsapp-templates.config.ts` — template names and parameter order. A mismatch with the approved template makes Meta reject the send; the notifier then falls back to text.
- `jobs/refill-reminder.job.ts` — cron `0 9 * * *` (09:00 server time). Completed orders with `refillDueAt` in the past get one reminder.

Cross-cutting:

| File | Role |
| --- | --- |
| `config/env.ts` | Zod-validated environment. Process exits if a required key is missing. |
| `middlewares/tenant.middleware.ts` | Requires `x-tenant-id` |
| `middlewares/auth.middleware.ts` | Pass-through. JWT is not checked. |
| `middlewares/validate.middleware.ts` | Zod body, query, or params |
| `database/plugins/softDelete.plugin.ts` | `deletedAt` instead of hard delete |
| `utils/whatsappIntegration.ts` | Decides if server tokens and pharmacy ids look real |
| `utils/publicUrl.ts` | Builds URLs Meta can fetch |

`modules/pharmacy-bot/` holds `PharmacyConversation` and `PharmacyMessage` models. `database/connection.ts` registers them so indexes sync. The live inbox uses `modules/conversation` and `modules/message`, not these two models.

`modules/user/user.model.ts` stores `admin`, `pharmacist`, and `staff`. Registration creates an `admin` user. Routes do not read the role.

## 9. Collections

All scoped by `pharmacyId` except the user lookup by email.

| Model | Holds |
| --- | --- |
| Pharmacy | Name, email, mobile, WhatsApp phone-number id, business account id, greeting image, payment link, QR, store address, hours, map, lat/long, active flag |
| User | Owner or staff login. Password is `salt:scrypt` via Node `crypto`. |
| Patient | Name, mobile, optional email. Auto-created on first WhatsApp message. |
| Conversation | One thread per patient, handoff flag |
| Message | Text or media, direction, link to conversation |
| Prescription | Stored file metadata for an upload |
| Order | Status, history, payment fields, delivery type, refill dates, links to patient, conversation, prescription |
| Medicine | Name, unit, price, stock, active flag |
| FAQ | Question, answer, keywords |

Order statuses and legal transitions are in `config/order.constants.ts`. Thirteen statuses. Terminal states: prescription rejected, order cancelled, and refill reminder after the completed-order reminder is sent. Completing an order sets `refillDueAt` to 30 days out when it is empty.

Payment fields on the order are an amount, a link, a QR URL, and a status the pharmacist sets. Nothing marks a payment confirmed from Razorpay, PhonePe, or a bank.

## 10. What is finished and what is not

Finished enough to demo on one pharmacy:

- Register, login, session pharmacy id
- WhatsApp menu, prescription upload, order create, status notifications
- Inbox reply out to WhatsApp
- Medicine lookup, FAQ keyword match, store info, repeat last order
- Payment link and QR send
- Dashboard counts and revenue
- Daily refill reminder

Not finished, even if a landing page or model mentions it:

- JWT on API routes (`auth.middleware.ts` calls `next()` immediately)
- Role checks for pharmacist vs staff
- Plan limits (message caps, branch caps)
- Multiple branches under one owner. One pharmacy document is one WhatsApp phone-number id.
- `ACTIVE_BOT` values other than `PHARMACY`
- Payment auto-confirmation
- Hindi bot copy
- Prescription OCR or medicine line items on an order
- Durable file storage. `Backend/uploads` is local disk and is not in git. A redeploy without that folder drops prescriptions and images.
- `SetupPage.tsx` and `lib/auth.ts` (unused)

## 11. Deploy from this commit

Replit VM (see `.replit`):

- Build: `Frontend` install + `npm run build`, then `Backend` install + `npm run build`
- Run: `cd Backend && npm start`
- Production flag: `NODE_ENV=production`
- Public origin in the Replit user env: `https://pharmacy-system.replit.app`
- Meta webhook: `https://<that-host>/api/v1/webhook`
- Verify token must equal `META_VERIFY_TOKEN`

Any other host, from `Backend/` after both builds:

```bash
NODE_ENV=production node dist/server.js
```

Set `APP_PUBLIC_URL` to the HTTPS origin. Put TLS in front of the process. Keep `uploads/` on a disk that survives restarts if prescriptions must remain downloadable.

## 12. Safe first edits

| If you need to change… | Start here |
| --- | --- |
| Bot menu labels | `Backend/src/bot/service-menu.ts` |
| Bot sentences | `Backend/src/bot/auto-reply.ts` |
| Keyword routing | `Backend/src/bot/intent-detector.ts` |
| Status rules | `Backend/src/config/order.constants.ts` and `modules/order/order-status.service.ts` |
| WhatsApp send/receive | `Backend/src/modules/whatsapp/whatsapp.service.ts` |
| Template parameter order | `Backend/src/config/whatsapp-templates.config.ts` and `.agents/memory/whatsapp-template-params.md` |
| Dashboard numbers | `Backend/src/modules/dashboard/dashboard.service.ts` and `Frontend/src/pages/DashboardHomePage.tsx` |
| Order screen | `Frontend/src/pages/OrdersPage.tsx` |
| Marketing WhatsApp button | `Frontend/src/config/whatsapp.ts` and `components/landing/FloatingWhatsAppButton.tsx` |
| Env keys | `Backend/src/config/env.ts` and `Backend/.env.example` together |
