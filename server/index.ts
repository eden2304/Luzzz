import express from 'express';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { runMigrations } from './migrate.js';
import { eventsRouter } from './routes/events.js';
import { pushRouter } from './routes/push.js';
import { remindersRouter, startReminderScheduler } from './reminders.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const distDir = path.join(__dirname, '..', 'dist');

async function main(): Promise<void> {
  await runMigrations();

  const app = express();
  app.use(express.json());

  app.use(eventsRouter);
  app.use(pushRouter);
  app.use(remindersRouter);

  app.use(express.static(distDir));
  // Express 5 (path-to-regexp v8) requires a named wildcard, not a bare '*'
  app.get('/*splat', (_req, res) => {
    res.sendFile(path.join(distDir, 'index.html'));
  });

  const PORT = Number(process.env.PORT) || 3000;
  app.listen(PORT, () => {
    console.log(`Luzzzz server listening on port ${PORT}`);
  });

  // checks every 5 minutes — this is what Vercel's Hobby-plan once-a-day cron couldn't do
  startReminderScheduler(5);
}

main().catch((err) => {
  console.error('Failed to start server:', err);
  process.exit(1);
});
