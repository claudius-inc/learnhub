# LearnHub LMS - Technical Specifications

*Internal Corporate Training Platform*

## Overview

LearnHub is a modern, AI-powered LMS for **internal corporate training** — helping businesses onboard employees, deliver compliance training, upskill teams, and track progress. Built with Next.js 14, it emphasizes simplicity, speed, and enterprise-grade features.

**Target Market:** B2B — HR teams, L&D departments, and training managers in mid-to-large enterprises.

**Contact:** me@claudiusinc.com

---

## Core Features (MVP - Phase 1)

### 1. User Management

**Roles:**
- **Admin** — Full system access, manages users/courses/settings
- **Instructor** — Creates and manages courses, views learner progress
- **Learner** — Takes courses, views own progress, earns certificates

**User Features:**
- Sign up / Sign in (email + password, magic link, SSO later)
- Profile management (name, avatar, bio)
- Role-based permissions
- User groups (for bulk enrollment)
- Import users via CSV

**Data Model:**
```
users: id, email, name, avatar_url, role, group_id, created_at, last_login
groups: id, name, description, created_at
```

### 2. Course Management

**Course Structure:**
```
Course
├── Sections (optional grouping)
│   └── Units (actual content)
└── Units (if no sections)
```

**Unit Types (MVP):**
| Type | Description |
|------|-------------|
| Text/Rich Content | WYSIWYG editor, markdown support |
| Video | Upload, YouTube/Vimeo embed |
| Document | PDF, PPT, Word viewer |
| Quiz | Multiple choice, true/false, fill-in-blank |
| Survey | Collect feedback, no scoring |
| External Link | iFrame embed or link out |

**Course Settings:**
- Name, description, thumbnail
- Category (e.g., Onboarding, Compliance, Skills)
- Active/Inactive status
- Hidden from catalog (for targeted enrollment)
- Time limit (days to complete)
- Prerequisites (must complete X before this)
- Certificate (on/off, template, expiration)

**Data Model:**
```
courses: id, name, description, thumbnail_url, category_id, status, hidden, time_limit_days, created_by, created_at
sections: id, course_id, name, sort_order
units: id, course_id, section_id, type, name, content, settings_json, sort_order
categories: id, name, color
```

### 3. Learning Experience

**Learner Dashboard:**
- "My Courses" — enrolled courses with progress %
- "Continue Learning" — resume where left off
- "Certificates" — earned certificates
- "Achievements" — badges, points, level

**Course Player:**
- Clean, distraction-free UI
- Sidebar navigation (units list)
- Progress tracking (auto-save)
- Mark as complete button
- Next/Previous navigation
- Mobile responsive

**Progress Tracking:**
```
enrollments: id, user_id, course_id, status, progress_pct, started_at, completed_at
unit_progress: id, user_id, unit_id, status, score, time_spent_sec, completed_at
```

### 4. Assessments

**Quiz Features:**
- Question types: Multiple choice, True/False, Fill-in-blank, Matching
- Question bank (reusable across quizzes)
- Randomization (questions, answers)
- Time limits
- Pass/fail threshold (default 70%)
- Retry limits
- Show correct answers (configurable)

**Data Model:**
```
questions: id, course_id, type, question_text, options_json, correct_answer, points
quiz_attempts: id, user_id, unit_id, score, passed, started_at, completed_at
quiz_answers: id, attempt_id, question_id, answer, is_correct
```

### 5. Certificates

**Features:**
- Auto-generated on course completion
- Custom templates (logo, colors, text)
- Unique certificate ID for verification
- Expiration dates (for compliance training)
- PDF download
- Public verification URL

**Data Model:**
```
certificates: id, user_id, course_id, issued_at, expires_at, template_id, verification_code
certificate_templates: id, name, html_template, settings_json
```

### 6. Reporting & Analytics

**Admin Dashboard:**
- Total users, courses, completions
- Active learners (daily/weekly/monthly)
- Course completion rates
- Popular courses
- Overdue learners

**Reports:**
- User progress report
- Course completion report
- Quiz results report
- Certificate report
- Export to CSV

---

## Extended Features (Phase 2)

### 7. AI-Powered Features

- **AI Course Creator** — Generate course outline from topic
- **AI Quiz Generator** — Auto-generate questions from content
- **AI Content Companion** — Rewrite, summarize, translate
- **AI Thumbnail Generator** — Create course images
- **AI Learning Coach** — In-course chat assistant

### 8. Gamification

- Points for completing units/courses
- Badges for achievements
- Levels (unlock with points)
- Leaderboards (optional, per group)
- Rewards (custom, e.g., gift cards)

### 9. Advanced Features

- **Learning Paths** — Sequence of courses
- **SCORM/xAPI Support** — Import external content
- **Blended Learning** — Schedule live sessions (Zoom/Meet integration)
- **Branching Logic** — Different paths based on answers
- **Custom Domains** — White-label portals
- **Multi-tenancy** — Branches for different teams/clients
- **SSO** — SAML, OAuth, OIDC

---

## Technical Architecture

### Stack

