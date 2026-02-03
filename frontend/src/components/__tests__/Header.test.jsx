/**
 * Header Component Tests
 */
import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import Header from '../Header';

describe('Header', () => {
  const mockOnShowStyleGuide = jest.fn();

  beforeEach(() => {
    mockOnShowStyleGuide.mockClear();
  });

  test('renders application title', () => {
    render(<Header onShowStyleGuide={mockOnShowStyleGuide} />);

    expect(screen.getByText('Professional Book Editor')).toBeInTheDocument();
  });

  test('renders subtitle', () => {
    render(<Header onShowStyleGuide={mockOnShowStyleGuide} />);

    expect(screen.getByText('AI-powered manuscript editing with tracked changes')).toBeInTheDocument();
  });

  test('renders style guide button', () => {
    render(<Header onShowStyleGuide={mockOnShowStyleGuide} />);

    expect(screen.getByText('View Reach Publishers Style Guide')).toBeInTheDocument();
  });

  test('calls onShowStyleGuide when button is clicked', () => {
    render(<Header onShowStyleGuide={mockOnShowStyleGuide} />);

    const button = screen.getByText('View Reach Publishers Style Guide');
    fireEvent.click(button);

    expect(mockOnShowStyleGuide).toHaveBeenCalledTimes(1);
  });
});
