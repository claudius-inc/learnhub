import { createClient } from '@libsql/client';

async function resetDb() {
  const db = createClient({
    url: process.env.TURSO_DATABASE_URL!,
    authToken: process.env.TURSO_AUTH_TOKEN,
  });

  const tables = [
    'quiz_answers', 'quiz_attempts', 'unit_progress', 'enrollments', 'certificates', 'certificate_templates', 
    'user_badges', 'badges', 'user_points', 'learning_path_enrollments', 'learning_path_courses', 
    'learning_paths', 'questions', 'units', 'sections', 'course_prerequisites', 'courses', 'categories', 
    'sessions', 'users', 'groups'
  ];

  for (const table of tables) {
    try { 
      await db.execute(`DROP TABLE IF EXISTS ${table}`); 
      console.log('Dropped', table); 
    } catch(e) {
      console.log('Failed to drop', table);
    }
  }
  console.log('Done dropping tables');
}

resetDb().catch(console.error);
