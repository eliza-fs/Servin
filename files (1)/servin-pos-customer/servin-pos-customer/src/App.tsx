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
    <div className="min-h-screen bg-canvas text-ink flex flex-col font-sans selection:bg-brand-soft selection:text-ink">
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
