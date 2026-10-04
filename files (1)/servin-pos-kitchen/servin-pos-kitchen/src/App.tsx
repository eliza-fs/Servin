/**
 * Servin Coffee & Kitchen - Kitchen KDS app
 *
 * Standalone, role-scoped build: contains only the Kitchen KDS workspace.
 */

import { Header } from './components/common/Header';
import { KitchenView } from './components/kitchen/KitchenView';

export default function App() {
  return (
    <div className="min-h-screen bg-[#F8F9FA] text-[#111827] flex flex-col font-sans selection:bg-[#E0E7FF] selection:text-[#1E1B4B]">
      <Header />

      <main className="flex-1 pb-16">
        <KitchenView />
      </main>
    </div>
  );
}
