# Creativa Training Filter System

![Next.js](https://img.shields.io/badge/Next.js-000000?style=for-the-badge&logo=next.js&logoColor=white)
![TypeScript](https://img.shields.io/badge/TypeScript-3178C6?style=for-the-badge&logo=typescript&logoColor=white)
![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-38B2AC?style=for-the-badge&logo=tailwind-css&logoColor=white)
![Firebase](https://img.shields.io/badge/Firebase-FFCA28?style=for-the-badge&logo=firebase&logoColor=black)

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

The **Creativa Training Filter System** is a secure, RTL-optimized management tool built to reduce repetitive spreadsheet work and improve the reliability of training operations. It combines Firebase-backed authentication and data persistence with browser-side Excel and PDF processing so operations teams can process files quickly without routing large spreadsheets through a custom backend.

### Key Value Propositions

- **Operational speed**: Client-side Excel parsing, filtering, export generation, and certificate packaging keep day-to-day workflows responsive.
- **Governed access**: Firebase Auth, Firestore user profiles, role-aware navigation, route guards, and Firestore security rules separate admin, employee, and viewer permissions.
- **Auditability**: Sensitive actions such as blacklist changes, attendance processing, filtering, sheet organization, and user administration are logged for administrative review.
- **Arabic-first experience**: The interface is RTL by default, uses an Arabic font at the root layout, and supports light/dark themes through `next-themes`.
- **Modern platform alignment**: The app uses the Next.js 16 App Router, Route Handlers, and the current `proxy.ts` convention that replaces legacy Middleware terminology.

---

## ✨ Core Features

### 📊 Operational Dashboard

The dashboard provides a management snapshot of blacklist activity and training operations. It includes aggregate metrics, expiring blacklist visibility, average monthly additions, and responsive Recharts visualizations with selectable daily, weekly, monthly, quarterly, and yearly ranges.

### 📝 Attendance Management

- **Single-session attendance**: Upload registration and attendance sheets, detect absentees, validate national IDs, avoid duplicate blacklist entries, and export attended or blacklisted result sheets.
- **Swap detection**: Warns operators when the attendance file appears larger than the registration file, reducing accidental reversed uploads.
- **Multi-day attendance**: Aggregates repeated attendance rows by participant ID, applies configurable minimum attendance thresholds, separates passed and failed participants, and adds eligible failures to the blacklist.

### 🚫 Blacklist & Candidate Filtering

- **Candidate filtering**: Upload a candidate list, compare against current blacklist national IDs, preview clean and excluded records, and export the clean sheet.
- **Blacklist console**: Search, sort, date-filter, status-filter, paginate, add, remove, and bulk-delete blacklist records.
- **Automatic expiry cleanup**: Blacklist entries older than four months are cleaned when the blacklist page loads.
- **National ID validation**: Prevents malformed IDs from being added during attendance processing.

### 🧾 Sheet Organization

The sheet organizer restructures Google Forms-style attendance exports by workshop name and date, preserves original columns, applies readable column widths, freezes the header row, and exports a cleaned workbook for downstream operational use.

### 📜 Certificate Engine

The certificate generator accepts a certificate background image and an Excel list of names, provides a drag-adjustable text placement preview, allows font-size tuning, and generates up to 500 PDF certificates per batch inside a ZIP archive.

### 👥 User & Audit Administration

- **User management**: Admins can create employee/viewer accounts through a secured Route Handler, update roles, activate/deactivate accounts, and search team members.
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
| **Authentication** | Firebase Auth |
| **Database** | Cloud Firestore |
| **Server Operations** | Firebase Admin SDK through App Router Route Handlers |
| **Excel Logic** | SheetJS (`xlsx`) |
| **PDF/Archives** | jsPDF, JSZip |
| **Charts** | Recharts |
| **Theming** | `next-themes` |
| **Observability** | Vercel Analytics and Speed Insights |
| **Linting** | ESLint 9 with `eslint-config-next` flat config |

---

## 🏗️ Architecture

The project follows a Next.js App Router structure with route-level UI in `app/`, shared client components in `components/`, Firebase and business logic in `lib/`, and authentication state in `context/`.

Most operational workflows are intentionally client-heavy. Excel parsing, list comparison, workbook generation, certificate rendering, and ZIP creation happen in the browser to reduce backend load and keep files close to the operator. Server-side functionality is reserved for privileged operations that require Firebase Admin credentials, currently user creation via `app/api/create-user/route.ts`.

### Security Model

- **Optimistic request protection**: `proxy.ts` redirects unauthenticated navigation based on the lightweight `auth-session` cookie. This follows the Next.js 16 Proxy convention and is used for fast UX-level redirects, not as the sole authorization boundary.
- **Client authorization**: `RouteGuard` and `useRequireAuth` validate authenticated user profiles and role access before rendering protected pages.
- **Data authorization**: `firestore.rules` enforces collection-level permissions for users, blacklist records, and audit logs.
- **Admin credentials**: Firebase Admin SDK is initialized only when the server route needs it, using `FIREBASE_ADMIN_*` environment variables.

### Key UI Components

- **`Navbar.tsx`**: Role-aware navigation with grouped attendance/admin menus, user profile controls, responsive mobile menu behavior, and theme switching.
- **`RouteGuard.tsx`**: Shared protected-route wrapper that redirects unauthenticated users and blocks unauthorized roles.
- **`ThemeProvider.tsx`**: Light/dark/system theme orchestration.
- **`MultiDayAttendance.tsx`**: Dedicated multi-day attendance processor used by the `/multi-day-attendance` route.
- **`CustomSelect.tsx`**: Reusable RTL-ready select control used by filters and admin forms.
- **`ToggleSwitch.tsx`**: Reusable toggle control used in user administration.

---

## 📁 Project Structure

```text
├── 📁 app/                       # Next.js App Router routes and API handlers
│   ├── 📁 admin/
│   │   ├── 📁 audit/             # Audit log dashboard, filters, and Excel export
│   │   └── 📁 users/             # User management, roles, activation state
│   ├── 📁 api/
│   │   └── 📁 create-user/       # Firebase Admin-backed user creation route
│   ├── 📁 attendance/            # Single-session attendance comparison workflow
│   ├── 📁 blacklist/             # Blacklist management console
│   ├── 📁 certificates/          # Certificate PDF/ZIP generation workflow
│   ├── 📁 filter/                # Candidate list filtering workflow
│   ├── 📁 login/                 # Email/username authentication screen
│   ├── 📁 multi-day-attendance/  # Multi-day attendance route wrapper
│   ├── 📁 organize/              # Workshop sheet organizer
│   ├── 🎨 globals.css            # Tailwind v4 import and global theme variables
│   ├── 📄 layout.tsx             # Root RTL layout, providers, analytics, nav
│   └── 📄 page.tsx               # Dashboard and blacklist analytics
├── 📁 components/                # Shared UI and workflow components
│   ├── 📁 ui/                    # Custom form controls
│   │   ├── 📄 CustomSelect.tsx
│   │   └── 📄 ToggleSwitch.tsx
│   ├── 📄 MultiDayAttendance.tsx
│   ├── 📄 Navbar.tsx
│   ├── 📄 RouteGuard.tsx
│   └── 📄 ThemeProvider.tsx
├── 📁 context/                   # AuthContext and global auth state
├── 📁 hooks/                     # Authentication hooks
├── 📁 lib/                       # Firebase, auth, audit, validation, Excel modules
│   ├── 📄 audit.ts               # Firestore audit logging helpers
│   ├── 📄 auth.ts                # App user profile and role utilities
│   ├── 📄 blacklist.ts           # Blacklist CRUD, bulk writes, expiry cleanup
│   ├── 📄 excel.ts               # SheetJS parsing, exports, organizer logic
│   ├── 📄 firebase.ts            # Firebase client SDK initialization
│   ├── 📄 firebase-admin.ts      # Firebase Admin SDK initialization
│   └── 📄 validation.ts          # National ID validation
├── 📁 public/                    # Logo and static assets
├── 📝 AGENTS.md                  # AI assistant guidance for current Next.js conventions
├── 📝 CLAUDE.md                  # Delegates to AGENTS.md
├── 📄 eslint.config.mjs          # ESLint flat configuration
├── 📄 firestore.rules            # Firestore authorization rules
├── 📄 next.config.ts             # Next.js configuration entry
├── 📄 postcss.config.mjs         # Tailwind CSS v4 PostCSS setup
├── 📄 proxy.ts                   # Next.js 16 Proxy redirect logic
└── 📄 tsconfig.json              # Strict TypeScript configuration and aliases
```

---

## ⚙️ Configuration & Guidelines

This repository uses modern Next.js conventions and should be maintained against the local framework documentation in `node_modules/next/dist/docs/`.

- **`AGENTS.md`**: Explicitly warns that this Next.js version may differ from prior conventions and requires checking local Next.js docs before code changes.
- **`proxy.ts`**: Uses the Next.js 16 Proxy convention. Legacy "middleware" language should be avoided in new documentation and code comments unless discussing migration.
- **`eslint.config.mjs`**: Uses ESLint flat config with `next/core-web-vitals` and Next TypeScript rules.
- **`postcss.config.mjs`**: Configures Tailwind CSS v4 through `@tailwindcss/postcss`.
- **`tsconfig.json`**: Enables strict mode, App Router typings, and the `@/*` path alias.
- **`firestore.rules`**: Defines the production authorization boundary and must be deployed with the Firebase project.

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
> The navigation and `RouteGuard` enforce the user-facing role experience. Firestore rules remain the required production data boundary.

---

## 🔄 Operational Workflows

> [!TIP]
> Most file processing happens in the browser. For standard attendance and filtering, the expected Excel shape is first-row headers followed by `Name`, `National ID`, optional phone, and optional email columns. Multi-day attendance supports common English and Arabic aliases for name, ID/code, and national ID columns.

### 1. Attendance Verification

1. Upload the registration sheet and attendance sheet.
2. Review the automatic warning if the files appear to be reversed.
3. Process the comparison to identify absentees.
4. Valid, non-duplicate absentees are added to the blacklist.
5. Export attended records or blacklist/invalid/skipped records as Excel workbooks.

### 2. Multi-Day Programs

1. Enter total training days and the minimum required attendance days.
2. Upload an Excel or CSV attendance log containing name, participant ID/code, and national ID.
3. The system aggregates attendance by participant ID.
4. Participants are split into passed and failed lists.
5. Failed participants with valid, non-duplicate national IDs are added to the blacklist and can be exported.

### 3. Candidate Filtering

1. Upload the candidate Excel file.
2. The system compares candidates against the current blacklist.
3. Review clean candidates and excluded candidates.
4. Export the clean list for training communication or enrollment.

### 4. Sheet Organization

1. Upload a Google Forms-style attendance workbook.
2. The system groups rows by `Workshop Name` and `Timestamp` date.
3. Missing required columns are surfaced in the UI.
4. Export an organized workbook with preserved columns, readable widths, frozen headers, and visual separators.

### 5. Certificate Generation

1. Upload a PNG or JPG certificate template.
2. Upload an Excel sheet where the first column contains recipient names.
3. Drag the live preview to position the name and adjust the font size.
4. Generate a ZIP archive containing individual PDF certificates.

### 6. Administration & Audit

1. Admins create employee/viewer users from the user management page.
2. Role changes and activation changes require confirmation and are logged.
3. Audit logs can be filtered, paginated, summarized, and exported to Excel.

---

## 🔐 Environment Variables

Create a `.env.local` file in the project root for local development.

### Client-Side Firebase

```env
NEXT_PUBLIC_FIREBASE_API_KEY=xxx
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=xxx
NEXT_PUBLIC_FIREBASE_PROJECT_ID=xxx
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=xxx
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=xxx
NEXT_PUBLIC_FIREBASE_APP_ID=xxx
NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID=xxx
```

### Server-Side Firebase Admin

```env
FIREBASE_ADMIN_PROJECT_ID=xxx
FIREBASE_ADMIN_CLIENT_EMAIL=xxx
FIREBASE_ADMIN_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n"
```

> [!IMPORTANT]
> `FIREBASE_ADMIN_PRIVATE_KEY` is normalized at runtime by replacing escaped `\n` sequences with real newlines, which supports common Vercel and `.env.local` formats.

---

## 🚀 Getting Started

### Prerequisites

- Node.js 20.9.0+ as required by the installed Next.js release
- npm
- Firebase project with Authentication and Cloud Firestore enabled
- A Firestore `users` document for the first admin account

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

   Create `.env.local` manually using the variables listed above.

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

- **Deploy Firestore rules**: `firestore.rules` must be deployed to the Firebase project before production usage.
- **Configure Firebase Auth**: Enable email/password sign-in and ensure each authenticated user has a matching Firestore profile in `users`.
- **Protect Admin credentials**: Keep all `FIREBASE_ADMIN_*` variables server-only and configure them in the hosting provider environment.
- **Understand Proxy scope**: `proxy.ts` provides fast redirects using the `auth-session` cookie. It improves navigation behavior but does not replace Firebase Auth, `RouteGuard`, or Firestore rules.
- **Validate production builds**: Run `npm run lint` and `npm run build` before deployment.
- **Monitor runtime behavior**: Vercel Analytics and Speed Insights are mounted in the root layout for production visibility.

---

**Built with ❤️ for Creativa Innovation Hub - Mansoura.**
