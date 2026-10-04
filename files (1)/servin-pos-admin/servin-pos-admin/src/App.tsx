/**
 * Servin Coffee & Kitchen - Admin app
 *
 * Standalone, role-scoped build: contains only the Admin workspace.
 */

import { Header } from './components/common/Header';
import { AdminView } from './components/admin/AdminView';

export default function App() {
  return (
    <div className="min-h-screen bg-[#F8F9FA] text-[#111827] flex flex-col font-sans selection:bg-[#E0E7FF] selection:text-[#1E1B4B]">
      <Header />

      <main className="flex-1 pb-16">
        <AdminView />
      </main>
    </div>
  );
}
