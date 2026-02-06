import { NextRequest, NextResponse } from 'next/server';
import { query, execute, queryOne } from '@/lib/db';
import { getSession } from '@/lib/auth';

type Badge = {
  id: string;
  name: string;
  description: string | null;
  icon_url: string | null;
  criteria_json: string | null;
  created_at: string;
};

type UserBadge = {
  user_id: string;
  badge_id: string;
  earned_at: string;
  badge_name?: string;
  badge_description?: string;
  badge_icon_url?: string;
};

// Default badges to seed
export const DEFAULT_BADGES = [
  {
    name: 'First Steps',
    description: 'Complete your first course',
    icon_url: '/badges/first-steps.svg',
    criteria: { type: 'course_count', value: 1 },
  },
  {
    name: 'Scholar',
    description: 'Complete 5 courses',
    icon_url: '/badges/scholar.svg',
    criteria: { type: 'course_count', value: 5 },
  },
  {
    name: 'Expert',
    description: 'Complete 10 courses',
    icon_url: '/badges/expert.svg',
    criteria: { type: 'course_count', value: 10 },
  },
  {
    name: 'Quiz Master',
    description: 'Pass 10 quizzes with 80% or higher',
    icon_url: '/badges/quiz-master.svg',
    criteria: { type: 'quiz_pass_count', value: 10 },
  },
  {
    name: 'Perfectionist',
    description: 'Get 100% on 5 quizzes',
    icon_url: '/badges/perfectionist.svg',
    criteria: { type: 'quiz_perfect_count', value: 5 },
  },
  {
    name: 'Rising Star',
    description: 'Reach Level 5',
    icon_url: '/badges/rising-star.svg',
    criteria: { type: 'level', value: 5 },
  },
  {
    name: 'Champion',
    description: 'Reach Level 10',
    icon_url: '/badges/champion.svg',
    criteria: { type: 'level', value: 10 },
  },
  {
    name: 'Point Collector',
    description: 'Earn 1000 points',
    icon_url: '/badges/point-collector.svg',
    criteria: { type: 'points', value: 1000 },
  },
];

// GET /api/badges - List all badges or user's badges
export async function GET(request: NextRequest) {
  const sessionId = request.cookies.get('session')?.value;
  if (!sessionId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const currentUser = await getSession(sessionId);
  if (!currentUser) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const { searchParams } = new URL(request.url);
  const userId = searchParams.get('user_id');
  const includeEarned = searchParams.get('include_earned') === 'true';

  // Get all badges
  const badges = await query<Badge>(
    'SELECT * FROM badges ORDER BY created_at ASC'
  );

  // Get user's earned badges
  const targetUserId = userId && currentUser.role === 'admin' ? userId : currentUser.id;
  
  const userBadges = await query<UserBadge>(
    `SELECT ub.*, b.name as badge_name, b.description as badge_description, b.icon_url as badge_icon_url
     FROM user_badges ub
     JOIN badges b ON ub.badge_id = b.id
     WHERE ub.user_id = ?
     ORDER BY ub.earned_at DESC`,
    [targetUserId]
  );

  const earnedBadgeIds = new Set(userBadges.map(ub => ub.badge_id));

  if (includeEarned) {
    // Return all badges with earned status
    const badgesWithStatus = badges.map(badge => ({
      ...badge,
      earned: earnedBadgeIds.has(badge.id),
      earned_at: userBadges.find(ub => ub.badge_id === badge.id)?.earned_at || null,
    }));
    return NextResponse.json({ badges: badgesWithStatus });
  }

  return NextResponse.json({ 
    badges,
    userBadges,
    earnedCount: userBadges.length,
    totalCount: badges.length,
  });
}

// POST /api/badges - Create a new badge (admin) or award badge to user
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
    
    // Award badge to user
    if (body.award_to_user) {
      const { badge_id, user_id } = body;
      const targetUserId = user_id || currentUser.id;

      // Only admins can award badges to others
      if (user_id && user_id !== currentUser.id && currentUser.role !== 'admin') {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
      }

      // Check badge exists
      const badge = await queryOne<Badge>('SELECT * FROM badges WHERE id = ?', [badge_id]);
      if (!badge) {
        return NextResponse.json({ error: 'Badge not found' }, { status: 404 });
      }

      // Check if already earned
      const existing = await queryOne<UserBadge>(
        'SELECT * FROM user_badges WHERE user_id = ? AND badge_id = ?',
        [targetUserId, badge_id]
      );

      if (existing) {
        return NextResponse.json(
          { error: 'Badge already earned', badge: existing },
          { status: 409 }
        );
      }

      // Award badge
      await execute(
        'INSERT INTO user_badges (user_id, badge_id) VALUES (?, ?)',
        [targetUserId, badge_id]
      );

      return NextResponse.json({
        success: true,
        badge,
        awarded_to: targetUserId,
      }, { status: 201 });
    }

    // Create new badge (admin only)
    if (currentUser.role !== 'admin') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { name, description, icon_url, criteria } = body;

    if (!name) {
      return NextResponse.json({ error: 'Name is required' }, { status: 400 });
    }

    await execute(
      `INSERT INTO badges (name, description, icon_url, criteria_json) VALUES (?, ?, ?, ?)`,
      [name, description || null, icon_url || null, criteria ? JSON.stringify(criteria) : null]
    );

    const badge = await query<Badge>(
      'SELECT * FROM badges ORDER BY created_at DESC LIMIT 1'
    );

    return NextResponse.json({ badge: badge[0] }, { status: 201 });
  } catch (error) {
    console.error('Error with badge operation:', error);
    return NextResponse.json(
      { error: 'Failed to process badge request' },
      { status: 500 }
    );
  }
}
