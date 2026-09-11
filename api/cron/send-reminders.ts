import type { VercelRequest, VercelResponse } from '@vercel/node';
import webPush from 'web-push';
import { getPool, withErrorHandling, type EventRow } from '../_db.js';

interface SubRow {
  id: number;
  endpoint: string;
  p256dh: string;
  auth: string;
}

export default withErrorHandling(async function handler(req: VercelRequest, res: VercelResponse) {
  const cronSecret = process.env.CRON_SECRET;
  if (cronSecret && req.headers.authorization !== `Bearer ${cronSecret}`) {
    res.status(401).json({ error: 'Unauthorized' });
    return;
  }

  const publicKey = process.env.VITE_VAPID_PUBLIC_KEY;
  const privateKey = process.env.VAPID_PRIVATE_KEY;
  const subject = process.env.VAPID_SUBJECT;
  if (!publicKey || !privateKey || !subject) {
    res.status(500).json({ error: 'Missing VAPID_PRIVATE_KEY, VITE_VAPID_PUBLIC_KEY or VAPID_SUBJECT' });
    return;
  }
  webPush.setVapidDetails(subject, publicKey, privateKey);

  const pool = getPool();

  const { rows: dueEvents } = await pool.query<EventRow>(
    `SELECT * FROM events
     WHERE remind_day_before = true
       AND reminder_sent_at IS NULL
       AND date::date BETWEEN CURRENT_DATE AND (CURRENT_DATE + INTERVAL '1 day')`
  );

  if (dueEvents.length === 0) {
    res.status(200).json({ ok: true, events: 0, sent: 0 });
    return;
  }

  const { rows: subs } = await pool.query<SubRow>('SELECT * FROM push_subscriptions');

  let sentCount = 0;
  for (const ev of dueEvents) {
    const payload = JSON.stringify({
      title: `תזכורת: ${ev.title}`,
      body: `מחר ב-${ev.start_time}`,
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

    await pool.query('UPDATE events SET reminder_sent_at = now() WHERE id = $1', [ev.id]);
  }

  res.status(200).json({ ok: true, events: dueEvents.length, sent: sentCount, subscriptions: subs.length });
});
