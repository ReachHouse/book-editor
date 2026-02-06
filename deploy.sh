#!/bin/bash
# =============================================================================
# DEPLOYMENT SCRIPT FOR HOSTINGER VPS
# =============================================================================
#
# This script handles deploying updates to the Book Editor application.
# It pulls the latest code from GitHub and rebuilds the Docker container.
#
# SECURITY:
# ---------
# On first deployment, this script automatically generates a SETUP_SECRET.
# This secret is required to create the admin account via the setup wizard.
# The secret is stored in .env and displayed once during first deployment.
# SAVE THIS SECRET - you'll need it to complete the setup wizard!
#
# FIRST-TIME SETUP:
# -----------------
# 1. SSH into your Hostinger VPS
# 2. Create a deployment directory:
#      mkdir -p /root/book-editor-backend
#      cd /root/book-editor-backend
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
# 7. IMPORTANT: Save the SETUP_SECRET displayed during first deployment!
#    You'll need it to create your admin account.
#
# SUBSEQUENT UPDATES:
# -------------------
# After pushing code changes to GitHub, simply run:
#   cd /root/book-editor-backend
#   ./deploy.sh
#
# WHAT THIS SCRIPT DOES:
# ----------------------
# 1. Generates SETUP_SECRET and JWT_SECRET if not exists (first deployment only)
# 2. Pulls latest code from GitHub (main branch)
# 3. Tags current image as "previous" for rollback
# 4. Stops the running container
# 5. Rebuilds the Docker image
# 6. Starts the container and shows logs
#
# ROLLBACK:
# ---------
# If a deployment fails, restore the previous version:
#   docker tag book-editor-backend-book-editor:previous book-editor-backend-book-editor:latest
#   docker compose up -d
#
# =============================================================================

set -e  # Exit on any error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
BOLD='\033[1m'
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
    echo "  mkdir -p /root/book-editor-backend"
    echo "  cd /root/book-editor-backend"
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

# =============================================================================
# SECURITY SECRETS MANAGEMENT
# =============================================================================
# Docker Compose automatically loads .env files from the current directory.
# This file is gitignored and persists across deployments.

ENV_FILE=".env"
OLD_ENV_FILE=".env.local"
FIRST_TIME_SETUP=false

# Warn if both files exist (user may have orphaned secrets)
if [ -f "$OLD_ENV_FILE" ] && [ -f "$ENV_FILE" ]; then
    echo -e "${YELLOW}WARNING: Both .env and .env.local exist!${NC}"
    echo -e "Using .env - check .env.local for any secrets you need to migrate manually."
    echo -e "Consider removing .env.local after verifying: rm .env.local"
    echo ""
fi

# Migrate from old .env.local if it exists and .env doesn't
if [ -f "$OLD_ENV_FILE" ] && [ ! -f "$ENV_FILE" ]; then
    echo -e "${YELLOW}Migrating secrets from .env.local to .env...${NC}"
    mv "$OLD_ENV_FILE" "$ENV_FILE"
    echo -e "${GREEN}Migration complete${NC}"
fi

