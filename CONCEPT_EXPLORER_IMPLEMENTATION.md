# Concept Explorer — Implementation Guide

## ✅ Completed Implementation

The Concept Explorer admin module has been successfully implemented based on the specification document. Here's what was created:

---

## 📂 File Structure

```
admin/app/concepts/
├── page.tsx                    # Main concepts list page (server component)
├── ConceptsView.tsx            # List view UI (client component)
├── [id]/
│   ├── page.tsx               # Concept detail page (server component)
│   └── ConceptDetailView.tsx  # Detail view with tabs (client component)
└── merge/
    └── page.tsx               # Concept merge interface (client component)
```

---

## 🎯 Implemented Features

### 1. Concept List View (`/concepts`)

**Features:**
- ✅ Searchable table with all concepts
- ✅ Filter by Concept Type (NERVE, MUSCLE, VESSEL, etc.)
- ✅ Filter by Status (ACTIVE, NEEDS_REVIEW, MERGED)
- ✅ Displays: Preferred Label, Type, Alias Count, Prerequisite Count, Question Count
- ✅ Quick actions: View, Edit, Flag
- ✅ Color-coded badges for types and statuses
- ✅ Normalized key shown as secondary text

**URL:** `/concepts`

---

### 2. Concept Detail View (`/concepts/[id]`)

**Features:**
- ✅ Header with concept info and action buttons
- ✅ Stats overview (aliases, prerequisites, questions, topics)
- ✅ 4 tabs with comprehensive data:

#### Tab A: Aliases
- ✅ List of all synonyms (TR/EN/LA)
- ✅ Shows source (AI/ADMIN/IMPORT)
- ✅ Usage frequency counter
- ✅ Active/Disabled status
- ✅ Add/Disable actions

#### Tab B: Prerequisites
- ✅ Canonical prerequisite labels
- ✅ Role badges (PRIMARY/SECONDARY)
- ✅ Edge strength indicators (WEAK/MEDIUM/STRONG)
- ✅ Topic coverage percentage
- ✅ Color-coded strength (STRONG highlighted)
- ✅ Change Role / Rebind actions

#### Tab C: Questions
- ✅ List of questions testing this concept
- ✅ Question text preview (truncated)
- ✅ Year, topic, difficulty display
- ✅ Average difficulty calculation
- ✅ Link to question detail page

#### Tab D: Topics
- ✅ Grid view of topics using this concept
- ✅ Frequency indicators
- ✅ Visual frequency bars
- ✅ Last used date
- ✅ Lesson categorization

**URL:** `/concepts/[id]`

---

### 3. Concept Merge View (`/concepts/merge`)

**Features:**
- ✅ Two-column source/target comparison
- ✅ Search for target concept
- ✅ Visual preview of merge impact
- ✅ Shows: aliases to migrate, prerequisites, questions
- ✅ After-merge statistics
- ✅ Warning banner with caution notes
- ✅ Color-coded: source (red), target (green)
- ✅ Execute merge action

**URL:** `/concepts/merge?source=[id]`

---

## 🔌 API Integration (lib/api.ts)

Added complete API layer:

```typescript
api.getConcepts(filters)          // List with filters
api.getConcept(id)                // Get detail
api.createConcept(data)           // Create new
api.updateConcept(id, data)       // Update
api.mergeConcepts(source, target) // Merge
api.getMergePreview(s, t)         // Preview merge
api.addConceptAlias(id, data)     // Add alias
api.disableConceptAlias(id, aid)  // Disable alias
api.searchConcepts(query)         // Search
```

---

## 🎨 UX Implementation

**✅ Following Design Principles:**

1. **ID Never Shown** - Only preferred labels visible to users
2. **Preferred Label Always Visible** - In headers and tables
3. **Aliases in Tooltips** - (Can be enhanced with hover states)
4. **Strong Edges Highlighted** - Visual emphasis with color/weight
5. **Normalized Key Read-Only** - Displayed but not editable

**Visual Design:**
- Clean table layouts with hover states
- Color-coded badges for quick scanning
- Responsive grid layouts
- Tab-based navigation for complex data
- Warning banners for critical actions
- Progress indicators and stats

---

## 🔐 Security Notes

The following rules are documented but need backend enforcement:

- ❌ AI cannot create concepts
- ❌ Questions with concept links cannot delete concepts
- ✅ Only ADMIN role can create/merge
- ✅ All merges logged to audit trail (backend requirement)

---

## 🚀 Next Steps for Backend

To make this functional, implement these backend endpoints:

### Core CRUD
```
GET    /admin/concepts
GET    /admin/concepts/:id
POST   /admin/concepts
PATCH  /admin/concepts/:id
```

### Merge Operations
```
POST   /admin/concepts/merge
GET    /admin/concepts/merge-preview
```

### Alias Management
```
POST   /admin/concepts/:id/alias
DELETE /admin/concepts/:id/alias/:aliasId
```

### Search
```
GET    /admin/concepts/search?q=...
```

---

## 📊 Data Models Expected

### Concept
```typescript
{
  id: string
  preferredLabel: string
  normalizedKey: string
  conceptType: 'NERVE' | 'MUSCLE' | 'VESSEL' | 'STRUCTURE' | 'ORGAN' | 'BONE' | 'JOINT' | 'LIGAMENT'
  status: 'ACTIVE' | 'NEEDS_REVIEW' | 'MERGED'
  aliasCount: number
  prerequisiteCount: number
  questionCount: number
  createdAt: string
  updatedAt: string
}
```

### ConceptDetail (includes relations)
```typescript
{
  ...Concept
  aliases: ConceptAlias[]
  prerequisites: ConceptPrerequisite[]
  questions: ConceptQuestion[]
  topics: ConceptTopic[]
}
```

See type definitions in respective page.tsx files for detailed schemas.

---

## 🎯 Usage Flow

1. **Browse Concepts** → Navigate to `/concepts`
2. **Filter/Search** → Use type and status filters
3. **View Details** → Click on concept name
4. **Explore Tabs** → Navigate between Aliases, Prerequisites, Questions, Topics
5. **Merge Duplicates** → Click "Merge" button, search for target, execute

---

## 🔧 Customization Options

### Add More Concept Types
Update the `CONCEPT_TYPE_COLORS` constant in both list and detail views.

### Add Filters
Extend the filter section in [ConceptsView.tsx](admin/app/concepts/ConceptsView.tsx#L67-L116)

### Enhance Tabs
Add more tabs in [ConceptDetailView.tsx](admin/app/concepts/[id]/ConceptDetailView.tsx#L106-L133)

---

## 📝 Notes

- All components use TypeScript with proper type definitions
- Client components marked with `'use client'`
- Server components fetch data directly from backend
- Error handling implemented for API failures
- Loading states for async operations
- Responsive design with Tailwind CSS
- Following Next.js 13+ app directory conventions

---

## 🎨 Color Coding Reference

**Concept Types:**
- NERVE → Purple
- MUSCLE → Red
- VESSEL → Blue
- STRUCTURE → Green
- ORGAN → Yellow
- BONE → Gray
- JOINT → Orange
- LIGAMENT → Pink

**Edge Strength:**
- WEAK → Gray
- MEDIUM → Yellow
- STRONG → Green (bold)

**Status:**
- ACTIVE → Green
- NEEDS_REVIEW → Yellow
- MERGED → Gray

---

## ✨ Ready for Integration

The frontend is complete and ready for backend API integration. Once the endpoints are implemented, the admin panel will be fully functional!
