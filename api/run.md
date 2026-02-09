Development ortamı başlatma
Docker servislerini başlat (postgres, redis, ocr):
./dev-start.sh
./dev-start.sh
Veya manuel olarak:
docker-compose up -d postgres redis ocr

Sonra manuel olarak başlat:
Terminal 1 - API:
cd apinpm run start:dev
Terminal 2 - Worker:
cd apinpm run start:worker
Terminal 3 - Admin Panel:
cd adminnpm run dev
Docker servislerini durdur:
docker-compose down
