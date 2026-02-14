# Environment Variables Setup

Bu proje hem **admin panel (Next.js)** hem de **backend API (NestJS)** için environment variable'lar kullanıyor.

## � Docker Setup (Önerilen)

### 1. Admin Panel (Next.js)

```bash
cd admin
cp .env.example .env.local
```

`.env.local` içeriği:
```env
API_URL=http://api:5000
```

### 2. Backend API (NestJS)

```bash
cd api
cp .env.example .env
```

`.env` içeriği:
```env
DATABASE_URL="postgresql://user:password@db:5432/tus?schema=public"
PORT=5000
NODE_ENV=development
ADMIN_URL=http://admin:3000
VISUAL_ASSETS_DIR=./uploads
OPENAI_API_KEY=your-openai-key
GEMINI_API_KEY=your-gemini-key
```

## 💻 Local Development (Docker olmadan)

### 1. Admin Panel

```bash
cd admin
cp .env.example .env.local
```

`.env.local` içeriği:
```env
API_URL=http://localhost:5000
```

### 2. Backend API

```bash
cd api
cp .env.example .env
```

`.env` içeriği:
```env
DATABASE_URL="postgresql://user:password@localhost:5432/tus?schema=public"
PORT=5000
NODE_ENV=development
ADMIN_URL=http://localhost:3000
VISUAL_ASSETS_DIR=./uploads
OPENAI_API_KEY=your-openai-key
GEMINI_API_KEY=your-gemini-key
```

## 🚀 Production

### 1. Admin Panel

Production environment variables (Vercel, Netlify, vb.):

```env
API_URL=https://api.yourdomain.com
```

### 2. Backend API

Production environment variables:

```env
DATABASE_URL="your-production-database-url"
PORT=5000
NODE_ENV=production
ADMIN_URL=https://admin.yourdomain.com
VISUAL_ASSETS_DIR=/app/uploads
OPENAI_API_KEY=your-production-openai-key
GEMINI_API_KEY=your-production-gemini-key
```

## 📝 Notlar

### API URL Yapılandırması

- **Docker**: `http://api:5000` (servis adı)
- **Local**: `http://localhost:5000`
- **Production**: `https://api.yourdomain.com`

### CORS Ayarları

Backend'de CORS, `ADMIN_URL` environment variable'ını kullanarak admin panel'den gelen isteklere izin verir.

- **Docker**: `http://admin:3000` (servis adı)
- **Local**: `http://localhost:3000`
- **Production**: `https://admin.yourdomain.com`

### Deployment Checklist

- [ ] Admin panel environment variables ayarlandı (`API_URL`)
- [ ] Backend environment variables ayarlandı (`ADMIN_URL`, `DATABASE_URL`, API keys)
- [ ] Database bağlantısı test edildi
- [ ] CORS yapılandırması doğrulandı
- [ ] Port 5000 kullanılıyor

## 🐛 Sorun Giderme

### "Failed to fetch" hatası alıyorum

1. Backend'in çalıştığından emin olun:
   ```bash
   cd api && npm run start:dev
   ```

2. Environment variable'ları kontrol edin:
   ```bash
   # Admin panelde (terminal)
   echo $API_URL
   
   # Backend'de
   echo $ADMIN_URL
   ```

3. Browser console'da network tab'ını açın ve hangi URL'e istek gittiğini kontrol edin

### "CORS error" alıyorum

Backend `.env` dosyasında `ADMIN_URL` doğru ayarlanmış mı kontrol edin:
- **Docker**: `ADMIN_URL=http://admin:3000`
- **Local**: `ADMIN_URL=http://localhost:3000`

### Docker'da servisler birbirini göremiyor

Docker Compose kullanıyorsanız, servis adlarının (api, admin, db) doğru olduğundan emin olun:
```yaml
services:
  api:
    # Backend port 5000
  admin:
    # Frontend port 3000
  db:
    # PostgreSQL port 5432
```
