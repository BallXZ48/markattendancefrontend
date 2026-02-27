# Mark Attendance Frontend

Next.js frontend for the NestJS attendance backend.

## Setup

1. Install dependencies

```bash
npm install
```

2. Configure backend base URL (optional)

Create `.env.local`:

```bash
NEXT_PUBLIC_API_BASE_URL=http://localhost:3000
```

If not set, the app defaults to `http://localhost:3000`.

3. Run the frontend

```bash
npm run dev
```

Open `http://localhost:3001`.

## Features

- Sign in with backend auth endpoints (no public sign up)
- Auto token refresh via `/auth/refresh`
- Role-aware course loading
- Attendance listing per selected course
- Teacher/admin attendance record form
- Student attendance statistics view
