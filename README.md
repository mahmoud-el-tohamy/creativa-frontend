# Creativa Training Filter System 🎯

A comprehensive web application designed specifically for **Creativa Innovation Hub (Mansoura)**. This system streamlines the management of trainee lists, attendance tracking, and effectively manages a dynamic "Blacklist" of absent candidates.

## ✨ Features

1. **Attendance Tracking & Blacklisting**
   - Upload the "Registered" Excel sheet and the "Attended" Excel sheet.
   - The system automatically cross-references the files using the National ID.
   - It identifies individuals who registered but failed to attend and automatically adds them to the Blacklist database to enforce attendance policies.

2. **Candidates Filtering**
   - Upload a new candidate Excel sheet for an upcoming training.
   - The system instantly checks the candidates against the Firestore Blacklist.
   - It filters out blacklisted individuals and provides a clean, paginated UI table of accepted candidates.
   - You can export the "Clean List" (accepted candidates) back to a ready-to-use Excel file.

3. **Blacklist Admin Panel**
   - A fully featured dashboard to manage blacklisted individuals.
   - Real-time client-side search by Name or National ID.
   - Manual controls to add or remove individuals with confirmation modals.
   - **Auto-Cleanup**: The system automatically purges entries that are older than 4 months silently on load, requiring zero manual maintenance.

## 🛠️ Tech Stack

- **Framework**: [Next.js 14](https://nextjs.org/) (App Router, Client Components)
- **Language**: [TypeScript](https://www.typescriptlang.org/)
- **Styling**: [Tailwind CSS v4](https://tailwindcss.com/) (Fully customized RTL Arabic UI)
- **Database**: [Firebase Firestore](https://firebase.google.com/docs/firestore)
- **File Processing**: [SheetJS (xlsx)](https://sheetjs.com/)

## 🚀 Getting Started

### 1. Prerequisites
- Node.js (v18 or higher) installed on your machine.
- A Firebase account with a Firestore Database initialized.

### 2. Installation

Clone the repository and install the dependencies:
```bash
git clone git@github.com:mahmoud-el-tohamy/creativa-filter.git
cd creativa-filter
npm install
```

### 3. Environment Variables
Create a `.env.local` file in the root directory of the project and add your Firebase configuration credentials. **Note:** Make sure to prefix them with `NEXT_PUBLIC_` so they are accessible on the client-side.

```env
NEXT_PUBLIC_FIREBASE_API_KEY=your_api_key
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=your_project.firebaseapp.com
NEXT_PUBLIC_FIREBASE_PROJECT_ID=your_project_id
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=your_project.firebasestorage.app
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
NEXT_PUBLIC_FIREBASE_APP_ID=your_app_id
```

### 4. Run the Development Server

Start the application locally:
```bash
npm run dev
```

Open your browser and navigate to [http://localhost:3000](http://localhost:3000) to start using the system.

---
*Developed with ❤️ to facilitate the operations of the Creativa team.*
