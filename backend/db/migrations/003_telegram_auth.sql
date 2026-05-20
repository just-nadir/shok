-- Migration: 003_telegram_auth.sql
-- Telegram Login integratsiya — OTP o'rniga

-- Ratings jadvaliga telegram_user_id qo'shish (24 soatlik blok uchun)
ALTER TABLE ratings ADD COLUMN IF NOT EXISTS telegram_user_id BIGINT;

-- Indeks: bir haydovchini 24 soat ichida qayta baholash bloki
CREATE INDEX IF NOT EXISTS idx_ratings_telegram_driver_created
    ON ratings (telegram_user_id, driver_id, created_at);

-- phone_hash ni ixtiyoriy qilish (eski ma'lumotlar uchun)
ALTER TABLE ratings ALTER COLUMN phone_hash DROP NOT NULL;
