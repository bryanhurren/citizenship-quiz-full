# Citizenship Quiz App - Next Steps & Summary

## 🎉 WHAT'S BEEN BUILT (30% Complete)

### ✅ **Complete Infrastructure** (Production Ready)
- Expo project with TypeScript
- Full navigation system (tabs + stacks)
- Zustand state management with session persistence
- Supabase integration (authentication, database)
- API service for quiz evaluation
- Complete TypeScript type system
- Design system matching web app
- Both question datasets (2008 + 2025)

### ✅ **Working Components** (Ready to Use)
- **Button** - Primary, secondary, danger variants with loading states
- **Input** - Text input with labels, validation, error messages
- **Card** - Container component with shadows
- **Badge** - Status badges (formal, comedy, primary)
- **ModeOptionCard** - Selectable card for modes/test versions

### ✅ **Complete Screens**
- **LoginScreen** - FULLY FUNCTIONAL ✓
  - Username/password login
  - Create new account with invite code
  - Form validation
  - Error handling
  - OAuth placeholders (Apple, Google)
  - Auto-login after account creation

### 🚧 **Placeholder Screens** (Need Implementation)
- ModeSelectionScreen
- QuizScreen
- ResultsScreen
- ProfileScreen

---

## 📱 TEST IT NOW!

**Run the app:**
```bash
cd /Users/bryanhurren/Documents/claude-test/CitizenshipQuizApp
npm start
```

**What works:**
- ✅ Tab navigation (Session, You)
- ✅ Full Login/Create Account flow
- ✅ Component styling
- ✅ Navigation between screens

**What to expect:**
- Login screen is fully functional
- Can create account and log in
- Other screens show placeholders
- Navigation works between all tabs

---

## 🎯 REMAINING WORK (70% to go)

### Priority 1: Mode Selection Screen (3-4 hours)
**File:** `/src/screens/ModeSelectionScreen.tsx`

**What it needs:**
```typescript
- Test version selector (2008 vs 2025)
  - Show context: "File N-400 before Oct 20, 2025 → 2008 test"
  - Show context: "File N-400 on/after Oct 20, 2025 → 2025 test"

- Mode selector (Formal vs Comedy)
  - Formal: "Professional USCIS interview simulation"
  - Comedy: "Anthony Jeselnik roast style (18+)"
  - Warning box for comedy mode

- Start Quiz button
  - Disabled until both selections made
  - Navigates to QuizScreen
  - Initializes quiz state
```

**Implementation template:**
```typescript
import React, { useState } from 'react';
import { View, Text, ScrollView, StyleSheet } from 'react-native';
import { Button, ModeOptionCard } from '../components';
import { useQuizStore } from '../store/quizStore';
import { TestVersion, QuizMode } from '../types';

export const ModeSelectionScreen = ({ navigation }) => {
  const [testVersion, setTestVersion] = useState<TestVersion | null>(null);
  const [mode, setMode] = useState<QuizMode | null>(null);

  const setSelectedTestVersion = useQuizStore(state => state.setSelectedTestVersion);
  const setSelectedMode = useQuizStore(state => state.setSelectedMode);

  const handleStartQuiz = () => {
    if (testVersion && mode) {
      setSelectedTestVersion(testVersion);
      setSelectedMode(mode);
      // TODO: Initialize quiz (shuffle questions, reset counts)
      navigation.navigate('Quiz');
    }
  };

  return (
    <ScrollView style={styles.container}>
      <Text style={styles.title}>Select Test Version</Text>

      <ModeOptionCard
        title="2008 Test (100 questions)"
        description="File Form N-400 before Oct 20, 2025 → Need 60/100 to pass"
        selected={testVersion === '2008'}
        onPress={() => setTestVersion('2008')}
      />

      <ModeOptionCard
        title="2025 Test (128 questions)"
        description="File Form N-400 on/after Oct 20, 2025 → Need 77/128 to pass (60%)"
        selected={testVersion === '2025'}
        onPress={() => setTestVersion('2025')}
      />

      {/* Similar for mode selection */}

      <Button
        title="Start Quiz"
        onPress={handleStartQuiz}
        disabled={!testVersion || !mode}
      />
    </ScrollView>
  );
};
```

### Priority 2: Quiz Screen (6-8 hours)
**File:** `/src/screens/QuizScreen.tsx`

**What it needs:**
- Display current question with number
- Textarea for answer input
- Submit button with loading state
- Feedback display (correct/partial/incorrect)
- Next question button
- Progress stats (X/100 or X/128)
- Quit & Save button
- Integration with API evaluation
- Retry logic for partial/incorrect answers

**Key logic:**
```typescript
- Load question from shuffled array
- Submit answer → call evaluateAnswer API
- Handle response (correct/partial/incorrect)
- Update question results
- Save session to database
- Next question or complete quiz
```

### Priority 3: Results Screen (3-4 hours)
**File:** `/src/screens/ResultsScreen.tsx`

