export function buildKnowledgeExtractionPrompt(payload: {
  content: string;
  lesson?: string;
  repairRawOutput?: string;
}): { systemPrompt: string; userPrompt: string } {
  if (payload.repairRawOutput) {
    return {
      systemPrompt: `Sen katı bir JSON onarım motorusun.

Sadece geçerli JSON döndür.
Markdown, açıklama, yorum, ek metin yazma.
Yeni tıbbi bilgi ekleme.
Şemaya uymayan alanları kaldır.
Eksik zorunlu alanları yalnızca yapısal olarak tamamla.
knowledgePoints[].fact alanı Türkçe cümle olmalı.
priority integer olmalı ve 0-10 arasında kalmalı.
examRelevance ve classificationConfidence 0-1 arasında number olmalı.

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
      userPrompt: `Aşağıdaki ham model çıktısını verilen şemaya uyan geçerli JSON haline getir.

Kurallar:
- Sadece JSON döndür.
- Markdown kullanma.
- Yeni tıbbi bilgi ekleme.
- Şemaya uymayan alanları sil.
- Eksik alanları yapısal olarak tamamla.
- knowledgePoints[].fact Türkçe olmalı.
- priority integer ve 0-10 arasında olmalı.
- examRelevance ve classificationConfidence 0-1 arasında olmalı.

RAW OUTPUT:
${payload.repairRawOutput}`,
    };
  }

  const systemPrompt = `Sen TUS odaklı bir tıbbi bilgi ayrıştırma motorusun.

Görevin:
Verilen ders özetinden mümkün olan en fazla sayıda atomik KnowledgePoint üretmek.

ZORUNLU KURALLAR:

1) Sadece verilen içerikten üret.
2) Açıklama yapma.
3) Yorum ekleme.
4) Başlık yazma.
5) Özet yazma.
6) Sadece GEÇERLİ JSON döndür.
7) Markdown kullanma.
8) JSON dışında hiçbir metin yazma.

DİL:
- knowledgePoints[].fact mutlaka Türkçe cümle olmalı.
- Tıbbi terimler Latin/İngilizce kalabilir.

ATOMİKLİK:
- Her fact tek cümle olmalı.
- Her fact tek bilgi içermeli.
- "ve", "ile", "ayrıca", "buna ek olarak" ile bağlı bilgiler AYRILMALI.
- Fonksiyon, innervasyon, klinik sonuç ayrı fact olmalı.
- Anatomi bilgi + klinik sonuç AYRI fact olmalı.
- Bir fact başka fact olmadan anlaşılabilmeli.

YOĞUN ÜRETİM:
- Az sayıda genel bilgi üretme.
- İçerikteki her bağımsız test edilebilir bilgiyi ayrı KnowledgePoint yap.
- Bilgi yoğun içerikte mümkün olan en fazla atomik fact üret.
- 3–4 madde ile yetinme.

MARKDOWN ÖZET KURALLARI:
- Başlıklar fact değildir.
- Madde işaretli satırlar ayrı fact adayıdır.
- “Klinik”, “TUS Spot”, “En sık”, “Önemli” kısımları özellikle tara.
- Bir satırda birden fazla bilgi varsa ayır.

TEKRAR:
- Aynı anlamlı fact tekrar edilmemeli.

ÇIKTI ŞEMASI:

{
  "knowledgePoints": [
    {
      "fact": "string",
      "priority": 0,
      "examRelevance": 0,
      "classificationConfidence": 0
    }
  ]
}

Alan kuralları:
- priority: 0–10 integer
- examRelevance: 0–1 sayı
- classificationConfidence: 0–1 sayı`;

  const userPrompt = `Ders:  ${payload.lesson || 'Belirtilmedi'}

Aşağıdaki ders özetinden atomik KnowledgePoint'ler üret.

İçerik:
${payload.content}

Kesin kurallar:
- Sadece JSON döndür.
- Her fact tek cümle olsun.
- Her fact tek bilgi içersin.
- Aynı anlamlı tekrar üretme.
- knowledgePoints[].fact Türkçe olsun.
- priority 0–10 arası integer olsun.
- examRelevance 0–1 arası olsun.
- classificationConfidence 0–1 arası olsun.

Örnek atomizasyon:

"Latissimus dorsi kol ekstansiyonu, addüksiyonu ve iç rotasyonu yapar."

Bunu tek fact yapma. Ayrı yaz:
- Latissimus dorsi kası kol ekstansiyonu yapar.
- Latissimus dorsi kası kol addüksiyonu yapar.
- Latissimus dorsi kası kol iç rotasyonu yapar.

Şimdi JSON üret.`;

  return { systemPrompt, userPrompt };
}
