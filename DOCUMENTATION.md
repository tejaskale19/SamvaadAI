# Samvaad AI - Complete Project Documentation

## Project Overview

Samvaad AI is an AI-powered content generation platform tailored for the Indian market. It generates social media content, translates to Hindi with cultural adaptations, predicts engagement scores, and includes a human approval workflow.

---

## Table of Contents

1. [Cultural Context Dataset](#1-cultural-context-dataset)
2. [Type Definitions](#2-type-definitions)
3. [API Service Layer](#3-api-service-layer)
4. [Backend API Routes](#4-backend-api-routes)
5. [Frontend Components](#5-frontend-components)
6. [Pages](#6-pages)
7. [Styling](#7-styling)
8. [Data Flow](#8-data-flow)
9. [Production Architecture](#9-production-architecture)
10. [Demo Scenario](#10-demo-scenario)
11. [Success Criteria](#11-success-criteria)
12. [Authentication](#12-authentication)

---

## 1. Cultural Context Dataset

### Description (Simple Language)
A data file containing Indian cultural information - festivals (Diwali, Holi, etc.), regional details (North/South/East/West India), social media best practices, sustainability terms in Hindi/English, and fashion keywords.

### Technical Details

**File Location:** `datasets/cultural_context.json`

**Structure:**
```json
{
  "festivals": ["Diwali", "Holi", "Ganesh Chaturthi", "Navratri", "Eid", "Pongal", "Durga Puja", "Onam", "Baisakhi", "Makar Sankranti"],
  
  "cultural_themes": {
    "family": ["संयुक्त परिवार", "परंपरा", "आशीर्वाद", "त्योहार"],
    "values": ["अतिथि देवो भव", "वसुधैव कुटुम्बकम्", "धर्म", "कर्म"],
    "celebrations": ["रंगोली", "दीये", "मिठाई", "पूजा"]
  },
  
  "regional_contexts": {
    "north": { "languages": [], "festivals": [], "themes": [] },
    "south": { "languages": [], "festivals": [], "themes": [] },
    "west": { "languages": [], "festivals": [], "themes": [] },
    "east": { "languages": [], "festivals": [], "themes": [] }
  },
  
  "social_media_trends": {
    "instagram": { "hashtag_patterns": [], "content_types": [], "optimal_posting_times": [] },
    "twitter": { "hashtag_patterns": [], "content_types": [], "optimal_posting_times": [] },
    "linkedin": { "hashtag_patterns": [], "content_types": [], "optimal_posting_times": [] },
    "facebook": { "hashtag_patterns": [], "content_types": [], "optimal_posting_times": [] }
  },
  
  "sustainability_keywords": {
    "hindi": ["पर्यावरण", "टिकाऊ", "प्राकृतिक", "जैविक", "हरित"],
    "english": ["Sustainable", "Eco-friendly", "Organic", "Natural", "Green"]
  },
  
  "fashion_themes": {
    "traditional": ["खादी", "Handloom", "Block Print", "Bandhani", "Chikankari"],
    "modern": ["Indo-Western", "Fusion", "Contemporary", "Minimalist"],
    "sustainable": ["Upcycled", "Zero-waste", "Natural dyes", "Organic cotton"]
  }
}
```

---

## 2. Type Definitions

### Description (Simple Language)
Blueprint definitions for all data structures used in the app - what content looks like, what predictions include, what approvals contain.

### Technical Details

**File Location:** `types/index.ts`

**Interfaces:**

```typescript
// Content Variant - Single AI-generated content piece
interface ContentVariant {
  id: string;
  content: string;
  platform: Platform;
  hashtags: string[];
  tone: 'professional' | 'casual' | 'inspirational' | 'humorous';
  engagementScore?: number;
}

// Generated Content - Complete generation response
interface GeneratedContent {
  id: string;
  prompt: string;
  variants: ContentVariant[];
  timestamp: string;
  status: 'draft' | 'approved' | 'rejected';
}

// Localized Content - Translation result
interface LocalizedContent {
  original: string;
  translated: string;
  language: string;
  culturalAdaptations: string[];
}

// Engagement Prediction - ML prediction result
interface EngagementPrediction {
  score: number;
  confidence: number;
  factors: {
    timing: number;
    hashtags: number;
    contentQuality: number;
    culturalRelevance: number;
  };
  recommendations: string[];
}

// Platform Type
type Platform = 'instagram' | 'twitter' | 'linkedin' | 'facebook';

// Approval Action - Human review action
interface ApprovalAction {
  contentId: string;
  variantId: string;
  action: 'approve' | 'reject' | 'edit';
  editedContent?: string;
  feedback?: string;
  approvedAt?: string;
}
```

---

## 3. API Service Layer

### Description (Simple Language)
Helper functions that connect the frontend to the backend - calling APIs to generate content, translate, predict engagement, and approve.

### Technical Details

**File Location:** `services/api.ts`

**Dependencies:** axios

**Exported Functions:**

| Function | Parameters | Returns | API Endpoint |
|----------|------------|---------|--------------|
| `generateContent()` | `GenerateContentRequest` | `Promise<GeneratedContent>` | POST `/api/generate` |
| `translateContent()` | `TranslateContentRequest` | `Promise<LocalizedContent>` | POST `/api/translate` |
| `predictEngagement()` | `PredictEngagementRequest` | `Promise<EngagementPrediction>` | POST `/api/predict-engagement` |
| `approveContent()` | `ApproveContentRequest` | `Promise<ApprovalAction>` | POST `/api/approve` |
| `getApprovedContent()` | None | `Promise<ApprovalAction[]>` | GET `/api/approved` |
| `getContentHistory()` | None | `Promise<GeneratedContent[]>` | GET `/api/history` |
| `getCulturalContext()` | None | `Promise<CulturalContext>` | GET `/api/cultural-context` |

---

## 4. Backend API Routes

### Description (Simple Language)
Server-side code that processes requests - generates 3 different content styles, translates to Hindi, calculates engagement scores, and saves approvals.

### Technical Details

**Location:** `src/pages/api/`

### 4.1 Content Generation API

**File:** `generate.ts`

**Endpoint:** `POST /api/generate`

**Request Body:**
```json
{
  "prompt": "Launching a sustainable clothing brand in India",
  "platform": "instagram",
  "numberOfVariants": 3
}
```

**Response:**
```json
{
  "id": "content-1709712000000",
  "prompt": "Launching a sustainable clothing brand in India",
  "variants": [
    {
      "id": "variant-1709712000000-0",
      "content": "🌿 Introducing our sustainable clothing line...",
      "platform": "instagram",
      "hashtags": ["#IndianFashion", "#DesiStyle", "#MadeInIndia"],
      "tone": "professional",
      "engagementScore": 85
    }
  ],
  "timestamp": "2026-03-06T10:00:00.000Z",
  "status": "draft"
}
```

**Logic:**
- Generates 3 variants with different tones (professional, casual, inspirational)
- Uses cultural context for hashtags and fashion themes
- Assigns random engagement score between 70-100

---

### 4.2 Translation API

**File:** `translate.ts`

**Endpoint:** `POST /api/translate`

**Request Body:**
```json
{
  "content": "Launching sustainable fashion...",
  "sourceLanguage": "English",
  "targetLanguage": "Hindi",
  "preserveCulturalContext": true
}
```

**Response:**
```json
{
  "original": "Launching sustainable fashion...",
  "translated": "🌿 भारतीय विरासत से प्रेरित हमारी टिकाऊ वस्त्र श्रृंखला...",
  "language": "Hindi",
  "culturalAdaptations": [
    "\"sustainable\" → \"टिकाऊ\"",
    "\"fashion\" → \"फैशन\"",
    "Added Hindi greeting \"नमस्ते\"",
    "Preserved cultural references",
    "Adapted tone for Indian audience"
  ]
}
```

**Logic:**
- Dictionary-based translation for key terms
- Adds cultural adaptations automatically
- Preserves emojis and formatting

---

### 4.3 Engagement Prediction API

**File:** `predict-engagement.ts`

**Endpoint:** `POST /api/predict-engagement`

**Request Body:**
```json
{
  "content": "Post content here...",
  "platform": "instagram",
  "hashtags": ["#IndianFashion"]
}
```

**Response:**
```json
{
  "score": 82,
  "confidence": 0.85,
  "factors": {
    "timing": 85,
    "hashtags": 75,
    "contentQuality": 88,
    "culturalRelevance": 80
  },
  "recommendations": [
    "Add more trending hashtags like #IndianFashion, #DesiStyle",
    "Best posting time: 9 AM IST"
  ]
}
```

**Scoring Algorithm:**
| Factor | Weight | Calculation |
|--------|--------|-------------|
| Timing | 20% | Default 85% for demo |
| Hashtags | 25% | Based on matching trending hashtags |
| Content Quality | 30% | Emojis (+15%), Newlines (+10%), Length (+10%) |
| Cultural Relevance | 25% | Keyword matches from cultural context |

---

### 4.4 Approval API

**File:** `approve.ts`

**Endpoints:**
- `POST /api/approve` - Submit approval action
- `GET /api/approve` - Get all approved content

**Request Body (POST):**
```json
{
  "contentId": "content-123",
  "variantId": "variant-123",
  "action": "approve",
  "editedContent": "Optional edited text",
  "feedback": "Optional feedback"
}
```

**Response:**
```json
{
  "contentId": "content-123",
  "variantId": "variant-123",
  "action": "approve",
  "approvedAt": "2026-03-06T10:30:00.000Z"
}
```

---

### 4.5 Cultural Context API

**File:** `cultural-context.ts`

**Endpoint:** `GET /api/cultural-context`

**Response:** Returns the full cultural_context.json data

---

### 4.6 History API

**File:** `history.ts`

**Endpoint:** `GET /api/history`

**Response:** Returns array of `GeneratedContent` objects

---

## 5. Frontend Components

### Description (Simple Language)
Reusable UI building blocks - input boxes, content cards, score displays, translation viewers, and approval buttons.

### Technical Details

**Location:** `components/`

### 5.1 Layout Component

**File:** `Layout.tsx`

**Props:**
```typescript
interface LayoutProps {
  children: React.ReactNode;
}
```

**Features:**
- Responsive header with navigation
- Mobile hamburger menu
- Active route highlighting
- Footer with branding
- Gradient background

**Navigation Items:**
- Home (/)
- Generate (/generate)
- Localize (/localize)
- Analytics (/analytics)
- Approve (/approve)
- History (/history)
- Settings (/settings)

---

### 5.2 PromptInput Component

**File:** `PromptInput.tsx`

**Props:**
```typescript
interface PromptInputProps {
  onSubmit: (prompt: string, platform: Platform) => void;
  isLoading?: boolean;
  defaultPrompt?: string;
}
```

**Features:**
- Platform selection buttons (Instagram, Twitter, LinkedIn, Facebook)
- Textarea for prompt input
- Character counter (max 500)
- Quick suggestion chips
- Gradient submit button with loading state

---

### 5.3 ContentCard Component

**File:** `ContentCard.tsx`

**Props:**
```typescript
interface ContentCardProps {
  variant: ContentVariant;
  index: number;
  onApprove?: (variantId: string) => void;
  onReject?: (variantId: string) => void;
  onEdit?: (variantId: string, editedContent: string) => void;
  onSelect?: (variant: ContentVariant) => void;
  isSelected?: boolean;
  showActions?: boolean;
}
```

**Features:**
- Tone-colored header (professional=blue, casual=green, inspirational=purple)
- Engagement score badge
- Content display with whitespace preservation
- Hashtag chips
- Edit mode with textarea
- Copy to clipboard button
- Approve/Reject buttons

---

### 5.4 EngagementScore Component

**File:** `EngagementScore.tsx`

**Props:**
```typescript
interface EngagementScoreProps {
  prediction: EngagementPrediction;
  showDetails?: boolean;
}
```

**Features:**
- SVG circular gauge with gradient fill
- Score display (0-100)
- Four factor progress bars:
  - Timing (with Clock icon)
  - Hashtags (with Hash icon)
  - Content Quality (with Sparkles icon)
  - Cultural Relevance (with Globe icon)
- Recommendations list

---

### 5.5 LocalizationViewer Component

**File:** `LocalizationViewer.tsx`

**Props:**
```typescript
interface LocalizationViewerProps {
  original: string;
  localized: LocalizedContent | null;
  isLoading?: boolean;
  onTranslate?: () => void;
}
```

**Features:**
- Two-column layout (English | Hindi)
- Language badges (EN/HI)
- Copy buttons for both versions
- Loading state with spinner
- Cultural adaptations chips (purple badges)
- Translate button when no translation exists

---

### 5.6 ApprovalPanel Component

**File:** `ApprovalPanel.tsx`

**Props:**
```typescript
interface ApprovalPanelProps {
  variant: ContentVariant;
  onApprove: (action: ApprovalAction) => void;
  isLoading?: boolean;
}
```

**Features:**
- Content preview (editable when edit selected)
- Three action cards:
  - Approve (green) - CheckCircle icon
  - Edit (blue) - Edit3 icon
  - Reject (red) - XCircle icon
- Feedback textarea
- Submit button with loading state

---

## 6. Pages

### Description (Simple Language)
The actual screens users see - home page, generation page, translation page, approval page, analytics dashboard, history list, and settings.

### Technical Details

**Location:** `src/pages/`

### 6.1 Home Page

**File:** `index.tsx`
**Route:** `/`

**Features:**
- Hero section with tagline
- PromptInput component
- Feature cards grid (5 features)
- Demo scenario section with "Try Demo" button

**State:**
```typescript
const [isLoading, setIsLoading] = useState(false);
```

**Data Flow:**
- On submit: Stores prompt in sessionStorage → Navigates to /generate

---

### 6.2 Generate Page

**File:** `generate.tsx`
**Route:** `/generate`

**Features:**
- Displays 3 AI-generated content variants
- Engagement score sidebar
- Variant selection
- "Translate to Hindi" button

**State:**
```typescript
const [isLoading, setIsLoading] = useState(false);
const [content, setContent] = useState<GeneratedContent | null>(null);
const [selectedVariant, setSelectedVariant] = useState<ContentVariant | null>(null);
const [engagementScore, setEngagementScore] = useState<EngagementPrediction | null>(null);
```

**Data Flow:**
- Reads prompt from sessionStorage
- Calls POST /api/generate
- On variant select: Calls POST /api/predict-engagement
- On proceed: Stores content in sessionStorage → Navigates to /localize

---

### 6.3 Localize Page

**File:** `localize.tsx`
**Route:** `/localize`

**Features:**
- LocalizationViewer component
- Translate button
- Re-translate option
- "Proceed to Approval" button

**State:**
```typescript
const [isLoading, setIsLoading] = useState(false);
const [originalContent, setOriginalContent] = useState('');
const [localizedContent, setLocalizedContent] = useState<LocalizedContent | null>(null);
```

**Data Flow:**
- Reads content from sessionStorage
- Calls POST /api/translate
- On proceed: Stores localized content in sessionStorage → Navigates to /approve

---

### 6.4 Approve Page

**File:** `approve.tsx`
**Route:** `/approve`

**Features:**
- English and Hindi content preview
- ApprovalPanel component
- Success animation on approval
- Navigation to create new content or view analytics

**State:**
```typescript
const [isLoading, setIsLoading] = useState(false);
const [content, setContent] = useState('');
const [localizedContent, setLocalizedContent] = useState<LocalizedContent | null>(null);
const [isApproved, setIsApproved] = useState(false);
const [approvalResult, setApprovalResult] = useState<ApprovalAction | null>(null);
```

**Data Flow:**
- Reads content from sessionStorage
- Calls POST /api/approve
- Clears sessionStorage on success

---

### 6.5 Analytics Page

**File:** `analytics.tsx`
**Route:** `/analytics`

**Features:**
- Stats cards (Total Content, Avg Engagement, Total Reach, Approved Content)
- Weekly performance bar chart
- Platform breakdown progress bars
- Top performing content list
- AI-powered insights section

**Data:** Uses mock data for demonstration

---

### 6.6 History Page

**File:** `history.tsx`
**Route:** `/history`

**Features:**
- Search input
- Platform filter dropdown
- Status filter dropdown
- History cards with engagement scores
- Stats summary (Total, Approved, Pending, Avg Score)

**State:**
```typescript
const [searchQuery, setSearchQuery] = useState('');
const [filterPlatform, setFilterPlatform] = useState<Platform | 'all'>('all');
const [filterStatus, setFilterStatus] = useState<'all' | 'approved' | 'pending' | 'rejected'>('all');
```

**Data:** Uses mock data for demonstration

---

### 6.7 Settings Page

**File:** `settings.tsx`
**Route:** `/settings`

**Features:**
- Appearance section (Dark mode toggle)
- Notifications section (Push notifications toggle)
- Language & Localization (Interface language, Auto-translate toggle)
- AI Configuration (Model selection, Variants count)
- Infrastructure info (DynamoDB, S3, ElastiCache, AWS Bedrock)
- Save button with success feedback

---

## 7. Styling

### Description (Simple Language)
Visual design using Tailwind CSS - gradients for buttons, responsive layouts, dark mode support, smooth animations.

### Technical Details

**File:** `src/styles/globals.css`

**Framework:** Tailwind CSS v4

**CSS Features:**
```css
/* Import Tailwind */
@import "tailwindcss";

/* CSS Variables */
:root {
  --background: #ffffff;
  --foreground: #171717;
}

/* Dark Mode Support */
@media (prefers-color-scheme: dark) {
  :root {
    --background: #0a0a0a;
    --foreground: #ededed;
  }
}

/* Custom Scrollbar */
::-webkit-scrollbar { width: 8px; }
::-webkit-scrollbar-thumb { background: #cbd5e1; border-radius: 4px; }

/* Animations */
@keyframes fadeIn {
  from { opacity: 0; transform: translateY(10px); }
  to { opacity: 1; transform: translateY(0); }
}

/* Utilities */
.line-clamp-1, .line-clamp-2, .line-clamp-3 { /* Text truncation */ }
```

**Tailwind Classes Used:**
- Gradients: `bg-gradient-to-r from-orange-500 to-pink-500`
- Shadows: `shadow-lg shadow-orange-500/25`
- Rounded: `rounded-xl`, `rounded-2xl`, `rounded-3xl`
- Dark mode: `dark:bg-slate-800`, `dark:text-white`
- Responsive: `md:grid-cols-2`, `lg:grid-cols-3`

---

## 8. Data Flow

### Description (Simple Language)
User enters prompt → System generates 3 posts → User picks one → System translates to Hindi → User reviews and approves → Done!

### Technical Flowchart

```
┌─────────────────────────────────────────────────────────────────┐
│                         USER WORKFLOW                            │
└─────────────────────────────────────────────────────────────────┘


┌──────────────┐
│  HOME PAGE   │
│    (/)       │
└──────┬───────┘
       │ User enters prompt + selects platform
       │ Stores in sessionStorage
       ▼
┌──────────────┐     POST /api/generate      ┌─────────────────────┐
│ GENERATE     │ ──────────────────────────► │ Generate API        │
│  (/generate) │                             │ - Creates 3 variants│
└──────┬───────┘ ◄────────────────────────── │ - Uses cultural ctx │
       │              GeneratedContent        └─────────────────────┘
       │
       │ User selects variant
       ▼
       │         POST /api/predict-engagement ┌─────────────────────┐
       │ ──────────────────────────────────► │ Predict API         │
       │                                      │ - Calculates score  │
       │ ◄──────────────────────────────────  │ - Returns factors   │
       │              EngagementPrediction    └─────────────────────┘
       │
       │ Stores content in sessionStorage
       ▼
┌──────────────┐     POST /api/translate     ┌─────────────────────┐
│ LOCALIZE     │ ──────────────────────────► │ Translate API       │
│  (/localize) │                             │ - Hindi translation │
└──────┬───────┘ ◄────────────────────────── │ - Cultural adapts   │
       │              LocalizedContent        └─────────────────────┘
       │
       │ Stores localized content in sessionStorage
       ▼
┌──────────────┐     POST /api/approve       ┌─────────────────────┐
│ APPROVE      │ ──────────────────────────► │ Approve API         │
│  (/approve)  │                             │ - Stores action     │
└──────┬───────┘ ◄────────────────────────── │ - Returns result    │
       │              ApprovalAction          └─────────────────────┘
       │
       │ Clears sessionStorage
       ▼
┌──────────────┐
│  COMPLETE!   │
│  Success UI  │
└──────────────┘
```

---

## 9. Production Architecture

### Description (Simple Language)
How the system would work in production with AWS services - databases, storage, caching, and AI services.

### AWS Services Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                      AWS PRODUCTION ARCHITECTURE                 │
└─────────────────────────────────────────────────────────────────┘

                           ┌─────────────────┐
                           │   CloudFront    │
                           │      (CDN)      │
                           └────────┬────────┘
                                    │
                           ┌────────▼────────┐
                           │   API Gateway   │
                           └────────┬────────┘
                                    │
                    ┌───────────────┼───────────────┐
                    │               │               │
           ┌────────▼────────┐     │      ┌────────▼────────┐
           │  Lambda         │     │      │  Lambda         │
           │  (Generate)     │     │      │  (Translate)    │
           └────────┬────────┘     │      └────────┬────────┘
                    │              │               │
                    │     ┌────────▼────────┐      │
                    │     │  AWS Bedrock    │      │
                    │     │  (Claude AI)    │      │
                    │     └─────────────────┘      │
                    │                              │
                    └───────────────┬──────────────┘
                                    │
                    ┌───────────────┼───────────────┐
                    │               │               │
           ┌────────▼────────┐ ┌────▼─────┐ ┌──────▼───────┐
           │   DynamoDB      │ │ ElastiCache│ │     S3      │
           │   (Content DB)  │ │ (Cache)    │ │  (Storage)  │
           └─────────────────┘ └───────────┘ └─────────────┘


Step Functions Workflow:
┌──────────┐   ┌──────────┐   ┌──────────┐   ┌──────────┐   ┌──────────┐
│  User    │ → │ Content  │ → │ Platform │ → │ Localize │ → │ Predict  │
│  Prompt  │   │ Generate │   │ Optimize │   │          │   │ Engage   │
└──────────┘   └──────────┘   └──────────┘   └──────────┘   └────┬─────┘
                                                                  │
                                                                  ▼
                                                           ┌──────────┐
                                                           │  Human   │
                                                           │ Approval │
                                                           └──────────┘
```

### Database Design (DynamoDB)

**Table: Content**
| Field | Type | Description |
|-------|------|-------------|
| content_id (PK) | String | UUID |
| prompt | String | User input |
| platform | String | instagram/twitter/linkedin/facebook |
| generated_variants | List | Array of variant objects |
| localized_content | Map | Hindi translation |
| engagement_score | Number | 0-100 |
| timestamp | String | ISO 8601 |

### Storage (S3)

**Bucket:** `samvaad-ai-data`

**Folders:**
- `/outputs/` - Generated content exports
- `/datasets/` - Cultural context and training data
- `/logs/` - Application and audit logs

### Caching (ElastiCache)

**Cached Items:**
- AI responses (TTL: 1 hour)
- Recent prompts (TTL: 24 hours)
- Engagement predictions (TTL: 1 hour)

**Purpose:** Reduce cost and latency

---

## 10. Demo Scenario

### User Prompt
"Launching a sustainable clothing brand in India"

### Expected System Behavior

1. **Generate 3 Instagram Posts**
   - Professional tone variant
   - Casual tone variant
   - Inspirational tone variant

2. **Translate to Hindi**
   - Full Hindi translation
   - Cultural adaptations applied

3. **Predict Engagement Score**
   - Overall score (e.g., 85/100)
   - Factor breakdown
   - Recommendations

4. **Show Optimized Versions**
   - Side-by-side English/Hindi
   - Engagement metrics

5. **Allow Human Approval**
   - Approve/Edit/Reject options
   - Feedback field
   - Save to database

---

## 11. Success Criteria

The prototype demonstrates:

| Criteria | Implementation |
|----------|----------------|
| ✅ AI generation | POST /api/generate creates 3 variants |
| ✅ Platform optimization | Content tailored with platform-specific hashtags |
| ✅ Hindi localization | POST /api/translate with cultural adaptations |
| ✅ Engagement scoring | POST /api/predict-engagement with 4 factors |
| ✅ Human approval | POST /api/approve with approve/edit/reject actions |

---

## Project Structure

```
samvaad-ai/
├── components/
│   ├── index.ts
│   ├── Layout.tsx
│   ├── PromptInput.tsx
│   ├── ContentCard.tsx
│   ├── EngagementScore.tsx
│   ├── LocalizationViewer.tsx
│   └── ApprovalPanel.tsx
├── datasets/
│   └── cultural_context.json
├── services/
│   └── api.ts
├── src/
│   ├── pages/
│   │   ├── _app.tsx
│   │   ├── _document.tsx
│   │   ├── index.tsx
│   │   ├── generate.tsx
│   │   ├── localize.tsx
│   │   ├── approve.tsx
│   │   ├── analytics.tsx
│   │   ├── history.tsx
│   │   ├── settings.tsx
│   │   └── api/
│   │       ├── generate.ts
│   │       ├── translate.ts
│   │       ├── predict-engagement.ts
│   │       ├── approve.ts
│   │       ├── cultural-context.ts
│   │       └── history.ts
│   └── styles/
│       └── globals.css
├── types/
│   └── index.ts
├── package.json
├── tsconfig.json
├── next.config.ts
└── DOCUMENTATION.md
```

---

## Running the Project

```bash
# Install dependencies
npm install

# Start development server
npm run dev

# Open in browser
http://localhost:3000
```

---

## Technologies Used

| Category | Technology |
|----------|------------|
| Framework | Next.js 16.1.6 |
| Language | TypeScript |
| Styling | Tailwind CSS v4 |
| HTTP Client | Axios |
| Icons | Lucide React |
| Animations | Framer Motion |
| Runtime | React 19 |
| Authentication | AWS Cognito |

---

## 12. Authentication

### Description (Simple Language)
User authentication system using AWS Cognito. Users can sign up, log in, and manage their sessions. All generated content is associated with the authenticated user.

### Technical Details

**Configuration:**

Create a `.env.local` file with your AWS Cognito settings:

```bash
# AWS Cognito User Pool ID
NEXT_PUBLIC_COGNITO_USER_POOL_ID=us-east-1_XXXXXXXXX

# AWS Cognito App Client ID
NEXT_PUBLIC_COGNITO_CLIENT_ID=xxxxxxxxxxxxxxxxxxxxxxxxxx

# AWS Region
NEXT_PUBLIC_COGNITO_REGION=us-east-1
```

**File Locations:**

| File | Purpose |
|------|---------|
| `config/cognito.ts` | Cognito configuration and validation |
| `context/AuthContext.tsx` | React context for authentication state |
| `middleware/auth.tsx` | Auth middleware and HOC for protected routes |
| `utils/auth.ts` | Server-side JWT token utilities |
| `src/pages/login.tsx` | Login page |
| `src/pages/signup.tsx` | Sign up page with email confirmation |
| `src/pages/dashboard.tsx` | User dashboard |

**Authentication Flow:**

1. **Sign Up:**
   - User enters email, password, and optional name
   - Cognito sends confirmation code to email
   - User enters code to verify email
   - Redirect to login

2. **Sign In:**
   - User enters email and password
   - Cognito returns JWT tokens (access, ID, refresh)
   - Tokens stored in AuthContext state
   - Redirect to dashboard

3. **Session Management:**
   - Access token included in API requests via axios interceptor
   - Session persists across page reloads using Cognito's built-in session management
   - Token refresh handled automatically by Cognito SDK

4. **Sign Out:**
   - Clear user session from Cognito
   - Clear local state
   - Redirect to login page

**Protected Routes:**

Routes that require authentication:
- `/dashboard`
- `/generate`
- `/localize`
- `/analytics`
- `/approve`
- `/history`
- `/settings`

Unauthenticated users are redirected to `/login`.

**API Integration:**

All API requests automatically include the JWT access token:

```typescript
// API requests include Authorization header
Authorization: Bearer <access_token>
```

Server-side utilities extract user ID from token:

```typescript
import { getUserIdFromRequest } from '../../../utils/auth';

// In API route handler
const userId = getUserIdFromRequest(req);
```

**User Data:**

The `User` interface contains:

```typescript
interface User {
  id: string;        // Cognito sub (unique user ID)
  email: string;     // User email
  name?: string;     // Display name
  accessToken: string;
  idToken: string;
  refreshToken: string;
}
```

---

*Documentation generated for Samvaad AI Prototype*
*Version 0.1.0 | March 2026*
