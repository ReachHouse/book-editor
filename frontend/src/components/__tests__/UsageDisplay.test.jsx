/**
 * UsageDisplay Component Tests
 */
import React from 'react';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import UsageDisplay from '../UsageDisplay';

// Mock the API module
const mockGetUsage = jest.fn();
jest.mock('../../services/api', () => ({
  getUsage: (...args) => mockGetUsage(...args)
}));

const mockUsageData = {
  daily: {
    input: 3000,
    output: 1500,
    total: 4500,
    limit: 500000,
    percentage: 1
  },
  monthly: {
    input: 50000,
    output: 25000,
    total: 75000,
    limit: 10000000,
    percentage: 1
  }
};

describe('UsageDisplay', () => {
  beforeEach(() => {
    jest.useFakeTimers();
    mockGetUsage.mockReset();
    mockGetUsage.mockResolvedValue(mockUsageData);
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  test('renders nothing before data loads', () => {
    mockGetUsage.mockReturnValue(new Promise(() => {})); // never resolves
    const { container } = render(<UsageDisplay />);
    expect(container.firstChild).toBeNull();
  });

  test('renders usage summary after data loads', async () => {
    await act(async () => {
      render(<UsageDisplay />);
    });

    expect(screen.getByText(/Today:/)).toBeInTheDocument();
    expect(screen.getByText(/Month:/)).toBeInTheDocument();
  });

  test('displays formatted token counts', async () => {
    await act(async () => {
      render(<UsageDisplay />);
    });

    // Check the toggle button contains formatted token counts
    const button = screen.getByLabelText('Toggle usage details');
    expect(button.textContent).toContain('500K');
    expect(button.textContent).toMatch(/Today:/);
    expect(button.textContent).toMatch(/Month:/);
  });

  test('shows expanded details when clicked', async () => {
    await act(async () => {
      render(<UsageDisplay />);
    });

    const button = screen.getByLabelText('Toggle usage details');
    fireEvent.click(button);

    expect(screen.getByText(/Daily Usage/)).toBeInTheDocument();
    expect(screen.getByText(/Monthly Usage/)).toBeInTheDocument();
  });

  test('shows input/output breakdown when expanded', async () => {
    await act(async () => {
      render(<UsageDisplay />);
    });

    fireEvent.click(screen.getByLabelText('Toggle usage details'));

    // The breakdown shows "Today: 3K in / 2K out" (1500 rounds to 2K)
    const breakdown = screen.getByText(/in \//);
    expect(breakdown.textContent).toContain('3K');
    expect(breakdown.textContent).toContain('out');
  });

  test('hides details when clicked again', async () => {
    await act(async () => {
      render(<UsageDisplay />);
    });

    const button = screen.getByLabelText('Toggle usage details');
    fireEvent.click(button); // expand
    expect(screen.getByText(/Daily Usage/)).toBeInTheDocument();

    fireEvent.click(button); // collapse
    expect(screen.queryByText(/Daily Usage/)).not.toBeInTheDocument();
  });

  test('shows warning when daily usage is high', async () => {
    mockGetUsage.mockResolvedValue({
      ...mockUsageData,
      daily: { ...mockUsageData.daily, percentage: 95 }
    });

    await act(async () => {
      render(<UsageDisplay />);
    });

    fireEvent.click(screen.getByLabelText('Toggle usage details'));

    expect(screen.getByText(/Approaching daily limit/)).toBeInTheDocument();
  });

  test('shows warning when monthly usage is high', async () => {
    mockGetUsage.mockResolvedValue({
      ...mockUsageData,
      monthly: { ...mockUsageData.monthly, percentage: 92 }
    });

    await act(async () => {
      render(<UsageDisplay />);
    });

    fireEvent.click(screen.getByLabelText('Toggle usage details'));

    expect(screen.getByText(/Approaching monthly limit/)).toBeInTheDocument();
  });

  test('handles API errors gracefully', async () => {
    mockGetUsage.mockRejectedValue(new Error('Network error'));

    await act(async () => {
      render(<UsageDisplay />);
    });

    // Should render nothing on error
    const toggleButton = screen.queryByLabelText('Toggle usage details');
    expect(toggleButton).not.toBeInTheDocument();
  });

  test('calls getUsage on mount', async () => {
    await act(async () => {
      render(<UsageDisplay />);
    });

    expect(mockGetUsage).toHaveBeenCalledTimes(1);
  });
});
