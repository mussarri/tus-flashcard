import {
  ContentKnowledgePromptPayload,
  ContentKnowledgePromptResult,
} from './types';

export function buildKnowledgeRepairPrompt(
  payload: ContentKnowledgePromptPayload,
): ContentKnowledgePromptResult {
  const systemPrompt = `Sen TUS bilgi noktası çıkarımının JSON çıktısını onarıyorsun.
Yalnızca geçerli JSON döndür. Yeni tıbbi bilgi ekleme. Mevcut bilgi noktalarını koru.
Çıktı şeması: {"knowledgePoints":[{"fact":"string","priority":0,"examRelevance":0,"classificationConfidence":0}]}
fact Türkçe ve tek ana fikir içermeli. priority 0-10, diğer iki sayı 0-1 aralığında olmalı.`;

  const userPrompt = `Ders: ${payload.lesson || 'Bilinmiyor'}
Aşağıdaki hatalı çıktıyı şemaya uygun JSON'a dönüştür. En fazla ${payload.maxKnowledgePoints || 15} bilgi noktası tut.

Hatalı çıktı:
${payload.repairRawOutput || ''}`;

  return { systemPrompt, userPrompt };
}
