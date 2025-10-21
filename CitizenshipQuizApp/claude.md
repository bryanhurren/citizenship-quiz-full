# US Citizenship Quiz App

## Overview

A comprehensive mobile and web application designed to help individuals prepare for the US Citizenship civics test. The app provides an interactive, AI-powered quiz experience with two distinct modes: a professional USCIS interview simulation and a comedy mode featuring dark humor.

## Customer Goals

### End User (Quiz Taker)

**Primary Goal**: Successfully prepare for the US Citizenship civics test through interactive practice

**Key Needs**:
- Practice citizenship test questions based on filing date (2008 vs 2025 test versions)
- Receive immediate, intelligent feedback on answers
- Track progress across multiple sessions
- Choose between serious study mode or entertaining comedy mode
- Resume quiz sessions across devices
- Monitor scores and improvement over time

**User Flow**:
1. Sign in with Google or Apple
2. Enter invite code (new users only)
3. Select test version (2008 or 2025) based on Form N-400 filing date
4. Choose quiz mode (formal or comedy)
5. Answer questions and receive AI-generated feedback
6. Track progress and scores
7. Resume sessions or start new ones

### Admin User

**Primary Goal**: Control access to the application through invite code management

**Key Needs**:
- Generate unique invite codes
- View all created codes and their usage status
- Track which users have used which codes
- Secure admin interface access

**User Flow**:
1. Access admin web interface
2. Create new invite codes
3. Distribute codes to approved users
4. Monitor code usage

## Primary Features

### 1. Dual Test Version Support
- **2008 Test**: 100 questions for users who filed Form N-400 before Oct 20, 2025 (60/100 to pass)
- **2025 Test**: 128 questions for users who filed Form N-400 on/after Oct 20, 2025 (77/128 to pass)

### 2. Quiz Modes

**Formal Mode**:
- Professional USCIS interview simulation
- Educational feedback
- Retry allowed only for partial answers

**Comedy Mode (18+)**:
- Anthony Jeselnik-style roast with dark humor
- Profanity and offensive content
- Retry allowed for both partial and incorrect answers

### 3. AI-Powered Evaluation
- Intelligent answer grading (correct/partial/incorrect)
- Contextual feedback based on selected mode
- Powered by Claude API

### 4. Authentication & Security
- OAuth integration (Google Sign-In & Apple Sign-In)
- Invite code system for new user registration
- Persistent user sessions

### 5. Progress Tracking
- Session management with auto-save
- Resume capability from last answered question
- Score tracking (correct/partial/incorrect counts)
- Best score tracking
- Question results history

### 6. User Profile
- View current session status
- Check statistics and scores
- Resume or start new sessions
- Account management

## Platform Support

### Mobile (Primary Platform)
- **iOS**: Native app built with Expo SDK 54 / React Native
- **Android** Native app built with tbd
- **Features**: Full quiz experience, OAuth authentication, offline-capable session storage
- **Distribution**: TestFlight / App Store

### Web
- **Admin Interface**: Invite code management dashboard
  - URL: `http://localhost:3000` (development)
  - Deployed at production URL

- **Quiz Interface**: Web version of quiz app
  - Supports both test versions and modes
  - Same functionality as mobile app

## Project Structure

```
CitizenshipQuizApp/
├── src/
│   ├── components/          # Reusable UI components
│   │   ├── Button.tsx
│   │   ├── Input.tsx
│   │   ├── Card.tsx
│   │   ├── Badge.tsx
│   │   ├── ModeOptionCard.tsx
│   │   ├── GoogleSignInButton.tsx
│   │   ├── WelcomeModal.tsx
│   │   └── index.ts
│   │
│   ├── screens/             # Main app screens
│   │   ├── LoginScreen.tsx        # OAuth login
│   │   ├── ModeSelectionScreen.tsx # Test version & mode selection
│   │   ├── QuizScreen.tsx         # Quiz interface
│   │   ├── ResultsScreen.tsx      # Quiz completion results
│   │   ├── ProfileScreen.tsx      # User profile & session management
│   │   └── index.ts
│   │
│   ├── navigation/          # React Navigation setup
│   │   └── AppNavigator.tsx       # Tab + Stack navigation
│   │
│   ├── store/               # State management
│   │   └── quizStore.ts           # Zustand store with AsyncStorage
│   │
│   ├── services/            # External services
│   │   ├── api.ts                 # Claude API integration
│   │   └── supabase.ts            # Database operations
│   │
│   ├── data/                # Question datasets
│   │   ├── questions.js           # 2008 test (100 questions)
│   │   └── questions-2025.js      # 2025 test (128 questions)
│   │
│   ├── constants/           # App configuration
│   │   └── theme.ts               # Colors, spacing, fonts
│   │
│   └── types/               # TypeScript definitions
│       └── index.ts
│
├── assets/                  # Static assets
│   └── google-logo.png
│
├── admin/                   # Web admin interface
│   └── admin.html
│
├── server.js                # Express server for admin & API
├── App.tsx                  # Root mobile app component
├── app.json                 # Expo configuration
└── package.json
```

