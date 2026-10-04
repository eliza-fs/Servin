import React, { useEffect, useState } from 'react';
import type { Session } from '@supabase/supabase-js';
import { Coffee, Lock } from 'lucide-react';
import { supabase } from '../../lib/supabase';

export type StaffRole = 'admin' | 'owner' | 'cashier' | 'kitchen';

export interface StaffProfile {
  id: string;
  name: string;
  username: string;
  role: StaffRole;
}

interface ProfileRow {
  id: string;
  name: string;
  username: string;
  role: StaffRole;
  is_active: boolean;
}

interface AuthGateProps {
  allowedRoles: StaffRole[];
  appTitle: string;
  children: (profile: StaffProfile, logout: () => Promise<void>) => React.ReactNode;
}

export const AuthGate: React.FC<AuthGateProps> = ({ allowedRoles, appTitle, children }) => {
  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState<StaffProfile | null>(null);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // Check the account's role in the database. The role is never chosen by the user.
  const loadProfile = async (session: Session | null) => {
    if (!session) {
      setProfile(null);
      return;
    }

    const { data, error: profileError } = await supabase
      .from('profiles')
      .select('id, name, username, role, is_active')
      .eq('id', session.user.id)
      .maybeSingle();

    if (profileError) {
      await supabase.auth.signOut();
      setProfile(null);
      setError('Could not load your account. Please try again.');
      return;
    }

    const row = data as unknown as ProfileRow | null;

    if (!row || !row.is_active || !allowedRoles.includes(row.role)) {
      await supabase.auth.signOut();
      setProfile(null);
      setError("You don't have access to this app.");
      return;
    }

    setProfile({ id: row.id, name: row.name, username: row.username, role: row.role });
  };

  useEffect(() => {
    let active = true;

    const init = async () => {
      const { data } = await supabase.auth.getSession();
      await loadProfile(data.session);
      if (active) setLoading(false);
    };
    init();

    const { data: listener } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'SIGNED_OUT') setProfile(null);
    });

    return () => {
      active = false;
      listener.subscription.unsubscribe();
    };
  }, []);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSubmitting(true);

    const { data, error: signInError } = await supabase.auth.signInWithPassword({
      email: email.trim(),
      password,
    });

    if (signInError || !data.session) {
      setError('Invalid email or password.');
      setSubmitting(false);
      return;
    }

    await loadProfile(data.session);
    setPassword('');
    setSubmitting(false);
  };

  const logout = async () => {
    await supabase.auth.signOut();
    setProfile(null);
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#F8F9FA] text-slate-500 text-sm">
        Loading...
      </div>
    );
  }

  if (profile) {
    return <>{children(profile, logout)}</>;
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#F8F9FA] px-4">
      <form
        onSubmit={handleLogin}
        className="w-full max-w-sm bg-white rounded-2xl border border-slate-200 shadow-sm p-6 space-y-4"
      >
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-[#111827] text-white flex items-center justify-center">
            <Coffee className="w-5 h-5 text-amber-400" />
          </div>
          <div>
            <p className="font-extrabold text-slate-900 leading-tight">SERVIN</p>
            <p className="text-xs text-slate-500">{appTitle}</p>
          </div>
        </div>

        <div className="space-y-1">
          <label className="text-xs font-medium text-slate-600" htmlFor="email">
            Email
          </label>
          <input
            id="email"
            type="email"
            required
            autoComplete="username"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400"
          />
        </div>

        <div className="space-y-1">
          <label className="text-xs font-medium text-slate-600" htmlFor="password">
            Password
          </label>
          <input
            id="password"
            type="password"
            required
            autoComplete="current-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400"
          />
        </div>

        {error && (
          <p className="text-sm text-red-600 bg-red-50 border border-red-100 rounded-lg px-3 py-2">
            {error}
          </p>
        )}

        <button
          type="submit"
          disabled={submitting}
          className="w-full flex items-center justify-center gap-2 rounded-lg bg-[#111827] text-white text-sm font-semibold py-2.5 hover:bg-slate-800 disabled:opacity-60 cursor-pointer"
        >
          <Lock className="w-4 h-4" />
          {submitting ? 'Signing in...' : 'Sign in'}
        </button>
      </form>
    </div>
  );
};