#!/bin/bash
# Shok Taxi — Deploy script
# VPS da ishlatish: bash /home/deploy/shoktaxi/scripts/deploy.sh

set -e

PROJECT_DIR="/home/deploy/shoktaxi"
cd "$PROJECT_DIR"

echo "=== Git pull ==="
git pull origin main

echo "=== Backend build ==="
cd backend
npm ci --omit=dev
npm run build
cd ..

echo "=== Frontend build ==="
cd frontend
npm ci
npm run build
cd ..

echo "=== PM2 restart ==="
pm2 restart shok-taxi-api || pm2 start ecosystem.config.js

echo ""
echo "✅ Deploy muvaffaqiyatli!"
echo "Status: pm2 status"
