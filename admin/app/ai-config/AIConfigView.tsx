/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import { useState } from "react";
import { api } from "../../lib/api";
import { Save, RefreshCw, CheckCircle2, XCircle } from "lucide-react";

interface AITaskConfig {
  id: string;
  taskType: string;
  provider: string;
  model: string;
  temperature: number;
  maxTokens: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

const TASK_TYPE_LABELS: Record<string, string> = {
  VISION_PARSE: "Vision Parse (Görüntü Analizi)",
  CONTENT_CLASSIFY: "Content Classify (İçerik Sınıflandırma)",
  KNOWLEDGE_EXTRACTION: "Knowledge Extraction (Bilgi Çıkarma)",
  FLASHCARD_GENERATION: "Flashcard Generation (Flashcard Üretimi)",
  QUESTION_GENERATION: "Question Generation (Soru Üretimi)",
  EMBEDDING: "Embedding (Vektörleştirme)",
  EXAM_QUESTION_ANALYSIS: "Exam Question Analysis (Sınav Sorusu Analizi)",
};

// Free tier supported models
const PROVIDER_MODELS: Record<string, string[]> = {
  OPENAI: [
    // GPT-5.2 series (2025)
    "gpt-5.2",
    "gpt-5.2-chat-latest",
    "gpt-5.2-codex",
    "gpt-5.2-pro",
    // GPT-5.1 series (2025)
    "gpt-5.1",
    "gpt-5.1-instant",
    "gpt-5.1-thinking",
    "gpt-5.1-pro",
    "gpt-5.1-mini",
    "gpt-5.1-nano",
    "gpt-5.1-chat-latest",
    "gpt-5.1-codex-max",
    "gpt-5.1-codex",
    // GPT-5 series (2025)
    "gpt-5",
    "gpt-5-chat-latest",
    "gpt-5-codex",
    "gpt-5-pro",
    "gpt-5-mini",
    "gpt-5-nano",
    // GPT-4.1 series (2025)
    "gpt-4.1",
    "gpt-4.1-mini",
    "gpt-4.1-nano",
    // Latest models (2024-2025)
    "gpt-4o",
    "gpt-4o-mini",
    "gpt-4o-2024-08-06",
    "gpt-4o-2024-11-20",
    "gpt-4o-2024-05-13",
    // Reasoning models (o1 series)
    "o1-preview",
    "o1-mini",
    // GPT-4 Turbo models
    "gpt-4-turbo",
    "gpt-4-turbo-preview",
    "gpt-4-0125-preview",
    "gpt-4-1106-preview",
    // GPT-4 base
    "gpt-4",
    // GPT-3.5 models
    "gpt-3.5-turbo",
    "gpt-3.5-turbo-0125",
    "gpt-3.5-turbo-1106",
    // Realtime models
    "gpt-realtime",
    "gpt-realtime-mini",
    "gpt-4o-realtime-preview",
    "gpt-4o-mini-realtime-preview",
    // Embedding models
    "text-embedding-3-small",
    "text-embedding-3-large",
    "text-embedding-ada-002",
  ],
  GEMINI: [
    // Gemini 3 series (2026) - Latest models
    "gemini-3-flash",
    "gemini-3-pro",
    "gemini-3-pro-image",
    // Gemini 2.5 series (2026) - Current models (RECOMMENDED)
    "gemini-2.5-flash", // 4K RPM, 4M TPM - BEST FOR MOST TASKS
    "gemini-2.5-flash-lite", // 4K RPM, 4M TPM - Lighter version
    "gemini-2.5-flash-preview-image", // Image support
    "gemini-2.5-flash-tts", // Text-to-speech
    "gemini-2.5-pro", // 150 RPM, 2M TPM - Premium
    "gemini-2.5-pro-tts", // Text-to-speech premium
    // Gemini 2.0 series (2025)
    "gemini-2.0-flash", // 2K RPM, 4M TPM
    "gemini-2.0-flash-lite", // 4K RPM, 4M TPM
    "gemini-2.0-flash-exp", // Experimental
    // Embedding models
    "text-embedding-004", // 3K RPM, 1M TPM
    "gemini-embedding-1.0", // 3K RPM, 1M TPM
    // Specialized models
    "deep-research-pro-preview", // Research agent
    "computer-use-preview", // Computer use
    "gemini-2.5-flash-native-audio-dialog", // Live audio
  ],
};

export default function AIConfigView({
  initialConfigs,
}: {
  initialConfigs: AITaskConfig[];
}) {
  const [configs, setConfigs] = useState<AITaskConfig[]>(initialConfigs);
  const [editing, setEditing] = useState<Record<string, Partial<AITaskConfig>>>(
    {},
  );
  const [saving, setSaving] = useState<Record<string, boolean>>({});
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [success, setSuccess] = useState<Record<string, boolean>>({});

  const handleEdit = (
    taskType: string,
    field: keyof AITaskConfig,
    value: any,
  ) => {
    const updatedEditing: Record<string, Partial<AITaskConfig>> = {
      ...editing,
      [taskType]: {
        ...editing[taskType],
        [field]: value,
      },
    };

    // If provider changed, validate and update model if needed
    if (field === 'provider') {
      const currentConfig = getConfig(taskType);
      const newProvider = value as string;
      const newProviderModels = PROVIDER_MODELS[newProvider] || [];
      const currentModel = updatedEditing[taskType]?.model || currentConfig?.model;

      // If current model is not in the new provider's model list, set default model
      if (!newProviderModels.includes(currentModel || '')) {
        // Set first model from new provider as default
        const defaultModel = newProviderModels[0] || '';
        updatedEditing[taskType].model = defaultModel;
      }
    }

    setEditing(updatedEditing);
    // Clear error and success for this config
    setErrors((prev) => {
      const newErrors = { ...prev };
      delete newErrors[taskType];
      return newErrors;
    });
    setSuccess((prev) => {
      const newSuccess = { ...prev };
      delete newSuccess[taskType];
      return newSuccess;
    });
  };

  const handleSave = async (taskType: string) => {
    const edited = editing[taskType];
    if (!edited || Object.keys(edited).length === 0) {
      return;
    }

    setSaving((prev) => ({ ...prev, [taskType]: true }));
    setErrors((prev) => {
      const newErrors = { ...prev };
      delete newErrors[taskType];
      return newErrors;
    });
    setSuccess((prev) => {
      const newSuccess = { ...prev };
      delete newSuccess[taskType];
      return newSuccess;
    });

    if (edited.temperature !== undefined) {
      if (edited.temperature < 0 || edited.temperature > 2) {
        setErrors((prev) => ({
          ...prev,
          [taskType]: "Temperature must be between 0 and 2",
        }));
        setSaving((prev) => {
          const newSaving = { ...prev };
          delete newSaving[taskType];
          return newSaving;
        });
        return;
      }
    }

    if (edited.maxTokens !== undefined) {
      if (edited.maxTokens < 1 || edited.maxTokens > 4000) {
        setErrors((prev) => ({
          ...prev,
          [taskType]: "Max tokens must be between 1 and 4000",
        }));
        setSaving((prev) => {
          const newSaving = { ...prev };
          delete newSaving[taskType];
          return newSaving;
        });
        return;
      }
    }

    // Prepare payload with correct types
    const payload: {
      provider?: "OPENAI" | "GEMINI";
      model?: string;
      temperature?: number;
      maxTokens?: number;
      isActive?: boolean;
    } = {};

    if (edited.provider !== undefined) {
      payload.provider = edited.provider as "OPENAI" | "GEMINI";
    }
    if (edited.model !== undefined) {
      payload.model = edited.model;
    }
    if (edited.temperature !== undefined) {
      payload.temperature = edited.temperature;
    }
    if (edited.maxTokens !== undefined) {
      payload.maxTokens = edited.maxTokens;
    }
    if (edited.isActive !== undefined) {
      payload.isActive = edited.isActive;
    }

    try {
      const response = await api.updateAIConfig(taskType, payload);
      setConfigs((prev) =>
        prev.map((config) =>
          config.taskType === taskType ? response.config : config,
        ),
      );
      setEditing((prev) => {
        const newEditing = { ...prev };
        delete newEditing[taskType];
        return newEditing;
      });
      setSuccess((prev) => ({ ...prev, [taskType]: true }));
      setTimeout(() => {
        setSuccess((prev) => {
          const newSuccess = { ...prev };
          delete newSuccess[taskType];
          return newSuccess;
        });
      }, 3000);
    } catch (error: any) {
      setErrors((prev) => ({
        ...prev,
        [taskType]: error.message || "Failed to update config",
      }));
    } finally {
      setSaving((prev) => {
        const newSaving = { ...prev };
        delete newSaving[taskType];
        return newSaving;
      });
    }
  };

  const handleRefresh = async () => {
    try {
      const response = await api.getAllAIConfigs();
      setConfigs(response.configs);
      setEditing({});
      setErrors({});
      setSuccess({});
    } catch (error) {
      console.error("Failed to refresh configs:", error);
    }
  };

  const getConfig = (taskType: string) => {
    const base = configs.find((c) => c.taskType === taskType);
    const edited = editing[taskType];
    return edited ? { ...base, ...edited } : base;
  };

  const hasChanges = (taskType: string) => {
    return editing[taskType] && Object.keys(editing[taskType]).length > 0;
  };

  return (
    <div className="p-8">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">
            AI Task Configuration
          </h1>
          <p className="text-gray-600 mt-2">
            Configure AI models and settings for each task type
          </p>
        </div>
        <button
          onClick={handleRefresh}
          className="flex items-center gap-2 px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg transition-colors"
        >
          <RefreshCw className="w-4 h-4" />
          Refresh
        </button>
      </div>

      <div className="space-y-6">
        {configs.map((config) => {
          const currentConfig = getConfig(config.taskType);
          const isEditing = hasChanges(config.taskType);
          const isSaving = saving[config.taskType];
          const error = errors[config.taskType];
          const successMsg = success[config.taskType];

          return (
            <div
              key={config.id}
              className="bg-white rounded-lg shadow-sm border border-gray-200 p-6"
            >
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className="text-lg font-semibold text-gray-900">
                    {TASK_TYPE_LABELS[config.taskType] || config.taskType}
                  </h3>
                  <p className="text-sm text-gray-500 mt-1">
                    Task Type:{" "}
                    <code className="bg-gray-100 px-1 rounded">
                      {config.taskType}
                    </code>
                  </p>
                </div>
                {isEditing && (
                  <button
                    onClick={() => handleSave(config.taskType)}
                    disabled={isSaving}
                    className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors disabled:opacity-50"
                  >
                    {isSaving ? (
                      <>
                        <RefreshCw className="w-4 h-4 animate-spin" />
                        Saving...
                      </>
                    ) : (
                      <>
                        <Save className="w-4 h-4" />
                        Save Changes
                      </>
                    )}
                  </button>
                )}
              </div>

              {error && (
                <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg flex items-center gap-2 text-red-700">
                  <XCircle className="w-4 h-4" />
                  <span className="text-sm">{error}</span>
                </div>
              )}

              {successMsg && (
                <div className="mb-4 p-3 bg-green-50 border border-green-200 rounded-lg flex items-center gap-2 text-green-700">
                  <CheckCircle2 className="w-4 h-4" />
                  <span className="text-sm">Config updated successfully!</span>
                </div>
              )}

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {/* Provider */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Provider
                  </label>
                  <select
                    value={currentConfig?.provider || ""}
                    onChange={(e) =>
                      handleEdit(config.taskType, "provider", e.target.value)
                    }
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  >
                    <option value="OPENAI">OpenAI</option>
                    <option value="GEMINI">Gemini</option>
                  </select>
                </div>

                {/* Model */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Model
                  </label>
                  <select
                    value={currentConfig?.model || ""}
                    onChange={(e) =>
                      handleEdit(config.taskType, "model", e.target.value)
                    }
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  >
                    {PROVIDER_MODELS[currentConfig?.provider || "OPENAI"]?.map(
                      (model) => (
                        <option key={model} value={model}>
                          {model}
                        </option>
                      ),
                    )}
                  </select>
                </div>

                {/* Temperature */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Temperature (0-2)
                  </label>
                  <input
                    type="number"
                    min="0"
                    max="2"
                    step="0.1"
                    value={currentConfig?.temperature ?? 0}
                    onChange={(e) =>
                      handleEdit(
                        config.taskType,
                        "temperature",
                        parseFloat(e.target.value),
                      )
                    }
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>

                {/* Max Tokens */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Max Tokens
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={currentConfig?.maxTokens ?? 0}
                    onChange={(e) =>
                      handleEdit(
                        config.taskType,
                        "maxTokens",
                        parseInt(e.target.value, 10),
                      )
                    }
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>

                {/* Is Active */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Status
                  </label>
                  <div className="flex items-center gap-3">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={currentConfig?.isActive ?? false}
                        onChange={(e) =>
                          handleEdit(
                            config.taskType,
                            "isActive",
                            e.target.checked,
                          )
                        }
                        className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                      />
                      <span className="text-sm text-gray-700">
                        {currentConfig?.isActive ? "Active" : "Inactive"}
                      </span>
                    </label>
                  </div>
                </div>

                {/* Last Updated */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Last Updated
                  </label>
                  <p className="text-sm text-gray-600">
                    {currentConfig?.updatedAt
                      ? new Date(currentConfig.updatedAt).toLocaleString(
                          "tr-TR",
                        )
                      : "N/A"}
                  </p>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
