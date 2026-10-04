/**
 * Servin Coffee & Kitchen - Admin app
 *
 * Standalone, role-scoped build: contains only the Admin workspace.
 * Access requires a staff login with the 'admin' role.
 */

import { AuthGate } from './components/auth/AuthGate';
import { SessionBadge } from './components/auth/SessionBadge';
import { Header } from './components/common/Header';
import { AdminView } from './components/admin/AdminView';

export default function App() {
  return (
    <AuthGate allowedRoles={['admin']} appTitle="Admin">
      {(profile, logout) => (
        <div className="min-h-screen bg-[#F8F9FA] text-[#111827] flex flex-col font-sans selection:bg-[#E0E7FF] selection:text-[#1E1B4B]">
          <Header />

          <main className="flex-1 pb-16">
            <AdminView />
          </main>

          <SessionBadge profile={profile} onLogout={logout} />
        </div>
      )}
    </AuthGate>
  );
}