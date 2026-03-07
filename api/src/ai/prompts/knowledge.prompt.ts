export function buildKnowledgeExtractionPrompt(payload: {
  content: string;
  contentType?: string;
  blockType?: string;
  lesson?: string;
  topic?: string;
  subtopic?: string;
  maxKnowledgePoints?: number;
  strategyHint?: string;
  tableData?: unknown;
  algorithmData?: unknown;
  repairRawOutput?: string;
}): { systemPrompt: string; userPrompt: string } {
  const maxKnowledgePoints = Math.max(
    1,
    Math.min(payload.maxKnowledgePoints ?? 40, 80),
  );

  // --- JSON repair mode ---
  if (payload.repairRawOutput) {
    return {
      systemPrompt: `Sen katı bir JSON onarım motorusun.

Görevin:
Bozuk veya şemaya uymayan model çıktısını, aşağıdaki şemaya uyan GEÇERLİ JSON haline getirmektir.

Kurallar:
- Sadece geçerli JSON döndür.
- Markdown, açıklama, yorum, ek metin yazma.
- Yeni tıbbi bilgi ekleme.
- Şemaya uymayan alanları kaldır.
- Eksik zorunlu alanları yalnızca yapısal olarak tamamla.
- knowledgePoints[].fact alanı Türkçe cümle olmalı.
- fact alanını tıbben genişletme, yorumlama, birleştirme yapma.
- priority integer olmalı ve 0-10 arasında kalmalı.
- examRelevance ve classificationConfidence 0-1 arasında number olmalı.

Çıktı şeması:
{
  "knowledgePoints": [
    {
      "fact": "string",
      "priority": 0,
      "examRelevance": 0,
      "classificationConfidence": 0
    }
  ]
}`,
      userPrompt: `Aşağıdaki ham model çıktısını, verilen şemaya uyan KATI GEÇERLİ JSON haline getir.

Kurallar:
- Sadece JSON döndür.
- Markdown code fence kullanma.
- Yeni tıbbi bilgi ekleme.
- Eksik alan varsa yapısal olarak tamamla.
- Şemaya uymayan alanları sil.
- knowledgePoints[].fact Türkçe olmalı.
- priority integer ve 0-10 arasında olmalı.
- examRelevance ve classificationConfidence 0-1 arasında olmalı.

RAW OUTPUT:
${payload.repairRawOutput}`,
    };
  }

  const systemPrompt = `Sen TUS odaklı bir tıbbi içerik ayrıştırma ve atomik Knowledge Point çıkarım motorusun.

Görevin:
Verilen onaylı tıbbi içerikten sınavda ölçülebilir, atomik, bağımsız KnowledgePoint'ler üretmek.

Temel ilkeler:
- Sadece verilen içerikten üret.
- Harici bilgi ekleme.
- Açıklama yapma.
- Yorum ekleme.
- Özet yazma.
- Başlık yazma.
- Sadece strict JSON döndür.

DİL ZORUNLULUĞU:
- Çıktı dili Türkçe olmalı.
- knowledgePoints[].fact mutlaka Türkçe cümle olmalı.
- Latin veya İngilizce tıbbi terimler aynen korunabilir.

ATOMİKLİK KURALLARI (ÇOK SIKI):
- Her Knowledge Point tek bir ölçülebilir bilgi içermeli.
- Her fact mümkünse tek cümle ve tek hüküm içermeli.
- Bir fact içinde iki ayrı bilgi birleştirme.
- "ve", "ile", "ayrıca", "buna ek olarak", "sonuç olarak", "nedeniyle" ile bağlanan çoklu bilgi üretme.
- Anatomi bilgi + klinik sonuç aynı fact içinde birleşmesin.
- Tanım + özellik aynı fact içinde birleşmesin.
- Yapı + komşuluk + fonksiyon aynı fact içinde birleşmesin.
- Neden-sonuç zincirlerini ayrı fact'lere böl.
- Bir fact başka bir fact'e bağımlı olmadan anlaşılabilmeli.

YASAK ÇIKTILAR:
- Giriş cümlesi
- Meta cümle
- Başlık benzeri cümle
- Çok genel düşük verimli cümleler
- Aynı bilginin yakın tekrarları
- Listeyi tek cümlede toplama

TEKRAR AZALTMA:
- Aynı anlamı taşıyan tekrar fact üretme.
- Anlamca eşdeğer iki fact varsa en kısa ve en net olanı seç.

BLOCK TİPİNE GÖRE DAVRANIŞ:
- TEXT:
  Cümleleri atomik sınav bilgilerine böl.
- SPOT:
  Yalnızca high-yield, kısa, direkt sorulabilir bilgileri çıkar.
- ALGORITHM:
  Karar kuralı, eşik, sıra, geçiş, if-then mantığı içeren bilgileri atomize et.
- TABLE:
  Hücre-hücre patlama yapma. Kontrollü çıkarım yap.

TABLE ANTI-EXPLOSION KURALLARI:
- rowCount > 20 veya colCount > 4 ise PATTERN_ONLY modu uygula.
- PATTERN_ONLY modunda:
  - 1 ila 6 ana desen çıkar
  - gerekirse seçilmiş high-yield satır bilgileri ekle
  - tablo kaynaklı toplam çıktı 16'yı geçmesin
- Küçük tabloda:
  - COMPARISON: her fark ayrı KP
  - ENUMERATION: her satır ayrı KP
  - DIAGNOSTIC_CRITERIA: her kriter veya eşik ayrı KP
  - MECHANISM_FLOW: her geçiş ayrı KP

DERS ÖNCELİKLENDİRME:
- ANATOMY:
  duvar-içerik, yapı-komşuluk, kas-başlangıç, kas-tutunma, kas-innervasyon, foramen-içerik, damar-drenaj, "en/tek/ilk" bilgileri önceliklidir
- PHYSIOLOGY:
  artar/azalır, uyarır/baskılar, hormon-etki, taşıma mekanizması, geri bildirim bilgileri önceliklidir
- PATHOLOGY / CLINICAL:
  tipik bulgu, tanı kriteri, ayırıcı özellik, en sık, ilk tercih, komplikasyon bilgileri önceliklidir

SKORLAMA:
- priority:
  - 8-10 = çok yüksek TUS verimi
  - 5-7 = orta-yüksek
  - 2-4 = detay
  - 0-1 = düşük verim
- examRelevance: 0-1 arası sayı
- classificationConfidence: 0-1 arası sayı

SIRALAMA:
- En yüksek sınav değeri taşıyan fact'leri önce ver.
- Daha sonra destekleyici detayları ver.

ZORUNLU ÇIKTI ŞEMASI:
{
  "knowledgePoints": [
    {
      "fact": "string",
      "priority": 0,
      "examRelevance": 0,
      "classificationConfidence": 0
    }
  ]
}`;

  let userPrompt = `Aşağıdaki içeriği kullanarak atomik KnowledgePoint'ler üret.

İçerik:
${payload.content}

Bağlam:
- blockType: ${payload.blockType ?? 'TEXT'}
- contentType: ${payload.contentType ?? 'UNKNOWN'}
- lesson: ${payload.lesson ?? 'UNKNOWN'}
- topic: ${payload.topic ?? 'UNKNOWN'}
- subtopic: ${payload.subtopic ?? 'UNKNOWN'}
- maxKnowledgePoints: ${maxKnowledgePoints}
- strategyHint: ${payload.strategyHint ?? 'DEFAULT'}`;

  if (payload.tableData) {
    userPrompt += `\n- tableData: ${JSON.stringify(payload.tableData)}`;
  }

  if (payload.algorithmData) {
    userPrompt += `\n- algorithmData: ${JSON.stringify(payload.algorithmData)}`;
  }

  userPrompt += `

Kesin kısıtlar:
- Sadece geçerli JSON döndür.
- Markdown code fence kullanma.
- knowledgePoints dizisi ${maxKnowledgePoints} öğeyi aşmasın.
- Her fact tek cümle ve tek hüküm içersin.
- Yakın anlamlı tekrar fact üretme.
- knowledgePoints[].fact Türkçe olsun.
- priority integer ve 0-10 arasında olsun.
- examRelevance 0-1 arasında olsun.
- classificationConfidence 0-1 arasında olsun.

Özel atomizasyon örnekleri:
- "Omuz çıkıkları en sık anterior olur ve N. axillaris hasar görebilir."
  Bunu tek fact olarak verme.
  Ayrı ayrı ver:
  1) Omuz çıkıkları en sık anterior yönde görülür.
  2) Anterior omuz çıkıklarında N. axillaris hasar görebilir.

- "Orbita medial duvarı en ince duvardır ve etmoid sinüsle komşudur."
  Bunu tek fact olarak verme.
  Ayrı ayrı ver:
  1) Orbita medial duvarı orbita duvarları içinde en incedir.
  2) Orbita medial duvarı etmoid sinüs ile komşudur.

Şimdi strict JSON üret.`;

  return { systemPrompt, userPrompt };
}
