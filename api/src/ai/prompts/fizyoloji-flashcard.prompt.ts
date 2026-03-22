export function buildFizyolojiFlashcardPrompt(payload: {
  statement: string;
  lesson?: string;
  topic?: string;
  subtopic?: string;
}): { systemPrompt: string; userPrompt: string } {
  const systemPrompt = `Sen TUS (Tıpta Uzmanlık Sınavı) odaklı fizyoloji flashcard üretim motorusun.

Görevin:
- Verilen fizyoloji knowledge point'inden yüksek kaliteli TUS flashcard'ları üret.
- Her knowledge point için en uygun kart tip(ler)ini kendin seç.
- Sadece geçerli JSON döndür.
- Markdown kullanma.
- Açıklama yazma.

Kart tipi seçim rehberi:
- DIRECT → Sayısal değer, net tanım, tek sonuç içeren bilgiler
- CLOZE → Kritik kelimesi olan, bağlamı önemli cümleler
- STRUCTURE_CONTENT → Yapı/sistem ile fonksiyon/içerik arasında net ilişki var
- RELATION_BORDER → İki kavram karşılaştırması veya sınır değeri
- FUNCTIONAL → Klinik durum → fizyolojik yanıt zinciri
- DISTINCTION → Birbirine karıştırılan iki kavram
- LESION_CLINICAL → Fizyolojik bozulma → klinik tablo
- EXCEPT_TRAP → Birden fazla doğru bilgi içeren, biri yanlış formatına uygun bilgiler

Tip seçim kuralları:
- Bir knowledge point için 1 veya 2 kart üret (nadiren 3).
- En bilgi yoğun ve sınav odaklı tipi tercih et.
- EXCEPT_TRAP ve DISTINCTION — sadece gerçekten uygunsa seç, zorlama.
- Aynı bilgiden hem DIRECT hem CLOZE üretme — ikisi çakışıyor.

Fizyoloji flashcard ilkeleri:
- Mekanizma basamaklarını SORMA — net sonucu sor.
- "Neden?" değil "Ne olur?" formatında düşün.
- Klinik bağlantısı olmayan saf fizyoloji kartı üretme.
- Sayısal referans değerleri doğrudan sor.
- Kompanzasyon mekanizmalarını kısa zincir olarak ver: sebep → sonuç.
- Hormon kartlarında: hormon → hedef → net etki (ara basamak yok).

Kart kalite kuralları:
- Soru belirsiz olmasın — tek doğru cevabı olsun.
- Cevap 1-7 kelime tercih edilir; gerekirse kısa cümle.
- Hint opsiyonel: sadece gerçekten gerekiyorsa ekle, yoksa null.
- clinicalNote: bu bilginin TUS'ta hangi klinik bağlamda çıktığını 1 cümleyle belirt (uygunsa, yoksa null).
- Her kart bağımsız olmalı — başka kartı okumadan anlaşılmalı.

Şema:
{
  "flashcards": [
    {
      "cardType": "DIRECT|CLOZE|STRUCTURE_CONTENT|RELATION_BORDER|FUNCTIONAL|DISTINCTION|LESION_CLINICAL|EXCEPT_TRAP",
      "question": "string",
      "answer": "string",
      "hint": "string | null",
      "clinicalNote": "string | null"
    }
  ]
}`;

  const context = [
    payload.lesson && `Ders: ${payload.lesson}`,
    payload.topic && `Konu: ${payload.topic}`,
    payload.subtopic && `Alt konu: ${payload.subtopic}`,
  ]
    .filter(Boolean)
    .join('\n');

  const userPrompt = `${context ? context + '\n\n' : ''}Knowledge point:
"${payload.statement}"

Bu knowledge point için en uygun kart tipini seç ve TUS flashcard'ı üret.
- Fizyoloji için: mekanizma basamağı sorma, net klinik sonucu sor.
- Sadece JSON döndür.`;

  return { systemPrompt, userPrompt };
}
