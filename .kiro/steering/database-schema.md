---
inclusion: fileMatch
fileMatchPattern: "**/*.sql,**/db/**,**/migrations/**,**/pool.ts"
---

# Database Schema va Qoidalar

## Jadvallar

### drivers
```sql
id            UUID PRIMARY KEY DEFAULT gen_random_uuid()
full_name     VARCHAR(100) NOT NULL
car_number    VARCHAR(20) NOT NULL
phone         VARCHAR(20) UNIQUE          -- 002 migratsiyada qo'shilgan
qr_code       VARCHAR(64) UNIQUE NOT NULL -- noyob token
is_blocked    BOOLEAN DEFAULT FALSE
password_hash VARCHAR(255) NOT NULL       -- bcrypt
created_at    TIMESTAMPTZ DEFAULT NOW()
```

### ratings
```sql
id             UUID PRIMARY KEY DEFAULT gen_random_uuid()
driver_id      UUID NOT NULL REFERENCES drivers(id)
phone_hash     VARCHAR(255) NOT NULL      -- bcrypt (maxfiylik)
overall_rating SMALLINT NOT NULL CHECK (1-5)
cleanliness    VARCHAR(10) CHECK ('good','average','bad')
politeness     VARCHAR(10) CHECK ('good','average','bad')
driving_style  VARCHAR(10) CHECK ('good','average','bad')
punctuality    VARCHAR(10) CHECK ('good','average','bad')
comment        VARCHAR(500)
created_at     TIMESTAMPTZ DEFAULT NOW()
```

### otp_codes
```sql
id         UUID PRIMARY KEY DEFAULT gen_random_uuid()
phone      VARCHAR(20) NOT NULL
code_hash  VARCHAR(255) NOT NULL  -- bcrypt
expires_at TIMESTAMPTZ NOT NULL   -- 5 daqiqa
used       BOOLEAN DEFAULT FALSE
created_at TIMESTAMPTZ DEFAULT NOW()
```

### login_attempts
```sql
id         UUID PRIMARY KEY DEFAULT gen_random_uuid()
identifier VARCHAR(100) NOT NULL  -- phone yoki username
attempt_at TIMESTAMPTZ DEFAULT NOW()
```

### session (connect-pg-simple)
```sql
sid    VARCHAR PRIMARY KEY
sess   JSON NOT NULL
expire TIMESTAMPTZ NOT NULL
```

## Indekslar
- `idx_ratings_driver_id` — haydovchi bo'yicha baholashlar
- `idx_ratings_phone_driver_created` — 24 soatlik qayta baholash bloki
- `idx_otp_codes_phone_expires` — OTP qidirish
- `idx_login_attempts_identifier_at` — brute-force tekshirish
- `idx_session_expire` — sessiya tozalash

## Migratsiya Qoidalari
- Fayl nomi: `XXX_description.sql` (ketma-ket raqamlash)
- Har bir migratsiya boshida izoh: maqsad va talab raqami
- `IF NOT EXISTS` ishlatish (idempotent bo'lishi kerak)
- Foreign key'lar aniq ko'rsatilishi shart
- Indekslar alohida yaratiladi

## SQL Yozish Qoidalari
- Parameterized queries: `$1, $2, ...` (SQL injection oldini olish)
- UUID primary key'lar: `gen_random_uuid()`
- Timestamp'lar: `TIMESTAMPTZ` (timezone bilan)
- Boolean default: `DEFAULT FALSE`
- VARCHAR chegaralari aniq belgilanishi kerak
