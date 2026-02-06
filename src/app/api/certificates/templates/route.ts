import { NextResponse } from 'next/server';
import { query } from '@/lib/db';

type Template = {
  id: string;
  name: string;
  created_at: string;
};

// GET /api/certificates/templates - List certificate templates
export async function GET() {
  const templates = await query<Template>(
    'SELECT id, name, created_at FROM certificate_templates ORDER BY name'
  );

  return NextResponse.json({ templates });
}
