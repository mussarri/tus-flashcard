-- Migration: Merge TopicNode into Topic
-- This migration consolidates TopicNode (prerequisite graph) into Topic (registry)

-- Step 1: Migrate TopicNode data into Topic (only if not already exists)
-- Insert TopicNodes that don't exist in Topic yet
INSERT INTO "Topic" (id, name, lesson, "displayName", description, "questionCount", "knowledgePointCount", "createdAt", "updatedAt")
SELECT 
    tn.id,
    tn.name,
    tn.lesson,
    NULL as "displayName",
    NULL as description,
    0 as "questionCount",
    0 as "knowledgePointCount",
    tn."createdAt",
    tn."updatedAt"
FROM "TopicNode" tn
WHERE NOT EXISTS (
    SELECT 1 FROM "Topic" t 
    WHERE t.name = tn.name AND t.lesson = tn.lesson
)
ON CONFLICT (name, lesson) DO NOTHING;

-- Step 2: Update PrerequisiteTopicEdge foreign keys to point to Topic
-- First, create a temporary mapping table
CREATE TEMP TABLE topicnode_to_topic_mapping AS
SELECT 
    tn.id as topicnode_id,
    t.id as topic_id
FROM "TopicNode" tn
JOIN "Topic" t ON t.name = tn.name AND t.lesson = tn.lesson;

-- Update the foreign key references
UPDATE "PrerequisiteTopicEdge" pte
SET "topicId" = m.topic_id
FROM topicnode_to_topic_mapping m
WHERE pte."topicId" = m.topicnode_id;

-- Step 3: Drop the old foreign key constraint
ALTER TABLE "PrerequisiteTopicEdge" 
DROP CONSTRAINT IF EXISTS "PrerequisiteTopicEdge_topicId_fkey";

-- Step 4: Add new foreign key constraint pointing to Topic
ALTER TABLE "PrerequisiteTopicEdge" 
ADD CONSTRAINT "PrerequisiteTopicEdge_topicId_fkey" 
FOREIGN KEY ("topicId") REFERENCES "Topic"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Step 5: Drop TopicNode table and related indexes
DROP INDEX IF EXISTS "TopicNode_name_key";
DROP INDEX IF EXISTS "TopicNode_name_idx";
DROP INDEX IF EXISTS "TopicNode_lesson_idx";
DROP TABLE IF EXISTS "TopicNode";
