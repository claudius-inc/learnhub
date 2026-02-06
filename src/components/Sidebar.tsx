'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { 
  LayoutDashboard, 
  Users, 
  BookOpen, 
  BarChart3, 
  Settings,
  GraduationCap,
  Award,
  Map,
  FolderKanban,
  Trophy,
  HelpCircle,
  X
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { User } from '@/lib/auth';

const adminNav = [
  { name: 'Dashboard', href: '/', icon: LayoutDashboard },
  { name: 'Users', href: '/users', icon: Users },
  { name: 'Groups', href: '/groups', icon: FolderKanban },
  { name: 'Courses', href: '/courses', icon: BookOpen },
  { name: 'Question Bank', href: '/questions', icon: HelpCircle },
  { name: 'Learning Paths', href: '/paths', icon: Map },
  { name: 'Categories', href: '/categories', icon: FolderKanban },
  { name: 'Certificates', href: '/certificates', icon: Award },
  { name: 'Leaderboard', href: '/leaderboard', icon: Trophy },
  { name: 'Reports', href: '/reports', icon: BarChart3 },
  { name: 'Settings', href: '/settings', icon: Settings },
];

const instructorNav = [
  { name: 'Dashboard', href: '/', icon: LayoutDashboard },
  { name: 'My Courses', href: '/courses', icon: BookOpen },
  { name: 'Question Bank', href: '/questions', icon: GraduationCap },
  { name: 'Reports', href: '/reports', icon: BarChart3 },
];

const learnerNav = [
  { name: 'Dashboard', href: '/', icon: LayoutDashboard },
  { name: 'My Courses', href: '/my-courses', icon: BookOpen },
  { name: 'Course Catalog', href: '/catalog', icon: GraduationCap },
  { name: 'Leaderboard', href: '/leaderboard', icon: Trophy },
  { name: 'Certificates', href: '/my-certificates', icon: Award },
];

type SidebarProps = {
  user: User;
  isOpen: boolean;
  onClose: () => void;
};

export function Sidebar({ user, isOpen, onClose }: SidebarProps) {
  const pathname = usePathname();
  
  const nav = user.role === 'admin' 
    ? adminNav 
    : user.role === 'instructor' 
      ? instructorNav 
      : learnerNav;

  return (
    <>
      {/* Overlay backdrop for mobile */}
      {isOpen && (
        <div 
          className="fixed inset-0 bg-black/50 z-30 md:hidden"
          onClick={onClose}
        />
      )}

      <aside 
        className={cn(
          'w-64 bg-white border-r border-slate-200 h-screen fixed left-0 top-0 flex flex-col z-40 transition-transform duration-300',
          // Mobile: hidden by default, shown when open
          isOpen ? 'translate-x-0' : '-translate-x-full',
          // Desktop: always visible
          'md:translate-x-0'
        )}
      >
        <div className="p-6 border-b border-slate-200 flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold text-slate-900">LearnHub</h1>
            <p className="text-sm text-slate-500 mt-1 capitalize">{user.role} Portal</p>
          </div>
          {/* Close button on mobile */}
          <button 
            onClick={onClose}
            className="p-2 hover:bg-slate-100 rounded-lg md:hidden"
          >
            <X className="w-5 h-5 text-slate-600" />
          </button>
        </div>

        <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
          {nav.map((item) => {
            const isActive = pathname === item.href || 
              (item.href !== '/' && pathname.startsWith(item.href));
            
            return (
              <Link
                key={item.name}
                href={item.href}
                onClick={onClose}
                className={cn(
                  'flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors',
                  isActive 
                    ? 'bg-blue-50 text-blue-700' 
                    : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
                )}
              >
                <item.icon className="w-5 h-5" />
                {item.name}
              </Link>
            );
          })}
        </nav>

        <div className="p-4 border-t border-slate-200">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-blue-600 flex items-center justify-center text-white font-medium">
              {user.name.charAt(0).toUpperCase()}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-slate-900 truncate">{user.name}</p>
              <p className="text-xs text-slate-500 truncate">{user.email}</p>
            </div>
          </div>
        </div>
      </aside>
    </>
  );
}
