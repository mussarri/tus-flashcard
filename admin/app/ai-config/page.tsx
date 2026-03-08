import { serverFetch } from '../../lib/api';
import AIConfigView from './AIConfigView';

export default async function AIConfigPage() {
  const response = await serverFetch<{
    success: boolean;
    configs: Array<{
      id: string;
      taskType: string;
      provider: string;
      model: string;
      temperature: number;
      maxTokens: number;
      isActive: boolean;
      createdAt: string;
      updatedAt: string;
    }>;
  }>('admin/ai-config');

  return <AIConfigView initialConfigs={response.configs} />;
}
