# 📊 Exam Intelligence Analyzer for TUS Anatomy

## Overview

The **Exam Intelligence Analyzer** is a strategic analysis system that processes analyzed TUS anatomy exam questions from the last 10+ years to produce actionable intelligence reports. It aggregates patterns, identifies trends, maps prerequisites, and provides content design recommendations.

## Purpose

This tool is designed to:
- **Understand Exam Behavior**: Identify recurring patterns and topics
- **Strategic Planning**: Guide content creation based on actual exam frequency
- **Risk Mitigation**: Highlight trap hotspots and confusion areas
- **Prerequisite Mapping**: Ensure foundational knowledge is prioritized
- **Resource Optimization**: Focus efforts on high-impact content gaps

## Architecture

### Backend: `ExamIntelligenceService`

**Location**: `/api/src/admin/exam-intelligence.service.ts`

The service aggregates data from:
- `ExamQuestion` table (analyzed questions with `analysisStatus = ANALYZED`)
- `PrerequisiteTopicEdge` table (prerequisite relationships)
- `Flashcard` table (current content coverage)
- `GeneratedQuestion` table (practice question coverage)

### Frontend: React Dashboard

**Location**: `/admin/app/exam-intelligence/`

- **page.tsx**: Server-side data fetching
- **ExamIntelligenceView.tsx**: Interactive tabbed interface with visualizations

### API Endpoint

```
GET /admin/exam-intelligence/report?lesson=Anatomi&startYear=2014&endYear=2024
```

**Query Parameters**:
- `lesson` (optional): Filter by lesson (e.g., "Anatomi")
- `startYear` (optional): Start year for analysis
- `endYear` (optional): End year for analysis

## Report Sections

### 1. Pattern Frequency

**Purpose**: Identify the most common exam patterns across all questions.

**Metrics**:
- Pattern description
- Frequency count
- Percentage of total questions
- Average year of appearance
- Trend (increasing/decreasing/stable)

**Use Case**:
> "If 'nerve-artery relationship' appears in 15% of questions with an increasing trend, create flashcards and practice questions focused on this pattern."

**Example Output**:
```json
{
  "pattern": "Nerve-artery relationship in anatomical spaces",
  "count": 24,
  "percentage": 12.5,
  "avgYear": 2020,
  "trend": "increasing"
}
```

---

### 2. Topic-Pattern Matrix

**Purpose**: Map which patterns are most reliable for each anatomical topic.

**Metrics**:
- Topic name
- Associated patterns with frequency
- Reliability score (0-1): How consistently the pattern appears for this topic
- Total questions for the topic

**Use Case**:
> "For 'Brachial Plexus', the pattern 'root-trunk-division sequence' has 90% reliability. Ensure all content emphasizes this structure."

**Example Output**:
```json
{
  "topic": "Brachial Plexus",
  "patterns": [
    {
      "pattern": "Root-trunk-division-cord-branch sequence",
      "frequency": 8,
      "reliability": 0.89
    }
  ],
  "totalQuestions": 9
}
```

---

### 3. Prerequisite Impact

**Purpose**: Quantify the importance of prerequisite knowledge for exam success.

**Metrics**:
- Prerequisite name
- Linked topics
- Total frequency across questions
- Strength (WEAK/MEDIUM/STRONG)
- Exam importance (0-100%): How many questions require this prerequisite

**Use Case**:
> "The prerequisite 'Basic embryology of limb buds' has 85% exam importance and is linked to 12 topics. Prioritize this content."

**Example Output**:
```json
{
  "prerequisite": "Basic embryology of limb buds",
  "linkedTopics": ["Radial nerve", "Ulnar nerve", "Median nerve", ...],
  "frequency": 32,
  "strength": "STRONG",
  "examImportance": 85
}
```

---

### 4. Yearly Trends

**Purpose**: Track how exam focus shifts over time.

**Metrics**:
- Year
- Total questions
- Top 5 topics with counts and percentages
- Top 5 patterns
- New topics introduced this year

**Use Case**:
> "In 2023, 'Skull base foramina' became a top topic. In 2024, it stayed at #2. This indicates sustained importance—create comprehensive content."

