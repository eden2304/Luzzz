import { Router } from 'express';
import webPush from 'web-push';
import { getPool, withErrorHandling } from './db.js';
import { reminderBodyText, type ReminderOffsetType } from './reminderTypes.js';

interface SubRow {
  id: number;
  endpoint: string;
  p256dh: string;
  auth: string;
}

interface DueReminderRow {
  id: number;
  event_id: string;
  offset_type: ReminderOffsetType;
  title: string;
  start_time: string;
}

export interface ReminderResult {
  ok: true;
  events: number;
  sent: number;
  subscriptions?: number;
}

let vapidConfigured = false;

function ensureVapidConfigured(): boolean {
  if (vapidConfigured) return true;
  const publicKey = process.env.VITE_VAPID_PUBLIC_KEY;
  const privateKey = process.env.VAPID_PRIVATE_KEY;
  const subject = process.env.VAPID_SUBJECT;
  if (!publicKey || !privateKey || !subject) {
    console.error('Missing VAPID_PRIVATE_KEY, VITE_VAPID_PUBLIC_KEY or VAPID_SUBJECT — reminders disabled');
    return false;
  }
  webPush.setVapidDetails(subject, publicKey, privateKey);
  vapidConfigured = true;
  return true;
}

/** Finds due reminders (any offset type), sends a push to every subscribed device, and marks them sent. */
export async function sendDueReminders(): Promise<ReminderResult> {
  if (!ensureVapidConfigured()) {
    return { ok: true, events: 0, sent: 0 };
  }

  const pool = getPool();

  // Israel wall-clock "now", compared against trigger_at (also Israel wall-clock, see
  // reminderTypes.ts). Lower-bounded to the last 60 minutes so a reminder that's been
  // unsent for a long time (e.g. after extended downtime) doesn't fire late — it's
  // just quietly skipped instead.
  const { rows: dueReminders } = await pool.query<DueReminderRow>(
    `SELECT r.id, r.event_id, r.offset_type, e.title, e.start_time
     FROM reminders r
     JOIN events e ON e.id = r.event_id
     WHERE r.sent_at IS NULL
       AND r.trigger_at <= (now() AT TIME ZONE 'Asia/Jerusalem')
       AND r.trigger_at > (now() AT TIME ZONE 'Asia/Jerusalem') - INTERVAL '60 minutes'`
  );

  if (dueReminders.length === 0) {
    return { ok: true, events: 0, sent: 0 };
  }

  const { rows: subs } = await pool.query<SubRow>('SELECT * FROM push_subscriptions');

  let sentCount = 0;
  for (const reminder of dueReminders) {
    const payload = JSON.stringify({
      title: `תזכורת: ${reminder.title}`,
      body: reminderBodyText(reminder.offset_type, reminder.start_time),
      url: '/',
    });

    for (const sub of subs) {
      try {
        await webPush.sendNotification(
          { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
          payload
        );
        sentCount++;
      } catch (err) {
        const statusCode = (err as { statusCode?: number })?.statusCode;
        if (statusCode === 404 || statusCode === 410) {
          await pool.query('DELETE FROM push_subscriptions WHERE id = $1', [sub.id]);
        } else {
          console.error('Push send failed for subscription', sub.id, err);
        }
      }
    }

    await pool.query('UPDATE reminders SET sent_at = now() WHERE id = $1', [reminder.id]);
  }

  return { ok: true, events: dueReminders.length, sent: sentCount, subscriptions: subs.length };
}

/** Runs sendDueReminders on a fixed interval for as long as the process lives. */
export function startReminderScheduler(intervalMinutes: number): void {
  const intervalMs = intervalMinutes * 60 * 1000;
  const tick = () => {
    sendDueReminders()
      .then((result) => {
        if (result.events > 0) {
          console.log('Reminder check:', JSON.stringify(result));
        }
      })
      .catch((err) => console.error('Reminder check failed', err));
  };
  tick(); // run once at startup too, don't wait a full interval
  setInterval(tick, intervalMs);
}

/** Optional manual trigger, protected by CRON_SECRET if set — handy for testing. */
export const remindersRouter = Router();

remindersRouter.get('/api/cron/send-reminders', withErrorHandling(async (req, res) => {
  const cronSecret = process.env.CRON_SECRET;
  if (cronSecret && req.headers.authorization !== `Bearer ${cronSecret}`) {
    res.status(401).json({ error: 'Unauthorized' });
    return;
  }
  const result = await sendDueReminders();
  res.status(200).json(result);
}));
