# LearnHub - TODO

## Phase 1: Foundation (Week 1)

### Database & Auth
- [ ] Set up Turso database (org: manapixels, db: learnhub)
- [ ] Create database schema (users, groups, sessions)
- [ ] Implement NextAuth with email/password
- [ ] Add password hashing with bcryptjs
- [ ] Create auth middleware for protected routes

### User Management
- [ ] User CRUD API routes
- [ ] Admin user list page with filters
- [ ] Add/Edit user modal
- [ ] Role selection (Admin, Instructor, Learner)
- [ ] User groups CRUD
- [ ] CSV import for bulk user creation

### Admin Dashboard Shell
- [ ] Sidebar navigation (Dashboard, Users, Courses, Reports, Settings)
- [ ] Dashboard with placeholder stats cards
- [ ] Responsive layout (mobile sidebar collapse)
- [ ] User avatar dropdown (profile, logout)

## Phase 2: Course Engine (Week 2)

### Course CRUD
- [ ] Database schema (courses, sections, units, categories)
- [ ] Course list page with filters
- [ ] Create course modal
- [ ] Course detail/edit page
- [ ] Course settings (time limits, prerequisites, status)

### Course Builder
- [ ] Drag-drop section/unit reordering
- [ ] Unit type selector (text, video, quiz, document, survey, link)
- [ ] Rich text editor for text units (TipTap or similar)
- [ ] YouTube/Vimeo video embed
- [ ] Document viewer (PDF.js)
- [ ] External link embed/iframe

### Categories
- [ ] Category CRUD
- [ ] Category colors and icons
- [ ] Course catalog organized by category

## Phase 3: Learning Experience (Week 3)

### Learner Dashboard
- [ ] My Courses list with progress bars
- [ ] Continue Learning card (resume last course)
- [ ] Course catalog (browse and self-enroll)
- [ ] My Certificates section

### Course Player
- [ ] Clean player UI with sidebar navigation
- [ ] Progress tracking (auto-save on unit completion)
- [ ] Mark as complete button
- [ ] Next/Previous navigation
- [ ] Mobile responsive player

### Enrollment
- [ ] Enroll users in courses (admin)
- [ ] Self-enrollment toggle per course
- [ ] Enrollment status tracking (not started, in progress, completed)

## Phase 4: Assessments & Certificates (Week 4)

### Quiz Engine
- [ ] Question types: Multiple choice, True/False, Fill-in-blank, Matching
- [ ] Question bank per course
- [ ] Quiz settings (pass threshold, retries, time limit, randomization)
- [ ] Quiz taking interface
- [ ] Quiz results with feedback

### Surveys
- [ ] Survey questions (text, rating, multiple choice)
- [ ] Survey results dashboard
- [ ] Export survey responses

### Certificates
- [ ] Certificate template editor
- [ ] Auto-generate on course completion
- [ ] PDF download
- [ ] Public verification URL
- [ ] Expiration dates for compliance

## Phase 5: AI & Gamification (Week 5)

### AI Features
- [ ] AI Course Creator (Gemini) - generate outline from topic
- [ ] AI Quiz Generator - generate questions from content
- [ ] AI Content Companion - rewrite, summarize, translate
- [ ] AI Thumbnail Generator

### Gamification
- [ ] Points system (configurable per action)
- [ ] Badges for achievements
- [ ] Levels (unlock with points)
- [ ] Leaderboards (global, per group)

## Phase 6: Enterprise & Polish (Week 6)

### Reporting
- [ ] User progress report
- [ ] Course completion report
- [ ] Quiz results report
- [ ] Learning path report
- [ ] Export to CSV

### Learning Paths
- [ ] Learning path CRUD
- [ ] Sequence courses in paths
- [ ] Path progress tracking
- [ ] Path certificates

### Enterprise
- [ ] SSO (SAML, OAuth)
- [ ] Custom domains / white-labeling
- [ ] API documentation
- [ ] Multi-tenancy (branches)

### Launch
- [ ] Stripe billing integration
- [ ] Pricing tiers
- [ ] Landing page
- [ ] Deploy to Vercel
- [ ] Performance optimization

---

## Current Sprint

**Focus:** Phase 1 - Foundation

**Next task:** Set up Turso database and create schema
