---
title: "BiTi - Enterprise Full-Stack Task Management SaaS Platform | NestJS, Next.js, Vue 3"
description: "Discover BiTi, a production-ready, multi-tenant SaaS application designed for enterprise project management. Built with NestJS, Vue 3, Next.js, and PostgreSQL."
keywords: "Full-Stack SaaS, Task Management Software, Multi-Tenant Architecture, NestJS Developer, Next.js NextAuth, Vue 3 Vuetify, WebSockets, Prisma ORM, Stripe Integration"
author: "Portfolio Owner"
---

# BiTi — Enterprise Task Management & Team Collaboration Platform

[![Tech Stack](https://img.shields.io/badge/Stack-NestJS%20%7C%20Vue%203%20%7C%20Next.js-blue?style=for-the-badge)](https://github.com/your-org/task-system)
[![Architecture](https://img.shields.io/badge/Architecture-Multi--Tenant%20SaaS-success?style=for-the-badge)](https://github.com/your-org/task-system)

> BiTi is a comprehensive, production-grade **Software-as-a-Service (SaaS) platform** I designed and developed to solve the complex challenges of modern project management. This full-stack application provides a unified ecosystem for cross-functional teams to plan sprints, track tasks in real time, collaborate seamlessly, and scale via subscription tiers.

---

## 🚀 Executive Summary

As organizations scale, managing workflows across fragmented tools becomes a bottleneck. **BiTi** bridges this gap by combining highly structured agile project management (Kanban, sprints, dependencies) with fluid, real-time collaboration (WebSockets chat, instant notifications).

The architecture is meticulously crafted with a clear separation of concerns across three core tiers:

1. **High-Performance Backend API**: A robust NestJS server handling complex business logic, Role-Based Access Control (RBAC), and strict data isolation.
2. **Reactive Admin Dashboard**: A rich, single-page application (SPA) built on Vue 3 and Vuetify for an intuitive user experience.
3. **SEO-Optimized Marketing Website**: A lightning-fast, static/server-rendered Next.js site designed for lead acquisition and customer conversion.

---

## 🛠️ Technology Stack Mastery

The platform leverages a modern, cutting-edge technology stack configured for performance, scalability, and type safety end-to-end.

### Backend Infrastructure

- **Framework:** NestJS 11 (Node.js) with TypeScript 5.7
- **Database & ORM:** PostgreSQL 16 managed by Prisma 6 ORM
- **Real-time Engine:** Socket.IO for WebSockets gateway
- **Auth & Security:** JWT, Passport, Helmet, custom Tenant Guards
- **Monetization:** Stripe & PayPal Server SDKs for subscription billing
- **Cloud Services:** Supabase Storage, Nodemailer (SMTP)

### Frontend (Admin Dashboard)

- **Framework:** Vue 3 (Composition API) with Vite 7
- **UI/UX:** Vuetify 3 (Material Design), SortableJS, Chart.js
- **State Management:** Pinia 3 for complex global state and caching
- **Networking:** Axios, Socket.IO-client

### Marketing & Growth (Website)

- **Framework:** Next.js 16 (App Router) & React 19
- **Styling:** Tailwind CSS V4 for rapid footprint-free design
- **Authentication:** NextAuth.js 4 with OAuth provider fallbacks

---

## 💡 Key Architectural Highlights

### 1. Robust Multi-Tenant Data Isolation

BiTi is a true business-to-business (B2B) application. Every data entity is strictly scoped to a specific organization (Tenant).

- **Seamless Context Switching**: Organizations are resolved dynamically via HTTP Headers (`X-Tenant-ID`), subdomains, or intelligent user defaults.
- **Security by Design**: A global `TenantGuard` and customized Prisma repository patterns guarantee absolute data silos, preventing data leakage across organizational boundaries.

### 2. Deep Agile Project Flow & Dependency Management

Project workflows are highly customizable to fit various agile methodologies.

- **Cycle Detection Logic**: Implemented advanced depth-first search (DFS) algorithms to strictly prevent circular dependencies between tasks.
- **Milestones & Sprints**: Support for nested subtasks, reusable sprint templates, and timesheet logging tied to specific billable hours.

### 3. Unified Real-Time Collaboration Layer

- **Instant Productivity**: Leveraging bidirectional WebSockets, the platform delivers instant push-style notifications, chat threads, and task metric updates without requiring browser refreshes.
- **Contextual Presence**: Users can track team status, presence indicators (`ACTIVE`, `AWAY`), and "last seen" telemetry synced across the ecosystem.

### 4. Enterprise-Grade Granular RBAC

- Beyond standard Admin/User roles, BiTi includes a fully dynamic permission engine.
- Tenant owners can define bespoke roles with micro-level permissions (e.g., `task.edit_own`, `project.delete`, `billing.view`), mapping them natively via bitwise or database lookups for lightning-fast authorization.

### 5. Frictionless Monetization & Quota Enforcement

- Integrated an automated billing system using **Stripe** that dynamically scales platform features.
- Free, Starter, Pro, and Enterprise tiers strictly regulate maximum users, active projects, and file storage limits (via Supabase), verified automatically at the API boundary logic.

---

## ⚙️ System Processing Logic & Database Design

Building BiTi required architecting an extensive, optimized relational database spanning **over 30 complex relational models**.

Key capabilities engineered at the database level include:

- **Transactional Integrity:** Comprehensive use of Prisma Interactive Transactions (`$transaction`) ensures that task modifications, audit logging (`TaskHistory`), and activity tracking succeed or fail atomically.
- **Soft Delete Mechanisms:** Implementation of `deletedAt` timestamps across critical assets prevents accidental data loss and allows for extended data retention policies necessary for enterprise compliance.
- **Extensive Relational Mapping:** Complex many-to-many relationships power departments, workspaces, cross-functional teams, and dynamic task assignments.

---

## 📈 Impact & Business Value

BiTi is not just a coding exercise; it is designed with actual business outcomes in mind:

- **Reduce Context Switching:** By wrapping Chat, Kanban, Bug Tracking, and Meeting Scheduling into one domain.
- **Drive Revenue:** Out-of-the-box Stripe hooks mean the application is ready to accept SaaS subscription revenue on Day 1.
- **SEO & Growth:** A dedicated Next.js marketing application ensures high Lighthouse scores and top-tier indexing for organic search traffic.

---

### Links & Resources

[Live Demo](https://biti.example.com) • [GitHub Repository](https://github.com/your-org/task-system) • [Architecture Diagrams](./docs/architecture)
