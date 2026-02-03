#!/bin/bash
# =============================================================================
# DEPLOYMENT SCRIPT FOR HOSTINGER VPS
# =============================================================================
#
# This script handles deploying updates to the Book Editor application.
# It pulls the latest code from GitHub and rebuilds the Docker container.
#
# FIRST-TIME SETUP:
# -----------------
# 1. SSH into your Hostinger VPS
# 2. Create a deployment directory:
#      mkdir -p /docker/book-editor-app
#      cd /docker/book-editor-app
#
# 3. Clone the repository:
#      git clone https://github.com/ReachHouse/book-editor.git .
#
# 4. Set your API key (add to ~/.bashrc for persistence):
#      export ANTHROPIC_API_KEY=sk-ant-api03-xxx
#
# 5. Make this script executable:
#      chmod +x deploy.sh
#
# 6. Run initial deployment:
#      ./deploy.sh
#
# SUBSEQUENT UPDATES:
# -------------------
# After pushing code changes to GitHub, simply run:
#   cd /docker/book-editor-app
#   ./deploy.sh
#
# WHAT THIS SCRIPT DOES:
# ----------------------
# 1. Pulls latest code from GitHub (main branch)
# 2. Tags current image as "previous" for rollback
# 3. Stops the running container
# 4. Rebuilds the Docker image
# 5. Starts the container and shows logs
#
# ROLLBACK:
# ---------
# If a deployment fails, restore the previous version:
#   docker tag book-editor:previous book-editor:latest
#   docker compose up -d
#
# =============================================================================

set -e  # Exit on any error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}========================================${NC}"
echo -e "${BLUE}  Book Editor Deployment Script${NC}"
echo -e "${BLUE}========================================${NC}"
echo ""

# Check if we're in a git repository
if [ ! -d ".git" ]; then
    echo -e "${RED}ERROR: Not in a git repository!${NC}"
    echo ""
    echo "Please run the first-time setup:"
    echo "  mkdir -p /docker/book-editor-app"
    echo "  cd /docker/book-editor-app"
    echo "  git clone https://github.com/ReachHouse/book-editor.git ."
    echo "  chmod +x deploy.sh"
    echo "  ./deploy.sh"
    exit 1
fi

# Check if docker-compose.yml exists
if [ ! -f "docker-compose.yml" ]; then
    echo -e "${RED}ERROR: docker-compose.yml not found!${NC}"
    echo "Make sure you're in the correct directory."
    exit 1
fi

# Check for API key
if [ -z "$ANTHROPIC_API_KEY" ]; then
    echo -e "${YELLOW}WARNING: ANTHROPIC_API_KEY is not set!${NC}"
    echo "The application will start but AI editing won't work."
    echo "Set it with: export ANTHROPIC_API_KEY=sk-ant-api03-xxx"
    echo ""
fi

# Step 1: Pull latest code
echo -e "${GREEN}[1/4] Pulling latest code from GitHub...${NC}"
git fetch origin main
git reset --hard origin/main
echo -e "      Current version: $(grep -oP "VERSION = '\K[^']+" frontend/src/constants/version.js 2>/dev/null || echo 'unknown')"
echo ""

# Step 2: Tag previous image for rollback
echo -e "${GREEN}[2/5] Tagging previous image for rollback...${NC}"
docker tag book-editor:latest book-editor:previous 2>/dev/null || echo "      (No previous image to tag)"
echo ""

# Step 3: Stop existing container
echo -e "${GREEN}[3/5] Stopping existing container...${NC}"
docker compose down 2>/dev/null || true
echo ""

# Step 4: Build new image
echo -e "${GREEN}[4/5] Building Docker image (this may take a minute)...${NC}"
docker compose build --no-cache
echo ""

# Step 5: Start container
echo -e "${GREEN}[5/5] Starting container...${NC}"
docker compose up -d
echo ""

# Wait for container to be healthy
echo -e "${BLUE}Waiting for container to be healthy...${NC}"
sleep 5

# Check health
HEALTH=$(curl -s http://localhost:3002/health 2>/dev/null || echo '{"status":"error"}')
if echo "$HEALTH" | grep -q '"status":"ok"'; then
    echo -e "${GREEN}Container is healthy!${NC}"
else
    echo -e "${YELLOW}Container may still be starting. Check logs below.${NC}"
fi

echo ""
echo -e "${BLUE}========================================${NC}"
echo -e "${BLUE}  Deployment Complete!${NC}"
echo -e "${BLUE}========================================${NC}"
echo ""
echo "Access the app at: http://your-vps-ip:3002"
echo ""
echo "Useful commands:"
echo "  View logs:     docker compose logs -f"
echo "  Stop:          docker compose down"
echo "  Restart:       docker compose restart"
echo "  Rollback:      docker tag book-editor:previous book-editor:latest && docker compose up -d"
echo ""

# Show recent logs
echo -e "${BLUE}Recent logs:${NC}"
docker compose logs --tail=10
