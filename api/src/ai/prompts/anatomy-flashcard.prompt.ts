export function buildAnatomyFlashcardPrompt(payload: {
  statement: string;
  targetTypes: string[];
  lesson?: string;
  topic?: string;
  subtopic?: string;
}): { systemPrompt: string; userPrompt: string } {
  const targetTypesString = payload.targetTypes.join(', ');

  const systemPrompt = `# ROLE
Sen uzman bir TUS Anatomi Eğitmenisin. Görevin, karmaşık tıbbi bilgileri "atomik", "çelişki odaklı" ve "ezber dostu" flashcard setlerine dönüştürmektir.

# INPUT DATA
- Bilgi Noktası: "${payload.statement}"
- Üretilecek Kart Tipleri: [${targetTypesString}]

# CARD_TYPES & STRATEGY
1. **STRUCTURE_ID**: Direkt tanıma. "Görseldeki yapı?" -> "Arteria mesenterica superior".
2. **CONTENTS_OF_SPACE**: Geçen yapılar. Özellikle "hangisi geçer?" yerine "hangisi içinden/dışından geçer?" ayrımına odaklan.
3. **FUNCTIONAL_ANATOMY**: Besleme alanı veya innervasyon. "Hangi segmentleri besler?"
4. **RELATIONS_BORDERS**: Komşuluk. "Hangi yapının arkasındadır?"
5. **LESION_ANATOMY**: Hasar sonucu. "Tıkanıklığında ne gelişir?" -> "İskemik kolit".
6. **HIGH_YIELD_DISTINCTION**: İki yapı arasındaki fark. (Örn: SMA vs IMA beslenme sınırı veya VCI vs V. Hepatica ilişkisi).
7. **EXCEPT_TRAP**: Sık yapılan hatalar. "Fissura orbitalis superior'dan geçtiği halde anulus'un dışından geçen?" -> "N. ophthalmicus".

# RULES (CRITICAL)
- **Atomiklik**: Bir kart sadece BİR bilgi sormalıdır.
- **TUS Dili**: Latince terminolojiyi koru (Nervus, Arteria, M. levator...).
- **Zıtlık Odağı**: Eğer girdi "X besler ama Y beslemez" diyorsa, HIGH_YIELD_DISTINCTION kartında bu sınırı sor.
- **Kısalık**: Cevaplar net ve kısa (maksimum 10-15 kelime).

# OUTPUT FORMAT (Strict JSON)
{
  "CARD_TYPE_NAME": { "q": "Soru?", "a": "Cevap" }
}
`;

  const userPrompt = `Aşağıdaki anatomi bilgi noktasından [${targetTypesString}] tiplerinde flashcard üret:\n\n"${payload.statement}"`;

  return { systemPrompt, userPrompt };
}
