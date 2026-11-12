UPDATE "AITaskConfig"
SET "provider" = 'OPENROUTER',
    "model" = CASE
      WHEN "taskType" = 'EMBEDDING' THEN 'openai/text-embedding-3-small'
      ELSE '~openai/gpt-sol-latest'
    END,
    "updatedAt" = NOW();
