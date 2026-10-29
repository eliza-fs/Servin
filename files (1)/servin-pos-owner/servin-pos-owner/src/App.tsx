/**
 * Servin Coffee & Kitchen - Owner app
 *
 * Standalone, role-scoped build: contains only the Owner workspace.
 * Access requires a staff login with the 'owner' or 'admin' role.
 */

import { AuthGate } from './components/auth/AuthGate';
import { SessionBadge } from './components/auth/SessionBadge';
import { Header } from './components/common/Header';
import { OwnerView } from './components/owner/OwnerView';

export default function App() {
  return (
    <AuthGate allowedRoles={['owner', 'admin']} appTitle="Owner">
      {(profile, logout) => (
        <div className="min-h-screen bg-canvas text-ink flex flex-col font-sans selection:bg-brand-soft selection:text-ink">
          <Header />

          <main className="flex-1 pb-16">
            <OwnerView />
          </main>

          <SessionBadge profile={profile} onLogout={logout} />
        </div>
      )}
    </AuthGate>
  );
}