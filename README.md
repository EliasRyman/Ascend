# Ascend

A modern timeboxing and productivity app for deep work. Plan your day with drag-and-drop task scheduling, sync with Google Calendar, and stay focused on what matters.

![React](https://img.shields.io/badge/React-19-61DAFB?logo=react)
![TypeScript](https://img.shields.io/badge/TypeScript-5.8-3178C6?logo=typescript)
![Vite](https://img.shields.io/badge/Vite-6-646CFF?logo=vite)
![Tailwind CSS](https://img.shields.io/badge/Tailwind-3-06B6D4?logo=tailwindcss)

## Features

- **Timeboxing** — Drag tasks onto a visual timeline to schedule your day
- **Task Management** — Create, organize, and complete tasks with tags
- **Dark Mode** — Beautiful light and dark themes
- **Persistent Google Calendar Sync** — Connect once, stay connected forever
- **Resizable Blocks** — Adjust time block durations by dragging
- **Notes Panel** — Keep daily notes alongside your schedule

## Getting Started

### Prerequisites

- Node.js 18+

### Google Calendar Setup (Required for Calendar Sync)

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project (or select an existing one)
3. Enable the **Google Calendar API**:
   - Go to "APIs & Services" → "Library"
   - Search for "Google Calendar API" and enable it
4. Create OAuth credentials:
   - Go to "APIs & Services" → "Credentials"
   - Click "Create Credentials" → "OAuth client ID"
   - Select "Web application"
   - Add **Authorized JavaScript origins**:
     - `http://localhost:3000` (frontend)
   - Add **Authorized redirect URIs**:
     - `http://localhost:4000/auth/google/callback` (backend callback)
5. Copy your **Client ID** and **Client Secret**

### Installation

```bash
# Install frontend dependencies
npm install

# Install backend dependencies
cd backend
npm install
cd ..
```

### Configuration

1. Create `.env` file in root:
```env
VITE_GOOGLE_CLIENT_ID=your-client-id.apps.googleusercontent.com
VITE_BACKEND_URL=http://localhost:4000
```

2. Create `.env` file in `/backend`:
```env
GOOGLE_CLIENT_ID=your-client-id.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=your-client-secret
REDIRECT_URI=http://localhost:4000/auth/google/callback

SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=your-supabase-anon-key
SUPABASE_SERVICE_KEY=your-supabase-service-role-key

FRONTEND_URL=http://localhost:3000
PORT=4000

ENCRYPTION_KEY=generate-a-secure-32-char-key
```

### Supabase Setup

Run the SQL in `supabase-schema.sql` in your Supabase SQL Editor to create the required tables.

### Running the App

```bash
# Terminal 1: Start backend
cd backend
npm run dev

# Terminal 2: Start frontend
npm run dev
```

- Frontend: `http://localhost:3000`
- Backend: `http://localhost:4000`

### Build for Production

```bash
# Build frontend
npm run build

# Build backend
cd backend
npm run build
```

## Architecture

```
┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
│     Frontend    │────▶│     Backend     │────▶│  Google OAuth   │
│  React + Vite   │     │  Express.js     │     │  Calendar API   │
└─────────────────┘     └─────────────────┘     └─────────────────┘
         │                       │
         │                       │
         ▼                       ▼
┌─────────────────────────────────────────┐
│              Supabase                   │
│  Auth + Database + Row Level Security   │
└─────────────────────────────────────────┘
```

## Tech Stack

- **React 19** — UI library
- **TypeScript** — Type safety
- **Vite** — Build tool and dev server
- **Tailwind CSS** — Utility-first styling
- **Lucide React** — Beautiful icons
- **Express.js** — Backend API
- **Supabase** — Auth and database
- **Google APIs** — Calendar integration

## License

MIT
