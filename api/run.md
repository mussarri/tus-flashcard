Development ortamını başlatma

PostgreSQL ve Redis servislerini başlat:
```bash
./dev-start.sh
```

API ve BullMQ işlemcilerini aynı süreçte başlat:
```bash
cd api
npm run start:dev
```

Admin panelini ayrı bir terminalde başlat:
```bash
cd admin
npm run dev
```

Docker servislerini durdur:
```bash
docker-compose down
```
