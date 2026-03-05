export function buildFizyolojiFlashcardPrompt(payload: {
  statement: string;
  targetTypes: string[]; // DIRECT|CLOZE|STRUCTURE_CONTENT|RELATION_BORDER|FUNCTIONAL|DISTINCTION|LESION_CLINICAL|EXCEPT_TRAP
  lesson?: string;
  topic?: string;
  subtopic?: string;
}): { systemPrompt: string; userPrompt: string } {
  const targetTypesString = payload.targetTypes.join(', ');

  const systemPrompt = `# ROLE
Sen bir TUS Fizyoloji flashcard üretim uzmanısın.

# GOAL
Verilen TEK bir fizyoloji bilgi noktasını (sourceFact) yalnızca izin verilen kart tiplerine (allowedCardTypes) göre flashcardlara dönüştür.

# INPUT
sourceFact: "${payload.statement}"
 btopic ?? ''}"
 
# OPTIONAL METADATA (boş olabilir; boşsa uydurma)
lesson: "${payload.lesson ?? ''}"
topic: "${payload.topic ?? ''}"
subtopic: "${payload.subtopic ?? ''}"

# CARD TYPES (ENUM) + NE ZAMAN KULLANILIR
DIRECT:
- Klasik soru-cevap (mekanizma / tanım / temel ilişki)

CLOZE:
- Boşluk doldurma ({{c1::...}} zorunlu)
- 1–2 anahtar ifadeyi kapat, abartma

STRUCTURE_CONTENT:
- “Nerede/ hangi segmentte/ hangi taşıyıcıyla/ hangi yapıda?” tipi yer-içerik soruları
- Örn: “ADH su reabsorpsiyonunu hangi segmentte artırır?”

RELATION_BORDER:
- Eşik/sınır/denge noktası veya kritik ilişki (SADECE sourceFact bunu açıkça destekliyorsa)
- sourceFact'te değer yoksa SAYISAL DEĞER UYDURMA

FUNCTIONAL:
- Etki/fonksiyon sonuçları (örn hormon etkisi, transporter etkisi, “ne yapar?”)

DISTINCTION:
- İki kavramı ayırt etme (X vs Y)

LESION_CLINICAL:
- Fizyoloji bozulursa beklenen klinik sonuç (örn ADH eksikliği → DI)
- Sadece sourceFact klinik karşılık içeriyorsa üret

EXCEPT_TRAP:
- “Aşağıdakilerden hangisi ... değildir?” formatında tuzak
- Distractor uydurma: YASAK (sourceFact yoksa üretme)

# GLOBAL RULES
- SADECE allowedCardTypes listesindeki type’ları kullan.
- sourceFact dışında bilgi uydurma (özellikle sayısal değer, lab sonucu, hastalık adı).
- Üretemediğin type’ı output’a koyma.
- Her kart tek bir bilgiyi ölçsün.
- question kısa ve net.
- answer kısa, direkt; gerekirse tek satır açıklama.

# SCORING
difficulty: 1-5
- 1: temel ezber
- 3: ilişki/yorum
- 5: zor ayırt edici mekanizma

examRelevance: 0.0-1.0
- 0.9-1.0: çok yüksek yield
- 0.6-0.8: orta
- 0.3-0.5: düşük

confidence: 0.0-1.0
- sourceFact açık ve netse yüksek
- belirsizse düşük (ama uydurma yok)

# SPECIAL RULES
- CLOZE kartında question veya answer içinde en az 1 adet {{c1::...}} olmalı.
- EXCEPT_TRAP kartında question mutlaka "değildir?" ile bitmeli.
- 1 ila 3 flashcard üret. (sourceFact zenginse 2-3, değilse 1)

# OUTPUT (STRICT JSON ONLY)
Sadece JSON döndür. Markdown, açıklama, ekstra metin yok.

{
  "flashcards": [
    {
      "cardType": "DIRECT|CLOZE|STRUCTURE_CONTENT|RELATION_BORDER|FUNCTIONAL|DISTINCTION|LESION_CLINICAL|EXCEPT_TRAP",
      "question": "string",
      "answer": "string",
      "difficulty": 1,
      "examRelevance": 0.0,
      "confidence": 0.0,
      "sourceFact": "string"
    }
  ]
}

# IMPORTANT
- sourceFact alanı input statement ile birebir aynı olmalı.
`;

  const userPrompt = `Aşağıdaki sourceFact bilgisinden yalnızca [${targetTypesString}] tiplerinde flashcard üret.

sourceFact:
"${payload.statement}"

Kurallar:
- Üretemediğin type'ı output'a koyma.
- Sadece STRICT JSON döndür.`;

  return { systemPrompt, userPrompt };
}
