# LearnHub - TODO

## Phase 1: Foundation (Week 1)

### Database & Auth
- [ ] Set up Turso database (org: manapixels, db: learnhub)
- [ ] Create database schema (users, groups, sessions)
- [ ] Implement NextAuth with email/password
- [ ] Add password hashing with bcryptjs
- [ ] Create auth middleware for protected routes

### User Management
- [x] User CRUD API routes
- [x] Admin user list page with filters
- [x] Add/Edit user modal
- [x] Role selection (Admin, Instructor, Learner)
- [x] User groups CRUD
- [ ] CSV import for bulk user creation

### Admin Dashboard Shell
- [ ] Sidebar navigation (Dashboard, Users, Courses, Reports, Settings)
- [ ] Dashboard with placeholder stats cards
- [ ] Responsive layout (mobile sidebar collapse)
- [ ] User avatar dropdown (profile, logout)

## Phase 2: Course Engine (Week 2)

### Course CRUD
- [x] Database schema (courses, sections, units, categories)
- [x] Course list page with filters (search, category, status)
- [x] Create course modal with settings
- [x] Course detail/edit page showing sections/units structure
- [x] Course settings (time limits, hidden, status)

### Course Builder
- [x] Drag-drop section/unit reordering (up/down buttons MVP)
- [x] Unit type selector (text, video, quiz, document, survey, link)
- [x] Rich text editor for text units (textarea for MVP)
- [x] YouTube/Vimeo video embed
- [ ] Document viewer (PDF.js)
- [x] External link embed/iframe

### Categories
- [x] Category CRUD API (/api/categories)
- [x] Category colors with color picker
- [x] Categories page at /categories

## Phase 3: Learning Experience (Week 3)

### Learner Dashboard
- [x] My Courses list with progress bars
- [x] Continue Learning card (resume last course)
- [x] Course catalog (browse and self-enroll)
- [ ] My Certificates section

### Course Player
- [x] Clean player UI with sidebar navigation
- [x] Progress tracking (auto-save on unit completion)
- [x] Mark as complete button
- [x] Next/Previous navigation
- [ ] Mobile responsive player

### Enrollment
- [x] Enroll users in courses (admin)
- [x] Self-enrollment toggle per course
- [x] Enrollment status tracking (not started, in progress, completed)

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

**Focus:** Phase 3 - Learning Experience ✓

**Completed:**
- Categories CRUD API and management page
- Courses CRUD API with filters and pagination
- Course list page with card grid view
- Course detail page with sections/units display
- CourseModal and CategoryModal components
- Course Builder (/courses/[id]/edit) with sections/units CRUD and reordering
- Enrollments API with self-enrollment support
- Learner dashboard (/my-courses) with progress tracking
- Course catalog (/catalog) for browsing and self-enrollment
- Course player (/learn/[id]) with progress tracking

**Next task:** Phase 4 - Quiz engine and certificates
