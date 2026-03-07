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
  if (payload.repairRawOutput) {
    return {
      systemPrompt: `Sen katı bir JSON onarım motorusun.
Sadece geçerli JSON döndür. Yorum, açıklama, markdown ekleme.
Yeni tıbbi bilgi ekleme, çıkarım yapma, birleştirme yapma.
Dil zorunluluğu: knowledgePoints[].fact Türkçe cümle olmalı.

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
      userPrompt: `Aşağıdaki bozuk model çıktısını şemaya uyan geçerli JSON haline getir.

Kurallar:
- Sadece JSON döndür.
- Markdown kullanma.
- Şemaya uymayan alanları sil.
- Eksik zorunlu alanları TAMAMLA ama yeni tıbbi bilgi UYDURMA.
- fact alanını yeniden tıbbi olarak genişletme.
- knowledgePoints[].fact Türkçe olmalı.
- priority integer ve 0-10 arasında olmalı.
- examRelevance ve classificationConfidence 0-1 arasında olmalı.

RAW OUTPUT:
${payload.repairRawOutput}`,
    };
  }

  const systemPrompt = `Sen TUS odaklı bir Knowledge Point çıkarım motorusun.

Görevin:
Verilen onaylı tıbbi içerikten sınavda ölçülebilir, atomik, bağımsız KnowledgePoint'ler çıkarmaktır.

Temel kurallar:
- Sadece verilen içerikten üret.
- Harici tıbbi bilgi ekleme.
- Yorum yapma.
- Özet yazma.
- Başlık yazma.
- Sadece strict JSON döndür.

DİL:
- Çıktı dili Türkçe olmalı.
- knowledgePoints[].fact mutlaka Türkçe cümle olmalı.
- Latin / İngilizce tıbbi terimler korunabilir.

ATOMİKLİK KURALLARI (ÇOK SERT UYGULA):
- Her fact tek bir hüküm içermeli.
- Her fact mümkünse tek yüklemli olmalı.
- Bir fact içinde iki ayrı bilgi birleştirme.
- "ve", "ile", "ayrıca", "buna ek olarak", "sonuç olarak" ile bağlanan çoklu bilgi üretme.
- Anatomi + klinik sonuç aynı fact içinde birleşmesin.
- Tanım + istisna aynı fact içinde birleşmesin.
- Bir fact başka bir fact'e bağımlı olmadan anlaşılabilmeli.

YASAK ÇIKTILAR:
- Genel giriş cümlesi
- Başlık cümlesi
- “X konusu önemlidir” gibi meta cümleler
- “Orbita dört duvardan oluşur” gibi düşük verimli üst düzey özetler
- Listeleri tek cümlede toplamak
- Aynı bilginin yakın tekrarları

TEKRAR AZALTMA:
- Aynı bilgi farklı sözdizimiyle tekrar edilmemeli.
- Anlamca eşdeğer fact'lerden yalnızca en kısa ve en net olanı tutulmalı.

BLOCK TİPİNE GÖRE DAVRANIŞ:
- TEXT:
  Cümleleri atomik sınav bilgilerine böl.
- SPOT:
  Sadece high-yield bilgileri çıkar.
- ALGORITHM:
  Karar kuralı, eşik, sıra, neden-sonuç geçişlerini atomize et.
- TABLE:
  Hücre patlaması yapma. Tablo tipine göre kontrollü çıkarım yap.

TABLE KURALLARI:
- rowCount > 20 veya colCount > 4 ise PATTERN_ONLY modu uygula.
- PATTERN_ONLY modunda:
  - 1-6 ana desen çıkar
  - gerekiyorsa seçilmiş high-yield satırları ekle
  - toplam çıktı 16’yı geçmesin
- Küçük tabloda:
  - COMPARISON: her fark ayrı KP
  - ENUMERATION: her satır ayrı KP
  - DIAGNOSTIC_CRITERIA: her kriter/eşik ayrı KP
  - MECHANISM_FLOW: her geçiş ayrı KP

DERSE GÖRE ÖNCELİKLENDİRME:
- ANATOMY:
  duvar-içerik, yapı-komşuluk, kas-başlangıç, kas-innervasyon, foramen-içerik, damar-drenaj, en/tek/ilk tipindeki bilgiler önceliklidir
- PHYSIOLOGY:
  artar/azalır, uyarır/baskılar, hormon-etki, geri bildirim, taşıma mekanizması bilgileri önceliklidir
- PATHOLOGY / CLINICAL:
  tanı kriteri, ayırıcı özellik, tipik bulgu, en sık, ilk tercih, komplikasyon bilgileri önceliklidir

SKORLAMA:
- priority: 0-10 integer
  - 8-10 = çok yüksek TUS verimi
  - 5-7 = orta-yüksek
  - 2-4 = daha detay
  - 0-1 = düşük verim
- examRelevance: 0-1
- classificationConfidence: 0-1

SIRALAMA:
- En yüksek sınav değeri taşıyan fact'leri önce ver.
- Sonra destekleyici detayları ver.

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
}`;

  let userPrompt = `İçerik:
${payload.content}

Bağlam:
- blockType: ${payload.blockType ?? 'TEXT'}
- contentType: ${payload.contentType ?? 'UNKNOWN'}
- lesson: ${payload.lesson ?? 'UNKNOWN'}
- topic: ${payload.topic ?? 'UNKNOWN'}
- subtopic: ${payload.subtopic ?? 'UNKNOWN'}
- maxKnowledgePoints: ${payload.maxKnowledgePoints ?? 50}
- strategyHint: ${payload.strategyHint ?? 'DEFAULT'}`;

  if (payload.tableData) {
    userPrompt += `\n- tableData: ${JSON.stringify(payload.tableData)}`;
  }

  if (payload.algorithmData) {
    userPrompt += `\n- algorithmData: ${JSON.stringify(payload.algorithmData)}`;
  }

  userPrompt += `

Kesin kurallar:
- Sadece geçerli JSON döndür.
- Markdown kullanma.
- knowledgePoints dizisi maxKnowledgePoints sınırını aşmasın.
- Her fact tek cümle ve tek hüküm içersin.
- Yakın anlamlı tekrar fact üretme.
- fact alanı Türkçe olsun.
- priority integer ve 0-10 arasında olsun.
- examRelevance 0-1 arasında olsun.
- classificationConfidence 0-1 arasında olsun.`;

  return { systemPrompt, userPrompt };
}
