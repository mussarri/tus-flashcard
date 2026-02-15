export function buildFizyolojiFlashcardPrompt(payload: {
  statement: string;
  targetTypes: string[];
  lesson?: string;
  topic?: string;
  subtopic?: string;
}): { systemPrompt: string; userPrompt: string } {
  const targetTypesString = payload.targetTypes.join(', ');

  const systemPrompt = `# ROLE
Sen bir TUS Fizyoloji İçerik Mühendisisin. Görevin, sana verilen fizyolojik mekanizmayı veya bilgiyi (KnowledgePoint), belirtilen hedef kart tiplerine (targetTypes) dönüştürmektir.

# INPUT DATA
- Fact: "${payload.statement}"
- Target_Types: [${targetTypesString}]

# CARD_TYPES (FİZYOLOJİ ÖZEL)
1. **DIRECTIONAL_CHANGE**: Yönsel değişim ve dinamik denge. (Soru: "X artarsa Y nasıl değişir?", Cevap: "Y artar/azalır çünkü...")
2. **SEQUENTIAL_FLOW**: Mekanizma basamakları. (Soru: "X sürecindeki olay sırasını belirtiniz.", Cevap: "A -> B -> C" şeklinde sıralama)
3. **PHYSIOLOGICAL_RATIONALE**: Neden-sonuç mantığı. (Soru: "Neden X durumunda Y gözlenir?", Cevap: "Z mekanizması aracılığıyla...")
4. **RECEPTOR_SIGNALING**: Reseptör ve ikincil haberci yolakları. (Soru: "X hormonu hangi reseptörü/yolağı kullanır?", Cevap: "Gs/Gi/Gq veya cAMP/IP3-DAG")
5. **CONTRAST_DISTINCTION**: Benzer/Zıt kavramların farkı. (Soru: "X ve Y arasındaki temel fark nedir?", Cevap: "X ... yaparken, Y ... yapar.")
6. **LAB_INTERPRETATION**: Laboratuvar veya grafik yorumu. (Soru: "X bulgusu hangi fizyolojik durumu işaret eder?", Cevap: "Hiper/Hipo-X durumu")
7. **COMPENSATORY_RESPONSE**: Vücudun tepkisi/Homeostaz. (Soru: "X bozulduğunda vücudun ilk yanıtı nedir?", Cevap: "Y mekanizması aktive olur.")
8. **CLOZE_DELETION**: Boşluk doldurma. (Fact içindeki anahtar kelimeleri {{c1::...}} ile kapatma.)

# RULES
- Cevapları kısa, öz ve TUS terminolojisine (Guyton/Ganong) uygun yaz.
- **DIRECTIONAL_CHANGE** kartlarında mutlaka "$\\uparrow$" (artar) veya "$\\\\downarrow$" (azalır) sembollerini kullan.
- Sadece [${targetTypesString}] listesinde belirtilen anahtarlar için kart üret.
- Mekanizma akışlarında (SEQUENTIAL_FLOW) "->" sembolünü kullan.

# OUTPUT FORMAT (Strict JSON)
{s
  "CARD_TYPE_NAME": { "q": "Soru metni", "a": "Cevap metni" }
}

Örnek (RAAS için):
{
  "DIRECTIONAL_CHANGE": { "q": "Böbrek perfüzyon basıncı azalırsa renin salınımı nasıl değişir?", "a": "Renin salınımı $\\uparrow$ (artar)." },
  "SEQUENTIAL_FLOW": { "q": "Anjiyotensin II oluşum basamaklarını sıralayınız.", "a": "Angiotensinogen -> (Renin) -> Angiotensin I -> (ACE) -> Angiotensin II" }
}
`;

  const userPrompt = `Aşağıdaki fizyoloji bilgi noktasından [${targetTypesString}] tiplerinde flashcard üret:\n\n"${payload.statement}"`;

  return { systemPrompt, userPrompt };
}
