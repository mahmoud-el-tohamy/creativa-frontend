# Creativa Training Filter System - Frontend Operations Platform

<div align="center">
  <img src="https://img.shields.io/badge/Next.js-000000?style=for-the-badge&logo=next.js&logoColor=white" alt="Next.js" />
  <img src="https://img.shields.io/badge/React-20232A?style=for-the-badge&logo=react&logoColor=61DAFB" alt="React" />
  <img src="https://img.shields.io/badge/TypeScript-3178C6?style=for-the-badge&logo=typescript&logoColor=white" alt="TypeScript" />
  <img src="https://img.shields.io/badge/Tailwind_CSS-38B2AC?style=for-the-badge&logo=tailwind-css&logoColor=white" alt="Tailwind CSS" />
</div>

<br />

An enterprise-grade, internal operations platform tailored for **Creativa Innovation Hub - Mansoura**. Designed with an Arabic-first UI and optimized for extreme operational velocity, this system consolidates training attendance control, candidate filtering, blacklist governance, financial tracking, certificate generation, and audit visibility into a single, highly responsive web application.

---

## 📖 Table of Contents

- [🚀 Key Value Propositions](#-key-value-propositions)
- [✨ Core Modules & Features](#-core-modules--features)
  - [📊 Operations & Dashboard](#-operations--dashboard)
  - [👥 Instructors & Financial Tracking (New)](#-instructors--financial-tracking-new)
  - [⏱️ Hours & Operational Timetables](#️-hours--operational-timetables)
  - [🚫 Blacklist & Safety Governance](#-blacklist--safety-governance)
  - [🧾 Advanced Sheet Organization](#-advanced-sheet-organization)
- [🏗️ Client-Side Architecture](#️-client-side-architecture)
- [🛠️ Technology Stack](#️-technology-stack)
- [📁 Folder Structure](#-folder-structure)
- [🚀 Local Setup & Guidelines](#-local-setup--guidelines)
- [🌐 Deployment & Vercel Specifics](#-deployment--vercel-specifics)

---

## 🚀 Key Value Propositions

- **Browser-Powered Processing:** Massive Excel parsing, cross-referencing, certificate rendering, and ZIP file compilation are executed entirely inside the user's browser, eliminating backend bottlenecks and preserving absolute data privacy.
- **Vercel-Optimized Filesystem:** Utilizes highly compressed **Base64 string storage** in MongoDB for user and instructor profile pictures, natively bypassing Vercel's read-only serverless filesystem constraints.
- **Arabic-First UX:** The interface is meticulously designed in RTL, incorporating professional Arabic typography, dynamic Light/Dark modes, and smooth Framer Motion micro-interactions.
- **Secure by Default:** Integrates with the backend using robust Axios interceptors and Next.js middleware to transparently handle token rotation via `HttpOnly` cookies, ensuring state-of-the-art session security.

---

## ✨ Core Modules & Features

### 📊 Operations & Dashboard
- **Live Metrics Snapshot:** Provides an immediate glance at total blacklist entries, weekly trends, expired bans, and total logged training sessions.
- **Recharts Analytics:** Highly interactive visualizations with configurable date ranges to track the volume of warnings and blacklistings over time.

### 👥 Instructors & Financial Tracking (New)
- **Instructor Profiles:** A dedicated interface to manage instructor data, associate training tracks, attach CVs, and assign daily financial rates.
- **Financial Module:** A comprehensive table view that automatically calculates total costs per session based on instructor rates and session durations.
- **1-Click Financial Exports:** Allows operations managers to export detailed financial summaries mapped by specific date ranges to Excel.

### ⏱️ Hours & Operational Timetables
- **Fiscal Year Mapping:** Organizes thousands of logged sessions accurately into designated fiscal years.
- **Planned vs Actual Heatmaps:** Visually compare targeted session hours against actual delivered hours via progressive bar charts.
- **Smart Matrix Export:** Converts raw session logs into beautiful, grid-based Excel timetables separated by months and days.

### 🚫 Blacklist & Safety Governance
- **Safe Warning Interceptor:** Before applying a warning to an attendee, a modal fires a live API check to preview their current warning count, preventing accidental escalations.
- **Candidate Filtering:** Upload an Excel candidate list and instantly filter out blacklisted members. Generates a clean, downloadable spreadsheet in milliseconds.
- **Automatic Expiry Cleanup:** The UI automatically detects and clears expired blacklist entries upon page load, maintaining a pristine database.

### 🧾 Advanced Sheet Organization
The system provides tailored engines to restructure messy Google Forms exports:
- **Client-Side Organizer (تنظيم شيت الحضور):** Rapidly groups rows chronologically and by Workshop Name, injecting visual separator rows directly via `xlsx-js-style`.
- **Backend Separator (فصل شيت الحضور):** Sends raw data to the backend to create a polished, multi-sheet workbook where each workshop occupies its own uniquely styled tab.

### 📜 Certificate Engine
- Upload a blank certificate image template alongside a list of names.
- Drag-and-drop the text placeholder to the exact pixel coordinate.
- The system generates up to 500 personalized PDF certificates and compresses them into a single ZIP file for download.

---

## 🏗️ Client-Side Architecture

- **Next.js App Router (v16):** Utilizes `app/` directory layouts, parallel loading states, and robust error boundaries.
- **API Masking via Proxies:** To circumvent strict browser CORS policies, `next.config.ts` intercepts requests starting with `/api` and stealthily rewrites them to the external backend server URL.
- **PWA Ready:** Configured with `next-pwa`, providing optimized maskable icons and standalone installation capabilities for mobile and desktop usage.
- **State Management:** Uses React Context (`AuthContext`) for centralized session awareness, combined with generic custom hooks (`useTableFilters`) to power advanced pagination and sorting cleanly.

---

## 🛠️ Technology Stack

| Domain | Technology |
| :--- | :--- |
| **Framework** | Next.js 16.2.4 (App Router) |
| **UI Library** | React 19.2.4 |
| **Styling** | Tailwind CSS v4 |
| **Network** | Axios (with rotation interceptors) |
| **Excel Core** | SheetJS (`xlsx`) & `xlsx-js-style` |
| **PDF & Zipping** | jsPDF, JSZip |
| **Visualizations** | Recharts, Framer Motion |
| **Observability** | Vercel Analytics & Speed Insights |

---

## 📁 Folder Structure

```text
├── 📁 app/                       # App Router architecture
│   ├── 📁 admin/                 # Audit logs & User management
│   ├── 📁 blacklist/             # Blacklist console
│   ├── 📁 financial-tracking/    # Financial modules
│   ├── 📁 hours/                 # Timetables & planned hours
│   ├── 📁 instructors/           # Instructor profiles
│   ├── 📄 layout.tsx             # Root RTL layout, providers, nav
│   └── 📄 page.tsx               # Analytics dashboard
├── 📁 components/                # Shared UI blocks
│   ├── 📁 shared/                # FilterBars, TrackSelectors
│   ├── 📁 ui/                    # Custom form inputs
│   └── 📄 RouteGuard.tsx         # Route protection logic
├── 📁 context/                   # AuthContext
├── 📁 hooks/                     # Custom data manipulation hooks
├── 📁 lib/                       # SDK & utilities
│   ├── 📄 api.ts                 # Centralized Axios configurations
│   ├── 📄 excel.ts               # SheetJS wrappers
│   └── 📄 validation.ts          # National ID regex
├── 📄 middleware.ts              # Optimistic route interception
└── 📄 next.config.ts             # API Rewrites & settings
```

---

## 🚀 Local Setup & Guidelines

1. **Prerequisites:** Ensure Node.js 20.9.0+ is installed, and the `creativa-backend` is successfully running on your machine.
2. **Clone & Install**:
   ```bash
   git clone https://github.com/mahmoud-el-tohamy/creativa-frontend.git
   cd creativa-frontend
   npm install
   ```
3. **Configure Environment**: Create a `.env.local` file pointing to your backend URL:
   ```env
   NEXT_PUBLIC_API_URL=http://localhost:5000
   ```
4. **Start Development**:
   ```bash
   npm run dev
   ```

---

## 🌐 Deployment & Vercel Specifics

This repository is tailored for deployment on Vercel.
- **Backend Link:** Ensure the `NEXT_PUBLIC_API_URL` environment variable is defined in your Vercel Project settings pointing to your live backend domain.
- **No Local Files:** The application relies entirely on client-side JS processing and Base64 MongoDB storage, completely circumventing Vercel's ephemeral, read-only filesystem restrictions.
- **Observability:** Native integration with Vercel Analytics provides real-time Web Vitals and visitor telemetry.

---

<div align="center">
  <b>Built with ❤️ for Creativa Innovation Hub - Mansoura.</b>
</div>
