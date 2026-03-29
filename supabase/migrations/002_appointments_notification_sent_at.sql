-- ============================================================
-- Migration 002: Add notification_sent_at to appointments
-- Sistema de notificaciones — Kinesiología Coni
--
-- This column tracks whether the 24-hour reminder has been
-- dispatched for a given appointment. The cron job at
-- /api/notifications/remind filters on IS NULL to find
-- appointments that still need a reminder, and sets it to
-- now() after sending.
--
-- Note: this column is intentionally separate from any
-- "confirmation sent" tracking. Confirmation notifications
-- (sent at creation time) are not idempotency-critical
-- because the cron is not involved.
--
-- Run in Supabase SQL Editor or via supabase db push.
-- ============================================================

ALTER TABLE appointments
  ADD COLUMN IF NOT EXISTS notification_sent_at TIMESTAMPTZ DEFAULT NULL;

COMMENT ON COLUMN appointments.notification_sent_at IS
  'Timestamp when the 24-hour reminder notification was dispatched '
  '(WhatsApp / Email). NULL means the reminder has not been sent yet. '
  'Set by GET /api/notifications/remind after successful dispatch. '
  'Only used for the reminder cron — confirmation notifications are '
  'tracked separately at the application layer.';

-- Index to make the cron query fast:
-- SELECT ... WHERE notification_sent_at IS NULL AND starts_at BETWEEN ...
-- A partial index on NULL rows is efficient because most rows will
-- eventually be non-NULL (reminder sent), so the index stays small.
CREATE INDEX IF NOT EXISTS idx_appointments_notification_pending
  ON appointments (starts_at)
  WHERE notification_sent_at IS NULL
    AND status IN ('scheduled', 'confirmed');
