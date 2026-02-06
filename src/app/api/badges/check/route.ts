import { NextRequest, NextResponse } from 'next/server';
import { query, execute, queryOne } from '@/lib/db';
import { getSession } from '@/lib/auth';

type Badge = {
  id: string;
  name: string;
  criteria_json: string | null;
};

type UserStats = {
  course_count: number;
  quiz_pass_count: number;
  quiz_perfect_count: number;
  total_points: number;
  level: number;
};

// POST /api/badges/check - Check and award any earned badges for user
export async function POST(request: NextRequest) {
  const sessionId = request.cookies.get('session')?.value;
  if (!sessionId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const currentUser = await getSession(sessionId);
  if (!currentUser) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  try {
    const body = await request.json();
    const userId = body.user_id || currentUser.id;

    // Only admins can check other users
    if (body.user_id && body.user_id !== currentUser.id && currentUser.role !== 'admin') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Get user's current stats
    const courseCount = await queryOne<{ count: number }>(
      `SELECT COUNT(*) as count FROM enrollments WHERE user_id = ? AND status = 'completed'`,
      [userId]
    );

    const quizPassCount = await queryOne<{ count: number }>(
      `SELECT COUNT(*) as count FROM quiz_attempts qa
       JOIN enrollments e ON qa.enrollment_id = e.id
       WHERE e.user_id = ? AND qa.passed = 1`,
      [userId]
    );

    const quizPerfectCount = await queryOne<{ count: number }>(
      `SELECT COUNT(*) as count FROM quiz_attempts qa
       JOIN enrollments e ON qa.enrollment_id = e.id
       WHERE e.user_id = ? AND qa.score = 100`,
      [userId]
    );

    const userPoints = await queryOne<{ total_points: number; level: number }>(
      'SELECT total_points, level FROM user_points WHERE user_id = ?',
      [userId]
    );

    const stats: UserStats = {
      course_count: courseCount?.count || 0,
      quiz_pass_count: quizPassCount?.count || 0,
      quiz_perfect_count: quizPerfectCount?.count || 0,
      total_points: userPoints?.total_points || 0,
      level: userPoints?.level || 1,
    };

    // Get all badges not yet earned
    const unearnedBadges = await query<Badge>(
      `SELECT b.* FROM badges b
       WHERE b.id NOT IN (
         SELECT badge_id FROM user_badges WHERE user_id = ?
       )`,
      [userId]
    );

    // Check each badge's criteria
    const newlyEarned: Badge[] = [];

    for (const badge of unearnedBadges) {
      if (!badge.criteria_json) continue;

      let criteria;
      try {
        criteria = JSON.parse(badge.criteria_json);
      } catch {
        continue;
      }

      let earned = false;

      switch (criteria.type) {
        case 'course_count':
          earned = stats.course_count >= criteria.value;
          break;
        case 'quiz_pass_count':
          earned = stats.quiz_pass_count >= criteria.value;
          break;
        case 'quiz_perfect_count':
          earned = stats.quiz_perfect_count >= criteria.value;
          break;
        case 'points':
          earned = stats.total_points >= criteria.value;
          break;
        case 'level':
          earned = stats.level >= criteria.value;
          break;
      }

      if (earned) {
        await execute(
          'INSERT OR IGNORE INTO user_badges (user_id, badge_id) VALUES (?, ?)',
          [userId, badge.id]
        );
        newlyEarned.push(badge);
      }
    }

    return NextResponse.json({
      stats,
      newlyEarned,
      checkedCount: unearnedBadges.length,
    });
  } catch (error) {
    console.error('Error checking badges:', error);
    return NextResponse.json(
      { error: 'Failed to check badges' },
      { status: 500 }
    );
  }
}
