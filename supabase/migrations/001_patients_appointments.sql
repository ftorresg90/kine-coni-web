-- ============================================================
-- Migration 001: patients + appointments
-- Sistema de gestión de pacientes y agenda — Kinesiología Coni
--
-- Prerequisite: schema.sql already applied (services, bookings,
-- update_updated_at_column function, etc.)
--
-- Run in Supabase SQL Editor or via supabase db push.
-- ============================================================


-- ============================================================
-- 0. Extensions
-- ============================================================

-- btree_gist is required for the EXCLUDE constraint on
-- overlapping TIMESTAMPTZ ranges in `appointments`.
-- Safe to run multiple times (IF NOT EXISTS).
CREATE EXTENSION IF NOT EXISTS btree_gist;


-- ============================================================
-- 1. patients
-- ============================================================

-- Chilean RUT is validated with a CHECK constraint.
-- Normalised format: XXXXXXXX-D (no dots, uppercase K).
-- Nullable because some patients (e.g. foreign nationals)
-- may not have a Chilean RUT.

CREATE TABLE IF NOT EXISTS patients (

    -- ── Identity ────────────────────────────────────────────
    id              UUID        PRIMARY KEY DEFAULT gen_random_uuid(),

    full_name       TEXT        NOT NULL
                                CHECK (char_length(full_name) BETWEEN 2 AND 200),

    -- Chilean RUT, normalised: 12345678-9 or 1234567-K
    rut             TEXT        CHECK (
                                    rut IS NULL
                                    OR rut ~* '^\d{7,8}-[\dkK]$'
                                ),

    birth_date      DATE        CHECK (
                                    birth_date IS NULL
                                    OR (
                                        birth_date <= CURRENT_DATE
                                        AND birth_date >= '1900-01-01'
                                    )
                                ),

    gender          TEXT        CHECK (
                                    gender IS NULL
                                    OR gender IN ('masculino', 'femenino', 'otro')
                                ),

    -- ── Contact ─────────────────────────────────────────────
    phone           TEXT        CHECK (
                                    phone IS NULL
                                    OR char_length(phone) BETWEEN 7 AND 20
                                ),

    email           TEXT        CHECK (
                                    email IS NULL
                                    OR email ~* '^[A-Za-z0-9._%+\-]+@[A-Za-z0-9.\-]+\.[A-Za-z]{2,}$'
                                ),

    address         TEXT        CHECK (
                                    address IS NULL
                                    OR char_length(address) <= 500
                                ),

    -- ── Clinical context ────────────────────────────────────
    -- Free-text principal diagnosis (ICD-10 code optional).
    diagnosis       TEXT        CHECK (
                                    diagnosis IS NULL
                                    OR char_length(diagnosis) <= 2000
                                ),

    -- General observations (evolution, social context, etc.)
    notes           TEXT        CHECK (
                                    notes IS NULL
                                    OR char_length(notes) <= 5000
                                ),

    -- ── Origin / provenance ─────────────────────────────────
    -- Optional link to the public booking request that
    -- originated this patient record. INT because bookings.id
    -- is SERIAL (integer) in schema.sql.
    source_booking_id INT       REFERENCES bookings (id)
                                ON DELETE SET NULL,

    -- ── Soft delete ─────────────────────────────────────────
    -- Records are never hard-deleted; set deleted_at to hide
    -- them from normal queries without losing clinical history.
    deleted_at      TIMESTAMPTZ DEFAULT NULL,

    -- ── Timestamps ──────────────────────────────────────────
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

COMMENT ON TABLE patients IS
    'Clinical patient records. Soft-deleted via deleted_at.';

COMMENT ON COLUMN patients.rut IS
    'Chilean RUT normalised as XXXXXXXX-D (no dots). '
    'Unique when present, excluding soft-deleted rows (partial unique index).';

COMMENT ON COLUMN patients.source_booking_id IS
    'FK to bookings.id when this patient was created from a '
    'public booking request. SET NULL on booking deletion.';

COMMENT ON COLUMN patients.deleted_at IS
    'Soft-delete timestamp. NULL means the record is active. '
    'All RLS policies and application queries filter deleted_at IS NULL.';


-- ── Indexes: patients ────────────────────────────────────────

-- RUT must be unique when present (excluding soft-deleted rows).
-- Using a partial unique index instead of a column-level UNIQUE
-- so that multiple deleted records can share the same RUT without
-- blocking re-creation.
CREATE UNIQUE INDEX IF NOT EXISTS idx_patients_rut_unique
    ON patients (rut)
    WHERE rut IS NOT NULL AND deleted_at IS NULL;

-- Full-text search index (name + rut combined tsvector).
CREATE INDEX IF NOT EXISTS idx_patients_search
    ON patients USING gin (
        to_tsvector('spanish', coalesce(full_name, '') || ' ' || coalesce(rut, ''))
    );

-- Most frequent admin query: list active patients, newest first.
CREATE INDEX IF NOT EXISTS idx_patients_created_at
    ON patients (created_at DESC)
    WHERE deleted_at IS NULL;

-- Filter by soft-delete status (used in EXISTS checks).
CREATE INDEX IF NOT EXISTS idx_patients_deleted_at
    ON patients (deleted_at);

-- Source booking reverse lookup.
CREATE INDEX IF NOT EXISTS idx_patients_source_booking
    ON patients (source_booking_id)
    WHERE source_booking_id IS NOT NULL;


-- ── Trigger: updated_at ───────────────────────────────────────
-- Reuses the function defined in schema.sql.

CREATE OR REPLACE TRIGGER set_updated_at_patients
    BEFORE UPDATE ON patients
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();


-- ============================================================
-- 2. appointments
-- ============================================================

-- Status lifecycle:
--   scheduled  → confirmed → completed
--                          ↘ no_show
--              → cancelled  (from any pre-completion state)

CREATE TABLE IF NOT EXISTS appointments (

    -- ── Identity ─────────────────────────────────────────────
    id              UUID        PRIMARY KEY DEFAULT gen_random_uuid(),

    -- ── Foreign keys ─────────────────────────────────────────
    -- Patient is mandatory; every appointment belongs to a patient.
    patient_id      UUID        NOT NULL
                                REFERENCES patients (id)
                                ON DELETE RESTRICT,

    -- ── Scheduling ───────────────────────────────────────────
    -- Both columns store full TIMESTAMPTZ so DST transitions
    -- (America/Santiago observes DST) are handled correctly by
    -- the database. Never store local DATE + TIME separately.
    starts_at       TIMESTAMPTZ NOT NULL,
    ends_at         TIMESTAMPTZ NOT NULL,

    -- ── Status ───────────────────────────────────────────────
    status          TEXT        NOT NULL DEFAULT 'scheduled'
                                CHECK (status IN (
                                    'scheduled',
                                    'confirmed',
                                    'completed',
                                    'cancelled',
                                    'no_show'
                                )),

    -- ── Visit details ────────────────────────────────────────
    -- Service name stored as free text so it decouples from the
    -- services catalogue — a session may not map to a predefined
    -- service (follow-up, reassessment, etc.).
    service         TEXT        NOT NULL
                                CHECK (char_length(service) BETWEEN 2 AND 200),

    -- Full address for the home-visit.
    location        TEXT        CHECK (
                                    location IS NULL
                                    OR char_length(location) <= 500
                                ),

    -- Session notes written after the visit (SOAP, progress, etc.)
    notes           TEXT        CHECK (
                                    notes IS NULL
                                    OR char_length(notes) <= 2000
                                ),

    -- ── Timestamps ───────────────────────────────────────────
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT now(),

    -- ── Scalar constraints ───────────────────────────────────

    -- ends_at must be after starts_at.
    CONSTRAINT chk_appointments_end_after_start
        CHECK (ends_at > starts_at),

    -- Sessions longer than 4 hours are almost certainly data
    -- entry errors in a home-visit kinesiology context.
    CONSTRAINT chk_appointments_max_duration
        CHECK (ends_at - starts_at <= INTERVAL '4 hours'),

    -- ── Overlap exclusion constraint ─────────────────────────
    -- Prevents double-booking using the btree_gist extension.
    --
    -- Two appointments conflict when their time ranges overlap
    -- AND both are "active" (not cancelled / no_show).
    --
    -- tstzrange(starts_at, ends_at) builds a half-open interval
    -- [starts_at, ends_at), which correctly handles back-to-back
    -- appointments that share a boundary time.
    --
    -- The status condition is encoded via a CASE expression that
    -- returns a constant integer only for active statuses.
    -- When status IS cancelled or no_show the expression returns
    -- NULL, which is excluded from EXCLUDE constraints by
    -- definition — effectively skipping the overlap check for
    -- those rows.
    CONSTRAINT no_overlapping_appointments
        EXCLUDE USING gist (
            tstzrange(starts_at, ends_at)   WITH &&,
            CASE
                WHEN status NOT IN ('cancelled', 'no_show')
                THEN 1
                ELSE NULL
            END                             WITH =
        )
);

COMMENT ON TABLE appointments IS
    'Confirmed agenda entries for home-visit appointments. '
    'The EXCLUDE constraint prevents double-booking for active '
    'statuses (scheduled, confirmed, completed).';

COMMENT ON COLUMN appointments.starts_at IS
    'Session start in TIMESTAMPTZ. Store in UTC; display in '
    'America/Santiago using AT TIME ZONE in queries or the '
    'application layer.';

COMMENT ON COLUMN appointments.status IS
    'Lifecycle: scheduled → confirmed → completed | no_show. '
    'Any status can transition to cancelled. '
    'cancelled and no_show are excluded from overlap checks.';

COMMENT ON COLUMN appointments.service IS
    'Free-text service name. Decoupled from the services '
    'catalogue to allow ad-hoc session types.';


-- ── Indexes: appointments ────────────────────────────────────

-- Primary calendar query: appointments in a date range.
CREATE INDEX IF NOT EXISTS idx_appointments_starts_at
    ON appointments (starts_at);

-- Patient history: all appointments for a given patient,
-- newest first.
CREATE INDEX IF NOT EXISTS idx_appointments_patient_id
    ON appointments (patient_id, starts_at DESC);

-- Anti-overbooking support: filter active appointments by time
-- range fast (also benefits the overlap application-layer check).
CREATE INDEX IF NOT EXISTS idx_appointments_active_range
    ON appointments (starts_at, ends_at)
    WHERE status IN ('scheduled', 'confirmed');

-- Weekly view: range scan on starts_at filtered by status.
CREATE INDEX IF NOT EXISTS idx_appointments_status_starts_at
    ON appointments (status, starts_at DESC);


-- ── Trigger: updated_at ───────────────────────────────────────

CREATE OR REPLACE TRIGGER set_updated_at_appointments
    BEFORE UPDATE ON appointments
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();


-- ============================================================
-- 3. Helper function: appointment overlap check
-- ============================================================
--
-- The EXCLUDE constraint on appointments handles the overlap
-- guarantee at the DB level. This PL/pgSQL function is provided
-- as a companion utility for the application layer to CHECK
-- whether a proposed time slot is free BEFORE attempting an
-- INSERT (to give a friendlier UX error rather than a raw
-- constraint violation).
--
-- Usage from application:
--   SELECT * FROM check_appointment_overlap(
--       '2026-04-01 10:00:00+00',
--       '2026-04-01 11:00:00+00',
--       NULL  -- pass appointment UUID to exclude when editing
--   );

CREATE OR REPLACE FUNCTION check_appointment_overlap(
    p_starts_at     TIMESTAMPTZ,
    p_ends_at       TIMESTAMPTZ,
    p_exclude_id    UUID DEFAULT NULL   -- exclude self when updating
)
RETURNS TABLE (
    conflict                BOOLEAN,
    conflicting_id          UUID,
    conflicting_starts_at   TIMESTAMPTZ,
    conflicting_ends_at     TIMESTAMPTZ
)
LANGUAGE plpgsql
SECURITY DEFINER   -- runs with definer's privileges; caller only
                   -- needs EXECUTE, not direct table access.
AS $$
BEGIN
    RETURN QUERY
    SELECT
        true                    AS conflict,
        a.id                    AS conflicting_id,
        a.starts_at             AS conflicting_starts_at,
        a.ends_at               AS conflicting_ends_at
    FROM appointments a
    WHERE
        -- Active appointments only
        a.status NOT IN ('cancelled', 'no_show')
        -- Overlapping range (half-open: [s, e) && [s', e'))
        AND tstzrange(a.starts_at, a.ends_at) &&
            tstzrange(p_starts_at, p_ends_at)
        -- When editing an existing appointment, exclude itself
        AND (p_exclude_id IS NULL OR a.id != p_exclude_id)
    LIMIT 1;

    -- If no row returned, emit a no-conflict sentinel row.
    IF NOT FOUND THEN
        RETURN QUERY SELECT false, NULL::UUID, NULL::TIMESTAMPTZ, NULL::TIMESTAMPTZ;
    END IF;
END;
$$;

COMMENT ON FUNCTION check_appointment_overlap IS
    'Pre-flight check for appointment scheduling. '
    'Returns a single row: conflict=true if the proposed slot '
    'overlaps an active appointment, false otherwise. '
    'Pass p_exclude_id when editing an existing appointment.';


-- ============================================================
-- 4. Row Level Security
-- ============================================================
--
-- Clinical data must NEVER be readable by anonymous/public users.
-- Only authenticated users (the kinesiologist admin) can read
-- or modify records.
--
-- This mirrors the RLS pattern used in schema.sql.

ALTER TABLE patients     ENABLE ROW LEVEL SECURITY;
ALTER TABLE appointments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admin full access patients"
    ON patients FOR ALL
    USING      (auth.role() = 'authenticated')
    WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Admin full access appointments"
    ON appointments FOR ALL
    USING      (auth.role() = 'authenticated')
    WITH CHECK (auth.role() = 'authenticated');

-- The check_appointment_overlap function uses SECURITY DEFINER
-- so it bypasses RLS internally; no additional policy needed.


-- ============================================================
-- 5. Convenience view: upcoming appointments
-- ============================================================
--
-- Joins appointments with patient name for the calendar / agenda
-- view in the admin dashboard.
-- The view itself has no RLS; access is governed by the
-- underlying tables' policies.

CREATE OR REPLACE VIEW upcoming_appointments AS
SELECT
    a.id,
    a.starts_at,
    a.ends_at,
    a.status,
    a.service,
    a.location,
    a.notes,
    -- Patient snapshot
    p.id            AS patient_id,
    p.full_name     AS patient_name,
    p.phone         AS patient_phone
FROM appointments a
JOIN patients p ON p.id = a.patient_id
WHERE
    a.starts_at >= now()
    AND a.status NOT IN ('cancelled', 'no_show')
    AND p.deleted_at IS NULL
ORDER BY a.starts_at ASC;

COMMENT ON VIEW upcoming_appointments IS
    'Calendar view for the admin dashboard. '
    'Shows future active appointments with patient details. '
    'Read access is governed by RLS on the underlying tables.';
