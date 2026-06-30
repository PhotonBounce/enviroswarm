# ENViroSwarm Deployment Guide

## Quick Deploy (One-Command Server Setup)

### Prerequisites
- Ubuntu 22.04 LTS server (or similar)
- Docker & Docker Compose installed
- Git
- SSH access with key-based auth
- Domain name (optional but recommended)
- SSL certificate (Let's Encrypt recommended)

### Step 1: Provision Server

```bash
# On your local machine, run:
ssh root@YOUR_SERVER_IP

# On the server:
apt update && apt upgrade -y
apt install -y docker.io docker-compose git curl
usermod -aG docker $USER
# Log out and back in for docker group to take effect
```

### Step 2: Clone and Setup

```bash
cd /opt
sudo git clone https://github.com/PhotonBounce/enviroswarm.git
cd enviroswarm
sudo chown -R $USER:$USER .
make setup
```

### Step 3: Configure Environment

```bash
cp .env.example .env
# Edit .env with your actual values:
# - Strong POSTGRES_PASSWORD
# - Strong SECRET_KEY
# - Your domain in CORS_ORIGINS
# - Your Stripe keys (if using payments)
# - AWS S3 credentials (for backups)
nano .env
```

### Step 4: Deploy

```bash
# One-command deploy
./scripts/deploy.sh all

# Or via Makefile from local machine
make deploy
```

### Step 5: Set Up Cron Jobs

```bash
./scripts/setup-cron.sh
```

This sets up:
- Health check every 5 minutes
- Database backup every day at 3 AM
- Docker log cleanup every Sunday
- Log rotation (7-day retention)

### Step 6: Configure GitHub Actions Secrets

Go to your GitHub repo → Settings → Secrets → Actions, and add:

| Secret | Description |
|--------|-------------|
| `SSH_PRIVATE_KEY` | Your server's SSH private key (for deployment) |
| `DEPLOY_HOST` | Your server IP or domain |
| `DEPLOY_USER` | SSH username (e.g., `root` or `ubuntu`) |
| `VITE_API_URL` | `https://api.yourdomain.com` |
| `API_URL` | `https://api.yourdomain.com` |
| `WEB_URL` | `https://yourdomain.com` |
| `ALERT_WEBHOOK` | Slack/Discord webhook URL for alerts |

### Step 7: SSL Certificate (Let's Encrypt)

```bash
# Install certbot
docker run -it --rm -p 80:80 certbot/certbot certonly --standalone -d yourdomain.com -d api.yourdomain.com

# Copy certs to nginx/ssl/
cp /etc/letsencrypt/live/yourdomain.com/fullchain.pem nginx/ssl/cert.pem
cp /etc/letsencrypt/live/yourdomain.com/privkey.pem nginx/ssl/key.pem

# Update nginx.conf to uncomment HTTPS block and restart
# docker-compose -f docker-compose.prod.yml restart nginx
```

### Step 8: Auto-Deploy from GitHub

Push a tag to trigger production deployment:

```bash
git tag -a v1.0.0 -m "Production release v1.0.0"
git push origin v1.0.0
```

The `release.yml` GitHub Action will:
1. Build the Docker image
2. Build the web dashboard
3. Create a release tarball
4. Deploy to your server (if configured)

---

## Monitoring & Maintenance

### View logs
```bash
# All containers
docker-compose -f docker-compose.prod.yml logs -f

# Backend only
docker-compose -f docker-compose.prod.yml logs -f backend

# Database
docker-compose -f docker-compose.prod.yml logs -f db
```

### Health check
```bash
make health
# or
./scripts/health-check.sh
```

### Manual backup
```bash
make backup
# or
./scripts/backup.sh
```

### Restart services
```bash
make deploy
# or
./scripts/deploy.sh all
```

### Update
```bash
cd /opt/enviroswarm
git pull origin main
make deploy
```

---

## Cost Estimation (Monthly)

| Service | VPS (2CPU/4GB) | VPS (4CPU/8GB) | AWS ECS |
|---------|---------------|---------------|---------|
| Server | $5–$10 | $10–$20 | $15–$30 |
| Database (self-hosted) | $0 | $0 | $15–$50 |
| Bandwidth | $0–$5 | $0–$10 | $5–$20 |
| Storage | $0–$2 | $0–$5 | $5–$15 |
| **Total** | **$5–$17** | **$10–$35** | **$40–$115** |

Recommended: **Hetzner Cloud** or **DigitalOcean** for cost-efficiency.

---

## Troubleshooting

### "Health check failed"
- Check Docker containers: `docker ps`
- Check logs: `docker-compose logs`
- Verify `.env` file is correct
- Check firewall: `ufw status`

### "Database connection refused"
- Ensure PostgreSQL container is running
- Check `DATABASE_URL` in `.env`
- Verify port 5432 is accessible

### "502 Bad Gateway"
- Check nginx config: `docker exec nginx nginx -t`
- Verify backend container is healthy
- Check CORS origins match
