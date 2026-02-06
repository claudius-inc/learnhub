import { createClient } from '@libsql/client';
import { readFileSync } from 'fs';

async function migrate() {
  const db = createClient({
    url: process.env.TURSO_DATABASE_URL!,
    authToken: process.env.TURSO_AUTH_TOKEN,
  });

  const schema = readFileSync('/root/openclaw/lms/src/lib/schema.sql', 'utf-8');
  
  // Remove block comments and extract statements
  const cleanSchema = schema
    .replace(/--[^\n]*/g, '') // Remove single-line comments
    .replace(/\n\s*\n/g, '\n'); // Remove blank lines
  
  // Find all CREATE statements (TABLE, INDEX)
  const statements = cleanSchema
    .split(/;/)
    .map(s => s.trim())
    .filter(s => s.length > 0 && (s.startsWith('CREATE') || s.includes('CREATE')));

  console.log(`Found ${statements.length} CREATE statements`);
  
  // Debug: show first few chars of each
  statements.forEach((s, i) => {
    console.log(`[${i}] ${s.substring(0, 50).replace(/\n/g, ' ')}...`);
  });

  console.log('\nRunning migrations...\n');

  for (const statement of statements) {
    try {
      await db.execute(statement);
      const match = statement.match(/CREATE\s+(?:TABLE|INDEX)\s+(?:IF\s+NOT\s+EXISTS\s+)?(\w+)/i);
      console.log('✓', match ? match[1] : statement.substring(0, 40));
    } catch (error: any) {
      const match = statement.match(/CREATE\s+(?:TABLE|INDEX)\s+(?:IF\s+NOT\s+EXISTS\s+)?(\w+)/i);
      console.error('✗', match ? match[1] : statement.substring(0, 40));
      console.error('  Error:', error.message?.substring(0, 100));
    }
  }

  // Create default admin user
  const { v4: uuidv4 } = await import('uuid');
  const bcrypt = await import('bcryptjs');
  
  const adminId = uuidv4().replace(/-/g, '');
  const passwordHash = await bcrypt.hash('admin123', 10);
  
  try {
    await db.execute({
      sql: `INSERT OR IGNORE INTO users (id, email, name, password_hash, role) 
            VALUES (?, ?, ?, ?, ?)`,
      args: [adminId, 'admin@learnhub.local', 'Admin', passwordHash, 'admin']
    });
    console.log('✓ Created default admin user (admin@learnhub.local / admin123)');
  } catch (error) {
    console.log('Admin user might already exist');
  }

  // Create default certificate template
  const templateId = uuidv4().replace(/-/g, '');
  const defaultTemplate = `
    <div style="text-align: center; padding: 40px; font-family: Georgia, serif;">
      <h1 style="color: #1e40af;">Certificate of Completion</h1>
      <p style="font-size: 18px;">This certifies that</p>
      <h2 style="color: #1e40af;">{{learner_name}}</h2>
      <p style="font-size: 18px;">has successfully completed</p>
      <h3>{{course_name}}</h3>
      <p style="margin-top: 40px;">Issued on: {{issue_date}}</p>
      <p style="font-size: 12px; color: #666;">Verification: {{verification_code}}</p>
    </div>
  `;
  
  try {
    await db.execute({
      sql: `INSERT OR IGNORE INTO certificate_templates (id, name, html_template) 
            VALUES (?, ?, ?)`,
      args: [templateId, 'Default', defaultTemplate]
    });
    console.log('✓ Created default certificate template');
  } catch (error) {
    console.log('Certificate template might already exist');
  }

  console.log('\n✅ Migration complete!');
}

migrate().catch(console.error);