# Safely parse .env file (avoids executing arbitrary code via source)
# Only reads KEY=VALUE lines, ignores comments and empty lines
load_env_file() {
    local file="$1"
    if [ ! -f "$file" ]; then
        return 1
    fi
    while IFS='=' read -r key value || [ -n "$key" ]; do
        # Skip empty lines and comments
        [[ -z "$key" || "$key" =~ ^[[:space:]]*# ]] && continue
        # Remove leading/trailing whitespace from key
        key=$(echo "$key" | xargs)
        # Remove surrounding quotes from value if present
        value="${value%\"}"
        value="${value#\"}"
        value="${value%\'}"
        value="${value#\'}"
        # Export the variable
        export "$key=$value"
    done < "$file"
}

# Load existing secrets if .env exists
if [ -f "$ENV_FILE" ]; then
    echo -e "${GREEN}Loading existing secrets from .env...${NC}"
    load_env_file "$ENV_FILE"
else
    FIRST_TIME_SETUP=true
    echo -e "${YELLOW}First-time deployment detected!${NC}"
    echo ""
fi

# Helper function to safely add/update a variable in .env (prevents duplicates)
# Uses # as sed delimiter since hex values never contain #
add_env_var() {
    local var_name="$1"
    local var_value="$2"

    # Validate inputs
    if [ -z "$var_name" ] || [ -z "$var_value" ]; then
        echo -e "${RED}ERROR: Cannot save empty variable name or value${NC}"
        return 1
    fi

    # Check if variable already exists in file
    if [ -f "$ENV_FILE" ] && grep -q "^${var_name}=" "$ENV_FILE"; then
        # Variable exists, update it in place (use # delimiter - safe for hex)
        sed -i "s#^${var_name}=.*#${var_name}=${var_value}#" "$ENV_FILE"
    else
        # Variable doesn't exist, append it
        echo "${var_name}=${var_value}" >> "$ENV_FILE"
    fi
}

# Generate SETUP_SECRET if not set
if [ -z "$SETUP_SECRET" ]; then
    echo -e "${GREEN}Generating SETUP_SECRET...${NC}"
    SETUP_SECRET=$(openssl rand -hex 32)

    # Verify generation succeeded
    if [ -z "$SETUP_SECRET" ] || [ ${#SETUP_SECRET} -ne 64 ]; then
        echo -e "${RED}ERROR: Failed to generate SETUP_SECRET (openssl failed?)${NC}"
        exit 1
    fi

    add_env_var "SETUP_SECRET" "$SETUP_SECRET"
    echo -e "${GREEN}SETUP_SECRET generated and saved to .env${NC}"
    FIRST_TIME_SETUP=true
fi

# Generate JWT_SECRET if not set
if [ -z "$JWT_SECRET" ]; then
    echo -e "${GREEN}Generating JWT_SECRET...${NC}"
    JWT_SECRET=$(openssl rand -hex 64)

    # Verify generation succeeded
    if [ -z "$JWT_SECRET" ] || [ ${#JWT_SECRET} -ne 128 ]; then
        echo -e "${RED}ERROR: Failed to generate JWT_SECRET (openssl failed?)${NC}"
        exit 1
    fi

    add_env_var "JWT_SECRET" "$JWT_SECRET"
    echo -e "${GREEN}JWT_SECRET generated and saved to .env${NC}"
fi

# Export secrets for docker-compose
export SETUP_SECRET
export JWT_SECRET

# Final validation - ensure secrets are set
if [ -z "$SETUP_SECRET" ] || [ -z "$JWT_SECRET" ]; then
    echo -e "${RED}ERROR: Secrets are not properly configured!${NC}"
    echo "SETUP_SECRET length: ${#SETUP_SECRET}"
    echo "JWT_SECRET length: ${#JWT_SECRET}"
    exit 1
fi

# Secure the .env file (readable only by owner)
if [ -f "$ENV_FILE" ]; then
    chmod 600 "$ENV_FILE"
fi

echo ""

# Check for API key
if [ -z "$ANTHROPIC_API_KEY" ]; then
    echo -e "${YELLOW}WARNING: ANTHROPIC_API_KEY is not set!${NC}"
    echo "The application will start but AI editing won't work."
    echo "Set it with: export ANTHROPIC_API_KEY=sk-ant-api03-xxx"
    echo ""
fi

# =============================================================================
# DEPLOYMENT STEPS
# =============================================================================

# Step 1: Pull latest code
echo -e "${GREEN}[1/5] Pulling latest code from GitHub...${NC}"
git fetch origin main
git reset --hard origin/main
echo -e "      Current version: $(grep -oP "VERSION = '\K[^']+" frontend/src/constants/version.js 2>/dev/null || echo 'unknown')"
echo ""

# Step 2: Tag previous image for rollback
echo -e "${GREEN}[2/5] Tagging previous image for rollback...${NC}"
docker tag book-editor-backend-book-editor:latest book-editor-backend-book-editor:previous 2>/dev/null || echo "      (No previous image to tag)"
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

# =============================================================================
# FIRST-TIME SETUP INSTRUCTIONS
# =============================================================================
if [ "$FIRST_TIME_SETUP" = true ]; then
    echo -e "${BOLD}${CYAN}========================================${NC}"
    echo -e "${BOLD}${CYAN}  FIRST-TIME SETUP - READ CAREFULLY!${NC}"
    echo -e "${BOLD}${CYAN}========================================${NC}"
    echo ""
    echo -e "${BOLD}${YELLOW}Your SETUP_SECRET has been generated:${NC}"
    echo ""
    echo -e "  ${BOLD}${GREEN}$SETUP_SECRET${NC}"
    echo ""
    echo -e "${BOLD}${RED}>>> SAVE THIS SECRET NOW! <<<${NC}"
    echo ""
    echo "You will need this secret to create your admin account."
    echo "It is stored in .env but won't be displayed again."
    echo ""
    echo -e "${BOLD}To complete setup:${NC}"
    echo "  1. Go to https://reachhouse.cloud"
    echo "  2. Enter the SETUP_SECRET above"
    echo "  3. Create your admin username, email, and password"
    echo ""
    echo -e "${CYAN}========================================${NC}"
    echo ""
fi

echo "Access the app at: https://reachhouse.cloud"
echo ""
echo "Useful commands:"
echo "  View logs:        docker compose logs -f"
echo "  Stop:             docker compose down"
echo "  Restart:          docker compose restart"
echo "  Rollback:         docker tag book-editor-backend-book-editor:previous book-editor-backend-book-editor:latest && docker compose up -d"
echo "  View secrets:     cat .env"
echo ""

# Show recent logs
echo -e "${BLUE}Recent logs:${NC}"
docker compose logs --tail=10
