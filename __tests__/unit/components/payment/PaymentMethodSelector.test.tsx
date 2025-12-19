import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { PaymentMethodSelector } from '@/components/payment/PaymentMethodSelector';
import { PaymentMethod } from '@/components/payment/PaymentMethodCard';

// Mock next-intl
vi.mock('next-intl', () => ({
  useTranslations: () => (key: string) => key,
}));

describe('PaymentMethodSelector', () => {
  const mockMethods: PaymentMethod[] = [
    {
      id: 'card',
      name: 'Credit Card',
      icon: 'card',
      description: 'Pay with Visa, Mastercard, or Amex',
    },
    {
      id: 'kiosk',
      name: 'Pay at Kiosk',
      icon: 'kiosk',
      description: 'Pay at Aman or Masary kiosk',
    },
    {
      id: 'wallet',
      name: 'Mobile Wallet',
      icon: 'wallet',
      description: 'Pay with Vodafone Cash',
    },
  ];

  const defaultProps = {
    methods: mockMethods,
    selectedMethod: null,
    onSelect: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders all payment methods', () => {
    render(<PaymentMethodSelector {...defaultProps} />);

    expect(screen.getByText('Credit Card')).toBeInTheDocument();
    expect(screen.getByText('Pay at Kiosk')).toBeInTheDocument();
    expect(screen.getByText('Mobile Wallet')).toBeInTheDocument();
  });

  it('calls onSelect when a method is clicked', () => {
    const onSelect = vi.fn();
    render(<PaymentMethodSelector {...defaultProps} onSelect={onSelect} />);

    fireEvent.click(screen.getByText('Credit Card'));
    expect(onSelect).toHaveBeenCalledWith('card');
  });

  it('marks selected method as selected', () => {
    render(<PaymentMethodSelector {...defaultProps} selectedMethod="kiosk" />);

    // The kiosk button should have the selected styling
    const buttons = screen.getAllByRole('button');
    // Find the button containing "Pay at Kiosk"
    const kioskButton = buttons.find((button) =>
      button.textContent?.includes('Pay at Kiosk')
    );
    expect(kioskButton).toHaveClass('border-primary');
  });

  it('shows loading state', () => {
    render(<PaymentMethodSelector {...defaultProps} isLoading={true} />);

    // Should show loading spinner
    const loadingSpinner = document.querySelector('.animate-spin');
    expect(loadingSpinner).toBeInTheDocument();
  });

  it('shows empty state when no methods available', () => {
    render(<PaymentMethodSelector {...defaultProps} methods={[]} />);

    expect(screen.getByText('No payment methods available for your region.')).toBeInTheDocument();
  });

  it('disables all methods when disabled prop is true', () => {
    render(<PaymentMethodSelector {...defaultProps} disabled={true} />);

    const buttons = screen.getAllByRole('button');
    buttons.forEach((button) => {
      expect(button).toBeDisabled();
    });
  });

  it('does not call onSelect when disabled', () => {
    const onSelect = vi.fn();
    render(
      <PaymentMethodSelector {...defaultProps} onSelect={onSelect} disabled={true} />
    );

    fireEvent.click(screen.getByText('Credit Card'));
    expect(onSelect).not.toHaveBeenCalled();
  });

  it('renders methods in a grid layout', () => {
    const { container } = render(<PaymentMethodSelector {...defaultProps} />);

    // Check that the container has grid styling
    const gridContainer = container.querySelector('.grid');
    expect(gridContainer).toBeInTheDocument();
    expect(gridContainer).toHaveClass('grid-cols-2');
  });
});
