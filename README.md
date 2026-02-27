# BiTi — Enterprise Task Management Platform

<div align="center">
  <img src="https://img.shields.io/badge/NestJS-E0234E?style=for-the-badge&logo=nestjs&logoColor=white" alt="NestJS" />
  <img src="https://img.shields.io/badge/Vue.js-35495E?style=for-the-badge&logo=vuedotjs&logoColor=4FC08D" alt="Vue 3" />
  <img src="https://img.shields.io/badge/Next-white?style=for-the-badge&logo=next.js&logoColor=black" alt="Next.js" />
  <img src="https://img.shields.io/badge/Prisma-3982CE?style=for-the-badge&logo=Prisma&logoColor=white" alt="Prisma" />
  <img src="https://img.shields.io/badge/PostgreSQL-316192?style=for-the-badge&logo=postgresql&logoColor=white" alt="PostgreSQL" />
</div>

<br />

> A production-ready, full-stack, multi-tenant task management SaaS platform equipped with real-time WebSocket collaboration, strict Row-Level Security, scalable subscription billing, and a high-conversion marketing website.

---

## 📑 Table of Contents

- [Overview](#overview)
- [System Architecture](#system-architecture)
- [Deep Technical Stack](#deep-technical-stack)
- [Core Processing Logic & Advanced Features](#core-processing-logic--advanced-features)
- [Monorepo Directory Structure](#monorepo-directory-structure)
- [Getting Started (Local Development)](#getting-started-local-development)
- [Environment Variables Setup](#environment-variables-setup)
- [Extension & Contribution Guide](#extension--contribution-guide)
- [License](#license)

---

## 🧭 Overview

**BiTi** is engineered for scale, catering to both individual freelancers and massive enterprise teams. The platform is logically divided into three interconnected but deployable sub-projects:

| Component                | Description                                                                                                                                       | Local Port |
| :----------------------- | :------------------------------------------------------------------------------------------------------------------------------------------------ | :--------- |
| **`/backend`**           | High-performance RESTful API server powered by NestJS, Prisma, and PostgreSQL. Handles authentication, payments, WebSocket, and data persistence. | `3000`     |
| **`/frontend`**          | Comprehensive Vue 3 SPA built with Vite and Vuetify. Acts as the primary authenticated dashboard for users and tenant administrators.             | `5173`     |
| **`/website-marketing`** | Lightning-fast static/SSR marketing pages built with Next.js App Router and Tailwind CSS for SEO visibility and user onboarding.                  | `3001`     |

---

## 🏗️ System Architecture

```text
┌─────────────────────────┐         ┌─────────────────────────┐
│   Marketing Website     │         │    Frontend (Admin)     │
│   (Next.js · React)     │         │   (Vue 3 · Vuetify)     │
│   Port 3001             │         │   Port 5173             │
└─────────┬───────────────┘         └──────────┬──────────────┘
          │  HTTP / REST API (JSON)            │  HTTP / REST + WebSocket
          ▼                                    ▼
┌─────────────────────────────────────────────────────────────┐
│                   Backend API (NestJS)                      │
│   JWT Auth · Multi-Tenant Middleware · RBAC · Rate Limits   │
│   Swagger Docs (/api/docs) · Port 3000                      │
├─────────────────────────────────────────────────────────────┤
│   Prisma ORM (30+ Data Models)                              │
│   WebSocket Gateway (Socket.IO)                             │
├─────────────┬──────────────┬───────────────┬────────────────┤
│ PostgreSQL  │ Supabase     │ Stripe/PayPal │ Nodemailer     │
│ (Primary)   │ (S3 Storage) │ (Monetization)│ (SMTP Mail)    │
└─────────────┴──────────────┴───────────────┴────────────────┘
```

---

## 🛠️ Deep Technical Stack

### Backend App (`/backend`)

- **Framework:** NestJS 11 (Node.js) with TypeScript 5.7
- **Database Pipeline:** PostgreSQL 16 via Prisma 6 ORM. The relational schema is extensive (950+ lines), defining strictly typed mappings for Users, Tenants, Departments, Roles, Teams, Sprints, and Workflows.
- **Security & Auth:** `@nestjs/jwt`, Passport (Local + Google OAuth), Helmet, CORS, `@nestjs/throttler` for rate limiting.
- **Data Isolation:** A custom `TenantGuard` dynamically parses headers (`X-Tenant-ID`) or subdomains and enforces logical boundaries across all Prisma repository calls.
- **Real-time Engine:** Socket.IO (`@nestjs/platform-socket.io`) managing stateful connections for Chat Rooms, WebRTC signaling, and asynchronous Notifications.
- **Billing / Monetization:** Connected to Stripe and PayPal Server SDKs to validate subscription tiers and restrict resources automatically using the `SubscriptionService`.
- **Asset Storage:** Supabase SDK + Multer for parsing generic uploads (S3 standard), plus local fallback.
- **Validation:** Pipeline transformation with `class-validator` and `class-transformer`.

### Frontend App (`/frontend`)

- **Core:** Vue 3 Composition API & Vite 7 build tools.
- **Component Library:** Vuetify 3 paired with Material Design Icons.
- **State Management:** Pinia 3. Stores manage Session State, Tenant contexts, Workspace filters, and persistent Chat histories.
- **Interactivity:**
  - ChartJS / Vue-ChartJS for velocity reporting and sprint burning.
  - SortableJS for fluid, drag-and-drop Kanban interface.
  - Day.js + VueDatePicker for global time-zone adjustments and scheduling.
  - Rich-Text (Vue Quill) for nested task descriptions.

### Marketing App (`/website-marketing`)

- **Core:** Next.js 16 (App Router) & React 19.
- **Styling:** Tailwind CSS V4 configured with a unified global design system and Lucide React Icons.
- **Lead Gen & Login:** NextAuth 4 (OAuth fallback) tightly coupled with Supabase for instant lead capturing and redirect handling.

---

## 🧠 Core Processing Logic & Advanced Features

### 1. Zero-Friction Multi-Tenancy

On registration, a new `Tenant` organization is minted accompanied by an `Owner` role. Subsequent log-ins route a user context specifically into their assigned SaaS tenant. Data bleed is physically impossible given our abstracted Prisma Repository pattern enforcing a `where: { tenantId: request.tenantId }` clause across all fetch/mutation routines.

### 2. Transactional Graph & Auditing

Creating a task doesn't just insert a row. Using Prisma's `$transaction` API, creating a task simultaneously writes to `TaskHistory`, alerts `TaskWatchers`, builds a timeline `ActivityLog`, and parses hierarchical Subtasks.

### 3. Cycle Detection (DAG enforcement)

Tasks can have direct upstream/downstream dependencies. The backend executes a strict depth-first search (DFS) topological sort prior to mutation. If Task A blocks Task B, and Task B blocks Task C, attempting to make Task C block Task A will instantly revert via `ConflictException`, preventing infinite logic loops.

### 4. Subscription & Webhooks

As resources (e.g., users, projects, or gigabytes used) are requested, the `Tenant` subscription limits are validated. When Stripe triggers a `payment_intent.succeeded` or `customer.subscription.deleted`, webhooks gracefully scale up (e.g., Free → Pro) or temporarily lock write-access.

---

## 📂 Monorepo Directory Structure

```text
task-system/
├── backend/
│   ├── prisma/
│   │   ├── schema.prisma       # Essential 30+ relational entity schema
│   │   └── seed.ts             # Dev environment bootstrap
│   ├── src/
│   │   ├── common/             # Interceptors, Guards, Utilities, Payments
│   │   └── modules/            # 32 modular feature sets (Auth, Teams, Sprints, etc)
│   └── package.json
│
├── frontend/
│   ├── src/
│   │   ├── components/         # Modals, DataTables, Overlays
│   │   ├── router/             # Vue Router Config
│   │   ├── services/           # 37 distinct Axios boundary wrappers
│   │   ├── stores/             # Pinia Logic
│   │   └── views/              # Page layouts (Board, Tasks, Analytics)
│   └── package.json
│
└── website-marketing/
    ├── src/
    │   ├── app/                # Next.js App Router endpoints, Layouts
    │   └── components/         # Tailwind Sections, Hero, Pricing Cards
    └── package.json
```

---

## 🚀 Getting Started (Local Development)

### Prerequisites

- Node.js ≥ 18 / npm ≥ 9
- Docker & Docker Compose (for PostgreSQL containerization)
- Optional: Supabase Keys, Stripe Test API Keys, Google OAuth Client ID

### Step 1: Initialize Database

```bash
cd backend
docker compose up -d
# Connects to localhost:5432 using 'taskuser' / 'taskpass'
```

### Step 2: Bootup Backend

```bash
cd backend
npm install

# Prepare environment (update with keys if needed)
cp .env.example .env

# Execute schema, generate Prisma Client types, setup fixtures
npx prisma migrate deploy
npx prisma generate
npx prisma db seed

npm run start:dev
```

_API Available at `http://localhost:3000/api`_
_Swagger UI Available at `http://localhost:3000/api/docs`_

### Step 3: Bootup Frontend

```bash
cd frontend
npm install
echo 'VITE_API_URL=http://localhost:3000/api' > .env
npm run dev
```

_App Dashboard Available at `http://localhost:5173`_

### Step 4: Bootup Marketing Site

```bash
cd website-marketing
npm install
cp .env.example .env.local
npm run dev
```

_Marketing Portal Available at `http://localhost:3001`_

---

## 🔒 Environment Variables Setup

### Backend (`/backend/.env`)

```ini
DATABASE_URL="postgresql://taskuser:taskpass@localhost:5432/taskdb"
PORT=3000
NODE_ENV=development
JWT_SECRET="YOUR_SUPER_SECRET_KEY"
JWT_EXPIRES_IN=7d
APP_STORAGE_TYPE=supabase
APP_STORAGE_SUPABASE_URL="https://[PROJECT].supabase.co"
APP_STORAGE_SUPABASE_KEY="[SERVICE_ROLE_KEY]"
CORS_ORIGINS="http://localhost:5173,http://localhost:3000,http://localhost:3001"
```

### Frontend (`/frontend/.env`)

```ini
VITE_API_URL="http://localhost:3000/api"
```

### Website (`/website-marketing/.env.local`)

```ini
NEXT_PUBLIC_API_URL="http://localhost:3000/api"
NEXT_PUBLIC_ADMIN_URL="http://localhost:5173"
NEXTAUTH_URL="http://localhost:3001"
# NEXTAUTH_SECRET="RUN `openssl rand -base64 32` TO GENERATE"
SUPABASE_URL="..."
SUPABASE_SERVICE_KEY="..."
```

---

## 🛠️ Extension & Contribution Guide

### Adding New API Modules

BiTi embraces strict modular separation following NestJS paradigms.

1. Define your data model in `prisma/schema.prisma` mapping tenant relations automatically.
2. Run database migration: `npx prisma migrate dev --name init_new_module`.
3. Scaffold core: `nest g res modules/<module-name>`.
4. Inject standard CRUD operations relying safely on `TenantGuard` to auto-filter query limits.
5. Create Vue 3 views under `frontend/src/views/` and bind reactive networking calls using a dedicated Axios service file under `frontend/src/services/`.

---

## 📜 License

This project architecture and source code is strictly proprietary and unlicensed. All rights reserved.