**What it needs:**
- Final score (e.g., "75%")
- Pass/fail message (test-version dependent)
- Score breakdown (correct, partial, incorrect)
- List of incorrect/partial answers for review
- "Start New Session" button
- Celebration/encouragement based on score

### Priority 4: Profile Screen (4-5 hours)
**File:** `/src/screens/ProfileScreen.tsx`

**What it needs:**
- User profile card (username, best score)
- Session history list
  - In-progress session (Resume button)
  - Completed sessions (date, test version, score)
- Logout button
- Empty state if no sessions

---

## 📊 File Structure Reference

```
CitizenshipQuizApp/
├── App.tsx ✅
├── src/
│   ├── components/ ✅
│   │   ├── Button.tsx
│   │   ├── Input.tsx
│   │   ├── Card.tsx
│   │   ├── Badge.tsx
│   │   ├── ModeOptionCard.tsx
│   │   └── index.ts
│   ├── constants/ ✅
│   │   └── theme.ts
│   ├── data/ ✅
│   │   ├── questions.js (2008)
│   │   └── questions-2025.js (2025)
│   ├── navigation/ ✅
│   │   └── AppNavigator.tsx
│   ├── screens/
│   │   ├── LoginScreen.tsx ✅
│   │   ├── ModeSelectionScreen.tsx 🚧
│   │   ├── QuizScreen.tsx 🚧
│   │   ├── ResultsScreen.tsx 🚧
│   │   ├── ProfileScreen.tsx 🚧
│   │   └── index.ts ✅
│   ├── services/ ✅
│   │   ├── supabase.ts
│   │   └── api.ts
│   ├── store/ ✅
│   │   └── quizStore.ts
│   └── types/ ✅
│       └── index.ts
```

---

## 🔑 Key Functions & Imports

**From `useQuizStore`:**
```typescript
const currentUser = useQuizStore(state => state.currentUser);
const setCurrentUser = useQuizStore(state => state.setCurrentUser);
const selectedMode = useQuizStore(state => state.selectedMode);
const selectedTestVersion = useQuizStore(state => state.selectedTestVersion);
const setShuffledQuestions = useQuizStore(state => state.setShuffledQuestions);
const saveSession = useQuizStore(state => state.saveSession);
const completeQuiz = useQuizStore(state => state.completeQuiz);
```

**From `services/api`:**
```typescript
import { evaluateAnswer } from '../services/api';

const evaluation = await evaluateAnswer(
  question.q,
  question.a,
  userAnswer,
  selectedMode
);
// Returns: { grade: 'correct' | 'partial' | 'incorrect', feedback: string }
```

**Load questions:**
```typescript
import { allQuestions } from '../data/questions';
import { allQuestions2025 } from '../data/questions-2025';

const questions = selectedTestVersion === '2025' ? allQuestions2025 : allQuestions;
```

---

## 🚀 Quick Start for Next Session

1. **Test current build:**
   ```bash
   cd CitizenshipQuizApp
   npm start
   # Press 'w' for web, 'i' for iOS, 'a' for Android
   ```

2. **Build Mode Selection screen** (start here)
   - Copy template from Priority 1 above
   - Use `ModeOptionCard` component
   - Wire up to Zustand store

3. **Build Quiz screen**
   - Most complex screen
   - Refer to web app (`citizenship-quiz.html`) for logic
   - Use `evaluateAnswer` from API service

4. **Build Results & Profile screens**
   - Straightforward UI
   - Display quiz results
   - Show session history

5. **Test end-to-end**
   - Complete quiz flow
   - Session persistence
   - Cross-platform testing

---

## 📦 Deployment

**Web:**
```bash
npx expo export:web
# Deploy `web-build` folder to Vercel
```

**iOS/Android (when ready):**
```bash
# Install EAS CLI
npm install -g eas-cli

# Build iOS
eas build --platform ios

# Build Android
eas build --platform android
```

---

## 🐛 Known Issues / TODOs

- [ ] Add question shuffling logic in ModeSelectionScreen
- [ ] Implement retry logic in QuizScreen (formal = no retry for incorrect, comedy = one retry)
- [ ] Add pass/fail threshold checks (2008: 60/100, 2025: 77/128)
- [ ] Format session dates as DD-MM-YYYY
- [ ] Add loading spinners for async operations
- [ ] Test on actual iOS/Android devices
- [ ] Add error boundaries
- [ ] Implement offline support
- [ ] Add analytics/crash reporting

---

## 💡 Tips

- **Styling**: All colors/fonts are in `src/constants/theme.ts`
- **State**: Use Zustand store, avoid local state for quiz data
- **Navigation**: Use `navigation.navigate('ScreenName')` from `@react-navigation/native`
- **Components**: Import from `'../components'` (index file exports all)
- **Testing**: Test on web first (faster), then iOS/Android

---

## 📞 Help

If you get stuck:
1. Check `web app (citizenship-quiz.html)` for reference logic
2. Check Zustand store for available state/actions
3. Check TypeScript types for data structures
4. Test components in isolation first

**Current Status: 30% Complete**
**Estimated Time Remaining: ~20 hours**

Good luck building! 🚀
