# Creativa Training Filter System

A production-oriented internal web application for **Creativa Innovation Hub - Mansoura** to manage training operations around attendance, filtering, blacklisting, certificates, and user administration.

The application is built with **Next.js 16**, **TypeScript**, **Tailwind CSS v4**, and **Firebase**. It provides an Arabic-first RTL interface with role-based access control for admins, employees, and viewers.

## Table of Contents

- [Overview](#overview)
- [Core Capabilities](#core-capabilities)
- [Role Matrix](#role-matrix)
- [Feature Workflows](#feature-workflows)
- [Tech Stack](#tech-stack)
- [Architecture](#architecture)
- [Project Structure](#project-structure)
- [Firestore Data Model](#firestore-data-model)
- [Environment Variables](#environment-variables)
- [Getting Started](#getting-started)
- [Build and Quality Checks](#build-and-quality-checks)
- [Security and Access Notes](#security-and-access-notes)
- [Operational Notes](#operational-notes)
- [Deployment Notes](#deployment-notes)

## Overview

Creativa Training Filter System helps the team run recurring training programs with less manual spreadsheet work. It centralizes several repetitive operations that were previously done manually:

- Comparing registered vs attended sheets.
- Tracking attendance across multi-day programs.
- Automatically blacklisting absentees or under-attendees.
- Filtering future candidate lists against the blacklist.
- Generating bulk certificates from a visual template.
- Managing users, permissions, and audit history.

The product is intentionally optimized for internal operations:

- Arabic RTL UI.
- Light and dark mode support.
- Excel-first workflows.
- Fast, client-driven interactions with Firebase.
- Admin tools for user lifecycle and audit review.

## Core Capabilities

### 1. Dashboard

The home page provides a quick operational overview of blacklist activity:

- Total blacklist entries.
- Entries added this month.
- Entries nearing automatic expiry.
- Average monthly additions.
- Recent blacklist activity table.
- Quick links to the main workflows.
- Monthly charting and export options.

### 2. Standard Attendance Processing

The standard attendance page compares:

- A sheet of all registered trainees.
- A sheet of actual attendees.

The app identifies absentees, checks whether they already exist in the blacklist, and adds only new absentees automatically.

### 3. Multi-Day Attendance Processing

The multi-day attendance workflow is designed for programs that span multiple days.

Inputs:

- `Total Training Days`
- `Minimum Required Attendance Days`
- One Excel file containing repeated attendance rows

Expected columns:

- `Name`
- `ID`
- `National ID`

What it does:

- Parses the Excel sheet with `xlsx`.
- Groups rows by `ID`.
- Counts how many times each `ID` appears.
- Treats that count as the trainee's attended days.
- Splits trainees into:
  - `passedList` if attendance is greater than or equal to the required minimum.
  - `failedList` if attendance is below the required minimum.
- Adds failed trainees to Firestore blacklist in batches.
- Generates a downloadable clean sheet for passed trainees.

Output clean sheet columns:

- `Name`
- `ID`
- `National ID`
- `Attended Days`

### 4. Candidate Filtering

The filtering page accepts a candidate list, checks it against the blacklist, then produces:

- A clean list for allowed trainees.
- A separate visual list of excluded blacklisted candidates.
- A downloadable Excel file for the clean list.
- Pagination for easier review.

### 5. Blacklist Management

The blacklist page acts as a management console for excluded trainees.

Features:

- Search by name or national ID.
- Manual add and remove.
- Bulk delete.
- Auto-cleanup of entries older than 4 months.
- Date visibility for each record.
- Read access for viewers.
- Write access for admins and employees only.

### 6. Certificate Generation

The certificates page generates personalized PDF certificates in bulk from:

- A certificate image template.
- An Excel sheet of names.

Features:

- Drag-and-position preview for name placement.
- Adjustable font size.
- Batch PDF generation.
- ZIP archive export.
- Upper bound protection for large batches.

### 7. User Administration

Admins can manage system users from the admin users page.

Features:

- Create employee and viewer accounts.
- Change user roles.
- Activate or deactivate users.
- Search users by name, email, or username.
- View user statistics.

User creation uses a secured server route powered by Firebase Admin SDK.

### 8. Audit Logs

The admin audit page tracks important actions across the system.

Examples:

- Blacklist additions and removals.
- Attendance processing actions.
- Candidate filtering runs.
- User creation and role changes.

The page supports:

- Filtering by action type.
- Filtering by performer.
- Date range filters.
- Excel export.

## Role Matrix

| Area | Admin | Employee | Viewer |
| --- | --- | --- | --- |
| Dashboard | Yes | Yes | Yes |
| View blacklist | Yes | Yes | Yes |
| Edit blacklist | Yes | Yes | No |
| Standard attendance page | Yes | Yes | No |
| Multi-day attendance page | Yes | Yes | No |
| Candidate filtering | Yes | Yes | No |
| Certificate generation | Yes | Yes | No |
| User management | Yes | No | No |
| Audit page | Yes | No | No |

## Feature Workflows

### Standard Attendance Workflow

1. Upload the registered sheet.
2. Upload the attended sheet.
3. The app compares both using national ID.
4. Missing attendees are treated as absentees.
5. New absentees are inserted into the blacklist.
6. The UI shows a summary and the newly added absentees.

### Multi-Day Attendance Workflow

1. Enter total program days.
2. Enter minimum required attendance.
3. Upload a single attendance sheet.
4. The app groups rows by `ID`.
5. It counts attended days per trainee.
6. Failed trainees are inserted into the blacklist.
7. Passed trainees are shown in a result table.
8. A clean result sheet can be downloaded.

### Candidate Filtering Workflow

1. Upload the candidate list.
2. The app loads the current blacklist.
3. Candidates are split into accepted and excluded groups.
4. Accepted candidates can be exported as a clean Excel sheet.

### Certificate Workflow

1. Upload the certificate image template.
2. Upload the Excel sheet of names.
3. Drag the preview text into the correct position.
4. Adjust font size as needed.
5. Generate and download the ZIP of certificate PDFs.

## Tech Stack

- **Framework:** Next.js 16 App Router
- **Language:** TypeScript
- **Styling:** Tailwind CSS v4
- **UI Direction:** Arabic RTL
- **Auth:** Firebase Authentication
- **Database:** Cloud Firestore
- **Admin Operations:** Firebase Admin SDK
- **Excel Processing:** SheetJS `xlsx`
- **PDF Generation:** `jspdf`
- **ZIP Export:** `jszip`
- **Charts:** `recharts`
- **Theme Support:** `next-themes`

## Architecture

### Frontend

The app is primarily client-driven. Most operational pages are client components that:

- Read files locally in the browser.
- Parse Excel sheets client-side.
- Query and update Firestore directly where appropriate.
- Use role-aware route guards.

### Authentication Model

Authentication is handled in two layers:

- **Firebase Auth** manages real authentication state.
- **Client-side role checks** determine access to role-specific pages.

The app also sets a lightweight `auth-session` cookie to help a proxy redirect unauthenticated visitors away from protected routes before the full client app loads.

### Data Layer

The codebase uses small focused utility modules:

- `lib/firebase.ts` for client Firebase initialization.
- `lib/firebase-admin.ts` for secure admin-only server actions.
- `lib/auth.ts` for user profile reads and user status updates.
- `lib/blacklist.ts` for blacklist CRUD and batch insertion.
- `lib/excel.ts` for Excel import/export utilities.
- `lib/audit.ts` for audit log writes and reads.

## Project Structure

```text
app/
  admin/
    audit/
    users/
  api/
    create-user/
  attendance/
  blacklist/
  certificates/
  filter/
  login/
  multi-day-attendance/
  page.tsx

components/
  MultiDayAttendance.tsx
  Navbar.tsx
  RouteGuard.tsx
  ThemeProvider.tsx
  ui/

context/
  AuthContext.tsx

hooks/
  useAuth.ts
  useRequireAuth.ts

lib/
  audit.ts
  auth.ts
  blacklist.ts
  excel.ts
  firebase.ts
  firebase-admin.ts

firestore.rules
proxy.ts
```

## Firestore Data Model

### `users`

Stores application-specific user profiles and roles.

Typical fields:

- `uid`
- `email`
- `username`
- `displayName`
- `role`
- `isActive`
- `createdAt`
- `createdBy`

### `blacklist`

Stores excluded trainees.

Typical fields:

- `name`
- `nationalId`
- `addedAt`

### `audit_logs`

Stores operational history.

Typical fields:

- `action`
- `performedBy`
- `performedByName`
- `performedByRole`
- `targetId`
- `targetName`
- `details`
- `timestamp`

## Environment Variables

Create a `.env.local` file in the project root.

### Firebase Client SDK

```env
NEXT_PUBLIC_FIREBASE_API_KEY=your_api_key
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=your_project.firebaseapp.com
NEXT_PUBLIC_FIREBASE_PROJECT_ID=your_project_id
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=your_project.firebasestorage.app
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
NEXT_PUBLIC_FIREBASE_APP_ID=your_app_id
NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID=your_measurement_id
```

### Firebase Admin SDK

Required for creating users through `/api/create-user`.

```env
FIREBASE_ADMIN_PROJECT_ID=your_project_id
FIREBASE_ADMIN_CLIENT_EMAIL=your_service_account_email
FIREBASE_ADMIN_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n"
```

## Getting Started

### Prerequisites

- Node.js 18 or newer
- npm
- A Firebase project with:
  - Authentication enabled
  - Firestore enabled
  - Service account credentials for admin operations

### Installation

```bash
git clone git@github.com:mahmoud-el-tohamy/creativa-filter.git
cd creativa-filter
npm install
```

### Local Development

```bash
npm run dev
```

Then open:

```text
http://localhost:3000
```

### Firestore Rules

Deploy the provided `firestore.rules` to your Firebase project before using the app in production. The rules are designed around:

- authenticated reads for allowed collections,
- write access for admins and employees,
- admin-only user management.

## Build and Quality Checks

Available scripts:

```bash
npm run dev
npm run build
npm run start
npm run lint
```

Recommended pre-deployment checks:

```bash
npm run lint
npm run build
```

## Security and Access Notes

- Route access is protected in the UI using `RouteGuard`.
- A proxy redirects unauthenticated requests to `/login`.
- Actual role enforcement for data access is implemented in Firestore security rules.
- User creation is handled through a server route backed by Firebase Admin SDK.
- Viewers can inspect blacklist data but cannot modify it.

Important note:

The proxy uses a lightweight custom cookie (`auth-session`) as a fast redirect mechanism. It is not a replacement for Firebase Auth or Firestore security rules. The actual data security boundary remains Firebase Authentication + Firestore Rules.

## Operational Notes

- The system is designed around Excel-first operations.
- Standard attendance and filtering rely on the existing parsing helpers in `lib/excel.ts`.
- Multi-day attendance accepts flexible `ID` values and does not enforce a fixed digit length.
- Blacklist cleanup removes entries older than 4 months.
- The UI is optimized for Arabic content and RTL layout.
- Theme switching is supported through `next-themes`.

## Deployment Notes

For deployment platforms like Vercel:

- add all client and admin Firebase environment variables,
- ensure Firestore rules are deployed,
- verify that the service account key is formatted correctly with preserved newlines,
- create the initial admin user manually if needed.

## Current Status

The repository currently includes:

- standard attendance tracking,
- multi-day attendance processing,
- candidate list filtering,
- blacklist operations,
- certificate generation,
- user administration,
- audit logging,
- analytics dashboarding.

This makes the system suitable as an internal operational console for recurring training programs with blacklist enforcement.
