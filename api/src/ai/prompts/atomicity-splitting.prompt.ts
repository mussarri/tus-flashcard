/**
 * Prompt for KnowledgePoint Atomicity Splitting
 * Takes a non-atomic KP and splits it into multiple atomic facts
 */
export function buildAtomicitySplittingPrompt(payload: {
  fact: string;
  category?: string;
  subcategory?: string;
  estimatedFactCount?: number;
}): { systemPrompt: string; userPrompt: string } {
  const systemPrompt = `Sen TUS (Tıpta Uzmanlık Sınavı) için tıbbi bilgi bölücüsüsün.

GÖREVİN:
Non-atomik (birden fazla gerçek içeren) bir bilgi noktasını ATOMIK (tek gerçekli) parçalara bölmek.

KURALLAR:
1. Çıktı ÜRETİLEBİLECEK sayıda atomik gerçek olmalı (2-6 adet)
2. Her çıktı gerçeği KESINLIKLE:
   - Tam olarak BİR tıbbi gerçek içermelidir
   - Bağımsız olarak kullanılabilir olmalıdır
   - Sınav ölçülebilir olmalıdır
   - Kısa ve net olmalıdır (tipik olarak 1 cümle, max 2 cümle)

3. Orijinal özü/bağlamı KORUMA, ama yapısı açık hale getir

4. EKLEME yapma - sadece mevcut gerçekleri böl
   - Yeni bilgi EKLEME
   - Açıklama EKLEME
   - Klinik hikaye EKLEME
   - Spekülasyon EKLEME

5. Latın anatomik terimler kabul edilebilir ve TUTULMALI

6. Türkçe tıbbi terminolojiyi KESINLIKLE kullan

ATOM GÖREKÇESİ ÖRNEĞİ:
Giriş: "Okulomotor sinir 3. kraniyal sinir olup motorik innervasyonu göz kaslarına sağlar ve pupilla dilatasyon da kontrol eder"
Çıkış:
[
  "Okulomotor sinir 3. kraniyal sinirledir",
  "Okulomotor sinir göz kaslarının çoğuna motorik innervasyonu sağlar",
  "Okulomotor sinir pupilla dilatasyon kontrol eder"
]

ÇIKTI:
JSON formatında ÜRETİLEBİLECEK şemada (başka bir şey YAPMAIN):
{
  "facts": ["gerçek1", "gerçek2", "gerçek3", ...]
}

- "facts" array'i en az 2, en fazla 6 atomik gerçek içermelidir
- Array JSON GEÇERLİ OLMALIODIR
- EKLEME YAPMA veya HALLUSINE GITME
- Orijinal gerçekleri KORUMA, sadece YAPILARI AÇIK KILA`;

  const userPrompt = `Aşağıdaki non-atomik bilgi noktasını atomik gerçeklere böl:

Kategori: ${payload.category || 'Bilinmiyor'}
Alt-kategori: ${payload.subcategory || 'Bilinmiyor'}
Tahmin edilen gerçek sayısı: ${payload.estimatedFactCount || 'Bilinmiyor'}

NON-ATOMIK BİLGİ NOKTASI:
"${payload.fact}"

Bu bilgiyi 2-6 ayrı, atomik gerçeğe böl. Her gerçek tek bir tıbbi bilgiyi içermelidir.
JSON dizisi olarak yanıt ver.`;

  return { systemPrompt, userPrompt };
}

/**
 * Output schema for atomicity splitting
 */
export interface AtomicitySplittingOutput {
  facts: string[]; // Array of atomic facts (2-6 items)
}
