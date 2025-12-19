import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { WalletPayment } from '@/components/payment/WalletPayment';

// Mock next-intl
vi.mock('next-intl', () => ({
  useTranslations: () => (key: string) => key,
}));

describe('WalletPayment', () => {
  const defaultProps = {
    onSubmit: vi.fn().mockResolvedValue(undefined),
    isLoading: false,
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders wallet title and description', () => {
    render(<WalletPayment {...defaultProps} />);

    expect(screen.getByText('wallet.title')).toBeInTheDocument();
    expect(screen.getByText('wallet.phoneHelp')).toBeInTheDocument();
  });

  it('renders phone number input', () => {
    render(<WalletPayment {...defaultProps} />);

    expect(screen.getByRole('textbox')).toBeInTheDocument();
    expect(screen.getByText('+20')).toBeInTheDocument();
  });

  it('renders wallet providers', () => {
    render(<WalletPayment {...defaultProps} />);

    expect(screen.getByText('Vodafone Cash')).toBeInTheDocument();
    expect(screen.getByText('Orange Money')).toBeInTheDocument();
    expect(screen.getByText('Etisalat Cash')).toBeInTheDocument();
    expect(screen.getByText('WE Pay')).toBeInTheDocument();
  });

  it('renders provider prefixes', () => {
    render(<WalletPayment {...defaultProps} />);

    expect(screen.getByText('010')).toBeInTheDocument();
    expect(screen.getByText('012')).toBeInTheDocument();
    expect(screen.getByText('011')).toBeInTheDocument();
    expect(screen.getByText('015')).toBeInTheDocument();
  });

  it('accepts numeric input only', async () => {
    const user = userEvent.setup();
    render(<WalletPayment {...defaultProps} />);

    const input = screen.getByRole('textbox');
    await user.type(input, '010abc123def456');

    expect(input).toHaveValue('010123456');
  });

  it('has maxLength of 11 characters', () => {
    render(<WalletPayment {...defaultProps} />);

    const input = screen.getByRole('textbox');
    expect(input).toHaveAttribute('maxLength', '11');
  });

  it('detects Vodafone Cash provider', async () => {
    const user = userEvent.setup();
    render(<WalletPayment {...defaultProps} />);

    const input = screen.getByRole('textbox');
    await user.type(input, '0101234567');

    expect(screen.getByText(/Detected:/)).toBeInTheDocument();
    // There are multiple "Vodafone Cash" elements (one in detected, one in providers list)
    expect(screen.getAllByText('Vodafone Cash').length).toBeGreaterThanOrEqual(2);
  });

  it('detects Orange Money provider', async () => {
    const user = userEvent.setup();
    render(<WalletPayment {...defaultProps} />);

    const input = screen.getByRole('textbox');
    await user.type(input, '0121234567');

    expect(screen.getByText(/Detected:/)).toBeInTheDocument();
  });

  it('detects Etisalat Cash provider', async () => {
    const user = userEvent.setup();
    render(<WalletPayment {...defaultProps} />);

    const input = screen.getByRole('textbox');
    await user.type(input, '0111234567');

    expect(screen.getByText(/Detected:/)).toBeInTheDocument();
  });

  it('detects WE Pay provider', async () => {
    const user = userEvent.setup();
    render(<WalletPayment {...defaultProps} />);

    const input = screen.getByRole('textbox');
    await user.type(input, '0151234567');

    expect(screen.getByText(/Detected:/)).toBeInTheDocument();
  });

  it('disables submit button when phone number is too short', async () => {
    const user = userEvent.setup();
    render(<WalletPayment {...defaultProps} />);

    const input = screen.getByRole('textbox');
    await user.type(input, '010123');

    const submitButton = screen.getByRole('button', { name: /wallet.sendRequest/i });
    expect(submitButton).toBeDisabled();
  });

  it('enables submit button when phone number is valid', async () => {
    const user = userEvent.setup();
    render(<WalletPayment {...defaultProps} />);

    const input = screen.getByRole('textbox');
    await user.type(input, '01012345678');

    const submitButton = screen.getByRole('button', { name: /wallet.sendRequest/i });
    expect(submitButton).toBeEnabled();
  });

  it('calls onSubmit with formatted phone number', async () => {
    const user = userEvent.setup();
    const onSubmit = vi.fn().mockResolvedValue(undefined);
    render(<WalletPayment {...defaultProps} onSubmit={onSubmit} />);

    const input = screen.getByRole('textbox');
    await user.type(input, '01012345678');

    const submitButton = screen.getByRole('button', { name: /wallet.sendRequest/i });
    await user.click(submitButton);

    expect(onSubmit).toHaveBeenCalledWith('+201012345678');
  });

  it('formats phone number without leading zero correctly', async () => {
    const user = userEvent.setup();
    const onSubmit = vi.fn().mockResolvedValue(undefined);
    render(<WalletPayment {...defaultProps} onSubmit={onSubmit} />);

    const input = screen.getByRole('textbox');
    await user.type(input, '1012345678');

    const submitButton = screen.getByRole('button', { name: /wallet.sendRequest/i });
    await user.click(submitButton);

    expect(onSubmit).toHaveBeenCalledWith('+201012345678');
  });

  it('shows loading state', () => {
    render(<WalletPayment {...defaultProps} isLoading={true} />);

    expect(screen.getByText('processing')).toBeInTheDocument();
  });

  it('disables input when loading', () => {
    render(<WalletPayment {...defaultProps} isLoading={true} />);

    expect(screen.getByRole('textbox')).toBeDisabled();
  });

  it('shows error message', () => {
    render(<WalletPayment {...defaultProps} error="Payment failed" />);

    expect(screen.getByText('Payment failed')).toBeInTheDocument();
  });

  it('renders success state', () => {
    render(<WalletPayment {...defaultProps} success={true} />);

    expect(screen.getByText('wallet.requestSent')).toBeInTheDocument();
    expect(screen.getByText('wallet.checkPhone')).toBeInTheDocument();
  });

  it('does not render form in success state', () => {
    render(<WalletPayment {...defaultProps} success={true} />);

    expect(screen.queryByRole('textbox')).not.toBeInTheDocument();
  });
});
