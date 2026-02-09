# QuestionCard Mobile Implementation - Student Experience

## 🎯 Overview

Complete implementation of the QuestionCard student mobile experience for the TUS Medical Exam Learning Platform. This implementation follows the core principles:

- **QuestionCard measures knowledge, it does NOT teach**
- **Mobile UI is fast, minimal, and distraction-free**
- **Student experience matches Admin Solve Mode behavior**
- **Explanations are revealed ONLY after answer submission**

---

## ✅ Implemented Features (P0 - Critical)

### 1️⃣ Real API Integration
- ✅ Connected to backend endpoints: `/api/student/questions`
- ✅ Question fetching with filters (lesson, topic, subtopic, difficulty, sourceType)
- ✅ Answer submission to `/api/student/questions/:id/answer`
- ✅ Proper error handling and timeout configuration
- ✅ Environment-based API URL configuration

**Files:**
- `src/features/QuestionBank/api.ts` - Complete API client
- `.env` - API URL configuration

### 2️⃣ Time Tracking
- ✅ Accurate time measurement from question display to answer submission
- ✅ Time sent to backend in seconds (converted from ms)
- ✅ Average time per question displayed in session summary
- ✅ No mock values - real timer implementation

**Files:**
- `src/features/QuestionBank/screens/QuestionCardScreen.tsx` - Timer logic

### 3️⃣ Collapsible Explanation Sections
- ✅ **Main Explanation** - Always visible after submit
- ✅ **Per-Option Explanations** - Collapsible, shows `wouldBeCorrectIf` for each option
- ✅ **Exam Trap** - Collapsible section with `confusedWith` and `keyDifference`
- ✅ **Clinical Correlation** - Collapsible clinical context
- ✅ **Spatial Contexts** (Anatomy) - Collapsible list of anatomical relations
  - Format: `"Ligamentum flavum — posterior to — dura mater"`

**Files:**
- `src/features/QuestionBank/components/ExplanationView.tsx` - Complete explanation UI

### 4️⃣ Session Management
- ✅ Session-based question flow (default: 20 questions)
- ✅ Progress indicator (e.g., "5 / 20")
- ✅ Session statistics tracking:
  - Total questions
  - Correct count
  - Time spent (total and average)
  - Accuracy percentage
- ✅ Session summary screen with detailed stats

**Files:**
- `src/features/QuestionBank/screens/QuestionQueueScreen.tsx` - Session management
- `src/features/QuestionBank/screens/SessionSummaryScreen.tsx` - Summary UI

### 5️⃣ Enhanced Type System
- ✅ `SpatialContext` interface with proper structure
- ✅ `ExamTrap` interface for trap questions
- ✅ Updated `AnswerResult` with all explanation fields
- ✅ `QuestionFilter` with sourceType (excludes EXAM_REPLICA from adaptive feed)

**Files:**
- `src/features/QuestionBank/types.ts` - Complete type definitions

---

## 📱 Screen Flow

### Question Session Flow
```
QuestionQueueScreen (Session Manager)
  ↓
QuestionCardUI (Individual Question)
  ├─ QuestionStem (Question text + EXAM_REPLICA badge)
  ├─ OptionCard (A-E options with state management)
  ├─ SessionFooter (Submit/Next buttons)
  └─ ExplanationView (After submit)
       ├─ Result Banner (Correct/Incorrect)
       ├─ Main Explanation
       ├─ Per-Option Explanations (collapsible)
       ├─ Exam Trap (collapsible)
       ├─ Clinical Correlation (collapsible)
       └─ Spatial Contexts (collapsible)
  ↓
SessionSummaryScreen (Session Results)
  ├─ Accuracy %
  ├─ Correct/Incorrect counts
  ├─ Average time per question
  └─ Actions (Retry wrong, New session, Home)
```

---

## 🔐 Security & Data Rules

✅ **Implemented:**
- correctAnswer is NOT exposed before submission (backend enforces this)
- Server-validated correctness (no client-side answer checking)
- UserAnswer records persisted on backend
- EXAM_REPLICA questions excluded from adaptive feed via sourceType filter
- timesShown and correctRate updated server-side automatically

---

## 🎨 UX Features

✅ **Implemented:**
- **No answer changes after submit** - Selection locked after submission
- **Clear visual states:**
  - Selected (blue highlight)
  - Correct (green with checkmark)
  - Incorrect (red with X)
  - Missed correct answer (green outline)
- **Submit button always visible** in footer
- **Explanations collapsed by default** - User expands what they need
- **Fast transitions** - No heavy animations
- **Progress indicator** - Always visible during session
- **EXAM_REPLICA badge** - 🟡 Çıkmış Soru (TUS) for past exam questions

---

## 🚀 Setup Instructions

### 1. Environment Configuration

