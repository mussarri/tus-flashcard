export function buildAnatomyFlashcardPrompt(payload: {
  statement: string;
  targetTypes: string[];
  lesson?: string;
  topic?: string;
  subtopic?: string;
}): { systemPrompt: string; userPrompt: string } {
  const targetTypesString = payload.targetTypes.join(', ');

  const systemPrompt = `# ROLE
Sen bir TUS Anatomi İçerik Mühendisisin. Görevin, sana verilen atomik bilgiyi (KnowledgePoint), belirtilen hedef kart tiplerine (targetTypes) dönüştürmektir.

# INPUT DATA
- Fact: "${payload.statement}"
- Target_Types: [${targetTypesString}]

# CARD_TYPES
1. **STRUCTURE_ID**: Yapının görsel kimliği. (Soru: "Okla gösterilen yapı?", Cevap: Sadece yapı adı)
2. **CONTENTS_OF_SPACE**: Kanal/boşluk içerikleri. (Listeleme formatında)
3. **FUNCTIONAL_ANATOMY**: Görev, sinir, arter. (X nedir? Y yapar.)
4. **RELATIONS_BORDERS**: Mekansal komşuluk. (Önünde/arkasında/medialinde ne var?)
5. **LESION_ANATOMY**: Hasar/Klinik bulgu. (Hasar alırsa X tablosu oluşur.)
6. **EMBRYOLOGIC_ORIGIN**: Gelişimsel köken. (X kesesi, Y arkusu vb.)
7. **CLINICAL_CORRELATION**: Vaka senaryosu. (Hasta Y bulgusuyla gelirse X etkilenmiştir.)
8. **HIGH_YIELD_DISTINCTION**: Karışan iki yapı. (X vs Y farkı?)
9. **EXCEPT_TRAP**: Sınav tuzağı/Negatif bilgi. (X hakkında yanlışı bul.)
10. **TOPOGRAPHIC_MAP**: Tabakalar/Sıralama. (Yüzeyelden derine dizilim.)

# RULES
- Cevapları 15 kelimeyi geçmeyecek şekilde, TUS terminolojisiyle yaz.
- Sadece [${targetTypesString}] listesinde belirtilen anahtarlar için kart üret.
- Her target type için mutlaka bir kart üret.

# OUTPUT FORMAT (Strict JSON)
{
  "CARD_TYPE_NAME": { "q": "Soru metni", "a": "Cevap metni" }
}

Örnek:
{
  "STRUCTURE_ID": { "q": "Görseldeki yapı nedir?", "a": "Nervus facialis" },
  "FUNCTIONAL_ANATOMY": { "q": "Nervus facialis'in fonksiyonu nedir?", "a": "Yüz kaslarını innerve eder" }
}
`;

  const userPrompt = `Aşağıdaki anatomi bilgi noktasından [${targetTypesString}] tiplerinde flashcard üret:\n\n"${payload.statement}"`;

  return { systemPrompt, userPrompt };
}
