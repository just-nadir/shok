#!/bin/bash
# Shok Taxi — VPS sozlash scripti
# DIQQAT: Mavjud savasushi loyihasiga tegmaydi!
# Ishlatish: VPS da root sifatida bajaring

set -e

echo "=== 1. Certbot o'rnatish (agar yo'q bo'lsa) ==="
apt install -y certbot python3-certbot-nginx

echo "=== 2. PostgreSQL da yangi database va user yaratish ==="
sudo -u postgres psql <<EOF
-- Foydalanuvchi yaratish (agar yo'q bo'lsa)
DO \$\$
BEGIN
  IF NOT EXISTS (SELECT FROM pg_catalog.pg_roles WHERE rolname = 'shok_taxi_user') THEN
    CREATE ROLE shok_taxi_user WITH LOGIN PASSWORD 'KUCHLI_PAROL_QOYING';
  END IF;
END
\$\$;

-- Database yaratish (agar yo'q bo'lsa)
SELECT 'CREATE DATABASE shok_taxi OWNER shok_taxi_user'
WHERE NOT EXISTS (SELECT FROM pg_database WHERE datname = 'shok_taxi')\gexec

-- Ruxsatlar
GRANT ALL PRIVILEGES ON DATABASE shok_taxi TO shok_taxi_user;
EOF

echo "=== 3. Migratsiyalarni bajarish ==="
sudo -u postgres psql -d shok_taxi -f /home/deploy/shoktaxi/backend/db/migrations/001_initial.sql
sudo -u postgres psql -d shok_taxi -f /home/deploy/shoktaxi/backend/db/migrations/002_driver_phone.sql

# shok_taxi_user ga jadval ruxsatlari
sudo -u postgres psql -d shok_taxi <<EOF
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO shok_taxi_user;
GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO shok_taxi_user;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO shok_taxi_user;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON SEQUENCES TO shok_taxi_user;
EOF

echo "=== 4. Deploy papkasi tayyorlash ==="
mkdir -p /home/deploy/shoktaxi/logs
chown -R deploy:deploy /home/deploy/shoktaxi 2>/dev/null || true

echo "=== 5. Firewall — 443 ochiq ekanini tekshirish ==="
ufw status | grep -q "443" || ufw allow 443/tcp

echo ""
echo "✅ Shok Taxi uchun VPS tayyor!"
echo ""
echo "Keyingi qadamlar:"
echo "1. deploy user sifatida: git clone REPO /home/deploy/shoktaxi"
echo "2. backend/.env.production faylni to'ldiring"
echo "3. cd /home/deploy/shoktaxi/backend && npm ci && npm run build"
echo "4. cd /home/deploy/shoktaxi/frontend && npm ci && npm run build"
echo "5. pm2 start ecosystem.config.js"
echo "6. sudo cp nginx/shoktaxi.conf /etc/nginx/sites-available/shoktaxi.uz"
echo "7. sudo ln -s /etc/nginx/sites-available/shoktaxi.uz /etc/nginx/sites-enabled/"
echo "8. sudo nginx -t && sudo systemctl reload nginx"
echo "9. sudo certbot --nginx -d shoktaxi.uz -d www.shoktaxi.uz"
