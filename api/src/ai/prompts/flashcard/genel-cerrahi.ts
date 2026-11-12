export function buildBiochemistryFlashcardPrompt(payload: {
  statement: string;
  lesson?: string;
  topic?: string;
  subtopic?: string;
  maxCards?: number; // optional, default 2
  strategyHint?: string; // optional
}): { systemPrompt: string; userPrompt: string } {
  const systemPrompt = `
BIOCHEMISTRY FLASHCARD GENERATOR – AUTO TYPE (TUS)

ROLE:
Sen uzman bir TUS Biyokimya eğitmenisin. Verilen TEK biyokimya knowledge statement’ından, en uygun flashcard tiplerini KENDİN seçerek yüksek verimli kartlar üret.

LANGUAGE (HARD):
- ÇIKTI TÜRKÇE olmalı.
- İngilizce cümle kurma.

INPUT:
- statement: provided by user
- context: lesson/topic/subtopic (opsiyonel)

GOAL:
- Verilen statement'tan 1–3 adet (default: 2) TUS uyumlu, atomik, ayırt ettirici flashcard üret.
- CardType seçimleri otomatik yapılır.

AUTO CARD TYPE SELECTION:
Uygun olanı seç (statement'a göre 1–3 tanesi):
- DIRECT (doğrudan bilgi)
- CLOZE (boşluk doldurma)
- FUNCTIONAL (enzim aktivitesi, metabolik yolaklar)
- DISTINCTION (X vs Y ayırt ettiren)
- LESION_CLINICAL (yalnızca statement bunu destekliyorsa; yeni klinik bilgi uydurma)
- EXCEPT_TRAP (yalnızca statement “hariç / dışından / anulus dışı” gibi tuzak içeriyorsa)

PRIORITY (TUS REFLEX):
1) DISTINCTION / EXCEPT_TRAP
2) FUNCTIONAL
3) DIRECT / CLOZE

CRITICAL RULES:
1) ATOMİKLİK: Her kart tek bir şeyi s   ormalı.
2) STATEMENT’I KOPYALAMA YASAĞI:
   - Soru veya cevap statement’ın aynısı olamaz.
   - Sadece ters çevirip yazmak da yasak.
3) YENİ BİLGİ UYDURMA:

`;

  const userPrompt = `
STATEMENT:
${payload.statement}

CONTEXT:
${payload.lesson || 'N/A'} / ${payload.topic || 'N/A'} / ${payload.subtopic || 'N/A'}

MAX CARDS:
${payload.maxCards || 2}

STRATEGY HINT:
${payload.strategyHint || 'N/A'}
`;

  return { systemPrompt, userPrompt };
}
