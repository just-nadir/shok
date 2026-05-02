-- Migration: 002_driver_phone.sql
-- Haydovchi telefon raqami ustuni

ALTER TABLE drivers ADD COLUMN IF NOT EXISTS phone VARCHAR(20) UNIQUE;

CREATE INDEX IF NOT EXISTS idx_drivers_phone ON drivers (phone);
