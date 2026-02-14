# Environment Variables Setup

Bu proje hem **admin panel (Next.js)** hem de **backend API (NestJS)** için environment variable'lar kullanıyor.

## 🔧 Development (Localhost)

### 1. Admin Panel (Next.js)

```bash
cd admin
cp .env.example .env.local
```

`.env.local` içeriği:
```env
API_URL=http://localhost:3001
NEXT_PUBLIC_API_URL=http://localhost:3001
BACKEND_URL=http://localhost:3001
```

### 2. Backend API (NestJS)

```bash
cd api
cp .env.example .env
```

`.env` içeriği:
```env
DATABASE_URL="postgresql://user:password@localhost:5432/tus?schema=public"
PORT=3001
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
NEXT_PUBLIC_API_URL=https://api.yourdomain.com
BACKEND_URL=https://api.yourdomain.com
```

⚠️ **Önemli**: 
- `NEXT_PUBLIC_` prefix'li variable'lar client-side'da kullanılabilir
- `API_URL` (prefix olmadan) sadece server-side'da kullanılabilir

### 2. Backend API

Production environment variables:

```env
DATABASE_URL="your-production-database-url"
PORT=3001
NODE_ENV=production
ADMIN_URL=https://admin.yourdomain.com
VISUAL_ASSETS_DIR=/app/uploads
OPENAI_API_KEY=your-production-openai-key
GEMINI_API_KEY=your-production-gemini-key
```

## 📝 Notlar

### API URL Yapılandırması

- **Development**: İstekler `localhost:3000` → Next.js Proxy → `localhost:3001` Backend
- **Production**: İstekler production domain → Next.js Proxy → Production Backend URL

### CORS Ayarları

Backend'de CORS, `ADMIN_URL` environment variable'ını kullanarak admin panel'den gelen isteklere izin verir.

### Deployment Checklist

- [ ] Admin panel environment variables ayarlandı
- [ ] Backend environment variables ayarlandı
- [ ] Database bağlantısı test edildi
- [ ] CORS yapılandırması doğrulandı
- [ ] API URL'leri production'a göre güncellendi

## 🐛 Sorun Giderme

### "Failed to fetch" hatası alıyorum

1. Backend'in çalıştığından emin olun:
   ```bash
   cd api && npm run start:dev
   ```

2. Environment variable'ları kontrol edin:
   ```bash
   # Admin panelde
   echo $NEXT_PUBLIC_API_URL
   
   # Backend'de
   echo $ADMIN_URL
   ```

3. Browser console'da network tab'ını açın ve hangi URL'e istek gittiğini kontrol edin

### "CORS error" alıyorum

Backend `.env` dosyasında `ADMIN_URL` doğru ayarlanmış mı kontrol edin:
```env
ADMIN_URL=http://localhost:3000  # Development için
```

### Production'da hala localhost kullanıyor

1. Environment variable'ların production ortamında doğru set edildiğinden emin olun
2. Next.js'i yeniden build edin: `npm run build`
3. Vercel/Netlify gibi platformlarda environment variable'ları dashboard'tan ayarlayın
