CREATE TABLE IF NOT EXISTS events (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  date TEXT NOT NULL,
  start_time TEXT NOT NULL,
  end_time TEXT NOT NULL,
  color TEXT NOT NULL,
  note TEXT
);

CREATE INDEX IF NOT EXISTS events_date_idx ON events (date);

CREATE TABLE IF NOT EXISTS push_subscriptions (
  id SERIAL PRIMARY KEY,
  endpoint TEXT UNIQUE NOT NULL,
  p256dh TEXT NOT NULL,
  auth TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Multiple reminders per event (day before, hour before, 5 min before, etc).
-- trigger_at is a naive TIMESTAMP representing Israel wall-clock time (matches
-- how `date`/`start_time` are entered — see server/reminders.ts for why).
CREATE TABLE IF NOT EXISTS reminders (
  id SERIAL PRIMARY KEY,
  event_id TEXT NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  offset_type TEXT NOT NULL,
  minutes_before INTEGER,
  trigger_at TIMESTAMP NOT NULL,
  sent_at TIMESTAMP
);

CREATE INDEX IF NOT EXISTS reminders_due_idx ON reminders (trigger_at) WHERE sent_at IS NULL;
CREATE INDEX IF NOT EXISTS reminders_event_idx ON reminders (event_id);

ALTER TABLE reminders ADD COLUMN IF NOT EXISTS minutes_before INTEGER;

-- Collapse the old fixed-preset offset types (hour/half-hour/quarter-hour/5-min before)
-- into the new free-typed 'minutes_before' + minutes_before column; same_day_8am had no
-- equivalent (it was an absolute time-of-day, not a relative offset) so it's just dropped —
-- safe since nothing currently reads that type any more. All idempotent: once converted,
-- these WHERE clauses no longer match anything on a re-run.
UPDATE reminders SET offset_type = 'minutes_before', minutes_before = 60 WHERE offset_type = 'hour_before';
UPDATE reminders SET offset_type = 'minutes_before', minutes_before = 30 WHERE offset_type = 'half_hour_before';
UPDATE reminders SET offset_type = 'minutes_before', minutes_before = 15 WHERE offset_type = 'quarter_hour_before';
UPDATE reminders SET offset_type = 'minutes_before', minutes_before = 5 WHERE offset_type = 'five_min_before';
DELETE FROM reminders WHERE offset_type = 'same_day_8am';

-- One-time migration from the old single remind_day_before/reminder_sent_at
-- columns (pre multi-reminder) into the new reminders table. Safe to re-run —
-- the column-existence check means it only actually does anything once.
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'events' AND column_name = 'remind_day_before'
  ) THEN
    INSERT INTO reminders (event_id, offset_type, trigger_at, sent_at)
    SELECT
      id,
      'day_before',
      (date::date + start_time::time - INTERVAL '1 day'),
      reminder_sent_at::timestamp
    FROM events
    WHERE remind_day_before = true
      AND NOT EXISTS (
        SELECT 1 FROM reminders r WHERE r.event_id = events.id AND r.offset_type = 'day_before'
      );

    ALTER TABLE events DROP COLUMN remind_day_before;
    ALTER TABLE events DROP COLUMN reminder_sent_at;
  END IF;
END $$;