| Layer | Technology |
|-------|------------|
| Frontend | Next.js 14 (App Router), React, Tailwind CSS |
| Backend | Next.js API Routes, tRPC (optional) |
| Database | PostgreSQL (via Supabase) or SQLite (Turso) |
| Auth | NextAuth.js or Supabase Auth |
| Storage | Supabase Storage or S3 |
| Video | Mux or Cloudflare Stream |
| AI | OpenAI API / Gemini |
| Hosting | Vercel |

### Database Schema (Simplified)

```sql
-- Users & Auth
users (id, email, name, avatar_url, role, group_id, created_at, last_login)
groups (id, name, description)

-- Courses
courses (id, name, description, thumbnail_url, category_id, status, settings_json, created_by, created_at)
categories (id, name, slug, color)
sections (id, course_id, name, sort_order)
units (id, course_id, section_id, type, name, content, settings_json, sort_order)

-- Progress
enrollments (id, user_id, course_id, status, progress_pct, started_at, completed_at)
unit_progress (id, enrollment_id, unit_id, status, score, time_spent_sec, completed_at)

-- Assessments
questions (id, course_id, type, question_text, options_json, correct_answer, points)
quiz_attempts (id, enrollment_id, unit_id, score, passed, started_at, completed_at)

-- Certificates
certificates (id, enrollment_id, template_id, issued_at, expires_at, verification_code)
certificate_templates (id, name, html_template)
```

### Key Screens

**Admin:**
1. Dashboard (stats, recent activity)
2. Users (list, add, edit, import)
3. Courses (list, create, edit)
4. Course Editor (drag-drop units)
5. Reports (filters, export)
6. Settings (branding, integrations)

**Instructor:**
1. My Courses (courses I teach)
2. Course Editor
3. Gradebook (student progress)
4. Question Bank

**Learner:**
1. Dashboard (my courses, continue learning)
2. Course Catalog (browse/enroll)
3. Course Player (take course)
4. My Certificates
5. My Profile

---

## MVP Scope (Phase 1)

### Must Have
- [ ] User auth (email/password)
- [ ] Admin dashboard
- [ ] Create/edit courses
- [ ] 4 unit types: Text, Video (YouTube), Quiz, Document
- [ ] Enroll users in courses
- [ ] Course player with progress tracking
- [ ] Basic quiz with multiple choice
- [ ] Completion certificates (simple template)
- [ ] Basic reporting (completion rates)

### Nice to Have (Phase 1.5)
- [ ] Groups and bulk enrollment
- [ ] Categories and course catalog
- [ ] Learning paths
- [ ] More question types
- [ ] Custom certificate templates

### Phase 2
- [ ] AI course creator
- [ ] AI quiz generator
- [ ] Gamification
- [ ] SCORM support
- [ ] SSO
- [ ] White-labeling
- [ ] API for integrations

---

## Estimated Timeline

| Phase | Duration | Deliverables |
|-------|----------|--------------|
| Phase 1 (MVP) | 3-4 weeks | Core LMS functionality |
| Phase 1.5 | 2 weeks | Polish, groups, catalog |
| Phase 2 | 4-6 weeks | AI features, gamification |

---

## Monetization (Future)

**Pricing Model (like TalentLMS):**
- Free: 5 users, 10 courses
- Starter ($59/mo): 40 users, unlimited courses
- Basic ($89/mo): 100 users, SSO
- Plus ($139/mo): 500 users, gamification
- Premium ($199/mo): 1000 users, white-label
- Enterprise: Custom

---

## Decisions Made

1. **Database:** Turso (SQLite edge) — consistent with our stack
2. **Video hosting:** YouTube/Vimeo embeds for MVP, add direct upload later
3. **Target market:** Internal corporate training (B2B)
4. **Scope:** Feature-complete (full feature set, not MVP)
5. **Contact:** me@claudiusinc.com

---

## Implementation Plan

### Phase 1: Foundation (Week 1)
- [ ] Project setup (Next.js 14, Turso, NextAuth)
- [ ] Database schema and migrations
- [ ] Auth (email/password, SSO-ready)
- [ ] User management (CRUD, roles, groups)
- [ ] Admin dashboard shell

### Phase 2: Course Engine (Week 2)
- [ ] Course CRUD with rich editor
- [ ] All unit types (text, video, document, quiz, survey, link)
- [ ] Drag-drop course builder
- [ ] Categories and organization
- [ ] Course settings (time limits, prerequisites)

### Phase 3: Learning Experience (Week 3)
- [ ] Learner dashboard
- [ ] Course player (progress tracking, completion)
- [ ] Quiz engine (all question types)
- [ ] Learning paths
- [ ] Mobile responsive

### Phase 4: Certificates & Gamification (Week 4)
- [ ] Certificate generation (PDF)
- [ ] Custom certificate templates
- [ ] Verification URLs
- [ ] Points, badges, levels
- [ ] Leaderboards

### Phase 5: AI & Enterprise (Week 5)
- [ ] AI course creator (Gemini)
- [ ] AI quiz generator
- [ ] AI content companion
- [ ] Full reporting suite
- [ ] CSV import/export
- [ ] Bulk enrollment

### Phase 6: Polish & Launch (Week 6)
- [ ] SSO (SAML, OAuth)
- [ ] White-labeling
- [ ] API documentation
- [ ] Performance optimization
- [ ] Deploy and test