## Technology Stack

### Mobile App
- **Framework**: Expo SDK 54, React Native
- **Language**: TypeScript
- **State Management**: Zustand with AsyncStorage persistence
- **Navigation**: React Navigation (Bottom Tabs + Stack Navigator)
- **Authentication**:
  - `expo-apple-authentication`
  - `@react-native-google-signin/google-signin`
- **Storage**: `@react-native-async-storage/async-storage`

### Backend
- **Database**: Supabase (PostgreSQL)
- **API**: Express.js
- **AI**: Claude API (Anthropic)

### Web Admin
- **Server**: Node.js / Express
- **Frontend**: Vanilla HTML/CSS/JavaScript
- **Port**: 3000

## Database Schema

### Users Table
```typescript
{
  id: number
  username: string (email)
  password: string (empty for OAuth)
  current_question: number
  correct_count: number
  partial_count: number
  incorrect_count: number
  question_results: QuestionResult[]
  completed: boolean
  best_score: number
  last_session_date: string | null
  mode: 'formal' | 'comedy'
  test_version: '2008' | '2025'
  created_at: string
}
```

### Invite Codes Table
```typescript
{
  id: number
  code: string (unique)
  used: boolean
  used_by: string | null
  created_at: string
}
```

## Key Workflows

### New User Registration
1. User clicks Google/Apple Sign-In
2. System checks if user exists
3. If new user → prompt for invite code
4. Validate code → create user account
5. Mark code as used → log in user
6. Present "You" tab

### Quiz Session
1. From "You" tab, user selects "start or resume quiz"
2. User selects test version (2008/2025)
3. User selects mode (formal/comedy)
4. Questions are shuffled using Fisher-Yates algorithm
5. For each question:
   - User submits answer
   - AI evaluates answer (correct/partial/incorrect)
   - User receives feedback
   - Optional retry based on mode rules
   - Progress auto-saved to database
   - Progress ("correct", "partial", and "incorrect") represented in the UI
6. Quiz completion → update best score

### Session Resume
1. From "You" tab User clicks "Resume Session", OR user has a session in progress and clicks the "Session" tab
2. Load saved progress from database
3. Restore question set, mode, version, and display progress/ score
4. Re-shuffle questions (same set, same order from previous session)
5. Continue from saved question index

## Configuration

### Environment Variables
- `SUPABASE_URL`: Supabase project URL
- `SUPABASE_ANON_KEY`: Supabase anonymous key
- `ANTHROPIC_API_KEY`: Claude API key
- Google OAuth client IDs (web + iOS)

### Test Thresholds
- **2008 Test**: 60/100 correct to pass (60%)
- **2025 Test**: 77/128 correct to pass (60%)

## Development Setup

1. Install dependencies: `npm install`
2. Start admin server: `node server.js` (port 3000)
3. Start mobile app: `npx expo start`
4. Run on iOS: `npx expo run:ios`
5. Configure OAuth credentials in `App.tsx`

## Design Guidelines

### Google Sign-In Button Compliance
Must follow [Google's branding guidelines](https://developers.google.com/identity/branding-guidelines):
- Background: #FFFFFF
- Border: #747775 (1px, inside)
- Text: #1F1F1F, Roboto Medium, 14px/20px
- Official Google logo (18x18px)

### Color Scheme
- Primary: #2563eb (blue)
- Correct: #22c55e (green)
- Partial: #f59e0b (orange)
- Incorrect: #ef4444 (red)
- Comedy: #a855f7 (purple)
- Formal: #6366f1 (indigo)

## Future Enhancements
- Android app support
- Login with Apple
- Detailed analytics dashboard

## Project Guidelines

- **Library Usage:** Always prioritize the latest stable versions of libraries.
- **Documentation:** Consult the official documentation for [Library Name] at [Link to Documentation] before implementing new features or making significant changes.
- **Dependency Updates:** If a dependency is updated, ensure Claude is aware of the new version and its corresponding documentation.
- **State, and act, commensurate with changes:** Let me know if changes made are well supported by "fast refresh" or if a "full reload" of the simulator is required.
- **Current Documentation Verification:** When referencing documentation for libraries, APIs, and development tools:
  - Always confirm the current date (today's date from system context)
  - Verify that referenced documentation is current and reflects the latest stable versions
  - Re-confirm documentation sources are up-to-date before providing implementation guidance
  - If documentation version is uncertain, explicitly search for or request the latest official documentation
  - When behavior differs from expectations, question whether referenced documentation is current

## Debugging: Research-First Approach

**For bugs and recurrent issues:**

1. **Research Before Fixing**
   - Web search for known bugs/issues with library + version + year
   - Check GitHub issues, Stack Overflow, official docs
   - Verify current best practices and recommended solutions

2. **For Recurrent Issues**
   - If an issue persists after 2+ fix attempts, STOP and research
   - Question: Is this a known bug in the dependency itself?
   - Rule out root causes before attempting another workaround

3. **Present Findings First**
   - Summarize research (what's known, what's recommended)
   - Explain root cause
   - Propose solution options
   - Get approval before implementing
