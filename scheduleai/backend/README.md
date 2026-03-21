# ScheduleAI Backend

## Setup

1. Install dependencies:
   ```bash
   npm install
   ```

2. Copy `.env.example` to `.env` and fill in:
   - `DATABASE_URL` — get a free Postgres from [neon.tech](https://neon.tech)
   - `CLERK_SECRET_KEY` — from [clerk.com](https://clerk.com) dashboard
   - VAPID keys — generate with: `npx web-push generate-vapid-keys`

3. Push database schema:
   ```bash
   npm run db:push
   ```

4. Start dev server:
   ```bash
   npm run dev
   ```

## Endpoints

- `GET /health` — health check
- `GET /api/users/me` — current user + settings
- `GET /api/schedules/active` — active schedule with all days + steps
- `POST /api/schedules/import` — import a full schedule JSON
- See routes/ for all other endpoints
