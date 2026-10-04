import React, { useState, useEffect } from 'react';
import { Coffee, ChefHat, LogOut } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import type { StaffProfile } from '../auth/AuthGate';

/**
 * Header for the Kitchen KDS app.
 * Shows the logged-in staff member and the number of active orders.
 */
interface HeaderProps {
  profile: StaffProfile;
  onLogout: () => void | Promise<void>;
}

export const Header: React.FC<HeaderProps> = ({ profile, onLogout }) => {
  const [currentTime, setCurrentTime] = useState('');
  const [activeOrdersCount, setActiveOrdersCount] = useState(0);

  useEffect(() => {
    const refreshCount = async () => {
      const { count } = await supabase
        .from('orders')
        .select('id', { count: 'exact', head: true })
        .in('kitchen_status', ['WAITING', 'COOKING', 'READY']);
      setActiveOrdersCount(count ?? 0);
    };
    refreshCount();

    const channel = supabase
      .channel('kitchen-header-' + Date.now())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'orders' }, () => {
        refreshCount();
      })
      .subscribe();

    const timer = setInterval(() => {
      const now = new Date();
      setCurrentTime(
        now.toLocaleTimeString('id-ID', {
          hour: '2-digit',
          minute: '2-digit',
        })
      );
    }, 1000);

    return () => {
      supabase.removeChannel(channel);
      clearInterval(timer);
    };
  }, []);

  return (
    <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-slate-200/80 shadow-xs">
      <div className="max-w-[1520px] mx-auto px-4 sm:px-6 h-16 flex items-center justify-between gap-4">
        {/* Zone 1: Brand Mark */}
        <div className="flex items-center gap-3 shrink-0">
          <div className="w-9 h-9 rounded-xl bg-[#111827] text-white flex items-center justify-center shadow-xs">
            <Coffee className="w-5 h-5 text-amber-400" />
          </div>
          <div>
            <div className="flex items-baseline gap-2">
              <span className="font-heading font-extrabold text-base tracking-tight text-slate-900">
                SERVIN
              </span>
              <span className="text-[11px] font-medium text-slate-400 tracking-wider uppercase hidden sm:inline">
                Coffee & Kitchen
              </span>
            </div>
            <p className="text-[11px] text-slate-400 hidden md:block">
              Kitchen · Display System
            </p>
          </div>
        </div>

        {/* Zone 2: Active workspace pill */}
        <div className="flex items-center p-1 bg-slate-100/90 rounded-xl border border-slate-200/80 max-w-full overflow-x-auto">
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap bg-white text-slate-900 shadow-xs border border-slate-200/60">
            <span className="text-amber-600">
              <ChefHat className="w-3.5 h-3.5" />
            </span>
            <span>Kitchen KDS</span>
            {activeOrdersCount > 0 && (
              <span className="px-1.5 py-0.2 rounded-full text-[10px] font-bold bg-amber-500 text-white animate-pulse">
                {activeOrdersCount}
              </span>
            )}
          </div>
        </div>

        {/* Zone 3: User & logout */}
        <div className="flex items-center gap-2.5 shrink-0">
          <div className="hidden md:flex items-center gap-2 pl-2 text-xs text-slate-600">
            <span className="font-mono tabular-nums text-slate-700 font-medium">
              {currentTime || '12:00'}
            </span>
            <span className="text-slate-400">·</span>
            <span className="text-slate-700 font-medium truncate max-w-[120px]">
              {profile.name}
            </span>
            <span className="px-1.5 py-0.5 rounded-md bg-slate-100 text-[10px] font-semibold uppercase tracking-wide text-slate-500">
              {profile.role}
            </span>
          </div>

          <button
            onClick={() => onLogout()}
            title="Sign out"
            className="p-2 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer border border-transparent hover:border-slate-200"
          >
            <LogOut className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </header>
  );
};