/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable @typescript-eslint/no-unsafe-argument */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-unsafe-call */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
import { PrismaClient } from '@prisma/client';
import { allConcepts } from './seeds';
import { seedAdminUser } from './seeds/admin';
import { normalizeConceptKey } from '../src/common/normalize/normalize-concept-key';

const prisma = new PrismaClient();

async function seed() {
  console.log('🌱 Seeding TUS Anatomy (modular)...');

  await seedAdminUser(prisma);
  interface SeedLesson {
    name: string;
    displayName: string;
    topics: {
      name: string;
      displayName: string;
    }[];
  }

  const curriculumData: SeedLesson[] = [
    {
      name: 'Histoloji',
      displayName: 'Histoloji ve Embriyoloji',
      topics: [
        { name: 'Hücre', displayName: 'Hücre' },
        { name: 'Doku', displayName: 'Doku' },
        { name: 'Kas', displayName: 'Kas' },
        {
          name: 'Genital Sistem ve Genel Embriyoloji',
          displayName: 'Genital Sistem ve Genel Embriyoloji',
        },
        { name: 'Hemopoetik Sistem', displayName: 'Hemopoetik Sistem' },
        {
          name: 'Gastrointestinal Sistem',
          displayName: 'Gastrointestinal Sistem',
        },
        {
          name: 'Kardiyovasküler Sistem',
          displayName: 'Kardiyovasküler Sistem',
        },
        { name: 'Endokrin Sistem', displayName: 'Endokrin Sistem' },
        { name: 'Solunum Sistemi', displayName: 'Solunum Sistemi' },
        { name: 'Sinir Sistemi', displayName: 'Sinir Sistemi' },
        { name: 'Üriner Sistem', displayName: 'Üriner Sistem' },
      ],
    },
    {
      name: 'Biyokimya',
      displayName: 'Tıbbi Biyokimya',
      topics: [
        { name: 'Hücre ve Organeller', displayName: 'Hücre ve Organeller' },
        { name: 'Metabolizma', displayName: 'Metabolizma' },
        { name: 'Karbonhidratlar', displayName: 'Karbonhidratlar' },
        { name: 'Lipitler', displayName: 'Lipitler' },
        {
          name: 'Aminoasitler ve Proteinler',
          displayName: 'Aminoasitler ve Proteinler',
        },
        { name: 'Nükleik Asitler', displayName: 'Nükleik Asitler' },
        { name: 'Genom ve Genetik', displayName: 'Genom ve Genetik' },
        {
          name: 'Vitaminler ve Mineraller',
          displayName: 'Vitaminler ve Mineraller',
        },
        { name: 'Hormonlar', displayName: 'Hormonlar' },
      ],
    },
    {
      name: 'Anatomi',
      displayName: 'Anatomi',
      topics: [
        { name: 'Kemikler', displayName: 'Kemikler' },
        { name: 'Eklemler', displayName: 'Eklemler' },
        { name: 'Kaslar', displayName: 'Kaslar' },
        { name: 'Solunum Sistemi', displayName: 'Solunum Sistemi' },
        { name: 'Dolaşım Sistemi', displayName: 'Dolaşım Sistemi' },
        {
          name: 'Gastrointestinal Sistem',
          displayName: 'Gastrointestinal Sistem',
        },
        { name: 'Ürogenital Sistem', displayName: 'Ürogenital Sistem' },
        { name: 'Nöroanatomi', displayName: 'Nöroanatomi' },
      ],
    },
    {
      name: 'Patoloji',
      displayName: 'Tıbbi Patoloji',
      topics: [
        { name: 'Hücre', displayName: 'Hücre' },
        { name: 'İnflamasyon', displayName: 'İnflamasyon' },
        { name: 'İmmun Sistem', displayName: 'İmmun Sistem' },
        {
          name: 'Onarım ve Yara İyileşmesi',
          displayName: 'Onarım ve Yara İyileşmesi',
        },
        {
          name: 'Hemodinamik Hastalıklar',
          displayName: 'Hemodinamik Hastalıklar',
        },
        { name: 'Neoplazi', displayName: 'Neoplazi' },
        { name: 'Solunum Sistemi', displayName: 'Solunum Sistemi' },
        {
          name: 'Kardiyovasküler Sistem',
          displayName: 'Kardiyovasküler Sistem',
        },
        { name: 'Hemopoetik Sistem', displayName: 'Hemopoetik Sistem' },
        {
          name: 'Gastrointestinal Sistem',
          displayName: 'Gastrointestinal Sistem',
        },
        { name: 'Hepatobilier Sistem', displayName: 'Hepatobilier Sistem' },
        { name: 'Üriner Sistem', displayName: 'Üriner Sistem' },
        { name: 'Endokrin Sistem', displayName: 'Endokrin Sistem' },
        { name: 'Kadın Genital Sistemi', displayName: 'Kadın Genital Sistemi' },
        { name: 'Erkek Genital Sistemi', displayName: 'Erkek Genital Sistemi' },
        { name: 'Meme Hastalıkları', displayName: 'Meme Hastalıkları' },
        { name: 'Sinir Sistemi', displayName: 'Sinir Sistemi' },
        { name: 'Kas İskelet Sistemi', displayName: 'Kas İskelet Sistemi' },
        { name: 'Deri Hastalıkları', displayName: 'Deri Hastalıkları' },
      ],
    },
    {
      name: 'Mikrobiyoloji',
      displayName: 'Tıbbi Mikrobiyoloji',
      topics: [
        { name: 'Temel Mikrobiyoloji', displayName: 'Temel Mikrobiyoloji' },
        { name: 'Bakteriyoloji', displayName: 'Bakteriyoloji' },
        { name: 'Parazitoloji', displayName: 'Parazitoloji' },
        { name: 'Mikoloji', displayName: 'Mikoloji' },
        { name: 'Viroloji', displayName: 'Viroloji' },
        { name: 'İmmunoloji', displayName: 'İmmunoloji' },
      ],
    },
    {
      name: 'Farmakoloji',
      displayName: 'Tıbbi Farmakoloji',
      topics: [
        { name: 'Genel Farmakoloji', displayName: 'Genel Farmakoloji' },
        { name: 'Otonom Sinir Sistemi', displayName: 'Otonom Sinir Sistemi' },
        { name: 'Santral Sinir Sistemi', displayName: 'Santral Sinir Sistemi' },
        {
          name: 'Kardiyovasküler Sistem',
          displayName: 'Kardiyovasküler Sistem',
        },
        { name: 'Solunum Sistemi', displayName: 'Solunum Sistemi' },
        {
          name: 'Gastrointestinal Sistem',
          displayName: 'Gastrointestinal Sistem',
        },
        { name: 'Endokrin Sistem', displayName: 'Endokrin Sistem' },
        { name: 'Otakoidler', displayName: 'Otakoidler' },
        { name: 'NSAİİ', displayName: 'NSAİİ' },
        { name: 'Kemoterapotikler', displayName: 'Kemoterapotikler' },
        { name: 'Toksikoloji', displayName: 'Toksikoloji' },
      ],
    },
    {
      name: 'Dahiliye',
      displayName: 'İç Hastalıkları (Dahiliye)',
      topics: [
        { name: 'Hematoloji', displayName: 'Hematoloji' },
        { name: 'Onkoloji', displayName: 'Onkoloji' },
        { name: 'Nefroloji', displayName: 'Nefroloji' },
        { name: 'Kardiyoloji', displayName: 'Kardiyoloji' },
        { name: 'Göğüs Hastalıkları', displayName: 'Göğüs Hastalıkları' },
        { name: 'Gastroenteroloji', displayName: 'Gastroenteroloji' },
        { name: 'Hepatoloji', displayName: 'Hepatoloji' },
        { name: 'Endokrin', displayName: 'Endokrinoloji' },
        { name: 'Romatoloji', displayName: 'Romatoloji' },
        {
          name: 'Enfeksiyon Hastalıkları',
          displayName: 'Enfeksiyon Hastalıkları',
        },
        { name: 'Allerji-İmmunoloji', displayName: 'Allerji ve İmmunoloji' },
        { name: 'Geriatri', displayName: 'Geriatri' },
      ],
    },
    {
      name: 'Pediatri',
      displayName: 'Çocuk Sağlığı ve Hastalıkları (Pediatri)',
      topics: [
        { name: 'Yenidoğan', displayName: 'Yenidoğan' },
        { name: 'Genetik', displayName: 'Genetik' },
        { name: 'Büyüme ve Gelişme', displayName: 'Büyüme ve Gelişme' },
        { name: 'Beslenme', displayName: 'Beslenme' },
        {
          name: 'Gastroenteroloji ve Hepatoloji',
          displayName: 'Gastroenteroloji ve Hepatoloji',
        },
        { name: 'Nöroloji', displayName: 'Nöroloji' },
        { name: 'Kardiyoloji', displayName: 'Kardiyoloji' },
        { name: 'Göğüs Hastalıkları', displayName: 'Göğüs Hastalıkları' },
        { name: 'Döküntülü Hastalıklar', displayName: 'Döküntülü Hastalıklar' },
        { name: 'Bağışıklama', displayName: 'Bağışıklama' },
        { name: 'Allerji', displayName: 'Allerji' },
        { name: 'İmmunoloji', displayName: 'İmmunoloji' },
        {
          name: 'Enfeksiyon Hastalıkları',
          displayName: 'Enfeksiyon Hastalıkları',
        },
        { name: 'Endokrinoloji', displayName: 'Endokrinoloji' },
        { name: 'Metabolik Hastalıklar', displayName: 'Metabolik Hastalıklar' },
        { name: 'Hematoloji', displayName: 'Hematoloji' },
        { name: 'Onkoloji', displayName: 'Onkoloji' },
        { name: 'Nefroloji', displayName: 'Nefroloji' },
        { name: 'Romatoloji', displayName: 'Romatoloji' },
        {
          name: 'Acil Tıp, Zehirlenmeler ve Yoğun Bakım',
          displayName: 'Acil Tıp, Zehirlenmeler ve Yoğun Bakım',
        },
        { name: 'Çocuk Psikiyatrisi', displayName: 'Çocuk Psikiyatrisi' },
        { name: 'Çocuk Cerrahisi', displayName: 'Çocuk Cerrahisi' },
      ],
    },
    {
      name: 'Genel Cerrahi',
      displayName: 'Genel Cerrahi',
      topics: [
        { name: 'Temel Cerrahi', displayName: 'Temel Cerrahi' },
        { name: 'Meme Hastalıkları', displayName: 'Meme Hastalıkları' },
        { name: 'Tiroid Hastalıkları', displayName: 'Tiroid Hastalıkları' },
        {
          name: 'Paratiroid Hastalıkları',
          displayName: 'Paratiroid Hastalıkları',
        },
        {
          name: 'Adrenal Bez Hastalıkları',
          displayName: 'Adrenal Bez Hastalıkları',
        },
        { name: 'Özefagus', displayName: 'Özefagus' },
        { name: 'Mide', displayName: 'Mide' },
        { name: 'İnce Barsak', displayName: 'İnce Barsak' },
        { name: 'Kolorektal', displayName: 'Kolorektal' },
        { name: 'Appendiks', displayName: 'Appendiks' },
        {
          name: 'Anal Kanal ve Perianal Bölge',
          displayName: 'Anal Kanal ve Perianal Bölge',
        },
        { name: 'Karaciğer', displayName: 'Karaciğer' },
        {
          name: 'Safra Yolu ve Safra Kesesi',
          displayName: 'Safra Yolu ve Safra Kesesi',
        },
        { name: 'Pankreas', displayName: 'Pankreas' },
        { name: 'Dalak', displayName: 'Dalak' },
        {
          name: 'Karın Duvarı, Periton, Retroperiton ve Mezenter',
          displayName: 'Karın Duvarı, Periton, Retroperiton ve Mezenter',
        },
        { name: 'Fıtık', displayName: 'Fıtık' },
      ],
    },
    {
      name: 'Küçük Stajlar',
      displayName: 'Küçük Stajlar',
      topics: [
        { name: 'Nöroloji', displayName: 'Nöroloji' },
        { name: 'Beyin Cerrahisi', displayName: 'Beyin ve Sinir Cerrahisi' },
        { name: 'Psikiyatri', displayName: 'Psikiyatri' },
        { name: 'Halk Sağlığı', displayName: 'Halk Sağlığı' },
        { name: 'Dermatoloji', displayName: 'Dermatoloji' },
        { name: 'Radyoloji', displayName: 'Radyoloji' },
        { name: 'Nükleer Tıp', displayName: 'Nükleer Tıp' },
        { name: 'KBB', displayName: 'Kulak Burun Boğaz (KBB)' },
        { name: 'Göz Hastalıkları', displayName: 'Göz Hastalıkları' },
        { name: 'Ortopedi', displayName: 'Ortopedi ve Travmatoloji' },
        { name: 'FTR', displayName: 'Fiziksel Tıp ve Rehabilitasyon (FTR)' },
        { name: 'Üroloji', displayName: 'Üroloji' },
        { name: 'Çocuk Cerrahisi', displayName: 'Çocuk Cerrahisi' },
        {
          name: 'Kalp Damar Cerrahisi',
          displayName: 'Kalp ve Damar Cerrahisi',
        },
        { name: 'Göğüs Cerrahisi', displayName: 'Göğüs Cerrahisi' },
        {
          name: 'Plastik Cerrahi',
          displayName: 'Plastik, Rekonstrüktif ve Estetik Cerrahi',
        },
        { name: 'Anestezi', displayName: 'Anesteziyoloji ve Reanimasyon' },
        {
          name: 'Acil Tıp ve Zehirlenmeler',
          displayName: 'Acil Tıp ve Zehirlenmeler',
        },
        { name: 'Adli Tıp', displayName: 'Adli Tıp' },
      ],
    },
    {
      name: 'Kadın Doğum',
      displayName: 'Kadın Hastalıkları ve Doğum',
      topics: [
        { name: 'Jinekoloji', displayName: 'Jinekoloji' },
        {
          name: 'Endokrinoloji',
          displayName: 'Üreme Endokrinolojisi ve İnfertilite',
        },
        { name: 'Onkoloji', displayName: 'Jinekolojik Onkoloji' },
        { name: 'Obstetri', displayName: 'Obstetri (Perinatoloji)' },
      ],
    },
  ];

  console.log('🌱 Ders ve Konu (Lesson & Topic) seed işlemi başlatılıyor...');

  let lessonCount = 0;
  let topicCount = 0;

  for (const lessonData of curriculumData) {
    // 1. Dersi upsert et (name @unique olduğu için doğrudan kullanılabilir)
    const lesson = await prisma.lesson.upsert({
      where: { name: lessonData.name },
      update: {
        displayName: lessonData.displayName,
      },
      create: {
        name: lessonData.name,
        displayName: lessonData.displayName,
      },
    });
    lessonCount++;

    // 2. İlgili dersin konularını kontrol ederek ekle veya güncelle
    // Not: Topic modelinde @@unique([name, lessonId]) kısıtlaması tanımlı olmayabileceği için
    // güvenli bir şekilde findFirst + update/create akışı kullanıyoruz.
    for (const topicData of lessonData.topics) {
      const existingTopic = await prisma.topic.findFirst({
        where: {
          name: topicData.name,
          lessonId: lesson.id,
        },
      });

      if (existingTopic) {
        await prisma.topic.update({
          where: { id: existingTopic.id },
          data: {
            displayName: topicData.displayName,
          },
        });
      } else {
        await prisma.topic.create({
          data: {
            name: topicData.name,
            displayName: topicData.displayName,
            lessonId: lesson.id,
          },
        });
      }
      topicCount++;
    }
  }

  console.log(
    `✅ Seed tamamlandı: ${lessonCount} Ders ve ${topicCount} Konu başarıyla işlendi.`,
  );

  // for (const c of allConcepts.flat()) {
  //   const normalizedLabel = normalizeConceptKey(c.preferredLabel);

  //   const concept = await prisma.concept.upsert({
  //     where: { normalizedLabel },
  //     update: {
  //       conceptType: c.conceptType,
  //       status: 'ACTIVE',
  //     },
  //     create: {
  //       preferredLabel: c.preferredLabel,
  //       normalizedLabel,
  //       conceptType: c.conceptType,
  //     },
  //   });

  //   for (const a of c.aliases) {
  //     const normalizedAlias = normalizeConceptKey(a.alias);

  //     await prisma.conceptAlias.upsert({
  //       where: { normalizedAlias },
  //       update: { isActive: true },
  //       create: {
  //         conceptId: concept.id,
  //         alias: a.alias,
  //         normalizedAlias,
  //         language: a.language,
  //         source: 'IMPORT',
  //       },
  //     });
  //   }

  //   console.log(`✅ ${c.preferredLabel}`);
  // }
}

seed()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
