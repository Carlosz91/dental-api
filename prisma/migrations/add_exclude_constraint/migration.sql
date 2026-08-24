-- Enable btree_gist extension for EXCLUDE constraints
CREATE EXTENSION IF NOT EXISTS btree_gist;

-- Add EXCLUDE constraint to prevent double booking
-- Using a simpler approach with direct timestamp comparison
-- This prevents overlapping appointments for the same specialist
-- when the status is not CANCELADO or NO_ASISTIO
ALTER TABLE "Appointment"
ADD CONSTRAINT "no_double_booking"
EXCLUDE USING GIST (
  "specialistId" WITH =,
  tsrange("startsAt", "endsAt") WITH &&
) WHERE ("status" NOT IN ('CANCELADO', 'NO_ASISTIO'));