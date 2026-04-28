-- Run this in Supabase SQL Editor to add required columns for queue management

-- Add status column
ALTER TABLE prescriptions ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'WAITING';

-- Add served_at column
ALTER TABLE prescriptions ADD COLUMN IF NOT EXISTS served_at TIMESTAMP WITH TIME ZONE;

-- Update existing records to have status if null
UPDATE prescriptions SET status = 'WAITING' WHERE status IS NULL;