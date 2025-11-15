# Docker Deployment Quick Reference

Complete Docker deployment guide for Pixelspot DOOH Advertising Platform.

---

## Prerequisites

- Docker 20.10+
- Docker Compose V2
- PostgreSQL database (hosted separately)
- All required API keys and credentials

---

## Quick Start

```bash
# 1. Configure environment
cp .env.example .env
nano .env  # Fill in all credentials

# 2. Build and run
docker-compose up -d

# 3. Verify
curl http://localhost:5000/api/health
docker-compose logs -f pixelspot
```

---

## Environment Variables

All environment variables must be configured in `.env` file before deployment.

### Critical Variables

```env
# Application
NODE_ENV=production
PORT=5000

# Database (REQUIRED - use your PostgreSQL connection string)
DATABASE_URL=postgresql://username:password@host:5432/pixelspot

# Firebase Authentication
FIREBASE_PROJECT_ID=your-firebase-project
FIREBASE_CLIENT_EMAIL=firebase-adminsdk-xxxxx@your-project.iam.gserviceaccount.com
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\nYour\nPrivate\nKey\n-----END PRIVATE KEY-----\n"
VITE_FIREBASE_API_KEY=AIzaSy...
VITE_FIREBASE_APP_ID=1:123456789:web:...

# Google OAuth & Maps
GOOGLE_CLIENT_ID=your-client-id.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=GOCSPX-your-secret
VITE_GOOGLE_MAPS_API_KEY=AIzaSy...

# AWS SES (Email)
AWS_ACCESS_KEY_ID=AKIAXXXXXXXX
AWS_SECRET_ACCESS_KEY=your-secret-key
AWS_SES_REGION=ap-south-1

# ComBirds SMS (India)
COMBIRDS_API_KEY=your-api-key
COMBIRDS_USER_ID=your-user-id
COMBIRDS_PASSWORD=your-password
COMBIRDS_HEADER=PIXSPT

# OpenAI (AI Features)
OPENAI_API_KEY=sk-proj-...

# Stripe Payments
STRIPE_SECRET_KEY=sk_live_...
VITE_STRIPE_PUBLIC_KEY=pk_live_...

# Session Security
SESSION_SECRET=generate-random-64-char-string
```

**Generate SESSION_SECRET:**
```bash
openssl rand -base64 32
```

See `.env.example` for complete list of all variables.

---

## Docker Commands

### Basic Operations

```bash
# Start application
docker-compose up -d

# Stop application
docker-compose down

# Restart application
docker-compose restart

# View logs (follow mode)
docker-compose logs -f

# View logs (last 100 lines)
docker-compose logs --tail=100

# Check container status
docker-compose ps
```

### Updates & Maintenance

```bash
# Update application (pull latest code)
git pull
docker-compose down
docker-compose build --no-cache
docker-compose up -d

# Run database migrations
docker-compose exec pixelspot npm run db:push

# Access container shell
docker-compose exec pixelspot sh

# View resource usage
docker stats pixelspot-app
```

### Debugging

```bash
# View all logs
docker-compose logs

# View error logs only
docker-compose logs pixelspot 2>&1 | grep -i error

# Inspect container
docker inspect pixelspot-app

# Check environment variables inside container
docker-compose exec pixelspot env | grep DATABASE

# Test health endpoint
curl http://localhost:5000/api/health

# Test inside container
docker-compose exec pixelspot wget -O- http://localhost:5000/api/health
```

---

## Docker Files Overview

### Dockerfile

Multi-stage production build:
- **Stage 1 (builder)**: Installs all dependencies and builds application
- **Stage 2 (production)**: Minimal runtime with only production dependencies
- Runs as non-root user for security
- Includes health check endpoint
- Exposes port 5000

**Key features:**
- Alpine Linux (minimal footprint)
- Multi-stage build (~200MB final image vs ~1GB with dev dependencies)
- Non-root user (nodejs:nodejs)
- Health check configured
- Proper signal handling (uses `node` directly, not `npm start`)

### docker-compose.yml