**Example Output**:
```json
{
  "year": 2024,
  "totalQuestions": 18,
  "topTopics": [
    { "topic": "Orbit", "count": 4, "percentage": 22.2 },
    { "topic": "Skull base foramina", "count": 3, "percentage": 16.7 }
  ],
  "topPatterns": [
    { "pattern": "Foramen-structure relationship", "count": 5 }
  ],
  "newTopics": ["Pterygopalatine fossa"]
}
```

---

### 5. Trap Hotspots

**Purpose**: Identify high-risk confusion areas that frequently appear as distractors.

**Metrics**:
- Topic
- Trap type
- Frequency
- Confusion pairs (concept1 ⟷ concept2)
- Key differentiators
- Risk level (HIGH/MEDIUM/LOW)

**Use Case**:
> "HIGH RISK: Students confuse 'Radial nerve at spiral groove' with 'Axillary nerve at surgical neck'. Create a dedicated trap flashcard highlighting the difference."

**Example Output**:
```json
{
  "topic": "Humerus fractures",
  "trapType": "Confusion",
  "frequency": 7,
  "confusionPairs": [
    {
      "concept1": "Radial nerve at spiral groove",
      "concept2": "Axillary nerve at surgical neck",
      "differentiator": "Spiral groove = mid-shaft; Surgical neck = proximal"
    }
  ],
  "riskLevel": "HIGH"
}
```

---

### 6. Content Recommendations

**Purpose**: Provide actionable priorities for content creation.

**Types**:
- **FLASHCARD**: Need more flashcards for high-frequency topics
- **QUESTION**: Need more practice questions
- **PREREQUISITE**: Ensure prerequisite content is complete

**Metrics**:
- Priority (HIGH/MEDIUM/LOW)
- Topic
- Reasoning
- Exam frequency
- Current coverage
- Gap to fill

**Use Case**:
> "Topic 'Orbit' appears in 12 exam questions but has only 8 flashcards. Target: 60 flashcards. Gap: 52. Priority: HIGH."

**Example Output**:
```json
{
  "type": "FLASHCARD",
  "priority": "HIGH",
  "topic": "Orbit",
  "reasoning": "Topic appears in 12 exam questions but has only 8 flashcards. Need 52 more.",
  "metrics": {
    "examFrequency": 12,
    "currentCoverage": 8,
    "gap": 52
  }
}
```

---

## How to Use

### Step 1: Analyze Exam Questions

Before generating the intelligence report, ensure you have analyzed exam questions:

1. Go to **Exam Questions** page
2. Upload or create questions
3. Trigger analysis for each question (assigns lesson, topic, patterns, traps)

### Step 2: Generate Intelligence Report

1. Navigate to **Exam Intelligence** in the admin panel
2. The report auto-generates on page load
3. Filter by lesson, year range if needed

### Step 3: Review Insights

Use the tabbed interface:

- **Overview**: High-level summary + top priorities
- **Patterns**: All patterns sorted by frequency
- **Topics**: Topic-pattern relationships
- **Prerequisites**: Essential prerequisite knowledge
- **Traps**: High-risk confusion areas
- **Recommendations**: Content gaps ranked by priority

### Step 4: Take Action

Based on recommendations:

1. **HIGH Priority Flashcards/Questions**: Create immediately
2. **Trap Hotspots**: Design trap-focused flashcards
3. **Prerequisites**: Ensure foundational content exists before advanced topics
4. **Trends**: Adjust content strategy based on increasing/decreasing patterns

---

## Key Algorithms

### Trend Calculation

Splits question years into two halves, compares averages:

- **Increasing**: Second half avg year > first half + 1
- **Decreasing**: Second half avg year < first half - 1
- **Stable**: Otherwise

### Reliability Score

For each topic-pattern pair:

```
Reliability = (Pattern appearances in topic) / (Total questions for topic)
```

Higher reliability = more consistent pattern for that topic.

### Exam Importance (Prerequisites)

```
Exam Importance = (Prerequisite frequency / Total analyzed questions) × 100
```

Capped at 100%.

---

## Example Workflow

### Scenario: Preparing Content for 2026 Exam

1. **Generate Report**: Run intelligence report for Anatomy, 2014-2024
2. **Identify Gaps**:
   - "Orbit" has HIGH priority recommendation (52 flashcards needed)
   - "Skull base foramina" appears in 18 questions but only 6 practice questions exist
3. **Check Prerequisites**:
   - "Basic cranial nerve paths" has 90% exam importance → Create prerequisite lesson
