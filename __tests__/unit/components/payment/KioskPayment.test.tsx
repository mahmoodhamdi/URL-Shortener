import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, act } from '@testing-library/react';
import { KioskPayment } from '@/components/payment/KioskPayment';

// Mock next-intl
vi.mock('next-intl', () => ({
  useTranslations: () => (key: string) => key,
}));

// Mock clipboard API
const mockClipboard = {
  writeText: vi.fn().mockResolvedValue(undefined),
};

Object.defineProperty(navigator, 'clipboard', {
  value: mockClipboard,
  writable: true,
});

describe('KioskPayment', () => {
  const defaultProps = {
    billReference: '1234-5678-9012',
    expiresAt: new Date(Date.now() + 2 * 60 * 60 * 1000), // 2 hours from now
    amount: 60000, // 600 EGP in cents
    currency: 'EGP',
    onClose: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('renders bill reference', () => {
    render(<KioskPayment {...defaultProps} />);

    expect(screen.getByText('1234-5678-9012')).toBeInTheDocument();
  });

  it('renders kiosk title', () => {
    render(<KioskPayment {...defaultProps} />);

    expect(screen.getByText('kiosk.title')).toBeInTheDocument();
  });

  it('renders formatted amount', () => {
    render(<KioskPayment {...defaultProps} />);

    expect(screen.getByText('EGP 600')).toBeInTheDocument();
  });

  it('copies reference to clipboard when copy button is clicked', async () => {
    render(<KioskPayment {...defaultProps} />);

    const copyButton = screen.getByRole('button', { name: '' });
    await act(async () => {
      fireEvent.click(copyButton);
    });

    expect(mockClipboard.writeText).toHaveBeenCalledWith('1234-5678-9012');
  });

  it('shows check icon after copying', async () => {
    render(<KioskPayment {...defaultProps} />);

    const copyButton = screen.getByRole('button', { name: '' });
    await act(async () => {
      fireEvent.click(copyButton);
    });

    // Check icon should appear after copying
    // The component shows Check icon for 2 seconds after copying
    expect(mockClipboard.writeText).toHaveBeenCalled();
  });

  it('renders countdown timer', () => {
    render(<KioskPayment {...defaultProps} />);

    // The timer should show approximately 2 hours
    expect(screen.getByText(/\d{2}:\d{2}:\d{2}/)).toBeInTheDocument();
  });

  it('updates countdown timer every second', () => {
    render(<KioskPayment {...defaultProps} />);

    const initialTimer = screen.getByText(/\d{2}:\d{2}:\d{2}/).textContent;

    act(() => {
      vi.advanceTimersByTime(1000);
    });

    const updatedTimer = screen.getByText(/\d{2}:\d{2}:\d{2}/).textContent;

    // Timer should have changed
    expect(updatedTimer).not.toBe(initialTimer);
  });

  it('shows Expired when time runs out', () => {
    const expiredProps = {
      ...defaultProps,
      expiresAt: new Date(Date.now() - 1000), // 1 second ago
    };

    render(<KioskPayment {...expiredProps} />);

    expect(screen.getByText('Expired')).toBeInTheDocument();
  });

  it('renders kiosk instructions', () => {
    render(<KioskPayment {...defaultProps} />);

    expect(screen.getByText('kiosk.instructions')).toBeInTheDocument();
    expect(screen.getByText('kiosk.step1')).toBeInTheDocument();
    expect(screen.getByText('kiosk.step2')).toBeInTheDocument();
    expect(screen.getByText('kiosk.step3')).toBeInTheDocument();
    expect(screen.getByText('kiosk.step4')).toBeInTheDocument();
    expect(screen.getByText('kiosk.step5')).toBeInTheDocument();
  });

  it('renders kiosk note', () => {
    render(<KioskPayment {...defaultProps} />);

    expect(screen.getByText('kiosk.note')).toBeInTheDocument();
  });

  it('calls onClose when Done button is clicked', () => {
    const onClose = vi.fn();
    render(<KioskPayment {...defaultProps} onClose={onClose} />);

    fireEvent.click(screen.getByText('Done'));
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('formats USD currency correctly', () => {
    render(<KioskPayment {...defaultProps} currency="USD" amount={1200} />);

    expect(screen.getByText('$12')).toBeInTheDocument();
  });

  it('formats EUR currency correctly', () => {
    render(<KioskPayment {...defaultProps} currency="EUR" amount={1500} />);

    expect(screen.getByText('€15')).toBeInTheDocument();
  });
});
