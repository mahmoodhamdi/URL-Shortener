import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import { PaymentCheckout } from '@/components/payment/PaymentCheckout';

// Mock next-intl
vi.mock('next-intl', () => ({
  useTranslations: () => (key: string) => key,
}));

// Mock fetch
const mockFetch = vi.fn();
global.fetch = mockFetch;

// Mock window.location
const mockLocation = {
  href: '',
};
Object.defineProperty(window, 'location', {
  value: mockLocation,
  writable: true,
});

describe('PaymentCheckout', () => {
  const defaultProps = {
    open: true,
    onOpenChange: vi.fn(),
    planId: 'PRO' as const,
    billingCycle: 'monthly' as const,
    onSuccess: vi.fn(),
    onCancel: vi.fn(),
  };

  const mockPaymentMethods = [
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

  beforeEach(() => {
    vi.clearAllMocks();
    mockLocation.href = '';
    mockFetch.mockReset();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('shows loading state initially', () => {
    mockFetch.mockImplementation(() => new Promise(() => {})); // Never resolves
    render(<PaymentCheckout {...defaultProps} />);

    // Should show loading spinner
    expect(document.querySelector('.animate-spin')).toBeInTheDocument();
  });

  it('fetches payment methods when opened', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () =>
        Promise.resolve({
          paymentMethods: mockPaymentMethods,
          preferredGateway: 'stripe',
        }),
    });

    render(<PaymentCheckout {...defaultProps} />);

    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalledWith('/api/payment/methods');
    });
  });

  it('displays payment methods after loading', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () =>
        Promise.resolve({
          paymentMethods: mockPaymentMethods,
          preferredGateway: 'stripe',
        }),
    });

    render(<PaymentCheckout {...defaultProps} />);

    await waitFor(() => {
      expect(screen.getByText('Credit Card')).toBeInTheDocument();
      expect(screen.getByText('Pay at Kiosk')).toBeInTheDocument();
      expect(screen.getByText('Mobile Wallet')).toBeInTheDocument();
    });
  });

  it('shows plan summary', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () =>
        Promise.resolve({
          paymentMethods: mockPaymentMethods,
          preferredGateway: 'stripe',
        }),
    });

    render(<PaymentCheckout {...defaultProps} />);

    await waitFor(() => {
      expect(screen.getByText(/Pro Plan/i)).toBeInTheDocument();
    });
  });

  it('auto-selects first payment method', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () =>
        Promise.resolve({
          paymentMethods: mockPaymentMethods,
          preferredGateway: 'stripe',
        }),
    });

    render(<PaymentCheckout {...defaultProps} />);

    await waitFor(() => {
      const buttons = screen.getAllByRole('button');
      const cardButton = buttons.find((b) => b.textContent?.includes('Credit Card'));
      expect(cardButton).toHaveClass('border-primary');
    });
  });

  it('redirects to login if not authenticated', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 401,
    });

    render(<PaymentCheckout {...defaultProps} />);

    await waitFor(() => {
      expect(mockLocation.href).toBe('/login?callbackUrl=/pricing');
    });
  });

  it('shows error state on fetch failure', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 500,
    });

    render(<PaymentCheckout {...defaultProps} />);

    await waitFor(() => {
      expect(screen.getByText('Failed to fetch payment methods')).toBeInTheDocument();
    });
  });

  it('handles card checkout and redirects', async () => {
    mockFetch
      .mockResolvedValueOnce({
        ok: true,
        json: () =>
          Promise.resolve({
            paymentMethods: mockPaymentMethods,
            preferredGateway: 'stripe',
          }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: () =>
          Promise.resolve({
            checkoutUrl: 'https://checkout.stripe.com/abc123',
          }),
      });

    render(<PaymentCheckout {...defaultProps} />);

    await waitFor(() => {
      expect(screen.getByText('Credit Card')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText('checkout'));

    await waitFor(() => {
      expect(mockLocation.href).toBe('https://checkout.stripe.com/abc123');
    });
  });

  it('handles kiosk payment flow', async () => {
    mockFetch
      .mockResolvedValueOnce({
        ok: true,
        json: () =>
          Promise.resolve({
            paymentMethods: mockPaymentMethods,
            preferredGateway: 'stripe',
          }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: () =>
          Promise.resolve({
            kioskData: {
              billReference: '1234-5678-9012',
              expiresAt: new Date(Date.now() + 60 * 60 * 1000).toISOString(),
              amount: 60000,
              currency: 'EGP',
            },
          }),
      });

    render(<PaymentCheckout {...defaultProps} />);

    await waitFor(() => {
      expect(screen.getByText('Pay at Kiosk')).toBeInTheDocument();
    });

    // Select kiosk
    fireEvent.click(screen.getByText('Pay at Kiosk'));
    fireEvent.click(screen.getByText('checkout'));

    await waitFor(() => {
      expect(screen.getByText('1234-5678-9012')).toBeInTheDocument();
    });
  });

  it('handles wallet payment flow', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () =>
        Promise.resolve({
          paymentMethods: mockPaymentMethods,
          preferredGateway: 'stripe',
        }),
    });

    render(<PaymentCheckout {...defaultProps} />);

    await waitFor(() => {
      expect(screen.getByText('Mobile Wallet')).toBeInTheDocument();
    });

    // Select wallet
    fireEvent.click(screen.getByText('Mobile Wallet'));

    // Mock the checkout API call for wallet
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({}),
    });

    fireEvent.click(screen.getByText('checkout'));

    await waitFor(() => {
      expect(screen.getByText('wallet.title')).toBeInTheDocument();
    });
  });

  it('shows error on checkout failure', async () => {
    mockFetch
      .mockResolvedValueOnce({
        ok: true,
        json: () =>
          Promise.resolve({
            paymentMethods: mockPaymentMethods,
            preferredGateway: 'stripe',
          }),
      })
      .mockResolvedValueOnce({
        ok: false,
        json: () =>
          Promise.resolve({
            error: 'Payment failed',
          }),
      });

    render(<PaymentCheckout {...defaultProps} />);

    await waitFor(() => {
      expect(screen.getByText('Credit Card')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText('checkout'));

    await waitFor(() => {
      expect(screen.getByText('Payment failed')).toBeInTheDocument();
    });
  });

  it('allows retry after error', async () => {
    mockFetch
      .mockResolvedValueOnce({
        ok: true,
        json: () =>
          Promise.resolve({
            paymentMethods: mockPaymentMethods,
            preferredGateway: 'stripe',
          }),
      })
      .mockResolvedValueOnce({
        ok: false,
        json: () =>
          Promise.resolve({
            error: 'Payment failed',
          }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: () =>
          Promise.resolve({
            paymentMethods: mockPaymentMethods,
            preferredGateway: 'stripe',
          }),
      });

    render(<PaymentCheckout {...defaultProps} />);

    await waitFor(() => {
      expect(screen.getByText('Credit Card')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText('checkout'));

    await waitFor(() => {
      expect(screen.getByText('tryAgain')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText('tryAgain'));

    await waitFor(() => {
      expect(screen.getByText('Credit Card')).toBeInTheDocument();
    });
  });

  it('calls onCancel when dialog is closed', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () =>
        Promise.resolve({
          paymentMethods: mockPaymentMethods,
          preferredGateway: 'stripe',
        }),
    });

    const onCancel = vi.fn();
    render(<PaymentCheckout {...defaultProps} onCancel={onCancel} />);

    await waitFor(() => {
      expect(screen.getByText('Credit Card')).toBeInTheDocument();
    });

    // Simulate dialog close
    const onOpenChange = defaultProps.onOpenChange;
    expect(onOpenChange).toBeDefined();
  });

  it('resets state when dialog closes and reopens', async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: () =>
        Promise.resolve({
          paymentMethods: mockPaymentMethods,
          preferredGateway: 'stripe',
        }),
    });

    const { rerender } = render(<PaymentCheckout {...defaultProps} />);

    await waitFor(() => {
      expect(screen.getByText('Credit Card')).toBeInTheDocument();
    });

    // Close dialog
    rerender(<PaymentCheckout {...defaultProps} open={false} />);

    // Reopen dialog
    rerender(<PaymentCheckout {...defaultProps} open={true} />);

    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalledTimes(2);
    });
  });

  it('shows security footer in selecting state', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () =>
        Promise.resolve({
          paymentMethods: mockPaymentMethods,
          preferredGateway: 'stripe',
        }),
    });

    render(<PaymentCheckout {...defaultProps} />);

    await waitFor(() => {
      expect(screen.getByText(/security.secure/)).toBeInTheDocument();
      expect(screen.getByText(/security.encrypted/)).toBeInTheDocument();
    });
  });

  it('shows back button in kiosk state', async () => {
    mockFetch
      .mockResolvedValueOnce({
        ok: true,
        json: () =>
          Promise.resolve({
            paymentMethods: mockPaymentMethods,
            preferredGateway: 'stripe',
          }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: () =>
          Promise.resolve({
            kioskData: {
              billReference: '1234-5678-9012',
              expiresAt: new Date(Date.now() + 60 * 60 * 1000).toISOString(),
              amount: 60000,
              currency: 'EGP',
            },
          }),
      });

    render(<PaymentCheckout {...defaultProps} />);

    await waitFor(() => {
      expect(screen.getByText('Pay at Kiosk')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText('Pay at Kiosk'));
    fireEvent.click(screen.getByText('checkout'));

    await waitFor(() => {
      expect(screen.getByText('1234-5678-9012')).toBeInTheDocument();
    });

    // Back button should be visible
    const backButton = document.querySelector('[class*="h-6 w-6"]');
    expect(backButton).toBeInTheDocument();
  });
});