4. **Review Traps**:
   - HIGH RISK: "Superior orbital fissure vs Inferior orbital fissure" → Create comparison flashcard
5. **Check Trends**:
   - "Pterygopalatine fossa" is a new topic in 2024 → Monitor for 2025/2026, prepare content
6. **Execute**:
   - Create 52 flashcards for "Orbit"
   - Generate 12 practice questions for "Skull base foramina"
   - Create prerequisite module for "Basic cranial nerve paths"
   - Design trap flashcard for orbital fissures

---

## Data Requirements

### Minimum Data for Meaningful Report

- **At least 50 analyzed questions** (more is better)
- **Questions from at least 3 years** (to detect trends)
- **Prerequisite graph populated** (for anatomy topics)

### Optimal Data

- 200+ analyzed questions
- 10+ years of data
- Prerequisite graph with STRONG edges
- Existing flashcard/question coverage to detect gaps

---

## Technical Details

### Database Tables Used

1. **ExamQuestion**: Source of analyzed questions
2. **PrerequisiteTopicEdge**: Prerequisite relationships
3. **Flashcard**: Current flashcard coverage
4. **GeneratedQuestion**: Current practice question coverage
5. **QuestionKnowledgePoint**: Links questions to knowledge
6. **ExamQuestionKnowledgePoint**: Links exam questions to knowledge

### Performance

- **Report generation**: ~2-5 seconds for 200 questions
- **No AI calls**: Pure aggregation logic
- **Cached on frontend**: Initial load caches report

### Extensibility

To add new analysis dimensions:

1. Add new interface to `ExamIntelligenceReport`
2. Create aggregation method in `ExamIntelligenceService`
3. Add new tab in `ExamIntelligenceView.tsx`

---

## Output Format

The report is a structured JSON object suitable for:

- **Dashboards**: Render as interactive UI
- **Excel Export**: Convert to spreadsheet for stakeholders
- **API Integration**: Feed into other systems
- **Automated Alerts**: Trigger notifications for HIGH priority gaps

---

## Best Practices

### For Administrators

1. **Run weekly**: After adding new analyzed questions
2. **Compare reports**: Track changes over time
3. **Share with content creators**: Provide actionable insights
4. **Prioritize HIGH**: Focus on high-priority recommendations first

### For Content Creators

1. **Start with prerequisites**: Ensure foundational content exists
2. **Focus on high-frequency topics**: 80/20 rule applies
3. **Create trap flashcards**: Address high-risk confusions explicitly
4. **Follow trends**: Adjust to increasing patterns

### For Quality Assurance

1. **Validate reliability scores**: High reliability = consistent pattern
2. **Review trap hotspots**: Ensure trap flashcards exist
3. **Check coverage gaps**: Verify recommendations are addressed

---

## Limitations

1. **Data Quality**: Report quality depends on exam question analysis accuracy
2. **No AI Generation**: This tool analyzes—it doesn't create content
3. **Anatomy-Centric**: Prerequisite analysis currently focuses on anatomy
4. **Static Snapshot**: Report reflects data at generation time

---

## Future Enhancements

### Planned Features

- [ ] Export to PDF/Excel
- [ ] Historical report comparison
- [ ] Automated email digest for HIGH priority gaps
- [ ] Multi-lesson support (Pharmacology, Pathology, etc.)
- [ ] Similarity clustering (group similar patterns)
- [ ] Predictive modeling (forecast next year's focus areas)

### Integration Ideas

- Link recommendations directly to content creation workflows
- Auto-generate flashcard drafts from trap hotspots
- Integrate with prerequisite learning path for students

---

## Support

For questions or issues:

1. Check data requirements (minimum 50 analyzed questions)
2. Verify questions have `analysisStatus = ANALYZED`
3. Ensure prerequisite graph is populated for anatomy
4. Review backend logs for aggregation errors

---

## Summary

The **Exam Intelligence Analyzer** transforms raw exam question data into strategic insights. By aggregating patterns, trends, prerequisites, and traps, it empowers content teams to:

- **Focus efforts** on high-impact topics
- **Mitigate risks** by addressing confusion areas
- **Prioritize prerequisites** for better learning outcomes
- **Optimize resources** by filling content gaps strategically

This is a **data-driven** approach to medical education content design.
