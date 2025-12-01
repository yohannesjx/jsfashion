# JsFashion Production Deployment Guide

## Prerequisites
- Ubuntu Server (Fresh installation)
- Domain: jsfashion.et pointing to 159.195.48.155
- Root access to the server

## Quick Deployment Steps

### 1. Connect to Server
```bash
ssh root@159.195.48.155
```

### 2. Install Dependencies
```bash
# Update system
apt update && apt upgrade -y

# Install Docker
curl -fsSL https://get.docker.com -o get-docker.sh
sh get-docker.sh

# Install Docker Compose
apt install docker-compose -y

# Install Caddy
apt install -y debian-keyring debian-archive-keyring apt-transport-https
curl -1sLf 'https://dl.cloudsmith.io/public/caddy/stable/gpg.key' | gpg --dearmor -o /usr/share/keyrings/caddy-stable-archive-keyring.gpg
curl -1sLf 'https://dl.cloudsmith.io/public/caddy/stable/debian.deb.txt' | tee /etc/apt/sources.list.d/caddy-stable.list
apt update
apt install caddy -y

# Install Git
apt install git -y
```

### 3. Clone Repository
```bash
cd /opt
git clone https://github.com/yohannesjx/jsfashion.git
cd jsfashion
```

### 4. Create Environment File
```bash
cat > .env << 'EOF'
POSTGRES_PASSWORD=your_secure_postgres_password_here
JWT_SECRET=your_secure_jwt_secret_here_min_32_chars
EOF
```

**Important:** Replace the placeholder values with secure random strings:
```bash
# Generate secure passwords
openssl rand -base64 32
```

### 5. Configure Caddy
```bash
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

# Create log directory
mkdir -p /var/log/caddy

# Restart Caddy
systemctl restart caddy
systemctl enable caddy
```

### 6. Build and Start Services
```bash
cd /opt/jsfashion

# Build and start all services
docker-compose -f docker-compose.prod.yml up -d --build

# Check status
docker-compose -f docker-compose.prod.yml ps

# View logs
docker-compose -f docker-compose.prod.yml logs -f
```

### 7. Initialize Database
The database will be automatically initialized with the schema on first run.

### 8. Create Admin User
```bash
# Access the backend container
docker exec -it jsfashion_backend sh

# Use the admin creation endpoint or SQL
# (You'll need to implement this or create manually via SQL)
```

## Verify Deployment

1. **Frontend**: https://jsfashion.et
2. **API**: https://api.jsfashion.et/health
3. **Admin**: https://jsfashion.et/admin

## Maintenance Commands

### View Logs
```bash
# All services
docker-compose -f docker-compose.prod.yml logs -f

# Specific service
docker-compose -f docker-compose.prod.yml logs -f frontend
docker-compose -f docker-compose.prod.yml logs -f backend
```

### Restart Services
```bash
# All services
docker-compose -f docker-compose.prod.yml restart

# Specific service
docker-compose -f docker-compose.prod.yml restart frontend
```

### Update Application
```bash
cd /opt/jsfashion
git pull origin main
docker-compose -f docker-compose.prod.yml up -d --build
```

### Backup Database
```bash
docker exec jsfashion_postgres pg_dump -U jsfashion jsfashion > backup_$(date +%Y%m%d).sql
```

### Restore Database
```bash
docker exec -i jsfashion_postgres psql -U jsfashion jsfashion < backup_20241202.sql
```

## Troubleshooting

### Check Service Status
```bash
docker-compose -f docker-compose.prod.yml ps
systemctl status caddy
```

### Check Logs
```bash
# Docker logs
docker-compose -f docker-compose.prod.yml logs --tail=100

# Caddy logs
tail -f /var/log/caddy/jsfashion.log
tail -f /var/log/caddy/api.log
```

### Restart Everything
```bash
docker-compose -f docker-compose.prod.yml down
docker-compose -f docker-compose.prod.yml up -d
systemctl restart caddy
```

## Security Recommendations

1. **Firewall Setup**
```bash
ufw allow 22/tcp
ufw allow 80/tcp
ufw allow 443/tcp
ufw enable
```

2. **SSL Certificates**
Caddy automatically handles SSL certificates via Let's Encrypt.

3. **Regular Updates**
```bash
apt update && apt upgrade -y
docker-compose -f docker-compose.prod.yml pull
docker-compose -f docker-compose.prod.yml up -d
```

4. **Backup Strategy**
Set up automated daily backups of the database.

## Performance Optimization

1. **Enable Docker logging limits**
Add to docker-compose.prod.yml for each service:
```yaml
logging:
  driver: "json-file"
  options:
    max-size: "10m"
    max-file: "3"
```

2. **Monitor Resources**
```bash
docker stats
htop
```

## Support

For issues, check:
- Application logs: `docker-compose logs`
- Caddy logs: `/var/log/caddy/`
- System logs: `journalctl -xe`
