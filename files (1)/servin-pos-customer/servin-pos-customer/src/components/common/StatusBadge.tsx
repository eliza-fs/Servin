import React from 'react';
import { KitchenStatus, PaymentStatus } from '../../types/pos';
import { Clock, ChefHat, Bell, CheckCircle2, AlertCircle, XCircle } from 'lucide-react';

interface KitchenStatusBadgeProps {
  status: KitchenStatus;
  size?: 'sm' | 'md' | 'lg';
}

export const KitchenStatusBadge: React.FC<KitchenStatusBadgeProps> = ({ status, size = 'md' }) => {
  const sizeClasses = {
    sm: 'text-[11px] py-0.5 px-2 gap-1.5 font-medium',
    md: 'text-xs py-1 px-2.5 gap-1.5 font-semibold',
    lg: 'text-xs py-1.5 px-3 gap-2 font-bold tracking-tight',
  };

  switch (status) {
    case 'WAITING':
      return (
        <span
          className={`inline-flex items-center rounded-md bg-amber-500/10 text-amber-700 border border-amber-500/20 ${sizeClasses[size]}`}
        >
          <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse" />
          <span>Waiting</span>
        </span>
      );
    case 'COOKING':
      return (
        <span
          className={`inline-flex items-center rounded-md bg-blue-500/10 text-blue-700 border border-blue-500/20 ${sizeClasses[size]}`}
        >
          <span className="w-1.5 h-1.5 rounded-full bg-blue-600 animate-ping" />
          <span>Cooking</span>
        </span>
      );
    case 'READY':
      return (
        <span
          className={`inline-flex items-center rounded-md bg-emerald-500/10 text-emerald-700 border border-emerald-500/20 ${sizeClasses[size]}`}
        >
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-600 animate-bounce" />
          <span>Ready</span>
        </span>
      );
    case 'COMPLETED':
      return (
        <span
          className={`inline-flex items-center rounded-md bg-slate-100 text-slate-700 border border-slate-200/80 ${sizeClasses[size]}`}
        >
          <CheckCircle2 className="w-3.5 h-3.5 text-slate-500" />
          <span>Completed</span>
        </span>
      );
  }
};

interface PaymentStatusBadgeProps {
  status: PaymentStatus;
  method?: string;
  size?: 'sm' | 'md';
}

export const PaymentStatusBadge: React.FC<PaymentStatusBadgeProps> = ({ status, method, size = 'md' }) => {
  const sizeClass = size === 'sm' ? 'text-[11px] py-0.5 px-1.5' : 'text-xs py-1 px-2';
  const methodLabel = method ? ` · ${method.toUpperCase()}` : '';

  if (status === 'PAID') {
    return (
      <span className={`inline-flex items-center gap-1.5 rounded-md bg-emerald-50 text-emerald-800 border border-emerald-200/60 font-medium ${sizeClass}`}>
        <span className="w-1.5 h-1.5 rounded-full bg-emerald-600" />
        <span>Paid{methodLabel}</span>
      </span>
    );
  }

  if (status === 'UNPAID') {
    return (
      <span className={`inline-flex items-center gap-1.5 rounded-md bg-rose-50 text-rose-800 border border-rose-200/60 font-medium ${sizeClass}`}>
        <span className="w-1.5 h-1.5 rounded-full bg-rose-600" />
        <span>Unpaid{methodLabel}</span>
      </span>
    );
  }

  return (
    <span className={`inline-flex items-center gap-1.5 rounded-md bg-slate-100 text-slate-700 border border-slate-200 font-medium ${sizeClass}`}>
      <span className="w-1.5 h-1.5 rounded-full bg-slate-500" />
      <span>Failed</span>
    </span>
  );
};

interface StockStatusBadgeProps {
  status: 'normal' | 'low_stock' | 'out_of_stock';
}

export const StockStatusBadge: React.FC<StockStatusBadgeProps> = ({ status }) => {
  if (status === 'out_of_stock') {
    return (
      <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-[11px] font-semibold bg-red-50 text-red-700 border border-red-200">
        <span className="w-1.5 h-1.5 rounded-full bg-red-600" />
        Out of Stock
      </span>
    );
  }
  if (status === 'low_stock') {
    return (
      <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-[11px] font-semibold bg-amber-50 text-amber-700 border border-amber-200">
        <span className="w-1.5 h-1.5 rounded-full bg-amber-600" />
        Low Stock
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-[11px] font-medium bg-slate-50 text-slate-700 border border-slate-200">
      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
      Normal
    </span>
  );
};