Create `.env` file in `mobile-app/` directory:
```bash
# For iOS Simulator
EXPO_PUBLIC_API_URL=http://localhost:3000

# For Android Emulator
# EXPO_PUBLIC_API_URL=http://10.0.2.2:3000

# For Physical Device (replace with your local IP)
# EXPO_PUBLIC_API_URL=http://192.168.1.100:3000
```

### 2. Install Dependencies
```bash
cd mobile-app
npm install
```

### 3. Start Backend API
```bash
cd api
npm run start:dev
```

### 4. Start Mobile App
```bash
cd mobile-app
npx expo start
```

---

## 📊 API Integration Details

### Endpoints Used

#### 1. Get Questions
```typescript
GET /api/student/questions
Query Params:
  - lessonId?: string
  - topicId?: string
  - subtopicId?: string
  - difficulty?: 'EASY' | 'MEDIUM' | 'HARD'
  - sourceType?: 'ADMIN' | 'AI_GENERATION' | 'ERROR_BASED'
  - limit?: number

Response: { questions: QuestionCard[] }
```

#### 2. Submit Answer
```typescript
POST /api/student/questions/:id/answer
Body:
  - userId: string (TODO: from auth)
  - selectedAnswer: 'A' | 'B' | 'C' | 'D' | 'E'
  - timeSpent: number (seconds)

Response: {
  isCorrect: boolean,
  correctAnswer: string,
  explanation: string,
  optionsMetadata: {...},
  examTrap?: {...},
  clinicalCorrelation?: string,
  spatialContexts?: [...],
  affectedKnowledgePoints?: string[]
}
```

---

## 🧪 Testing Checklist

### Manual Testing
- [ ] Questions load from real backend
- [ ] Timer starts on question display
- [ ] Submit disabled until option selected
- [ ] Answer lock after submission
- [ ] Correct/incorrect feedback shows immediately
- [ ] All explanation sections expandable
- [ ] Spatial contexts render properly (if present)
- [ ] Exam trap shows (if present)
- [ ] Clinical correlation shows (if present)
- [ ] Progress indicator updates
- [ ] Session summary calculates correctly
- [ ] Network errors handled gracefully

### Edge Cases
- [ ] No internet connection
- [ ] Backend timeout
- [ ] Invalid question ID
- [ ] Empty question list
- [ ] Question with missing optional fields

---

## 📈 Next Steps (P1 - High Priority)

### 1. Question Prefetching
- Prefetch next 2-3 questions during current question solve
- Cache in React Query
- Reduce perceived latency

### 2. Answer Lock UI Enhancement
- Visual indicator that answer is locked
- Subtle animation on lock

### 3. Loading States
- Skeleton screens during question load
- Shimmer effect
- Smooth transitions

### 4. Haptic Feedback
- Vibration on option select
- Success/error haptic on submit
- Native feel

---

## 🔄 Future Enhancements (P2+)

- [ ] Offline mode with local cache
- [ ] Retry wrong questions filter
- [ ] Knowledge point navigation from remediation
- [ ] Image support in question stems
- [ ] Bookmark/flag questions
- [ ] Session history
- [ ] Streak tracking
- [ ] Performance analytics dashboard

---

## 🐛 Known Issues / TODOs

1. **Authentication:** Currently using mock userId (`'student-mock-id'`)
   - TODO: Integrate with auth context
   - Get real user ID from JWT/session

2. **Prefetching:** Not implemented yet
   - Questions load one at a time
   - Network latency visible between questions

3. **Retry Wrong Questions:** Button exists but not functional
   - Need to implement wrong question filtering
   - Store failed question IDs in session state

4. **Accessibility:** Not fully tested
   - Screen reader support needed
   - Font scaling not verified

---

## 📝 Code Quality

### Best Practices Followed
- ✅ TypeScript strict mode
- ✅ Component composition
- ✅ Custom hooks for data fetching
- ✅ Proper error boundaries
- ✅ Loading states
- ✅ Responsive design
- ✅ Theme consistency

### Performance
- ✅ React Query caching
- ✅ Minimal re-renders
- ✅ Lazy state initialization
- ✅ Proper cleanup in useEffect

---

## 👥 Team Notes

**Backend Team:**
- All required endpoints are implemented and working
- No backend changes needed
- Analytics tracking automatic

**Mobile Team:**
- Core implementation complete (P0)
- Ready for testing with real data
- Can proceed with P1 features

**QA Team:**
- Test with real backend running on localhost
- Verify all explanation sections render
- Check session flow end-to-end
- Test network failure scenarios

---

## 📞 Support

For questions or issues:
1. Check backend is running: `curl http://localhost:3000/api/student/questions?limit=5`
2. Verify `.env` file has correct API_URL
3. Check console logs for API errors
4. Verify question data structure matches types

---

**Last Updated:** January 28, 2026
**Status:** ✅ P0 Complete - Ready for Testing
