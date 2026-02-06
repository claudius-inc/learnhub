import { NextRequest, NextResponse } from 'next/server';
import { query, execute, queryOne } from '@/lib/db';

type SettingRow = {
  key: string;
  value: string;
};

// GET /api/settings - Fetch all settings
export async function GET() {
  // First ensure settings table exists
  await execute(`
    CREATE TABLE IF NOT EXISTS settings (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL,
      updated_at TEXT DEFAULT (datetime('now'))
    )
  `);

  const rows = await query<SettingRow>('SELECT key, value FROM settings');
  
  const settings: Record<string, string | number> = {};
  for (const row of rows) {
    // Try to parse as number or JSON, fallback to string
    try {
      const parsed = JSON.parse(row.value);
      settings[row.key] = parsed;
    } catch {
      settings[row.key] = row.value;
    }
  }

  return NextResponse.json({ settings });
}

// PUT /api/settings - Update settings
export async function PUT(request: NextRequest) {
  const data = await request.json();

  // Ensure settings table exists
  await execute(`
    CREATE TABLE IF NOT EXISTS settings (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL,
      updated_at TEXT DEFAULT (datetime('now'))
    )
  `);

  // Validate and save each setting
  const validKeys = [
    'site_name',
    'site_tagline', 
    'primary_color',
    'default_certificate_template_id',
    'points_course_completion',
    'points_quiz_pass',
    'points_quiz_perfect',
    'points_certificate_earned',
  ];

  for (const key of validKeys) {
    if (key in data) {
      const value = typeof data[key] === 'string' ? data[key] : JSON.stringify(data[key]);
      
      await execute(
        `INSERT INTO settings (key, value, updated_at) 
         VALUES (?, ?, datetime('now'))
         ON CONFLICT(key) DO UPDATE SET value = ?, updated_at = datetime('now')`,
        [key, value, value]
      );
    }
  }

  return NextResponse.json({ success: true });
}
