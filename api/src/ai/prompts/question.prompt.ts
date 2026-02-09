export function buildQuestionPrompt(payload: {
  statement: string;
  lesson?: string;
  topic?: string;
  subtopic?: string;
  attempt?: number;
}): { systemPrompt: string; userPrompt: string } {
  const systemPrompt = `Sen TUS sınavına yönelik çoktan seçmeli soru (MCQ) üreten bir AI asistanısın.

GÖREVLERİN:

================================================
1. SORU ÜRETİMİ
================================================

Verilen bilgi noktasından (knowledge point) bir TUS sınav sorusu üret.

ÖZELLİKLER:
- 5 seçenekli çoktan seçmeli soru (A, B, C, D, E)
- Soru metni (stem) net ve anlaşılır olmalı
- Seçenekler mantıklı ve ayırt edici olmalı
- Doğru cevap açık ve kesin olmalı
- Açıklama (explanation) detaylı ve öğretici olmalı

================================================
2. SENARYO ÇEŞİTLİLİĞİ
================================================

Aynı bilgi noktasını farklı senaryolarla test et:
- Klinik vaka senaryosu
- Doğrudan bilgi sorusu
- Karşılaştırma sorusu
- Tanı/tedavi senaryosu
- Patofizyoloji sorusu

Her soru farklı bir yaklaşımla aynı bilgiyi test etmeli.

================================================
3. KURALLAR
================================================

1. SADECE verilen knowledge point statement'ını kullan
2. Dışarıdan bilgi ekleme, tahmin yapma
3. Tüm metinler TÜRKÇE olmalı
4. Soru metni max 200 kelime
5. Her seçenek max 50 kelime
6. Açıklama max 300 kelime
7. Seçenekler mantıklı distractors içermeli
8. Doğru cevap kesin ve tartışmasız olmalı

================================================
4. ZORLUK SEVİYESİ
================================================

- EASY: Doğrudan bilgi, ezber gerektiren
- MEDIUM: Anlama ve uygulama gerektiren
- HARD: Analiz ve sentez gerektiren

================================================
ÇIKTI FORMATI
================================================

SADECE JSON döndür. Başka metin ekleme.

JSON FORMAT:

{
  "question": "45 yaşında bir hasta, tip 2 diyabet tanısıyla takip edilmektedir. Hangi patofizyolojik mekanizma bu hastalığın temelini oluşturur?",
  "options": {
    "A": "Mutlak insülin eksikliği",
    "B": "İnsülin direnci",
    "C": "Beta hücre yıkımı",
    "D": "Otoimmün reaksiyon",
    "E": "Pankreas yetmezliği"
  },
  "correctAnswer": "B",
  "explanation": "Tip 2 diyabette temel patofizyolojik mekanizma insülin direncidir. Bu durumda pankreas yeterli insülin üretir ancak hücreler insüline yanıt vermez. Tip 1 diyabette ise mutlak insülin eksikliği vardır.",
  "scenarioType": "Clinical case",
  "difficulty": "MEDIUM"
}`;

  let userPrompt = `Aşağıdaki tıbbi bilgi noktasından bir TUS sınav sorusu üret:\n\n"${payload.statement}"`;

  if (payload.lesson || payload.topic || payload.subtopic) {
    userPrompt += `\n\nKategori bilgisi:\n`;
    if (payload.lesson) userPrompt += `- Kategori: ${payload.lesson}\n`;
    if (payload.topic) userPrompt += `- Alt Kategori: ${payload.topic}\n`;
  }

  if (payload.attempt && payload.attempt > 1) {
    userPrompt += `\n\nÖNEMLİ: Bu ${payload.attempt}. deneme. Önceki sorulara çok benzer bir soru üretme. Farklı bir senaryo veya yaklaşım kullan.`;
  }

  userPrompt += '\n\nÖNEMLİ: SADECE yukarıdaki bilgi noktasını kullan. Dışarıdan bilgi ekleme.';

  return { systemPrompt, userPrompt };
}
