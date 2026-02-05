/**
 * Header Component Tests
 */
import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import Header from '../Header';

// Mock the AuthContext
const mockLogout = jest.fn();
jest.mock('../../contexts/AuthContext', () => ({
  useAuth: () => ({
    logout: mockLogout
  })
}));

describe('Header', () => {
  const mockOnShowStyleGuide = jest.fn();

  beforeEach(() => {
    mockOnShowStyleGuide.mockClear();
    mockLogout.mockClear();
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

  test('shows username when user is provided', () => {
    const user = { username: 'testuser', role: 'user' };
    render(<Header onShowStyleGuide={mockOnShowStyleGuide} user={user} />);

    expect(screen.getByText('testuser')).toBeInTheDocument();
  });

  test('shows Admin badge for admin users', () => {
    const user = { username: 'admin', role: 'admin' };
    render(<Header onShowStyleGuide={mockOnShowStyleGuide} user={user} />);

    expect(screen.getByText('Admin')).toBeInTheDocument();
  });

  test('does not show Admin badge for regular users', () => {
    const user = { username: 'regular', role: 'user' };
    render(<Header onShowStyleGuide={mockOnShowStyleGuide} user={user} />);

    expect(screen.queryByText('Admin')).not.toBeInTheDocument();
  });

  test('shows sign out button when user is provided', () => {
    const user = { username: 'testuser', role: 'user' };
    render(<Header onShowStyleGuide={mockOnShowStyleGuide} user={user} />);

    expect(screen.getByLabelText('Sign out')).toBeInTheDocument();
  });

  test('calls logout when sign out is clicked', () => {
    const user = { username: 'testuser', role: 'user' };
    render(<Header onShowStyleGuide={mockOnShowStyleGuide} user={user} />);

    fireEvent.click(screen.getByLabelText('Sign out'));

    expect(mockLogout).toHaveBeenCalledTimes(1);
  });

  test('does not show user bar when no user provided', () => {
    render(<Header onShowStyleGuide={mockOnShowStyleGuide} />);

    expect(screen.queryByLabelText('Sign out')).not.toBeInTheDocument();
  });
});
