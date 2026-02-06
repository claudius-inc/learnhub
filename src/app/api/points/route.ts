import { NextRequest, NextResponse } from 'next/server';
import { query, execute, queryOne } from '@/lib/db';
import { getSession } from '@/lib/auth';

type UserPoints = {
  user_id: string;
  total_points: number;
  level: number;
  updated_at: string;
  user_name?: string;
  user_email?: string;
};

// Point values for different actions
export const POINT_VALUES = {
  course_completion: 100,
  unit_completion: 10,
  quiz_pass: 25,
  quiz_perfect: 50, // bonus for 100% score
  first_course: 50, // bonus for completing first course
  streak_3_days: 30,
  streak_7_days: 100,
} as const;

// Level thresholds
export const LEVEL_THRESHOLDS = [
  0,      // Level 1
  100,    // Level 2
  300,    // Level 3
  600,    // Level 4
  1000,   // Level 5
  1500,   // Level 6
  2200,   // Level 7
  3000,   // Level 8
  4000,   // Level 9
  5000,   // Level 10
];

function calculateLevel(points: number): number {
  for (let i = LEVEL_THRESHOLDS.length - 1; i >= 0; i--) {
    if (points >= LEVEL_THRESHOLDS[i]) {
      return i + 1;
    }
  }
  return 1;
}

// GET /api/points - Get current user's points or leaderboard
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
  const leaderboard = searchParams.get('leaderboard') === 'true';
  const limit = Math.min(parseInt(searchParams.get('limit') || '10'), 100);
  const userId = searchParams.get('user_id');

  if (leaderboard) {
    // Get leaderboard
    const results = await query<UserPoints>(
      `SELECT up.*, u.name as user_name, u.email as user_email
       FROM user_points up
       JOIN users u ON up.user_id = u.id
       WHERE u.status = 'active'
       ORDER BY up.total_points DESC
       LIMIT ?`,
      [limit]
    );

    // Find current user's rank
    const userRank = await queryOne<{ rank: number }>(
      `SELECT COUNT(*) + 1 as rank 
       FROM user_points 
       WHERE total_points > (SELECT COALESCE(total_points, 0) FROM user_points WHERE user_id = ?)`,
      [currentUser.id]
    );

    return NextResponse.json({ 
      leaderboard: results,
      currentUserRank: userRank?.rank || null
    });
  }

  // Get specific user's points (admin only) or current user's points
  const targetUserId = userId && currentUser.role === 'admin' ? userId : currentUser.id;

  const points = await queryOne<UserPoints>(
    `SELECT up.*, u.name as user_name
     FROM user_points up
     JOIN users u ON up.user_id = u.id
     WHERE up.user_id = ?`,
    [targetUserId]
  );

  if (!points) {
    return NextResponse.json({ 
      points: {
        user_id: targetUserId,
        total_points: 0,
        level: 1,
        updated_at: null,
      },
      nextLevel: {
        level: 2,
        pointsNeeded: LEVEL_THRESHOLDS[1],
        progress: 0
      }
    });
  }

  // Calculate progress to next level
  const nextLevelIndex = points.level;
  const nextLevelThreshold = LEVEL_THRESHOLDS[nextLevelIndex] || LEVEL_THRESHOLDS[LEVEL_THRESHOLDS.length - 1];
  const currentLevelThreshold = LEVEL_THRESHOLDS[points.level - 1] || 0;
  const progressInLevel = points.total_points - currentLevelThreshold;
  const pointsForNextLevel = nextLevelThreshold - currentLevelThreshold;

  return NextResponse.json({ 
    points,
    nextLevel: {
      level: points.level + 1,
      pointsNeeded: nextLevelThreshold,
      progress: Math.round((progressInLevel / pointsForNextLevel) * 100)
    }
  });
}

// POST /api/points - Award points to a user
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
    const { user_id, points, reason } = body;

    // Only admins can award points to others, or system can award to current user
    const targetUserId = user_id || currentUser.id;
    
    if (user_id && user_id !== currentUser.id && currentUser.role !== 'admin') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    if (typeof points !== 'number' || points <= 0) {
      return NextResponse.json(
        { error: 'Points must be a positive number' },
        { status: 400 }
      );
    }

    // Check if user_points record exists
    const existing = await queryOne<UserPoints>(
      'SELECT * FROM user_points WHERE user_id = ?',
      [targetUserId]
    );

    let newTotal: number;
    let newLevel: number;

    if (existing) {
      newTotal = existing.total_points + points;
      newLevel = calculateLevel(newTotal);

      await execute(
        `UPDATE user_points 
         SET total_points = ?, level = ?, updated_at = datetime('now')
         WHERE user_id = ?`,
        [newTotal, newLevel, targetUserId]
      );
    } else {
      newTotal = points;
      newLevel = calculateLevel(newTotal);

      await execute(
        `INSERT INTO user_points (user_id, total_points, level) VALUES (?, ?, ?)`,
        [targetUserId, newTotal, newLevel]
      );
    }

    const leveledUp = existing && newLevel > existing.level;

    return NextResponse.json({
      success: true,
      points_awarded: points,
      reason,
      new_total: newTotal,
      new_level: newLevel,
      leveled_up: leveledUp,
    });
  } catch (error) {
    console.error('Error awarding points:', error);
    return NextResponse.json(
      { error: 'Failed to award points' },
      { status: 500 }
    );
  }
}
