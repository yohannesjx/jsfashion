#!/bin/bash

# JsFashion Deployment Script
# This script automates the deployment process

set -e

echo "🚀 JsFashion Deployment Script"
echo "================================"

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Check if running as root
if [ "$EUID" -ne 0 ]; then 
    echo -e "${RED}Please run as root${NC}"
    exit 1
fi

echo -e "${GREEN}✓${NC} Running as root"

# Update system
echo -e "\n${YELLOW}Updating system...${NC}"
apt update && apt upgrade -y
echo -e "${GREEN}✓${NC} System updated"

# Install Docker
if ! command -v docker &> /dev/null; then
    echo -e "\n${YELLOW}Installing Docker...${NC}"
    curl -fsSL https://get.docker.com -o get-docker.sh
    sh get-docker.sh
    rm get-docker.sh
    echo -e "${GREEN}✓${NC} Docker installed"
else
    echo -e "${GREEN}✓${NC} Docker already installed"
fi

# Install Docker Compose
if ! command -v docker-compose &> /dev/null; then
    echo -e "\n${YELLOW}Installing Docker Compose...${NC}"
    apt install docker-compose -y
    echo -e "${GREEN}✓${NC} Docker Compose installed"
else
    echo -e "${GREEN}✓${NC} Docker Compose already installed"
fi

# Install Caddy
if ! command -v caddy &> /dev/null; then
    echo -e "\n${YELLOW}Installing Caddy...${NC}"
    apt install -y debian-keyring debian-archive-keyring apt-transport-https
    curl -1sLf 'https://dl.cloudsmith.io/public/caddy/stable/gpg.key' | gpg --dearmor -o /usr/share/keyrings/caddy-stable-archive-keyring.gpg
    curl -1sLf 'https://dl.cloudsmith.io/public/caddy/stable/debian.deb.txt' | tee /etc/apt/sources.list.d/caddy-stable.list
    apt update
    apt install caddy -y
    echo -e "${GREEN}✓${NC} Caddy installed"
else
    echo -e "${GREEN}✓${NC} Caddy already installed"
fi

# Install Git
if ! command -v git &> /dev/null; then
    echo -e "\n${YELLOW}Installing Git...${NC}"
    apt install git -y
    echo -e "${GREEN}✓${NC} Git installed"
else
    echo -e "${GREEN}✓${NC} Git already installed"
fi

# Clone repository
if [ ! -d "/opt/jsfashion" ]; then
    echo -e "\n${YELLOW}Cloning repository...${NC}"
    cd /opt
    git clone https://github.com/yohannesjx/jsfashion.git
    cd jsfashion
    echo -e "${GREEN}✓${NC} Repository cloned"
else
    echo -e "\n${YELLOW}Updating repository...${NC}"
    cd /opt/jsfashion
    git pull origin main
    echo -e "${GREEN}✓${NC} Repository updated"
fi

# Create .env file if it doesn't exist
if [ ! -f "/opt/jsfashion/.env" ]; then
    echo -e "\n${YELLOW}Creating environment file...${NC}"
    POSTGRES_PASSWORD=$(openssl rand -base64 32)
    JWT_SECRET=$(openssl rand -base64 32)
    
    cat > /opt/jsfashion/.env << EOF
POSTGRES_PASSWORD=$POSTGRES_PASSWORD
JWT_SECRET=$JWT_SECRET
EOF
    
    echo -e "${GREEN}✓${NC} Environment file created"
    echo -e "${YELLOW}⚠${NC}  Credentials saved to /opt/jsfashion/.env"
else
    echo -e "${GREEN}✓${NC} Environment file exists"
fi

# Configure Caddy
echo -e "\n${YELLOW}Configuring Caddy...${NC}"
mkdir -p /var/log/caddy

cat > /etc/caddy/Caddyfile << 'EOF'
# Main website
jsfashion.et, www.jsfashion.et {
    reverse_proxy localhost:3000
    
    encode gzip
    
    log {
        output file /var/log/caddy/jsfashion.log
    }
}

# API subdomain
api.jsfashion.et {
    reverse_proxy localhost:8081
    
    encode gzip
    
    log {
        output file /var/log/caddy/api.log
    }
}
EOF

systemctl restart caddy
systemctl enable caddy
echo -e "${GREEN}✓${NC} Caddy configured and started"

# Setup firewall
echo -e "\n${YELLOW}Configuring firewall...${NC}"
ufw --force enable
ufw allow 22/tcp
ufw allow 80/tcp
ufw allow 443/tcp
echo -e "${GREEN}✓${NC} Firewall configured"

# Build and start services
echo -e "\n${YELLOW}Building and starting services...${NC}"
cd /opt/jsfashion
docker-compose -f docker-compose.prod.yml down
docker-compose -f docker-compose.prod.yml up -d --build

echo -e "\n${YELLOW}Waiting for services to start...${NC}"
sleep 10

# Check service status
echo -e "\n${YELLOW}Service Status:${NC}"
docker-compose -f docker-compose.prod.yml ps

echo -e "\n${GREEN}================================${NC}"
echo -e "${GREEN}✓ Deployment Complete!${NC}"
echo -e "${GREEN}================================${NC}"
echo -e "\n📱 Your application is now available at:"
echo -e "   ${GREEN}Frontend:${NC} https://jsfashion.et"
echo -e "   ${GREEN}API:${NC}      https://api.jsfashion.et"
echo -e "   ${GREEN}Admin:${NC}    https://jsfashion.et/admin"
echo -e "\n📝 Credentials are stored in: /opt/jsfashion/.env"
echo -e "\n📊 View logs with:"
echo -e "   docker-compose -f /opt/jsfashion/docker-compose.prod.yml logs -f"
echo -e "\n🔄 To update the application:"
echo -e "   cd /opt/jsfashion && git pull && docker-compose -f docker-compose.prod.yml up -d --build"
echo ""
