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

  const systemPrompt = `Sen TUS odaklı bir tıbbi içerik ayrıştırma ve atomik Knowledge Point çıkarım motorusun.

Görevin:
Verilen ders özetinden mümkün olan en fazla sayıda, atomik, sınavda ölçülebilir ve bağımsız KnowledgePoint üretmek.

TEMEL PRENSİP:
Bu içerikler çoğunlukla markdown benzeri, başlıklı, maddeli, high-yield ders özetleridir.
Modeli özetleyici gibi değil, bilgi-parçalayıcı gibi kullan.

GENEL KURALLAR:
- Sadece verilen içerikten üret.
- Harici bilgi ekleme.
- Başlıkları bilgi olarak alma.
- Açıklama yapma.
- Yorum ekleme.
- Özet yazma.
- Sadece strict JSON döndür.

DİL:
- knowledgePoints[].fact Türkçe cümle olmalı.
- Latin / İngilizce tıbbi terimler korunabilir.

ATOMİKLİK KURALLARI:
- Her fact tek cümle olmalı.
- Her fact tek hüküm içermeli.
- Bir fact içinde iki ayrı bilgi birleşmemeli.
- "ve", "ile", "ayrıca", "buna ek olarak", "sonuç olarak", "nedeniyle" ile bağlanan çoklu bilgi tek fact olmamalı.
- Fonksiyon, innervasyon, klinik sonuç, komşuluk, lezyon, en sık bilgi, hareket bilgisi ayrı fact'lere bölünmeli.
- Anatomi bilgi + klinik bilgi aynı fact'te birleşmemeli.
- Bir fact başka bir fact olmadan anlaşılabilmeli.

YOĞUN ATOMİZASYON KURALI:
- Az sayıda genel cümle üretme.
- İçerikteki her bağımsız test edilebilir bilgiyi ayrı değerlendirme.
- Bir kas için fonksiyon, innervasyon, klinik hasar, lezyon sonucu ve özel kullanım ayrı ayrı çıkarılmalıdır.
- Bir yapı için komşuluk, içerik, görev, klinik önem ve en sık sorulan özellikler ayrı ayrı çıkarılmalıdır.
- İçerik bilgi yoğun ise 3-4 KnowledgePoint ile yetinme.
- Mümkün olan en yüksek kapsama ile üret.

MARKDOWN ÖZET İÇİN ÖZEL KURALLAR:
- Başlıklar KnowledgePoint değildir.
- Madde işaretli satırları aktif olarak parçala.
- "Klinik", "TUS Spot", "En sık", "Önemli", "Lezyon", "Sendrom", "İnnervasyon", "Fonksiyon", "Hareket" bölümlerini özellikle tara.
- Bir satırda birden fazla bilgi varsa bunları ayır.

TEKRAR AZALTMA:
- Aynı anlamlı fact'leri tekrar etme.
- Anlamca eşdeğerse en kısa ve en net cümleyi seç.

DERS ÖNCELİĞİ:
- ANATOMI:
  yapı-komşuluk, kas-innervasyon, kas-hareket, kas-başlangıç, kas-tutunma, duvar-içerik, foramen-içerik, en/tek/ilk bilgileri önceliklidir.
- FIZYOLOJI:
  artar/azalır, uyarır/baskılar, hormon-etki, feedback, transport bilgileri önceliklidir.
- PATOLOJI / KLINIK:
  tipik bulgu, en sık neden, komplikasyon, lezyon-sonuç, ayırıcı özellik, tanı kriteri önceliklidir.

SKORLAMA:
- priority: 0-10 integer
- examRelevance: 0-1
- classificationConfidence: 0-1

SIRALAMA:
- Önce en yüksek TUS değeri taşıyan fact'leri ver.
- Sonra destekleyici fact'leri ver.

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
}`;

  const userPrompt = `Aşağıdaki ders özetinden atomik KnowledgePoint'ler üret.

Ders:
${payload.lesson ?? 'UNKNOWN'}

İçerik:
${payload.content}

Kesin kurallar:
- Sadece geçerli JSON döndür.
- Markdown kullanma.
- Her fact tek cümle olsun.
- Her fact tek hüküm içersin.
- Aynı anlamlı tekrar üretme.
- knowledgePoints[].fact Türkçe olsun.
- priority integer ve 0-10 arasında olsun.
- examRelevance 0-1 arasında olsun.
- classificationConfidence 0-1 arasında olsun.

Çok önemli:
- Başlıkları fact olarak alma.
- Madde satırlarını aktif biçimde parçala.
- Fonksiyon, innervasyon, klinik sonuç, lezyon, hareket, komşuluk, "en sık" bilgilerini ayrı ayrı çıkar.
- Az sayıda genel sonuç üretme.
- İçerik bilgi yoğun ise mümkün olduğunca fazla atomik fact çıkar.

Atomizasyon örnekleri:
- "Latissimus dorsi kol ekstansiyonu, addüksiyonu ve iç rotasyonu yapar."
  Bunu tek fact verme.
  Ayrı ver:
  1) Latissimus dorsi kası kol ekstansiyonu yapar.
  2) Latissimus dorsi kası kol addüksiyonu yapar.
  3) Latissimus dorsi kası kol iç rotasyonu yapar.

- "N. accessorius hasarında omuz silkme zayıflığı ve omuz düşüklüğü görülür."
  Bunu tek fact verme.
  Ayrı ver:
  1) N. accessorius hasarında omuz silkme zayıflar.
  2) N. accessorius hasarında omuz düşüklüğü görülebilir.

- "Trapezius skapula retraksiyonu yapar ve N. accessorius ile innerve olur."
  Bunu tek fact verme.
  Ayrı ver:
  1) Trapezius kası skapula retraksiyonu yapar.
  2) Trapezius kasının motor innervasyonu N. accessorius tarafından sağlanır.

Şimdi mümkün olan en yüksek kapsama ile strict JSON üret.`;

  return { systemPrompt, userPrompt };
}
