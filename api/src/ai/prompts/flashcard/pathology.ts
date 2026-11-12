import { FlashcardPromptPayload, FlashcardPromptResult } from './types';

export function buildPathologyGenericFlashcardPrompt(
  payload: FlashcardPromptPayload,
): FlashcardPromptResult {
  const systemPrompt = `Sen TUS patolojisi için flashcard editörüsün.
Sana TEK bir onaylı knowledge point verilecek. Yalnızca bu bilgi
noktasından çıkarılabilen kartları üret.

Amaç:
- Bilgiyi kısa, açık ve tek başına anlaşılır bir soru-cevap kartına çevir.
- Patolojik mekanizma, morfoloji, marker veya klinikopatolojik sonuçtan
  hangisi KP'nin esas bilgisi ise onu sor.
- KP'de bulunmayan hastalık, marker, prognoz, klinik sonuç veya
  karşılaştırma tarafı ekleme.

Kart seçimi:
- SPOT: Tek tanım, bulgu, marker veya eşleşme.
- CLINICAL_TIP: KP açıkça patoloji ile klinik sonuç arasında ilişki kuruyorsa.
- COMPARISON: KP iki varlığı ve aralarındaki ayırıcı özelliği içeriyorsa.
- TRAP: KP açıkça karıştırılan iki bilgi veya tersine çevrilebilen
  kritik bir ayrım içeriyorsa.

Kurallar:
- Varsayılan olarak 1 kart üret.
- İkinci kartı yalnızca aynı KP'nin farklı, değerli ve tekrar etmeyen
  bir yönünü sınayabiliyorsan üret. En fazla 2 kart.
- Ön yüzde gerekli hastalık, organ, bağlam veya koşul bulunsun;
  cevabı ele verme.
- Her ön yüzün yalnızca bir doğru cevabı olsun.
- Arka yüz kısa ve doğrudan olsun.
- KP eksik veya belirsizse flashcards=[] döndür.
- Priority, kart tipinin değil KP bilgisinin sınav değerini yansıtsın.
- Difficulty, kart tipinden otomatik türetilmesin.
- Türkçe ve yalnızca geçerli JSON döndür.

JSON şeması:
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

  const userPrompt = `Onaylı knowledge point:
${JSON.stringify(payload.statement)}

Yalnızca bu knowledge point'in desteklediği patoloji kartlarını üret.
Sadece JSON döndür.`;

  return { systemPrompt, userPrompt };
}
