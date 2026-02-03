/**
 * ErrorDisplay Component Tests
 */
import React from 'react';
import { render, screen } from '@testing-library/react';
import ErrorDisplay from '../ErrorDisplay';

describe('ErrorDisplay', () => {
  test('returns null when error is empty', () => {
    const { container } = render(<ErrorDisplay error="" />);

    expect(container.firstChild).toBeNull();
  });

  test('returns null when error is null', () => {
    const { container } = render(<ErrorDisplay error={null} />);

    expect(container.firstChild).toBeNull();
  });

  test('returns null when error is undefined', () => {
    const { container } = render(<ErrorDisplay error={undefined} />);

    expect(container.firstChild).toBeNull();
  });

  test('renders error message', () => {
    render(<ErrorDisplay error="Something went wrong" />);

    expect(screen.getByText('Error')).toBeInTheDocument();
    expect(screen.getByText('Something went wrong')).toBeInTheDocument();
  });

  test('renders debug log when provided', () => {
    const debugLog = [
      { timestamp: '12:34:56', message: 'Step 1', type: 'info' },
      { timestamp: '12:34:57', message: 'Step 2', type: 'info' },
      { timestamp: '12:34:58', message: 'Error occurred', type: 'error' }
    ];

    render(<ErrorDisplay error="Test error" debugLog={debugLog} />);

    expect(screen.getByText('Debug Log:')).toBeInTheDocument();
  });

  test('does not render debug section when debugLog is empty', () => {
    render(<ErrorDisplay error="Test error" debugLog={[]} />);

    expect(screen.queryByText('Debug Log:')).not.toBeInTheDocument();
  });

  test('does not render debug section when debugLog is undefined', () => {
    render(<ErrorDisplay error="Test error" />);

    expect(screen.queryByText('Debug Log:')).not.toBeInTheDocument();
  });
});
