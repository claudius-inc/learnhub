import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';

export async function GET(request: NextRequest) {
  const sessionId = request.cookies.get('session')?.value;
  
  if (!sessionId) {
    return NextResponse.json({ user: null }, { status: 401 });
  }
  
  const user = await getSession(sessionId);
  
  if (!user) {
    return NextResponse.json({ user: null }, { status: 401 });
  }
  
  return NextResponse.json({ user });
}
