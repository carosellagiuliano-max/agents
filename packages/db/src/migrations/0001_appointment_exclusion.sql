-- Enable btree_gist extension for exclusion constraints
CREATE EXTENSION IF NOT EXISTS btree_gist;

-- Add exclusion constraint to prevent overlapping appointments for the same staff
-- This uses tstzrange to create a time range and ensures no two appointments
-- for the same staff member can overlap in time
ALTER TABLE appointments 
ADD CONSTRAINT appointments_no_overlap 
EXCLUDE USING GIST (
  staff_id WITH =,
  tstzrange(start_time, end_time, '[)') WITH &&
) 
WHERE (status NOT IN ('cancelled', 'no_show'));

-- Create index to speed up availability queries
CREATE INDEX appointments_staff_time_idx ON appointments USING GIST (
  staff_id,
  tstzrange(start_time, end_time, '[)')
) WHERE (status NOT IN ('cancelled', 'no_show'));
