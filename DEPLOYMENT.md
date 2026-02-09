# TUS Docker Deployment Guide

Production deployment guide for the TUS Medical Exam Preparation Platform.

## 📋 Prerequisites

- Docker Engine 20.10+
- Docker Compose 2.0+
- 4GB+ RAM
- 20GB+ disk space
- Domain name (for SSL/HTTPS)

## 🚀 Quick Start

### 1. Clone and Configure

```bash
# Clone repository
git clone <your-repo-url>
cd tus

# Create environment file
cp .env.production .env

# Edit .env with your values
nano .env
```

### 2. Configure Environment Variables

**Required variables in `.env`:**

```bash
# Database
POSTGRES_PASSWORD=your_secure_password

# Redis
REDIS_PASSWORD=your_redis_password

# API
JWT_SECRET=your_jwt_secret  # Generate: openssl rand -base64 32

# AI Services
OPENAI_API_KEY=your_openai_key
GEMINI_API_KEY=your_gemini_key

# Domain
NEXT_PUBLIC_API_URL=https://yourdomain.com/api
CORS_ORIGIN=https://yourdomain.com
```

### 3. Build and Start Services

```bash
# Build all images
docker-compose build

# Start services
docker-compose up -d

# Check status
docker-compose ps

# View logs
docker-compose logs -f
```

### 4. Initialize Database

```bash
# Run Prisma migrations
docker-compose exec api npx prisma migrate deploy

# (Optional) Seed database
docker-compose exec api npx prisma db seed
```

## 🌐 Service Endpoints

- **API**: http://localhost:5000
- **Admin Panel**: http://localhost:3001
- **Nginx (HTTP)**: http://localhost:80
- **PostgreSQL**: localhost:5432
- **Redis**: localhost:6379

## 🔒 SSL/HTTPS Setup (Production)

### Using Let's Encrypt (Certbot)

```bash
# Install certbot
sudo apt-get install certbot

# Stop nginx temporarily
docker-compose stop nginx

# Generate certificate
sudo certbot certonly --standalone -d yourdomain.com -d www.yourdomain.com

# Copy certificates
sudo cp /etc/letsencrypt/live/yourdomain.com/fullchain.pem nginx/ssl/
sudo cp /etc/letsencrypt/live/yourdomain.com/privkey.pem nginx/ssl/

# Update nginx.conf (uncomment HTTPS server block)
nano nginx/nginx.conf

# Restart nginx
docker-compose up -d nginx
```

### Auto-renewal

```bash
# Add to crontab
0 0 1 * * certbot renew --quiet && docker-compose restart nginx
```

## 📊 Monitoring & Logs

### View Logs

```bash
# All services
docker-compose logs -f

# Specific service
docker-compose logs -f api
docker-compose logs -f worker
docker-compose logs -f admin

# Last 100 lines
docker-compose logs --tail=100 api
```

### Health Checks

```bash
# Check service health
docker-compose ps

# API health endpoint
curl http://localhost:5000/health

# Check resource usage
docker stats
```

## 🔧 Maintenance

### Update Application

```bash
# Pull latest changes
git pull

# Rebuild and restart
docker-compose build
docker-compose up -d

# Run migrations
docker-compose exec api npx prisma migrate deploy
```

### Backup Database

```bash
# Create backup
docker-compose exec postgres pg_dump -U tus tus_db > backup_$(date +%Y%m%d).sql

# Restore backup
cat backup_20260209.sql | docker-compose exec -T postgres psql -U tus tus_db
```

### Backup Uploads

```bash
# Backup uploads directory
tar -czf uploads_backup_$(date +%Y%m%d).tar.gz api/uploads/
```

### Scale Workers

```bash
# Scale worker service
docker-compose up -d --scale worker=3
```

## 🐛 Troubleshooting

### Service Won't Start

```bash
# Check logs
docker-compose logs service_name

# Restart service
docker-compose restart service_name

# Rebuild from scratch
docker-compose down
docker-compose build --no-cache
docker-compose up -d
```

### Database Connection Issues

```bash
# Check postgres is healthy
docker-compose ps postgres

# Test connection
docker-compose exec postgres psql -U tus -d tus_db -c "SELECT 1;"

# Reset database (WARNING: destroys data)
docker-compose down -v
docker-compose up -d
```

### Out of Memory

```bash
# Check resource usage
docker stats

# Adjust limits in docker-compose.yml
# Restart services
docker-compose up -d
```

### Port Already in Use

```bash
# Find process using port
lsof -i :5000

# Change port in docker-compose.yml or .env
# Restart services
docker-compose up -d
```

## 🔐 Security Checklist

- [ ] Change all default passwords
- [ ] Generate strong JWT_SECRET
- [ ] Configure CORS_ORIGIN (no wildcards in production)
- [ ] Enable HTTPS with valid SSL certificate
- [ ] Set up firewall rules
- [ ] Enable Redis password authentication
- [ ] Regular security updates
- [ ] Backup strategy in place
- [ ] Monitor logs for suspicious activity

## 📈 Performance Optimization

### Production Settings

1. **Enable Redis persistence**
   - Already configured in docker-compose.yml

2. **Optimize PostgreSQL**
   ```bash
   # Add to postgres environment in docker-compose.yml
   POSTGRES_SHARED_BUFFERS=256MB
   POSTGRES_EFFECTIVE_CACHE_SIZE=1GB
   ```

3. **Enable nginx caching**
   - Already configured in nginx.conf

4. **Monitor resource usage**
   ```bash
   docker stats --no-stream
   ```

## 🆘 Support

For issues and questions:
- Check logs: `docker-compose logs -f`
- Review this guide
- Check Docker documentation
- Review application logs in containers

## 📝 Environment Variables Reference

| Variable | Description | Default | Required |
|----------|-------------|---------|----------|
| `POSTGRES_USER` | Database user | tus | No |
| `POSTGRES_PASSWORD` | Database password | - | Yes |
| `POSTGRES_DB` | Database name | tus_db | No |
| `REDIS_PASSWORD` | Redis password | - | Yes |
| `JWT_SECRET` | JWT signing secret | - | Yes |
| `OPENAI_API_KEY` | OpenAI API key | - | Yes |
| `GEMINI_API_KEY` | Google Gemini API key | - | Yes |
| `CORS_ORIGIN` | Allowed CORS origins | * | Yes |
| `NEXT_PUBLIC_API_URL` | API URL for admin panel | - | Yes |

## 🔄 Update Strategy

1. **Pull latest changes**
2. **Review changelog**
3. **Backup database and uploads**
4. **Build new images**
5. **Run migrations**
6. **Test in staging (if available)**
7. **Deploy to production**
8. **Monitor logs**
9. **Rollback if issues**
