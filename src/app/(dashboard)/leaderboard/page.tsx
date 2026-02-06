'use client';

import { useState, useEffect } from 'react';
import { Trophy, Medal, Crown, Star, TrendingUp, User } from 'lucide-react';
import { cn } from '@/lib/utils';

type LeaderboardEntry = {
  user_id: string;
  total_points: number;
  level: number;
  user_name: string;
  user_email: string;
};

type CurrentUser = {
  id: string;
  name: string;
  role: string;
};

const LEVEL_NAMES = [
  'Beginner',
  'Novice',
  'Apprentice',
  'Journeyman',
  'Expert',
  'Master',
  'Grandmaster',
  'Legend',
  'Champion',
  'Transcendent',
];

function getLevelName(level: number): string {
  return LEVEL_NAMES[Math.min(level - 1, LEVEL_NAMES.length - 1)];
}

function getRankIcon(rank: number) {
  if (rank === 1) return <Crown className="w-6 h-6 text-yellow-500" />;
  if (rank === 2) return <Medal className="w-6 h-6 text-slate-400" />;
  if (rank === 3) return <Medal className="w-6 h-6 text-amber-600" />;
  return <span className="w-6 h-6 flex items-center justify-center text-slate-500 font-bold">{rank}</span>;
}

function getRankBg(rank: number): string {
  if (rank === 1) return 'bg-gradient-to-r from-yellow-50 to-amber-50 border-yellow-200';
  if (rank === 2) return 'bg-gradient-to-r from-slate-50 to-slate-100 border-slate-200';
  if (rank === 3) return 'bg-gradient-to-r from-amber-50 to-orange-50 border-amber-200';
  return 'bg-white border-slate-200';
}

