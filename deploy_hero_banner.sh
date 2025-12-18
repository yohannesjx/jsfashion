#!/bin/bash

# Hero Banner Feature Deployment Script
# This script deploys the hero banner management feature

set -e

echo "🎨 Deploying Hero Banner Feature"
echo "=================================="

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Navigate to project directory
cd /opt/jsfashion

echo -e "\n${YELLOW}1. Pulling latest changes from git...${NC}"
git pull origin main

echo -e "\n${YELLOW}2. Running database migration...${NC}"
docker-compose -f docker-compose.prod.yml exec -T db psql -U postgres -d jsfashion < backend/sql/migrations/010_add_store_settings.sql

echo -e "\n${YELLOW}3. Rebuilding backend service...${NC}"
docker-compose -f docker-compose.prod.yml up -d --build backend

echo -e "\n${YELLOW}4. Rebuilding frontend service...${NC}"
docker-compose -f docker-compose.prod.yml up -d --build frontend

echo -e "\n${YELLOW}5. Waiting for services to restart...${NC}"
sleep 10

echo -e "\n${YELLOW}6. Checking service status...${NC}"
docker-compose -f docker-compose.prod.yml ps

echo -e "\n${GREEN}================================${NC}"
echo -e "${GREEN}✓ Hero Banner Feature Deployed!${NC}"
echo -e "${GREEN}================================${NC}"
echo -e "\n📝 Next steps:"
echo -e "   1. Go to https://jsfashion.et/admin/settings"
echo -e "   2. Upload or select a hero banner image"
echo -e "   3. Save settings"
echo -e "   4. Visit https://jsfashion.et to see the new banner"
echo -e "\n📱 The mobile app will automatically fetch the new banner on next launch"
echo ""
