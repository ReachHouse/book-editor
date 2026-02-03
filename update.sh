#!/bin/bash
# Quick update script - pulls latest and rebuilds
# Run: ./update.sh

echo "Pulling latest code..."
git pull origin main

echo "Rebuilding and restarting..."
docker compose down
docker compose up -d --build

echo "Done! Check: curl http://localhost:3002/health"
