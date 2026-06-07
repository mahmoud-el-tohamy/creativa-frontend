# Creativa Training Filter System - Frontend

![Next.js](https://img.shields.io/badge/Next.js-000000?style=for-the-badge&logo=next.js&logoColor=white)
![TypeScript](https://img.shields.io/badge/TypeScript-3178C6?style=for-the-badge&logo=typescript&logoColor=white)
![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-38B2AC?style=for-the-badge&logo=tailwind-css&logoColor=white)
![Node.js](https://img.shields.io/badge/Node.js-43853D?style=for-the-badge&logo=node.js&logoColor=white)

An enterprise-grade internal operations platform for **Creativa Innovation Hub - Mansoura**. The system consolidates training attendance control, candidate filtering, blacklist governance, certificate generation, sheet organization, user administration, and audit visibility into a single Arabic-first web application.

---

## 📖 Table of Contents

- [🚀 Overview](#-overview)
- [✨ Core Features](#-core-features)
- [🛠️ Tech Stack](#️-tech-stack)
- [🏗️ Architecture](#️-architecture)
- [📁 Project Structure](#-project-structure)
- [⚙️ Configuration & Guidelines](#️-configuration--guidelines)
- [🎭 Role-Based Access Control](#-role-based-access-control)
- [🔄 Operational Workflows](#-operational-workflows)
- [🔐 Environment Variables](#-environment-variables)
- [🚀 Getting Started](#-getting-started)
- [📝 Deployment & Security](#-deployment--security)

---

## 🚀 Overview

The **Creativa Training Filter System** is a secure, RTL-optimized management tool built to reduce repetitive spreadsheet work and improve the reliability of training operations. It pairs a custom Node.js/Express backend with browser-side Excel and PDF processing, ensuring operations teams can process files quickly without routing large spreadsheets through a server.

### Key Value Propositions

- **Operational speed**: Client-side Excel parsing, filtering, export generation, and certificate packaging keep day-to-day workflows responsive.
- **Governed access**: Secured via a dedicated backend REST API using HttpOnly cookies (JWT), `middleware.ts` route protection, and role-aware navigation separating admin, employee, and viewer permissions.
- **Auditability**: Sensitive actions such as blacklist changes, attendance processing, filtering, and user administration are automatically logged by the backend API for administrative review.
- **Arabic-first experience**: The interface is RTL by default, uses an Arabic font at the root layout, and supports light/dark themes through `next-themes`.
- **Modern platform alignment**: Built with Next.js 16 App Router, incorporating native API rewrites and robust Axios interceptors for seamless token rotation.

---

## ✨ Core Features

### 📊 Operational Dashboard

The dashboard provides a management snapshot of blacklist activity and training operations. It includes aggregate metrics, expiring blacklist visibility, average monthly additions, and responsive Recharts visualizations with selectable daily, weekly, monthly, quarterly, and yearly ranges.

### 📱 Progressive Web App (PWA)

The system is fully installable as a standalone Progressive Web App on mobile and desktop devices. It features a custom manifest, optimized maskable icons, and a tailored standalone experience.

### 📝 Attendance Management

- **Single-session attendance**: Upload registration and attendance sheets, detect absentees, validate national IDs, avoid duplicate blacklist entries, and export attended or blacklisted result sheets.
- **Swap detection**: Warns operators when the attendance file appears larger than the registration file, reducing accidental reversed uploads.
- **Multi-day attendance**: Aggregates repeated attendance rows by participant ID, applies configurable minimum attendance thresholds, separates passed and failed participants, and adds eligible failures to the blacklist.

### ⏱️ Hours & Timetable Tracking

- **Session Management**: Log training sessions, modes (online/offline), hours, attendee counts, and evaluation links.
- **Bulk Excel Import**: Effortlessly import multiple sessions via Excel sheets with built-in deduplication.
- **Dynamic Timetables**: Automatically generates comprehensive visual timetables mapped against customizable fiscal years.
- **Advanced Exporting**: Export detailed tracking logs or structured timetable spreadsheets with a single click.

### 🚫 Blacklist & Candidate Filtering

- **Candidate filtering**: Upload a candidate list, compare against current blacklist national IDs, preview clean and excluded records, and export the clean sheet.
- **Blacklist console**: Search, sort, date-filter, status-filter, paginate, add, remove, and bulk-delete blacklist records. Includes a streamlined glassmorphism UI with framer-motion animations.
- **Dynamic Tracks**: Filter blacklisted users by specific training tracks, synchronized with the attendance module.
- **Automatic expiry cleanup**: Expired blacklist entries are verified and cleaned when the blacklist page loads.
- **National ID validation**: Prevents malformed IDs from being added during attendance processing, with strict regex patterns ensuring format compliance.

### 🧾 Sheet Organization Modules (تنظيم وفصل الشيتات)

The system offers two specialized engines to restructure raw Google Forms attendance exports:
- **Client-Side Organizer (تنظيم شيت الحضور):** Completely processes the Excel file in the browser using `SheetJS` and `xlsx-js-style`. It groups rows chronologically by `Timestamp` and `Workshop Name`, injecting solid black separator rows directly into the exported workbook while preserving all original columns.
- **Backend Attendance Separator (فصل شيت الحضور):** Securely uploads the raw file to the backend API which dynamically reconstructs it into a polished, multi-sheet Excel workbook—grouping trainees by Workshop Name into separate tabs, applying yellow session headers, and padding sessions to ensure uniform printable areas. The frontend then automatically downloads the styled file.

### 📜 Certificate Engine

The certificate generator accepts a certificate background image and an Excel list of names, provides a drag-adjustable text placement preview, allows font-size tuning, and generates up to 500 PDF certificates per batch inside a ZIP archive.

### 👥 User & Audit Administration

- **User management**: Admins can create employee/viewer accounts, update roles, activate/deactivate accounts, and search team members.
- **Username or email login**: Operators can sign in with either an email address or a stored username.
- **Audit logs**: Admins can filter logs by action, performer, and date range, view activity statistics, paginate results, and export filtered audit history to Excel.

---

## 🛠️ Tech Stack

| Category | Technology |
| :--- | :--- |
| **Framework** | Next.js 16.2.4 (App Router) |
| **Runtime UI** | React 19.2.4 |
| **Language** | TypeScript 5 |
| **Styling** | Tailwind CSS v4 via `@tailwindcss/postcss` |
| **Data Fetching** | Axios (with interceptors) & SWR |
| **State Management** | React Context (`AuthContext`) & Custom Hooks (`useTableFilters`) |
| **Excel Logic** | SheetJS (`xlsx`) & `xlsx-js-style` |
| **PDF/Archives** | jsPDF, JSZip |
| **Charts** | Recharts |
| **Animations** | Framer Motion |
| **Theming** | `next-themes` |
| **PWA Support** | `next-pwa` |
| **Observability** | Vercel Analytics and Speed Insights |

---

## 🏗️ Architecture

The project follows a Next.js App Router structure with route-level UI in `app/`, shared client components in `components/`, centralized API interaction in `lib/api.ts`, and authentication state in `context/`.

Most operational workflows are intentionally client-heavy. Excel parsing, list comparison, workbook generation, certificate rendering, and ZIP creation happen entirely in the browser to reduce backend load and keep files completely private.

### Security Model

- **Session Security**: Authentication is managed by a custom backend API using secure, `HttpOnly` JWT cookies. The frontend handles token expiration gracefully via Axios interceptors.
- **Optimistic Request Protection**: Next.js `middleware.ts` intercepts unauthenticated navigation based on the presence of the `refreshToken` cookie, preventing unauthorized page loads.
- **Client Authorization**: `RouteGuard` and `useRequireAuth` validate authenticated user profiles and role access before rendering protected pages.
- **API Proxying**: To prevent CORS issues, `next.config.ts` handles API route rewrites (`/api/:path*`), effectively masking the external backend domain from the client browser.

### Key UI Components

- **`Navbar.tsx`**: Role-aware navigation with grouped attendance/admin menus, user profile controls, responsive mobile menu behavior, and theme switching.
- **`RouteGuard.tsx`**: Shared protected-route wrapper that redirects unauthenticated users and blocks unauthorized roles.
- **`TrackSelector.tsx`**: Shared track selection component allowing dynamic addition and removal of workshop tracks across modules.
- **`FilterBar.tsx`**: Centralized filtering component standardizing search, date ranges, sorting, and pagination controls.
- **`MultiDayAttendance.tsx`**: Dedicated multi-day attendance processor used by the `/multi-day-attendance` route.

### Architecture Highlights (Refactoring)
- **DRY Principles**: Widespread usage of shared components (`shared/` directory) and custom hooks (`hooks/useTableFilters.ts`) to reduce duplication.
- **Componentized Views**: Complex pages like the Blacklist are decoupled into discrete modular modals (`AddModal`, `DeleteModal`, `BulkDeleteModal`).

---

## 📁 Project Structure

```text
├── 📁 app/                       # Next.js App Router routes
│   ├── 📁 admin/                 # Audit logs & User management workflows
│   ├── 📁 attendance/            # Single-session attendance workflow
│   ├── 📁 blacklist/             # Blacklist management console
│   ├── 📁 certificates/          # Certificate PDF/ZIP generation workflow
│   ├── 📁 filter/                # Candidate list filtering workflow
│   ├── 📁 login/                 # Email/username authentication screen
│   ├── 📁 multi-day-attendance/  # Multi-day attendance route
│   ├── 📁 organize/              # Workshop sheet organizer
│   ├── 🎨 globals.css            # Tailwind v4 import and global theme variables
│   ├── 📄 layout.tsx             # Root RTL layout, providers, analytics, nav
│   └── 📄 page.tsx               # Dashboard and blacklist analytics
├── 📁 components/                # Shared UI and workflow components
│   ├── 📁 blacklist/             # Blacklist-specific components and modals
│   ├── 📁 organize/              # Sheet organization components
│   ├── 📁 shared/                # Highly reusable cross-app components (FilterBar, TrackSelector)
│   ├── 📁 ui/                    # Custom form controls
│   ├── 📄 MultiDayAttendance.tsx
│   ├── 📄 Navbar.tsx
│   ├── 📄 RouteGuard.tsx
│   └── 📄 ThemeProvider.tsx
├── 📁 context/                   # AuthContext and global auth state
├── 📁 hooks/                     # Custom logic hooks (useTableFilters, etc.)
├── 📁 lib/                       # API clients, validation, Excel modules
│   ├── 📄 api.ts                 # Centralized Axios instance & API functions
│   ├── 📄 audit.ts               # Audit fetch wrappers
│   ├── 📄 blacklist.ts           # Blacklist fetch wrappers
│   ├── 📄 excel.ts               # SheetJS parsing & exports
│   ├── 📄 tracks.ts              # Tracks fetch wrappers
│   └── 📄 validation.ts          # National ID validation
├── 📁 public/                    # Logo and static assets
├── 📄 middleware.ts              # Next.js route protection
├── 📄 next.config.ts             # Next.js configuration & API rewrites
├── 📄 postcss.config.mjs         # Tailwind CSS v4 PostCSS setup
└── 📄 tsconfig.json              # Strict TypeScript configuration
```

---

## 🎭 Role-Based Access Control

| Feature | Admin | Employee | Viewer |
| :--- | :---: | :---: | :---: |
| Dashboard & Analytics | ✅ | ✅ | ✅ |
| View Blacklist | ✅ | ✅ | ✅ |
| Edit/Modify Blacklist | ✅ | ✅ | ❌ |
| Attendance Processing | ✅ | ✅ | ❌ |
| Multi-Day Attendance | ✅ | ✅ | ❌ |
| Candidate Filtering | ✅ | ✅ | ❌ |
| Sheet Organization | ✅ | ✅ | ❌ |
| Certificate Generation | ✅ | ✅ | ❌ |
| User Management | ✅ | ❌ | ❌ |
| Audit Logs UI | ✅ | ❌ | ❌ |

> [!NOTE]
> The navigation and `RouteGuard` enforce the user-facing role experience. The Node.js backend enforces the true data authorization rules.

---

## 🔐 Environment Variables

Create a `.env.local` file in the project root for local development.

```env
NEXT_PUBLIC_API_URL=http://localhost:5000
```

For production deployment (e.g., Vercel), set the environment variable to your deployed backend URL:

```env
NEXT_PUBLIC_API_URL=https://creativa-backend.vercel.app
```

*(Note: The Next.js `rewrites` configuration proxy routes all frontend `/api` requests automatically to this backend URL to bypass CORS.)*

---

## 🚀 Getting Started

### Prerequisites

- Node.js 20.9.0+
- npm
- The `creativa-backend` project running locally (or deployed)

### Installation & Run

1. **Clone the repository**:
   ```bash
   git clone https://github.com/mahmoud-el-tohamy/creativa-filter.git
   ```

2. **Install dependencies**:
   ```bash
   npm install
   ```

3. **Configure environment variables**:
   Create `.env.local` manually with `NEXT_PUBLIC_API_URL`.

4. **Start the development server**:
   ```bash
   npm run dev
   ```

5. **Run quality checks before release**:
   ```bash
   npm run lint
   npm run build
   ```

---

## 📝 Deployment & Security

- **Backend Dependency**: Ensure the Node.js/Express `creativa-backend` is successfully deployed and accessible.
- **Proxy Configuration**: The `next.config.ts` rewrite natively masks the API destination URL from the client browser, securing the endpoint and resolving CORS natively.
- **Cookie Security**: Authentication is managed completely by `HttpOnly` cookies. No JWTs are stored in `localStorage`.
- **Monitor Runtime Behavior**: Vercel Analytics and Speed Insights are mounted in the root layout for production visibility.

---

**Built with ❤️ for Creativa Innovation Hub - Mansoura.**
