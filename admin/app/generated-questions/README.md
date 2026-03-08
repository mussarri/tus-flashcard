# Generated Questions Admin Page

Component-based architecture for reviewing AI-generated questions.

## Component Hierarchy

```
AdminGeneratedQuestionPage (page.tsx)
├── QuestionList (left panel)
│   └── Filter tabs + question cards
└── QuestionReviewPanel (right panel)
    ├── QuestionStemEditor
    ├── OptionsEditor
    ├── ExplanationEditor
    ├── PrerequisiteInfo
    ├── SourceExamQuestion
    └── ReviewActions
        └── Reject modal
```

## Features

### Left Panel - Question List
- **Filter Tabs**: Pending / Approved / Rejected
- **Question Cards**: Display stem preview, difficulty, topic, creation date
- **Selection**: Click to view details in right panel

### Right Panel - Question Review
- **View Mode**: Read-only display of all question details
- **Edit Mode**: Inline editing of question, options, correct answer, explanation
- **Metadata**: Prerequisite, concepts, source exam question
- **Actions**: Edit, Save, Approve, Reject with reason modal

## Workflow

1. **List View**: Admin sees filtered list of questions (default: pending)
2. **Select Question**: Click card to load full details in right panel
3. **Edit (optional)**: Click "Edit" to enter edit mode, modify fields, save changes
4. **Review**: View prerequisite context, linked concepts, source question
5. **Decision**:
   - **Approve**: Marks question APPROVED, auto-advances to next pending question
   - **Reject**: Opens modal requiring reason, marks REJECTED, auto-advances

## Data Flow

```
page.tsx (state + API calls)
   ↓ props
QuestionList ← questions, filter, selectedQuestion
QuestionReviewPanel ← selectedQuestion, editState, handlers
   ↓ props
Sub-components ← question data + edit handlers
```

## API Integration

All API calls go through `api.ts`:
- `listGeneratedQuestions(filters)` - Get questions with status filter
- `getGeneratedQuestion(id)` - Get full question details (currently unused, data from list)
- `approveGeneratedQuestion(id)` - Approve question
- `rejectGeneratedQuestion(id, rejectedBy, reason)` - Reject with reason
- `editGeneratedQuestion(id, updates)` - Update question before approval

## Type Safety

Shared types in `components/types.ts`:
- `GeneratedQuestion` - Full question interface with relations
- `EditState` - Form state for editing

## Styling

- Tailwind CSS utility classes
- lucide-react icons
- Responsive split-panel layout
- Color-coded status badges and difficulty indicators
