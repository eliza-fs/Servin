/**
 * Servin Coffee & Kitchen - Cashier app
 *
 * Standalone, role-scoped build: contains only the Cashier workspace.
 * Access requires a staff login with the 'cashier' or 'admin' role.
 */

import { AuthGate } from './components/auth/AuthGate';
import { SessionBadge } from './components/auth/SessionBadge';
import { Header } from './components/common/Header';
import { CashierView } from './components/cashier/CashierView';

export default function App() {
  return (
    <AuthGate allowedRoles={['cashier', 'admin']} appTitle="Cashier">
      {(profile, logout) => (
        <div className="min-h-screen bg-canvas text-ink flex flex-col font-sans selection:bg-brand-soft selection:text-ink">
          <Header />

          <main className="flex-1 pb-16">
            <CashierView />
          </main>

          <SessionBadge profile={profile} onLogout={logout} />
        </div>
      )}
    </AuthGate>
  );
}