#!/bin/bash
# Quick update script - pulls latest and rebuilds
# Run: ./update.sh

set -e  # Exit on any error
trap 'echo "ERROR: Update failed at line $LINENO"; exit 1' ERR

echo "========================================="
echo "  Book Editor Update Script"
echo "========================================="

echo ""
echo "[1/4] Pulling latest code..."
git pull origin main

echo ""
echo "[2/4] Stopping containers..."
docker compose down

echo ""
echo "[3/4] Rebuilding and starting..."
docker compose up -d --build

echo ""
echo "[4/4] Waiting for health check..."
sleep 5

# Check if the container is healthy
if curl -s http://localhost:3002/health | grep -q '"status":"ok"'; then
    echo ""
    echo "========================================="
    echo "  Update successful!"
    echo "  App running at: http://localhost:3002"
    echo "========================================="
else
    echo ""
    echo "WARNING: Health check failed. Container may still be starting."
    echo "Check status with: docker compose logs"
fi