Single instance orchestration:
- Loads environment from `.env` file
- Maps port 5000 to host
- Health check with 30s interval
- Resource limits (1 CPU, 1GB RAM)
- Persistent logs volume
- Auto-restart policy

### .dockerignore

Excludes from Docker build:
- `node_modules` (will be installed fresh)
- `.env` files (provided separately)
- Git files
- Documentation
- Development files

---

## Production Deployment

### Option 1: Hetzner Ubuntu Server

```bash
# On your server
ssh root@YOUR_SERVER_IP

# Install Docker
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh
sudo apt install docker-compose-plugin -y

# Clone repository
git clone https://github.com/YOUR_ORG/pixelspot.git
cd pixelspot

# Configure environment
cp .env.example .env
nano .env  # Fill in all credentials

# Deploy
docker-compose up -d

# Setup Nginx reverse proxy
sudo apt install nginx -y
sudo nano /etc/nginx/sites-available/pixelspot
```

**Nginx configuration:**
```nginx
server {
    listen 80;
    server_name adsmanager.pixelspot.in;

    location / {
        proxy_pass http://localhost:5000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }
}
```

```bash
# Enable and test
sudo ln -s /etc/nginx/sites-available/pixelspot /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl restart nginx

# Setup SSL
sudo apt install certbot python3-certbot-nginx -y
sudo certbot --nginx -d adsmanager.pixelspot.in
```

### Option 2: AWS / Cloud Provider

1. Launch EC2 instance (Ubuntu 22.04)
2. Install Docker and Docker Compose
3. Configure security group (ports 80, 443, 22)
4. Follow same deployment steps as above
5. Point domain to instance IP
6. Configure SSL with Certbot

### Option 3: Replit Deployments

Replit handles Docker automatically - no manual Docker configuration needed:

1. Push code to Replit
2. Configure secrets in Replit dashboard
3. Click "Deploy" button

---

## Database Configuration

**PostgreSQL is NOT included in the Docker setup.** You must use an external database.

### Recommended Options

**Option 1: Neon PostgreSQL (Recommended)**
- Serverless PostgreSQL
- Automatic backups
- Free tier available
- https://neon.tech

**Option 2: Self-hosted PostgreSQL**
```bash
# On separate server or same host
docker run -d \
  --name pixelspot-postgres \
  -e POSTGRES_USER=pixelspot \
  -e POSTGRES_PASSWORD=secure_password \
  -e POSTGRES_DB=pixelspot_db \
  -v postgres_data:/var/lib/postgresql/data \
  -p 5432:5432 \
  postgres:16-alpine

# Get connection string
DATABASE_URL=postgresql://pixelspot:secure_password@host:5432/pixelspot_db
```

**Option 3: Cloud Providers**
- AWS RDS
- Google Cloud SQL
- Azure Database for PostgreSQL
- DigitalOcean Managed Databases

**After database setup:**
```bash
# Run migrations
docker-compose exec pixelspot npm run db:push

# Verify connection
docker-compose exec pixelspot node -e "
  const { Pool } = require('pg');
  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
  pool.query('SELECT NOW()', (err, res) => {
    console.log(err ? 'ERROR: ' + err.message : 'Connected!');
    pool.end();
  });
"
```

---

## Monitoring

### Health Checks

Built-in health endpoint:
```bash
curl http://localhost:5000/api/health
```

Response:
```json
{
  "status": "ok",
  "timestamp": "2025-01-15T10:30:00.000Z"
}
```

### Docker Health Status

```bash
# View health status
docker-compose ps

# Inspect health checks
docker inspect pixelspot-app | grep -A 10 Health
```

### Resource Monitoring

```bash
# Real-time stats
docker stats pixelspot-app

# View resource limits
docker inspect pixelspot-app | grep -A 10 Resources
```

### Log Management

```bash
# View logs
docker-compose logs -f

# Logs are also written to ./logs directory
tail -f logs/pixelspot.log

# Docker log rotation is configured:
# - max-size: 10MB
# - max-file: 3
```

---

## Backup & Restore

### Database Backup

```bash
# Backup database
pg_dump $DATABASE_URL > backup-$(date +%Y%m%d).sql

# Or using docker
docker exec pixelspot-postgres pg_dump -U pixelspot pixelspot_db > backup.sql
```

