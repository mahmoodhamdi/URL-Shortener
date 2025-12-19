'use client';

import { cn } from '@/lib/utils';
import { Check } from 'lucide-react';

export interface PaymentMethod {
  id: string;
  name: string;
  icon: string;
  description: string;
}

interface PaymentMethodCardProps {
  method: PaymentMethod;
  isSelected: boolean;
  onClick: () => void;
  disabled?: boolean;
}

export function PaymentMethodCard({
  method,
  isSelected,
  onClick,
  disabled = false,
}: PaymentMethodCardProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={cn(
        'relative flex flex-col items-center justify-center p-4 rounded-lg border-2 transition-all',
        'hover:border-primary/50 hover:bg-accent/50',
        'focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2',
        'dark:focus:ring-offset-gray-900',
        isSelected
          ? 'border-primary bg-primary/5 dark:bg-primary/10'
          : 'border-border bg-card',
        disabled && 'opacity-50 cursor-not-allowed hover:border-border hover:bg-card'
      )}
    >
      {isSelected && (
        <div className="absolute top-2 right-2">
          <Check className="h-4 w-4 text-primary" />
        </div>
      )}

      <span className="text-3xl mb-2" role="img" aria-label={method.name}>
        {method.icon}
      </span>

      <span className="font-medium text-sm text-center text-foreground">
        {method.name}
      </span>

      <span className="text-xs text-muted-foreground text-center mt-1 line-clamp-2">
        {method.description}
      </span>
    </button>
  );
}
