import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import cron from 'node-cron';

import schedulesRouter from './routes/schedules.js';
import daysRouter from './routes/days.js';
import stepsRouter from './routes/steps.js';
import sessionsRouter from './routes/sessions.js';
import settingsRouter from './routes/settings.js';
import notificationsRouter from './routes/notifications.js';
import usersRouter from './routes/users.js';
import { sendScheduledNotifications } from './lib/push.js';

const app = express();

app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:5173',
  credentials: true,
}));
app.use(express.json());

// Health check
app.get('/health', (req, res) => res.json({ ok: true }));

// Routes
app.use('/api/users', usersRouter);
app.use('/api/schedules', schedulesRouter);
app.use('/api/days', daysRouter);
app.use('/api/steps', stepsRouter);
app.use('/api/sessions', sessionsRouter);
app.use('/api/settings', settingsRouter);
app.use('/api/notifications', notificationsRouter);

// Error handler
app.use((err, req, res, next) => {
  console.error(err);
  res.status(err.status || 500).json({ error: err.message || 'Internal server error' });
});

// Cron: check every minute for scheduled notifications
cron.schedule('* * * * *', () => {
  sendScheduledNotifications().catch(console.error);
});

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log(`ScheduleAI backend running on port ${PORT}`);
});
