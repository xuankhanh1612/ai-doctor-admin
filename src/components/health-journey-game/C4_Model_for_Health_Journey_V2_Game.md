# Health Journey V2 - C4 Architecture

## C1 - System Context

```text
┌──────────────────────────┐
│         User             │
└────────────┬─────────────┘
             │
             ▼
┌────────────────────────────────────────────┐
│          Health Journey V2 Platform        │
│                                            │
│ • Daily Tasks                              │
│ • Journey Chapters                         │
│ • AI Coach                                 │
│ • InBody Analysis                          │
│ • Rewards                                  │
│ • Guild                                    │
│ • Health Digital Twin                      │
└────────────────────────────────────────────┘
      │
      ├──────────────► OpenAI
      │
      ├──────────────► InBody Import
      │
      ├──────────────► Apple Health
      │
      ├──────────────► Google Fit
      │
      ├──────────────► Vision AI OCR
      │
      └──────────────► Supabase/Postgres
```

---

## C2 - Container Diagram

```text
┌─────────────────────────────────────────────────────────┐
│                     Frontend (React)                    │
├─────────────────────────────────────────────────────────┤
│ Dashboard                                               │
│ Journey                                                 │
│ Daily Tasks                                             │
│ Rewards                                                 │
│ Guild                                                   │
│ Profile                                                 │
│ AI Coach                                                │
└─────────────────────────────────────────────────────────┘
                    │
                    ▼

┌─────────────────────────────────────────────────────────┐
│                    Journey Engine                       │
├─────────────────────────────────────────────────────────┤
│ Activity Service                                        │
│ Task Service                                            │
│ XP Service                                              │
│ Reward Service                                          │
│ Chapter Service                                         │
└─────────────────────────────────────────────────────────┘
                    │
                    ▼

┌─────────────────────────────────────────────────────────┐
│                     AI Layer                            │
├─────────────────────────────────────────────────────────┤
│ OpenAI                                                  │
│ Medical Reasoning                                       │
│ AI Coach                                                │
│ OCR Verification                                        │
└─────────────────────────────────────────────────────────┘
                    │
                    ▼

┌─────────────────────────────────────────────────────────┐
│                    Data Layer                           │
├─────────────────────────────────────────────────────────┤
│ Local Storage                                           │
│ Supabase                                                │
│ PostgreSQL                                              │
│ Object Storage                                          │
└─────────────────────────────────────────────────────────┘
```

---

## C3 - Component Diagram

Journey Engine

```text
Activity Engine
│
├── Drink Water
├── Walking
├── Reading
├── Deep Work
├── Breathing
├── No Sugar
├── Cold Shower
└── InBody Import

        │
        ▼

Task Engine
│
├── Daily Progress
├── Weekly Progress
├── Monthly Progress
└── Streak Tracking

        │
        ▼

XP Engine
│
├── XP Calculation
├── Level System
├── Energy System
└── Coin System

        │
        ▼

Journey Engine
│
├── Chapter 1 The Awakening
├── Chapter 2 The Discipline
├── Chapter 3 The Transformation
├── Chapter 4 The Mastery
└── Chapter 5 The Legend

        │
        ▼

Reward Engine
│
├── Coins
├── Loot Box
├── Avatar
├── NFT Badge
└── Premium Reward
```

---

## C3 - AI Coach Components

```text
AI Coach

├── Motivation Agent
├── Health Agent
├── InBody Agent
├── Nutrition Agent
├── Exercise Agent
├── Habit Agent
└── Journey Agent
```

Example:

Activity:
Drink Water

↓

AI Coach:

"Bạn đã hoàn thành 80% mục tiêu nước hôm nay."

↓

Journey Agent

Chapter Progress +1

---

## C3 - InBody Integration

```text
User Upload InBody

        │

        ▼

AIInbodyPortalPanel

        │

        ▼

OCR Extraction

        │

        ▼

Medical AI Analysis

        │

        ▼

Create Activity

type=inbody_import

        │

        ▼

+100 XP

        │

        ▼

Journey Update
```

---

## C3 - Proof Verification

```text
User Upload Image

        │

        ▼

Proof Service

        │

        ├── OCR

        ├── Metadata

        ├── Timestamp

        └── AI Verification

        │

        ▼

Activity Created
```

Examples

Water

photo_water.jpg

Reading

photo_book.jpg

Walking

google_fit_screenshot.jpg

InBody

inbody_report.pdf

---

## C4 - Code Structure

```text
src/

healthJourney/

├── components/
│
├── pages/
│
├── services/
│   ├── activityService.ts
│   ├── taskService.ts
│   ├── xpService.ts
│   ├── journeyService.ts
│   ├── rewardService.ts
│   └── proofService.ts
│
├── store/
│   └── useJourneyStore.ts
│
├── hooks/
│
├── types/
│
├── data/
│   ├── chapters.json
│   ├── tasks.json
│   ├── rewards.json
│   └── achievements.json
│
└── utils/
```

---

## Data Flow

```text
User Action

Drink Water

        ▼

Activity

        ▼

Task Progress

        ▼

XP + Energy

        ▼

Journey Progress

        ▼

Chapter Unlock

        ▼

Reward

        ▼

AI Coach Feedback
```

---

## Future Expansion

Phase 1

* Daily Tasks
* Journey
* Rewards

Phase 2

* Guild
* Team Challenges
* Leaderboards

Phase 3

* AI Health Coach
* AI Habit Coach
* Medical Digital Twin

Phase 4

* NFT Badges
* Token Economy
* Marketplace

Phase 5

* Health DAO
* Research Participation
* Precision Medicine Network

```
```
