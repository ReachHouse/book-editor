/**
 * StyleGuideModal Component Tests
 */
import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import StyleGuideModal from '../StyleGuideModal';

// Mock the constants module
jest.mock('../../constants', () => ({
  FULL_STYLE_GUIDE_DOCUMENT: 'Test style guide content here.'
}));

describe('StyleGuideModal', () => {
  const mockOnClose = jest.fn();

  beforeEach(() => {
    mockOnClose.mockClear();
  });

  test('returns null when not open', () => {
    const { container } = render(
      <StyleGuideModal isOpen={false} onClose={mockOnClose} />
    );

    expect(container.firstChild).toBeNull();
  });

  test('renders when open', () => {
    render(<StyleGuideModal isOpen={true} onClose={mockOnClose} />);

    expect(screen.getByText('Reach Publishers Style Guide')).toBeInTheDocument();
  });

  test('displays important notice', () => {
    render(<StyleGuideModal isOpen={true} onClose={mockOnClose} />);

    expect(screen.getByText(/All edits strictly follow/)).toBeInTheDocument();
  });

  test('displays style guide content', () => {
    render(<StyleGuideModal isOpen={true} onClose={mockOnClose} />);

    expect(screen.getByText('Test style guide content here.')).toBeInTheDocument();
  });

  test('calls onClose when X button is clicked', () => {
    render(<StyleGuideModal isOpen={true} onClose={mockOnClose} />);

    const closeButton = screen.getByLabelText('Close style guide');
    fireEvent.click(closeButton);

    expect(mockOnClose).toHaveBeenCalledTimes(1);
  });

  test('calls onClose when footer Close button is clicked', () => {
    render(<StyleGuideModal isOpen={true} onClose={mockOnClose} />);

    const closeButton = screen.getByRole('button', { name: 'Close' });
    fireEvent.click(closeButton);

    expect(mockOnClose).toHaveBeenCalledTimes(1);
  });
});
