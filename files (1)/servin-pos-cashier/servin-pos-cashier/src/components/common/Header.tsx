import React, { useState, useEffect } from 'react';
import { posService } from '../../services/posService';
import { Coffee, RefreshCw, CreditCard } from 'lucide-react';

/**
 * Header for the Cashier app.
 * The original header contained a 5-role workspace switcher; in the role-split
 * projects the role is fixed, so it is shown as a single active pill instead.
 */
const ROLE = 'cashier' as const;

export const Header: React.FC = () => {
  const [currentTime, setCurrentTime] = useState('');
  const findUserName = () => posService.getUsers().find((u) => u.role === ROLE && u.isActive)?.name;
  const [userName, setUserName] = useState(findUserName());

  useEffect(() => {
    const refresh = () => {
      setUserName(findUserName());
    };
    refresh();
    const unsubscribe = posService.subscribe(refresh);

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
      unsubscribe();
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
              Cashier · POS Register
            </p>
          </div>
        </div>

        {/* Zone 2: Fixed role pill (replaces the 5-role switcher) */}
        <div className="flex items-center p-1 bg-slate-100/90 rounded-xl border border-slate-200/80 max-w-full overflow-x-auto">
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap bg-white text-slate-900 shadow-xs border border-slate-200/60">
            <span className="text-amber-600">
              <CreditCard className="w-3.5 h-3.5" />
            </span>
            <span>Cashier</span>
          </div>
        </div>

        {/* Zone 3: Actions & System Status */}
        <div className="flex items-center gap-2.5 shrink-0">
          <button
            onClick={() => {
              if (confirm('Reset demo data to initial state (sample order ORD-1024, inventory stocks & recipes)?')) {
                posService.resetToDefaults();
              }
            }}
            title="Reset sample orders & inventory"
            className="p-2 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer border border-transparent hover:border-slate-200"
          >
            <RefreshCw className="w-3.5 h-3.5" />
          </button>

          <div className="hidden xl:flex items-center gap-2 pl-2 border-l border-slate-200 text-xs text-slate-600">
            <span className="font-mono tabular-nums text-slate-700 font-medium">
              {currentTime || '12:00'}
            </span>
            <span className="text-slate-400">·</span>
            <span className="text-slate-500 truncate max-w-[100px]">
              {userName || 'Staff'}
            </span>
          </div>
        </div>
      </div>
    </header>
  );
};
