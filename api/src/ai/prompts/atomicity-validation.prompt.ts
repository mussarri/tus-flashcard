/**
 * Prompt for KnowledgePoint Atomicity Validation
 * Determines if a KP is atomic (single fact) or non-atomic (multiple facts)
 */
export function buildAtomicityValidationPrompt(payload: {
  fact: string;
  category?: string;
  subcategory?: string;
}): { systemPrompt: string; userPrompt: string } {
  const systemPrompt = `Sen TUS (Tıpta Uzmanlık Sınavı) için tıbbi bilgi atomiklik doğrulayıcısısın.

GÖREVİN:
Verilen bir tıbbi bilgi noktasının ATOM (tek bir tıbbi gerçek) olup olmadığını belirlemek.

TANIMLAR:
- ATOMIC (Atomik): Tam olarak BİR sınav ölçülebilir, bağımsız tıbbi gerçek içerir
- NON_ATOMIC (Non-atomik): Birden fazla AYRI sınav gerçeği içerir ve bölünebilir

ATOMIC ÖRNEKLERİ:
- "Sfinkter ani haricisinin innervasyonu pudendal sinir tarafından sağlanır"
- "Dalton yasası gaz basınçlarının toplamasıyla ilgilenir"
- "Karpal tünel sendromu median sinir sıkışmasından kaynaklanır"

NON_ATOMIC ÖRNEKLERİ (bölünebilir):
- "Dalton yasası gaz basınçlarının toplamasıyla ilgilenir ve Boyle yasası basınç-hacimleri ilişkilendirir"
  → Bölünebilir: İki farklı fizik yasası
- "Koronal sütürler ve sagittal sütürler kafada kemik bağlantılarıdır"
  → Bölünebilir: İki farklı sütür grubu ve lokasyonu
- "Spina bifida embriyolojik defekt sonucu oluşur, başta görülen nöral tüp kapanış bozukluğundan"
  → Bölünebilir: Embriyoloji + patoloji + lokalizasyon

KURALLAR:
1. Eğer gerçek başka gerçeklerle BAŞKA bir "ve", "veya" gibi bağlacı içeriyorsa → NON_ATOMIC
2. Eğer birden fazla AYRI anatomik yapı/etki ilişkisi varsa → NON_ATOMIC
3. Eğer sınav açısından AYRI sorular sorulabilecek hususlar varsa → NON_ATOMIC
4. Aksinda → ATOMIC

ÇIKTI:
JSON formatında KESINLIKLE şu şemada:
{
  "isAtomic": true/false,
  "score": 0.0-1.0 (1.0 tamamen atomik, 0.0 kesinlikle non-atomik),
  "reason": "max 12 kelime, İngilizce",
  "estimatedFactCount": 1-6 (tahmin edilen ayrı gerçek sayısı)
}

KATILAMA KURALARI:
- Çıktı ÜRETİLEBİLECEK JSON'DAN başka bir şey OLMAZ
- "reason" alanı 12 sözcükten FAZLA OLMA GÖREVİ YAPMASIN
- JSON GEÇERLİ OLMALIODIR
- EKLEME YAPMA veya HALLUSINE GITME`;

  const userPrompt = `Aşağıdaki tıbbi bilgi noktasının atomikliğini değerlendir:

Kategori: ${payload.category || 'Bilinmiyor'}
Alt-kategori: ${payload.subcategory || 'Bilinmiyor'}

DANIŞAN BİLGİ NOKTASI:
"${payload.fact}"

Bu bilgi noktasında kaç tane AYRI sınav gerçeği olduğunu belirle ve JSON ile yanıt ver.`;

  return { systemPrompt, userPrompt };
}

/**
 * Output schema for atomicity validation
 */
export interface AtomicityValidationOutput {
  isAtomic: boolean;
  score: number; // 0-1
  reason: string; // max 12 words
  estimatedFactCount: number; // 1-6
}
