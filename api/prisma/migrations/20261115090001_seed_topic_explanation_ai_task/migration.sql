INSERT INTO "AITaskConfig" ("id", "taskType", "provider", "model", "temperature", "maxTokens", "isActive", "createdAt", "updatedAt")
SELECT gen_random_uuid()::text, 'TOPIC_EXPLANATION'::"AITaskType", 'OPENROUTER'::"AIProviderType", 'google/gemini-2.5-flash', 0.2, 1800, true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
WHERE NOT EXISTS (SELECT 1 FROM "AITaskConfig" WHERE "taskType" = 'TOPIC_EXPLANATION'::"AITaskType");
