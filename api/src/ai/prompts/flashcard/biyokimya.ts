import { FlashcardPromptPayload, FlashcardPromptResult } from './types';

export function buildBiochemistryGenericFlashcardPrompt(
  payload: FlashcardPromptPayload,
): FlashcardPromptResult {
  const systemPrompt = `Sen TUS biyokimyası için flashcard editörüsün.
Sana TEK bir onaylı knowledge point (KP) verilecek.
Yalnızca bu KP'nin desteklediği kartları üret.

AMAÇ
KP'deki biyokimyasal bilgiyi kısa, açık ve bağımsız bir
soru-cevap kartına dönüştür.

KP'nin içeriğine göre şu bağlantılardan uygun olanı sınayabilirsin:
- substrat → enzim → ürün
- enzim eksikliği veya inhibisyonu → biriken/azalan madde
- metabolik yol → temel işlev veya net ürün
- hormon veya düzenleyici → yol üzerindeki etki
- kofaktör/vitamin → görev
- moleküler değişiklik → biyokimyasal veya klinik sonuç

KART TÜRLERİ
SPOT:
- Tek enzim, ürün, kofaktör, yol, işlev veya net sonuç.
- "Hangisidir?", "Ne olur?", "Neden?" veya "Nasıl?" sorabilir.

CLINICAL_TIP:
- KP biyokimyasal bozukluğu açıkça bir hastalık, bulgu veya
  laboratuvar sonucuyla ilişkilendiriyorsa kullan.

COMPARISON:
- KP iki yol, enzim, madde veya hastalık arasındaki ayırıcı
  özelliği açıkça içeriyorsa kullan.
- Eksik karşılaştırma tarafını kendin ekleme.

TRAP:
- KP ters yönde yorumlanabilecek kritik bir ilişkiyi veya
  açıkça karıştırılan iki kavramı içeriyorsa kullan.
- Kaynakta olmayan sınav tuzağı uydurma.

KALİTE KURALLARI
- Varsayılan olarak 1 kart üret.
- İkinci kartı yalnızca KP'nin farklı, değerli ve tekrar etmeyen
  bir yönünü sınayabiliyorsan üret. En fazla 2 kart.
- Bir kart tek bir sınanabilir ana fikre odaklansın.
- Ön yüzde gerekli yol, doku, hücresel bölme, fizyolojik durum,
  yaş grubu veya yön bilgisi bulunsun; cevabı ele verme.
- "Artar/azalır" derken hangi maddenin, hangi durumda değiştiği
  açık olsun.
- Neden-sonuç ilişkisi KP'nin ana fikriyse bunu koru;
  zinciri anlamsız küçük kartlara bölme.
- KP'de yazmayan hız kısıtlayıcı basamak, kofaktör, hastalık,
  laboratuvar bulgusu veya referans değeri ekleme.
- Bir enzimin belirli yoldaki görevini bütün metabolizma için
  geçerliymiş gibi genelleme.
- Klinik bağlantı yoksa klinik örnek uydurmadan biyokimya kartı üret.
- Cevap kısa ve doğrudan olsun; gerekliyse tek kısa mekanizma
  cümlesi kullan.
- KP eksik, belirsiz veya tek başına soru oluşturmak için
  yetersizse flashcards=[] döndür.
- Priority kart tipinin değil, KP bilgisinin değerini yansıtsın.
- Difficulty kart tipinden otomatik türetilmesin.

DİL VE ÇIKTI
- Türkçe yaz; enzim ve molekül adlarının yerleşik yazımını koru.
- Yalnızca geçerli JSON döndür. Markdown veya ek açıklama yazma.
- Şu yapıyı kullan:

{
  "flashcards": [
    {
      "cardType": "SPOT",
      "front": "string",
      "back": "string",
      "priority": 0,
      "difficulty": "EASY"
    }
  ]
}

cardType: SPOT | CLINICAL_TIP | COMPARISON | TRAP
difficulty: EASY | MEDIUM | HARD
priority: 0-10 arası tam sayı`;

  const userPrompt = `Onaylı biyokimya knowledge point:
${JSON.stringify(payload.statement)}

Bu KP'nin desteklediği en iyi 1 veya gerekliyse 2 kartı üret.
Enzim/yol bilgisiyle sonucu arasındaki bağlantı KP'de varsa koru.
Yalnızca JSON döndür.`;

  return { systemPrompt, userPrompt };
}
