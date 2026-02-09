# Setup Instructions

## Initial Setup

### 1. Install Dependencies

```bash
# Backend
cd api
npm install
npm run prisma:generate

# Admin Panel
cd ../admin
npm install
```

### 2. Configure Environment

```bash
# Copy environment template
cp api/.env.example api/.env

# Edit api/.env with your settings:
# - DATABASE_URL (default: postgresql://tus:tus_password@localhost:5432/tus_db)
# - REDIS_URL (default: redis://localhost:6379)
# - OCR_API_URL and OCR_API_KEY (for OCR service integration)
# - AI_API_URL and AI_API_KEY (for AI service integration)
```

### 3. Start Database & Redis

```bash
# Start PostgreSQL and Redis
docker-compose up -d postgres redis

# Wait for services to be healthy (about 10 seconds)
```

### 4. Run Database Migrations

```bash
cd api
npm run prisma:migrate

# This will create the database schema
```

### 5. Start Services

**Option A: Docker Compose (Recommended for Development)**

```bash
# Start all services
docker-compose up

# Or start in background
docker-compose up -d
```

**Option B: Manual Start**

```bash
# Terminal 1: Start API
cd api
npm run start:dev

# Terminal 2: Start Worker
cd api
npm run start:worker

# Terminal 3: Start Admin Panel
cd admin
npm run dev
```

## Access Points

- **API**: http://localhost:3000
- **Admin Panel**: http://localhost:3001
- **Prisma Studio**: Run `npm run prisma:studio` in `api/` directory

## Testing the Pipeline

### 1. Create a Batch

1. Go to http://localhost:3001/upload
2. Enter a topic (e.g., "Cardiology - Arrhythmias")
3. Click "Create Batch"

### 2. Upload Files

1. Drag and drop or select image/PDF files
2. Click "Upload X File(s)"
3. Files will be queued for OCR processing

### 3. Review and Approve

1. Go to http://localhost:3001/batches
2. Click on your batch
3. Review parsed blocks
4. Approve, edit, reject, or delete blocks

## API Endpoints

### Upload
- `POST /api/upload/batch` - Create batch
- `POST /api/upload/batch/:id/files` - Upload files
- `GET /api/upload/batch/:id` - Get batch details
- `GET /api/upload/batches` - List all batches

### Parsing
- `POST /api/parsing/batch/:id/classify` - Classify all blocks

### Approval
- `POST /api/approval/block/:id/approve` - Approve block
- `POST /api/approval/block/:id/reject` - Reject block
- `POST /api/approval/block/:id/delete` - Delete block
- `GET /api/approval/batch/:id/review` - Get batch for review

## Development Notes

### OCR Service Integration

The OCR service (`src/ocr/ocr.service.ts`) currently has placeholder logic. To integrate with a real OCR service:

1. Update `OCR_API_URL` and `OCR_API_KEY` in `.env`
2. Implement the actual API call in `OcrService.processPage()`
3. Ensure the response format matches `OCRResult` interface

### Worker Process

The worker (`src/worker.ts`) processes OCR jobs from the BullMQ queue. Make sure Redis is running for the worker to function.

### File Storage

Uploaded files are stored in `api/uploads/` directory. This directory is gitignored but should be persisted in production.

## Troubleshooting

### Database Connection Issues

```bash
# Check if PostgreSQL is running
docker-compose ps

# Check logs
docker-compose logs postgres

# Reset database (WARNING: deletes all data)
cd api
npm run prisma:migrate reset
```

### Redis Connection Issues

```bash
# Check if Redis is running
docker-compose ps

# Test Redis connection
docker-compose exec redis redis-cli ping
```

### Worker Not Processing Jobs

1. Ensure Redis is running
2. Check worker logs: `docker-compose logs worker`
3. Verify queue configuration in `src/queue/queue.module.ts`

## Next Steps

After the ingestion pipeline is working:

1. Implement knowledge extraction from approved blocks
2. Add flashcard generation
3. Add question generation
4. Implement user analytics
5. Build mobile app integration