export default function LeaderboardPage() {
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [currentUser, setCurrentUser] = useState<CurrentUser | null>(null);
  const [currentUserRank, setCurrentUserRank] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchLeaderboard();
    fetchCurrentUser();
  }, []);

  const fetchCurrentUser = async () => {
    try {
      const res = await fetch('/api/auth/me');
      if (res.ok) {
        const data = await res.json();
        setCurrentUser(data.user);
      }
    } catch (err) {
      console.error('Failed to fetch user:', err);
    }
  };

  const fetchLeaderboard = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/points?leaderboard=true&limit=50');
      const data = await res.json();
      setLeaderboard(data.leaderboard || []);
      setCurrentUserRank(data.currentUserRank);
    } catch (err) {
      console.error('Failed to fetch leaderboard:', err);
    } finally {
      setLoading(false);
    }
  };

  const userEntry = currentUser
    ? leaderboard.find((e) => e.user_id === currentUser.id)
    : null;

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <div className="flex items-center gap-3 mb-8">
        <div className="p-3 bg-gradient-to-br from-yellow-400 to-amber-500 rounded-xl shadow-lg">
          <Trophy className="w-8 h-8 text-white" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Leaderboard</h1>
          <p className="text-slate-500">Top learners ranked by points</p>
        </div>
      </div>

      {/* Current User Stats */}
      {currentUser && (
        <div className="bg-gradient-to-r from-blue-600 to-indigo-600 rounded-xl p-6 mb-8 text-white">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 bg-white/20 rounded-full flex items-center justify-center">
                <User className="w-8 h-8" />
              </div>
              <div>
                <p className="text-blue-200 text-sm">Your Ranking</p>
                <h2 className="text-xl font-bold">{currentUser.name}</h2>
                <div className="flex items-center gap-2 mt-1">
                  {currentUserRank && (
                    <span className="px-2 py-0.5 bg-white/20 rounded text-sm">
                      Rank #{currentUserRank}
                    </span>
                  )}
                  {userEntry && (
                    <>
                      <span className="px-2 py-0.5 bg-white/20 rounded text-sm">
                        Level {userEntry.level}
                      </span>
                      <span className="text-blue-200 text-sm">
                        {getLevelName(userEntry.level)}
                      </span>
                    </>
                  )}
                </div>
              </div>
            </div>
            <div className="text-right">
              <p className="text-blue-200 text-sm">Total Points</p>
              <p className="text-4xl font-bold">{userEntry?.total_points || 0}</p>
            </div>
          </div>
        </div>
      )}

      {/* Top 3 Podium */}
      {leaderboard.length >= 3 && (
        <div className="grid grid-cols-3 gap-4 mb-8">
          {/* Second Place */}
          <div className="flex flex-col items-center pt-8">
            <div className="relative">
              <div className="w-20 h-20 bg-gradient-to-br from-slate-200 to-slate-300 rounded-full flex items-center justify-center">
                <User className="w-10 h-10 text-slate-600" />
              </div>
              <div className="absolute -top-2 -right-2 bg-slate-400 rounded-full p-1">
                <Medal className="w-5 h-5 text-white" />
              </div>
            </div>
            <h3 className="font-semibold mt-3 text-center truncate max-w-full">{leaderboard[1].user_name}</h3>
            <p className="text-2xl font-bold text-slate-600">{leaderboard[1].total_points}</p>
            <p className="text-sm text-slate-500">Level {leaderboard[1].level}</p>
          </div>

          {/* First Place */}
          <div className="flex flex-col items-center">
            <div className="relative">
              <div className="w-24 h-24 bg-gradient-to-br from-yellow-300 to-amber-400 rounded-full flex items-center justify-center shadow-lg">
                <User className="w-12 h-12 text-yellow-800" />
              </div>
              <div className="absolute -top-3 -right-1 bg-yellow-500 rounded-full p-1.5">
                <Crown className="w-6 h-6 text-white" />
              </div>
            </div>
            <h3 className="font-bold mt-3 text-lg text-center truncate max-w-full">{leaderboard[0].user_name}</h3>
            <p className="text-3xl font-bold text-yellow-600">{leaderboard[0].total_points}</p>
            <p className="text-sm text-slate-500">Level {leaderboard[0].level}</p>
          </div>

          {/* Third Place */}
          <div className="flex flex-col items-center pt-8">
            <div className="relative">
              <div className="w-20 h-20 bg-gradient-to-br from-amber-200 to-orange-300 rounded-full flex items-center justify-center">
                <User className="w-10 h-10 text-amber-700" />
              </div>
              <div className="absolute -top-2 -right-2 bg-amber-500 rounded-full p-1">
                <Medal className="w-5 h-5 text-white" />
              </div>
            </div>
            <h3 className="font-semibold mt-3 text-center truncate max-w-full">{leaderboard[2].user_name}</h3>
            <p className="text-2xl font-bold text-amber-600">{leaderboard[2].total_points}</p>
            <p className="text-sm text-slate-500">Level {leaderboard[2].level}</p>
          </div>
        </div>
      )}

      {/* Full Leaderboard */}
      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
        <div className="p-4 border-b border-slate-200 bg-slate-50">
          <h2 className="font-semibold text-slate-900">All Rankings</h2>
        </div>

        {loading ? (
          <div className="p-8 text-center text-slate-500">Loading...</div>
        ) : leaderboard.length === 0 ? (
          <div className="p-8 text-center">
            <Trophy className="w-12 h-12 text-slate-300 mx-auto mb-4" />
            <p className="text-slate-500">No rankings yet</p>
            <p className="text-sm text-slate-400 mt-1">Complete courses to earn points!</p>
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {leaderboard.map((entry, index) => {
              const rank = index + 1;
              const isCurrentUser = currentUser?.id === entry.user_id;

              return (
                <div
                  key={entry.user_id}
                  className={cn(
                    'flex items-center gap-4 p-4 border-l-4 transition-colors',
                    getRankBg(rank),
                    isCurrentUser && 'ring-2 ring-blue-500 ring-inset'
                  )}
                >
                  {/* Rank */}
                  <div className="w-10 flex justify-center">
                    {getRankIcon(rank)}
                  </div>

                  {/* User Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-slate-900 truncate">
                        {entry.user_name}
                      </span>
                      {isCurrentUser && (
                        <span className="px-2 py-0.5 bg-blue-100 text-blue-600 text-xs rounded">
                          You
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-2 text-sm text-slate-500">
                      <Star className="w-3.5 h-3.5 text-amber-500" />
                      <span>Level {entry.level}</span>
                      <span className="text-slate-300">•</span>
                      <span>{getLevelName(entry.level)}</span>
                    </div>
                  </div>

                  {/* Points */}
                  <div className="text-right">
                    <p className="text-xl font-bold text-slate-900">
                      {entry.total_points.toLocaleString()}
                    </p>
                    <p className="text-xs text-slate-500">points</p>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Points Guide */}
      <div className="mt-8 bg-slate-50 rounded-xl p-6 border border-slate-200">
        <h3 className="font-semibold text-slate-900 mb-4 flex items-center gap-2">
          <TrendingUp className="w-5 h-5 text-green-600" />
          How to Earn Points
        </h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
          <div className="bg-white rounded-lg p-3 border border-slate-200">
            <p className="font-bold text-green-600 text-lg">+100</p>
            <p className="text-slate-600">Complete Course</p>
          </div>
          <div className="bg-white rounded-lg p-3 border border-slate-200">
            <p className="font-bold text-green-600 text-lg">+50</p>
            <p className="text-slate-600">First Course Bonus</p>
          </div>
          <div className="bg-white rounded-lg p-3 border border-slate-200">
            <p className="font-bold text-blue-600 text-lg">+25</p>
            <p className="text-slate-600">Pass Quiz</p>
          </div>
          <div className="bg-white rounded-lg p-3 border border-slate-200">
            <p className="font-bold text-purple-600 text-lg">+50</p>
            <p className="text-slate-600">Perfect Quiz Score</p>
          </div>
          <div className="bg-white rounded-lg p-3 border border-slate-200">
            <p className="font-bold text-slate-600 text-lg">+10</p>
            <p className="text-slate-600">Complete Unit</p>
          </div>
        </div>
      </div>
    </div>
  );
}
