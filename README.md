# TUS Medical Education Platform

AI-assisted content processing and adaptive learning system for TUS exam preparation.

## Architecture

- **Backend**: NestJS with Prisma ORM, PostgreSQL, Redis + BullMQ
- **OCR Service**: PaddleOCR FastAPI service (Docker)
- **Admin Panel**: Next.js (App Router) with Tailwind CSS
- **Infrastructure**: Docker Compose

## Prerequisites

- Docker & Docker Compose
- Node.js 20+
- npm or yarn

## Quick Start

### 1. Environment Setup

```bash
# Copy environment file
cp api/.env.example api/.env

# Edit api/.env with your configuration
# - DATABASE_URL
# - REDIS_URL
# - OCR_API_URL (default: http://ocr:8000 in Docker, http://localhost:8000 locally)
# - AI_API_URL and AI_API_KEY (for AI service)
```

### 2. Start Services

```bash
# Start all services (postgres, redis, ocr, api, worker, admin)
docker-compose up -d

# Or start individually
docker-compose up postgres redis ocr
docker-compose up api
docker-compose up worker
docker-compose up admin
```

### 3. Database Setup

```bash
# Generate Prisma Client
cd api
npm install
npm run prisma:generate

# Run migrations
npm run prisma:migrate

# (Optional) Open Prisma Studio
npm run prisma:studio
```

### 4. Access Services

- **API**: http://localhost:3000
- **OCR Service**: http://localhost:8000
- **Admin Panel**: http://localhost:3001
- **Prisma Studio**: Run `npm run prisma:studio` in api directory

## Development

### Backend (NestJS)

```bash
cd api

# Install dependencies
npm install

# Development mode
npm run start:dev

# Run worker
npm run start:worker

# Run tests
npm test
```

### Admin Panel (Next.js)

```bash
cd admin

# Install dependencies
npm install

# Development mode
npm run dev
```

## Project Structure

```
tus/
├── api/                    # NestJS backend
│   ├── prisma/
│   │   └── schema.prisma   # Database schema
│   ├── src/
│   │   ├── upload/         # File upload module
│   │   ├── ocr/           # OCR processing
│   │   ├── parsing/       # Block classification
│   │   ├── approval/      # Admin approval workflow
│   │   ├── queue/         # BullMQ configuration
│   │   └── prisma/        # Prisma service
│   └── uploads/           # Uploaded files storage
├── admin/                 # Next.js admin panel
└── docker-compose.yml     # Docker services
```

## Content Ingestion Pipeline

1. **Upload**: Admin uploads multiple files (images/PDFs) as a batch
2. **OCR Processing**: Each page is queued for OCR extraction
3. **Block Parsing**: OCR output is split into blocks (TEXT, TABLE, ALGORITHM)
4. **Classification**: Blocks are automatically classified
5. **Admin Review**: Admin reviews, edits, and approves blocks
6. **Knowledge Extraction**: Approved blocks move to knowledge extraction (future)

## API Endpoints

### Upload

- `POST /api/upload/batch` - Create new upload batch
- `POST /api/upload/batch/:batchId/files` - Upload files to batch
- `GET /api/upload/batch/:batchId` - Get batch details
- `GET /api/upload/batches` - List all batches

### Parsing

- `POST /api/parsing/block/:blockId/classify` - Classify single block
- `POST /api/parsing/page/:pageId/classify` - Classify all blocks in page
- `POST /api/parsing/batch/:batchId/classify` - Classify all blocks in batch

### Approval

- `POST /api/approval/block/:blockId/approve` - Approve block (with optional edit)
- `POST /api/approval/block/:blockId/reject` - Reject block
- `POST /api/approval/block/:blockId/delete` - Delete block
- `GET /api/approval/batch/:batchId/review` - Get batch for review
- `GET /api/approval/batch/:batchId/approved` - Get approved blocks

## Database Schema

Key entities:

- **UploadBatch**: Represents one topic worth of pages
- **UploadPage**: Individual page in a batch
- **ParsedBlock**: OCR output block (TEXT/TABLE/ALGORITHM)
- **ApprovedContent**: Admin-approved blocks ready for knowledge extraction
- **KnowledgePoint**: Atomic medical facts extracted from approved content
- **ExamQuestion**: Past exam questions for analysis
- **Flashcard**: Generated flashcards from knowledge points
- **GeneratedQuestion**: AI-generated exam questions

## Security & Traceability

Every generated content maintains full traceability:

- Flashcard → KnowledgePoint → ApprovedContent → ParsedBlock → UploadPage → UploadBatch

All content must be admin-approved before use.

## Next Steps (Future Implementation)

- Knowledge extraction from approved blocks
- Flashcard generation
- Question generation
- User analytics and SRS
- Mobile app integration

## License

Private - TUS Medical Education Platform
