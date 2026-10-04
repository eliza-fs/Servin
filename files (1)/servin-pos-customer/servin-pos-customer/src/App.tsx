/**
 * Servin Coffee & Kitchen - Customer app (self-order)
 *
 * Route: /order/table-12  (the table number is read from the URL, default 12)
 */

import { useState, useEffect } from 'react';
import { Header } from './components/common/Header';
import { CustomerView } from './components/customer/CustomerView';

export default function App() {
  const [tableNumber, setTableNumber] = useState('12');

  // Read the table number from URL path or hash, e.g. /order/table-5
  const parseRoute = () => {
    const path = window.location.pathname.toLowerCase();
    const hash = window.location.hash.toLowerCase().replace('#', '');
    const route = hash || path;
    const match = route.match(/table-(\d+)/);
    if (match) {
      setTableNumber(match[1]);
    }
  };

  useEffect(() => {
    parseRoute();
    window.addEventListener('popstate', parseRoute);
    return () => window.removeEventListener('popstate', parseRoute);
  }, []);

  return (
    <div className="min-h-screen bg-[#F8F9FA] text-[#111827] flex flex-col font-sans selection:bg-[#E0E7FF] selection:text-[#1E1B4B]">
      <Header />

      <main className="flex-1 pb-16">
        <CustomerView
          initialTableNumber={tableNumber}
          onNavigateToOrder={() => {}}
        />
      </main>
    </div>
  );
}
