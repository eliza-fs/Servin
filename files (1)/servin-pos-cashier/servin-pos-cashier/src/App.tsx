/**
 * Servin Coffee & Kitchen - Cashier app
 *
 * Standalone, role-scoped build: contains only the Cashier workspace.
 */

import { Header } from './components/common/Header';
import { CashierView } from './components/cashier/CashierView';

export default function App() {
  return (
    <div className="min-h-screen bg-[#F8F9FA] text-[#111827] flex flex-col font-sans selection:bg-[#E0E7FF] selection:text-[#1E1B4B]">
      <Header />

      <main className="flex-1 pb-16">
        <CashierView />
      </main>
    </div>
  );
}
