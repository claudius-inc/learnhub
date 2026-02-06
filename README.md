# LearnHub LMS

A modern Learning Management System built with Next.js, Turso (SQLite), and Tailwind CSS.

## Features

### Admin Features
- **User Management** - Create, edit, and manage users with roles (admin, instructor, learner)
- **Group Management** - Organize users into groups
- **Course Management** - Create courses with sections, units (text, video, quiz, etc.)
- **Question Bank** - Manage quiz questions with multiple types (multiple choice, true/false, fill-in-blank)
- **Category Management** - Organize courses into categories
- **Certificate Templates** - Customize certificate designs
- **Reports** - User progress, course completion, and quiz analytics with CSV export
- **Settings** - Site branding, certificate defaults, gamification points

### Instructor Features
- Course creation and management
- Quiz question creation
- View reports for their courses

### Learner Features
- Course catalog and enrollment
- Progress tracking
- Quiz taking
- Certificate generation
- Leaderboard and achievements

## Tech Stack

- **Frontend**: Next.js 16 (App Router), React 19, Tailwind CSS 4
- **Database**: Turso (SQLite at the edge)
- **Auth**: Custom session-based authentication with bcrypt
- **Icons**: Lucide React

## Getting Started

### Prerequisites

- Node.js 18+
- npm or pnpm
- A Turso database (or any libSQL-compatible database)

### Installation

1. Clone the repository:
```bash
git clone <repo-url>
cd lms
```

2. Install dependencies:
```bash
npm install
```

3. Copy environment variables:
```bash
cp .env.example .env.local
```

4. Configure your environment variables in `.env.local`:
```
TURSO_DATABASE_URL=your-turso-database-url
TURSO_AUTH_TOKEN=your-turso-auth-token
NEXTAUTH_SECRET=your-random-secret-string
NEXTAUTH_URL=http://localhost:3000
```

5. Run database migrations:
```bash
npm run migrate
```

This creates all tables and seeds:
- Default admin user: `admin@learnhub.local` / `admin123`
- Default certificate template
- Default achievement badges

6. Start the development server:
```bash
npm run dev
```

7. Open [http://localhost:3000](http://localhost:3000) and login with the admin credentials.

## Project Structure

```
src/
├── app/
│   ├── (auth)/           # Login/registration pages
│   ├── (dashboard)/      # Main app pages (protected)
│   │   ├── catalog/      # Course catalog (learner)
│   │   ├── categories/   # Category management (admin)
│   │   ├── certificates/ # Certificate templates (admin)
│   │   ├── courses/      # Course management (admin/instructor)
│   │   ├── groups/       # Group management (admin)
│   │   ├── leaderboard/  # Points leaderboard
│   │   ├── learn/        # Course player (learner)
│   │   ├── my-certificates/ # Learner certificates
│   │   ├── my-courses/   # Enrolled courses (learner)
│   │   ├── questions/    # Question bank (admin)
│   │   ├── reports/      # Analytics reports (admin)
│   │   ├── settings/     # Site settings (admin)
│   │   └── users/        # User management (admin)
│   ├── api/              # API routes
│   └── verify/           # Public certificate verification
├── components/           # Reusable UI components
└── lib/                  # Utilities, DB, auth
```

## Scripts

| Script | Description |
|--------|-------------|
| `npm run dev` | Start development server |
| `npm run build` | Build for production |
| `npm run start` | Start production server |
| `npm run lint` | Run ESLint |
| `npm run migrate` | Run database migrations |
| `npm run reset-db` | Reset database (warning: destroys data) |
| `npm run typecheck` | TypeScript type checking |

## API Routes

### Authentication
- `POST /api/auth/login` - Login
- `POST /api/auth/logout` - Logout
- `POST /api/auth/register` - Register (if enabled)

### Users
- `GET /api/users` - List users
- `POST /api/users` - Create user
- `PUT /api/users/[id]` - Update user
- `DELETE /api/users/[id]` - Delete user

### Courses
- `GET /api/courses` - List courses
- `POST /api/courses` - Create course
- `GET /api/courses/[id]` - Get course details
- `PUT /api/courses/[id]` - Update course
- `DELETE /api/courses/[id]` - Delete course

### Enrollments
- `GET /api/enrollments` - List enrollments
- `POST /api/enrollments` - Enroll in course
- `PUT /api/enrollments/[id]` - Update enrollment progress

### Reports
- `GET /api/reports/user-progress` - User progress report
- `GET /api/reports/course-completion` - Course completion report
- `GET /api/reports/quiz-results` - Quiz results report
- Add `?format=csv` to any report for CSV export

### Settings
- `GET /api/settings` - Get all settings
- `PUT /api/settings` - Update settings

## Deployment

### Vercel (Recommended)

1. Push to GitHub
2. Import project in Vercel
3. Add environment variables in Vercel dashboard
4. Deploy

### Self-hosted

1. Build the application:
```bash
npm run build
```

2. Start the production server:
```bash
npm start
```

## Security Notes

- Change the default admin password immediately after first login
- Generate a strong `NEXTAUTH_SECRET` (32+ random characters)
- Use HTTPS in production
- Consider rate limiting for API endpoints

## License

MIT