### Application Logs Backup

```bash
# Backup logs directory
tar -czf logs-backup-$(date +%Y%m%d).tar.gz ./logs
```

### Restore Database

```bash
psql $DATABASE_URL < backup.sql
```

---

## Scaling (Future)

Current setup: **Single instance**

For multi-instance scaling:

### Option 1: Docker Compose Scale

```bash
# Scale to 3 instances (requires session store like Redis)
docker-compose up -d --scale pixelspot=3
```

**Requirements:**
- Shared session store (Redis/Memcached)
- Load balancer (Nginx)
- Sticky sessions or session sharing

### Option 2: Kubernetes

Migrate to K8s for:
- Auto-scaling
- Self-healing
- Zero-downtime deployments
- Advanced orchestration

### Option 3: Managed Services

- AWS ECS/Fargate
- Google Cloud Run
- Azure Container Instances
- DigitalOcean App Platform

---

## Troubleshooting

### Container won't start

```bash
# Check logs
docker-compose logs pixelspot

# Common issues:
# 1. Missing .env file
# 2. Invalid DATABASE_URL
# 3. Port 5000 already in use
# 4. Insufficient memory

# Fix port conflict
sudo lsof -i :5000
# Kill process or change PORT in .env
```

### Database connection errors

```bash
# Test database connectivity
docker-compose exec pixelspot node -e "
  require('pg').Pool({ connectionString: process.env.DATABASE_URL })
    .query('SELECT 1')
    .then(() => console.log('✅ Connected'))
    .catch(err => console.log('❌ Error:', err.message));
"

# Common issues:
# 1. Wrong DATABASE_URL format
# 2. Database not accessible (firewall)
# 3. Invalid credentials
```

### Application errors

```bash
# View detailed error logs
docker-compose logs pixelspot | grep -i error

# Check environment variables
docker-compose exec pixelspot env

# Restart with fresh build
docker-compose down
docker-compose build --no-cache
docker-compose up -d
```

### High memory usage

```bash
# Check resource usage
docker stats

# Increase memory limit in docker-compose.yml
# memory: 2G  # Default is 1G
```

### Port already in use

```bash
# Find what's using port 5000
sudo lsof -i :5000

# Option 1: Kill the process
sudo kill -9 <PID>

# Option 2: Change port in .env
# PORT=5001
```

---

## Security Best Practices

- [ ] Use strong `SESSION_SECRET` (32+ characters)
- [ ] Never commit `.env` file to Git
- [ ] Use production API keys (not test keys)
- [ ] Enable HTTPS/SSL in production
- [ ] Restrict database access (not publicly accessible)
- [ ] Run container as non-root user (already configured)
- [ ] Keep Docker and images updated
- [ ] Use Docker secrets for sensitive data (advanced)
- [ ] Implement rate limiting (already configured in app)
- [ ] Enable firewall rules (UFW/iptables)

---

## Performance Tips

1. **Use Docker BuildKit for faster builds:**
   ```bash
   DOCKER_BUILDKIT=1 docker-compose build
   ```

2. **Prune unused Docker resources:**
   ```bash
   docker system prune -a
   ```

3. **Monitor resource usage:**
   ```bash
   docker stats
   ```

4. **Optimize database queries** (use indexes)

5. **Enable Nginx caching** for static assets

6. **Use CDN** for media files (images, videos)

---

## Additional Resources

- **Dockerfile**: Multi-stage production build configuration
- **docker-compose.yml**: Orchestration configuration
- **.env.example**: Complete environment variables template
- **DEPLOYMENT.md**: Comprehensive deployment guide
- **Docker Documentation**: https://docs.docker.com/

---

## Support

For Docker-specific issues:

1. Check logs: `docker-compose logs -f`
2. Verify `.env` configuration
3. Test database connectivity
4. Check network/firewall settings
5. Review Docker logs for errors

---

**Last Updated**: November 2025  
**Docker Version**: 20.10+  
**Docker Compose Version**: V2  
**Application Version**: 1.0.0
