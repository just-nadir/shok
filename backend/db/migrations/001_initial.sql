-- Migration: 001_initial.sql
-- Shok Taksi Haydovchi Baholash PWA
-- Requirements: 1.1, 2.3, 3.3, 9.2

-- Haydovchilar
CREATE TABLE drivers (
    id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    full_name     VARCHAR(100) NOT NULL,
    car_number    VARCHAR(20) NOT NULL,
    qr_code       VARCHAR(64) UNIQUE NOT NULL,  -- noyob token
    is_blocked    BOOLEAN DEFAULT FALSE,
    password_hash VARCHAR(255) NOT NULL,         -- bcrypt
    created_at    TIMESTAMPTZ DEFAULT NOW()
);

-- Adminlar
CREATE TABLE admins (
    id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    username      VARCHAR(50) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    created_at    TIMESTAMPTZ DEFAULT NOW()
);

-- Baholashlar
CREATE TABLE ratings (
    id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    driver_id      UUID NOT NULL REFERENCES drivers(id),
    phone_hash     VARCHAR(255) NOT NULL,  -- bcrypt hash, maxfiylik uchun
    overall_rating SMALLINT NOT NULL CHECK (overall_rating BETWEEN 1 AND 5),
    cleanliness    VARCHAR(10) CHECK (cleanliness IN ('good', 'average', 'bad')),
    politeness     VARCHAR(10) CHECK (politeness IN ('good', 'average', 'bad')),
    driving_style  VARCHAR(10) CHECK (driving_style IN ('good', 'average', 'bad')),
    punctuality    VARCHAR(10) CHECK (punctuality IN ('good', 'average', 'bad')),
    comment        VARCHAR(500),
    created_at     TIMESTAMPTZ DEFAULT NOW()
);

-- OTP kodlar
CREATE TABLE otp_codes (
    id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    phone      VARCHAR(20) NOT NULL,
    code_hash  VARCHAR(255) NOT NULL,  -- bcrypt hash
    expires_at TIMESTAMPTZ NOT NULL,
    used       BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Brute-force himoya
CREATE TABLE login_attempts (
    id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    identifier VARCHAR(100) NOT NULL,  -- phone yoki username
    attempt_at TIMESTAMPTZ DEFAULT NOW()
);

-- Sessiyalar (connect-pg-simple)
CREATE TABLE session (
    sid    VARCHAR NOT NULL COLLATE "default",
    sess   JSON NOT NULL,
    expire TIMESTAMPTZ NOT NULL,
    CONSTRAINT session_pkey PRIMARY KEY (sid)
);

-- Indekslar

-- Baholashlarni haydovchi bo'yicha qidirish
CREATE INDEX idx_ratings_driver_id
    ON ratings (driver_id);

-- 24 soatlik qayta baholash blokini tekshirish (Talab 5.4)
CREATE INDEX idx_ratings_phone_driver_created
    ON ratings (phone_hash, driver_id, created_at);

-- OTP kodlarni telefon va muddati bo'yicha qidirish
CREATE INDEX idx_otp_codes_phone_expires
    ON otp_codes (phone, expires_at);

-- Brute-force urinishlarni identifikator va vaqt bo'yicha qidirish (Talab 9.3)
CREATE INDEX idx_login_attempts_identifier_at
    ON login_attempts (identifier, attempt_at);

-- Muddati o'tgan sessiyalarni tozalash uchun
CREATE INDEX idx_session_expire
    ON session (expire);
