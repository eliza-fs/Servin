import React from 'react';
import { LogOut } from 'lucide-react';
import type { StaffProfile } from './AuthGate';

interface SessionBadgeProps {
  profile: StaffProfile;
  onLogout: () => void | Promise<void>;
}

export const SessionBadge: React.FC<SessionBadgeProps> = ({ profile, onLogout }) => (
  <div className="fixed bottom-4 right-4 z-50 flex items-center gap-2 rounded-full bg-white/95 border border-slate-200 shadow-md pl-3 pr-1.5 py-1.5 text-xs text-slate-600">
    <span className="font-medium text-slate-800 truncate max-w-[120px]">{profile.name}</span>
    <span className="px-1.5 py-0.5 rounded-md bg-slate-100 text-[10px] font-semibold uppercase tracking-wide text-slate-500">
      {profile.role}
    </span>
    <button
      onClick={() => onLogout()}
      title="Sign out"
      className="p-1.5 rounded-full text-slate-400 hover:text-slate-700 hover:bg-slate-100 cursor-pointer"
    >
      <LogOut className="w-3.5 h-3.5" />
    </button>
  </div>
);