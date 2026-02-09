# PaddleOCR Servisi Kurulumu

PaddleOCR FastAPI servisi Docker container içinde çalışır ve NestJS backend ile entegre edilmiştir.

## Kurulum

### 1. Docker Compose ile Otomatik Başlatma

```bash
# Tüm servisleri başlat (OCR dahil)
docker-compose up -d

# Sadece OCR servisini başlat
docker-compose up -d ocr
```

### 2. Manuel Build ve Çalıştırma

```bash
cd ocr-service

# Build
docker build -t tus-ocr .

# Run
docker run -p 8000:8000 tus-ocr
```

## Servis Yapılandırması

### Environment Variables

`docker-compose.yml` içinde OCR servisi otomatik olarak yapılandırılır:

- **Port**: 8000
- **Health Check**: `/health` endpoint'i üzerinden kontrol edilir
- **Start Period**: İlk başlatmada modellerin indirilmesi için 120 saniye beklenir

### NestJS Entegrasyonu

NestJS backend'de OCR servisi şu şekilde yapılandırılır:

```env
OCR_API_URL=http://ocr:8000  # Docker içinde
# veya
OCR_API_URL=http://localhost:8000  # Local development
```

## API Kullanımı

### Health Check

```bash
curl http://localhost:8000/health
```

### OCR İşleme

```bash
curl -X POST http://localhost:8000/api/v1/ocr \
  -F "file=@image.jpg"
```

Response:
```json
{
  "text": "Extracted text...",
  "confidence": 0.95,
  "blocks": [
    {
      "text": "Text block",
      "boundingBox": {
        "x": 0.1,
        "y": 0.1,
        "width": 0.8,
        "height": 0.2
      },
      "confidence": 0.95
    }
  ]
}
```

## Özellikler

- ✅ Metin tanıma (OCR)
- ✅ Bounding box koordinatları (normalize 0-1)
- ✅ Güven skorları
- ⏳ Tablo algılama (placeholder)
- ⏳ Algoritma/flowchart algılama (placeholder)

## Notlar

1. **İlk Başlatma**: PaddleOCR modelleri ilk çalıştırmada indirilir (~500MB), bu yüzden ilk başlatma biraz zaman alabilir.

2. **Dil Desteği**: Şu anda İngilizce (`lang='en'`) destekleniyor. Diğer diller için `main.py` içinde `lang` parametresini değiştirebilirsiniz.

3. **GPU Desteği**: GPU kullanmak için Dockerfile'ı değiştirmeniz ve GPU runtime'ı eklemeniz gerekir.

4. **Performans**: CPU modunda çalışır. Büyük dosyalar için işlem süresi artabilir.

## Sorun Giderme

### OCR Servisi Başlamıyor

```bash
# Logları kontrol et
docker-compose logs ocr

# Servisi yeniden başlat
docker-compose restart ocr
```

### Modeller İndirilemiyor

PaddleOCR modelleri otomatik olarak `~/.paddleocr/` dizinine indirilir. İnternet bağlantınızı kontrol edin.

### NestJS OCR Servisine Bağlanamıyor

```bash
# OCR servisinin çalıştığını kontrol et
curl http://localhost:8000/health

# NestJS'te OCR_API_URL'in doğru olduğundan emin ol
# Docker içinde: http://ocr:8000
# Local: http://localhost:8000
```

## Geliştirme

OCR servisini geliştirmek için:

```bash
cd ocr-service

# Dependencies yükle
pip install -r requirements.txt

# Servisi çalıştır
uvicorn main:app --reload --host 0.0.0.0 --port 8000
```
