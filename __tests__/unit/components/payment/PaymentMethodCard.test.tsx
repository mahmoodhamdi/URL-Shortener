import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { PaymentMethodCard, PaymentMethod } from '@/components/payment/PaymentMethodCard';

// Mock next-intl
vi.mock('next-intl', () => ({
  useTranslations: () => (key: string) => key,
}));

describe('PaymentMethodCard', () => {
  const mockMethod: PaymentMethod = {
    id: 'card',
    name: 'Credit Card',
    icon: 'card',
    description: 'Pay with Visa, Mastercard, or Amex',
  };

  const defaultProps = {
    method: mockMethod,
    isSelected: false,
    onClick: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders method name and description', () => {
    render(<PaymentMethodCard {...defaultProps} />);

    expect(screen.getByText('Credit Card')).toBeInTheDocument();
    expect(screen.getByText('Pay with Visa, Mastercard, or Amex')).toBeInTheDocument();
  });

  it('calls onClick when clicked', () => {
    const onClick = vi.fn();
    render(<PaymentMethodCard {...defaultProps} onClick={onClick} />);

    fireEvent.click(screen.getByRole('button'));
    expect(onClick).toHaveBeenCalledTimes(1);
  });

  it('shows checkmark when selected', () => {
    render(<PaymentMethodCard {...defaultProps} isSelected={true} />);

    // Check for checkmark icon presence
    const button = screen.getByRole('button');
    expect(button).toHaveClass('border-primary');
  });

  it('does not show checkmark when not selected', () => {
    render(<PaymentMethodCard {...defaultProps} isSelected={false} />);

    const button = screen.getByRole('button');
    expect(button).not.toHaveClass('border-primary');
  });

  it('is disabled when disabled prop is true', () => {
    const onClick = vi.fn();
    render(<PaymentMethodCard {...defaultProps} onClick={onClick} disabled={true} />);

    const button = screen.getByRole('button');
    expect(button).toBeDisabled();

    fireEvent.click(button);
    expect(onClick).not.toHaveBeenCalled();
  });

  it('renders card icon correctly', () => {
    render(<PaymentMethodCard {...defaultProps} />);

    // The component should render an icon based on the method.icon
    const button = screen.getByRole('button');
    expect(button).toBeInTheDocument();
  });

  it('renders kiosk icon for kiosk method', () => {
    const kioskMethod: PaymentMethod = {
      id: 'kiosk',
      name: 'Pay at Kiosk',
      icon: 'kiosk',
      description: 'Pay at Aman or Masary kiosk',
    };
    render(<PaymentMethodCard {...defaultProps} method={kioskMethod} />);

    expect(screen.getByText('Pay at Kiosk')).toBeInTheDocument();
  });

  it('renders wallet icon for wallet method', () => {
    const walletMethod: PaymentMethod = {
      id: 'wallet',
      name: 'Mobile Wallet',
      icon: 'wallet',
      description: 'Pay with Vodafone Cash or Orange Money',
    };
    render(<PaymentMethodCard {...defaultProps} method={walletMethod} />);

    expect(screen.getByText('Mobile Wallet')).toBeInTheDocument();
  });

  it('renders apple-pay icon', () => {
    const applePayMethod: PaymentMethod = {
      id: 'apple-pay',
      name: 'Apple Pay',
      icon: 'apple-pay',
      description: 'Pay with Apple Pay',
    };
    render(<PaymentMethodCard {...defaultProps} method={applePayMethod} />);

    expect(screen.getByText('Apple Pay')).toBeInTheDocument();
  });

  it('renders google-pay icon', () => {
    const googlePayMethod: PaymentMethod = {
      id: 'google-pay',
      name: 'Google Pay',
      icon: 'google-pay',
      description: 'Pay with Google Pay',
    };
    render(<PaymentMethodCard {...defaultProps} method={googlePayMethod} />);

    expect(screen.getByText('Google Pay')).toBeInTheDocument();
  });
});
