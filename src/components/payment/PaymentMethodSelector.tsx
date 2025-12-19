'use client';

import { PaymentMethodCard, PaymentMethod } from './PaymentMethodCard';
import { Loader2 } from 'lucide-react';

interface PaymentMethodSelectorProps {
  methods: PaymentMethod[];
  selectedMethod: string | null;
  onSelect: (methodId: string) => void;
  isLoading?: boolean;
  disabled?: boolean;
}

export function PaymentMethodSelector({
  methods,
  selectedMethod,
  onSelect,
  isLoading = false,
  disabled = false,
}: PaymentMethodSelectorProps) {
  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (methods.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        No payment methods available for your region.
      </div>
    );
  }

  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
      {methods.map((method) => (
        <PaymentMethodCard
          key={method.id}
          method={method}
          isSelected={selectedMethod === method.id}
          onClick={() => onSelect(method.id)}
          disabled={disabled}
        />
      ))}
    </div>
  );
}
