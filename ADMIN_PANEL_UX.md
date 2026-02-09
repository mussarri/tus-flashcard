# Editor-Oriented Admin Panel UX Documentation

## Overview

The admin panel has been redesigned with an editor-oriented workflow that strictly follows the content → knowledge → flashcard pipeline. All actions are validated and disabled when prerequisites are not met.

## Architecture

### Global Layout (`EditorLayout.tsx`)

- **Left Sidebar**: Navigation with work queue badges
- **Top Status Bar**: Shows active batch/topic context
- **Main Content Area**: Page-specific content

### Navigation Structure

1. **Dashboard** - Work queue overview
2. **Uploads / Batches** - Batch management
3. **Content Review** - Block approval workflow
4. **Knowledge Points** - Knowledge extraction triggers
5. **Topics** - Topic-based flashcard/question generation
6. **Flashcards** - Flashcard review and management
7. **Questions** - Question review and management
8. **Logs / Activity** - Audit trail

## Key Pages

### 1. Dashboard (`/admin/dashboard`)

**Purpose**: Show pending work at a glance

**Cards**:
- Batches awaiting review
- Content awaiting approval
- Approved content awaiting extraction
- Topics without flashcards

Each card shows count and "Go to" button.

### 2. Batch List (`/admin/batches`)

**Features**:
- Table view of all batches
- Status badges (UPLOADED, CLASSIFIED, REVIEWED, etc.)
- Quick actions: View

### 3. Batch Detail (`/admin/batches/[id]`)

**Tab Structure** (strictly ordered):
1. **Pages / Parsed Blocks** - Always enabled
2. **Approved Content** - Enabled if approved content exists
3. **Knowledge** - Enabled if knowledge points exist
4. **Flashcards** - Enabled if flashcards exist
5. **Questions** - Enabled if questions exist
6. **Logs** - Always enabled

**Rules**:
- Tabs are disabled if previous steps incomplete
- Lock icon shown on disabled tabs
- Tooltip explains why tab is disabled

### 4. Content Review (`/admin/content-review`)

**Layout**:
- Left: Raw OCR text (read-only)
- Right: Editable text area

**Features**:
- AI classification shown as read-only (lesson, topic, contentType)
- Confidence score with warning if < 0.7
- Approve button disabled if editedText is empty
- Reject requires reason

**Rules**:
- AI suggestions are clearly marked as "AI suggestion"
- Final decision happens during approval

### 5. Knowledge Extraction (`/admin/knowledge`)

**Features**:
- List of approved content awaiting extraction
- Status badges for each content
- Extract button with validation

**Button Rules**:
- Enabled only if `extractionStatus === 'NOT_STARTED' || 'VERIFIED'`
- Disabled with explanation if already processed
- Confirmation modal before extraction

### 6. Topic Detail (`/admin/topics/[id]`)

**Features**:
- Topic name and lesson
- Knowledge point count
- Allowed flashcard types (read-only badges)
- Generation panel with mode/provider selectors

**Generation Panel**:
- Mode: APPEND / REPLACE
- Provider: OpenAI / Gemini / Default
- Generate button

**Button Rules**:
- Disabled if no knowledge points
- Disabled if no allowed flashcard types
- Shows warning with reasons if disabled

**Coverage Report** (after generation):
- Total knowledge points
- Used (queued for generation)
- Skipped
- Skip reasons breakdown
- Coverage percentage

### 7. Flashcards (`/admin/flashcards`)

**Features**:
- List of all flashcards
- Filter by status (All, Pending, Approved)
- Card type badges
- Lesson badges
- Knowledge point links

**Actions**:
- Regenerate (single card)
- Delete
- Disable/Enable (future)

**Rules**:
- Flashcards are NOT auto-published
- All require manual approval

### 8. Logs (`/admin/logs`)

**Features**:
- Audit trail of all admin actions
- Filter by success/failure
- Shows: timestamp, action, admin user, mode/provider, results, status

**Information Tracked**:
- Admin user ID
- Action type
- Mode (APPEND/REPLACE)
- Provider (OpenAI/Gemini)
- Result counts
- Error messages

## UX Principles Implemented

### 1. Never Allow Actions Out of Order
- Tabs disabled if prerequisites not met
- Buttons disabled with clear explanations
- State machine validation on backend

### 2. Disable Instead of Show Errors
- Buttons show disabled state
- Tooltips explain why disabled
- No error messages for invalid actions

### 3. Always Explain Why Disabled
- Tooltips on disabled buttons
- Warning messages in panels
- Status badges show current state

### 4. AI Suggests, Human Decides
- AI classification shown as read-only
- Marked as "AI suggestion"
- Final decision in approval step

### 5. Prefer Rejecting Over Silent Failure
- Validation before actions
- Confirmation modals for destructive actions
- Clear error messages if validation fails

## Pipeline Flow

```
1. Upload → Batch created (PENDING)
2. OCR Processing → Batch status: PROCESSING → UPLOADED
3. Classification → Batch status: CLASSIFIED
4. Content Review → Approve blocks → Batch status: REVIEWED
5. Knowledge Extraction → Extract from approved content → Batch status: KNOWLEDGE_EXTRACTED
6. Flashcard Generation → Generate from topics → Batch status: COMPLETED
```

## API Integration

### Required Endpoints

- `GET /admin/dashboard` - Work queue counts (TODO)
- `GET /admin/batches` - Batch list
- `GET /admin/batches/[id]` - Batch detail
- `GET /admin/batches/[id]/approved-content` - Approved content (TODO)
- `POST /admin/approved-contents/[id]/extract-knowledge` - Extract knowledge
- `POST /admin/topics/[id]/generate-flashcards` - Generate flashcards (with coverage)
- `GET /admin/flashcards` - Flashcard list (TODO)
- `GET /admin/logs` - Audit logs (TODO)

## Status Badge Colors

- **PENDING**: Gray
- **PROCESSING**: Blue
- **UPLOADED**: Green
- **CLASSIFIED**: Purple
- **REVIEWED**: Yellow
- **KNOWLEDGE_EXTRACTED**: Indigo
- **COMPLETED**: Green
- **CANCELLED**: Red

## Next Steps

1. Implement missing API endpoints
2. Add work queue count fetching
3. Complete Pages/Blocks tab in batch detail
4. Add knowledge review & merge interface
5. Add flashcard approval workflow
6. Implement audit log fetching
