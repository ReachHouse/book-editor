/**
 * RegisterPage Component Tests
 */
import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import RegisterPage from '../RegisterPage';

// Mock the AuthContext
const mockRegister = jest.fn();
jest.mock('../../contexts/AuthContext', () => ({
  useAuth: () => ({
    register: mockRegister
  })
}));

describe('RegisterPage', () => {
  const mockSwitchToLogin = jest.fn();

  beforeEach(() => {
    mockRegister.mockClear();
    mockSwitchToLogin.mockClear();
  });

  test('renders registration form', () => {
    render(<RegisterPage onSwitchToLogin={mockSwitchToLogin} />);

    expect(screen.getByRole('heading', { name: 'Create Account' })).toBeInTheDocument();
    expect(screen.getByLabelText('Invite Code')).toBeInTheDocument();
    expect(screen.getByLabelText('Username')).toBeInTheDocument();
    expect(screen.getByLabelText('Email')).toBeInTheDocument();
    expect(screen.getByLabelText('Password')).toBeInTheDocument();
    expect(screen.getByLabelText('Confirm Password')).toBeInTheDocument();
  });

  test('renders login link', () => {
    render(<RegisterPage onSwitchToLogin={mockSwitchToLogin} />);

    expect(screen.getByText('Sign in')).toBeInTheDocument();
  });

  test('calls onSwitchToLogin when login link clicked', () => {
    render(<RegisterPage onSwitchToLogin={mockSwitchToLogin} />);

    fireEvent.click(screen.getByText('Sign in'));
    expect(mockSwitchToLogin).toHaveBeenCalledTimes(1);
  });

  test('shows error for empty fields', () => {
    render(<RegisterPage onSwitchToLogin={mockSwitchToLogin} />);

    fireEvent.click(screen.getByRole('button', { name: /Create Account/i }));

    expect(screen.getByText('All fields are required.')).toBeInTheDocument();
    expect(mockRegister).not.toHaveBeenCalled();
  });

  test('shows error for short username', () => {
    render(<RegisterPage onSwitchToLogin={mockSwitchToLogin} />);

    fireEvent.change(screen.getByLabelText('Invite Code'), { target: { value: 'ABCD1234' } });
    fireEvent.change(screen.getByLabelText('Username'), { target: { value: 'ab' } });
    fireEvent.change(screen.getByLabelText('Email'), { target: { value: 'test@example.com' } });
    fireEvent.change(screen.getByLabelText('Password'), { target: { value: 'password123' } });
    fireEvent.change(screen.getByLabelText('Confirm Password'), { target: { value: 'password123' } });

    fireEvent.click(screen.getByRole('button', { name: /Create Account/i }));

    expect(screen.getByText('Username must be at least 3 characters.')).toBeInTheDocument();
  });

  test('shows error for invalid username characters', () => {
    render(<RegisterPage onSwitchToLogin={mockSwitchToLogin} />);

    fireEvent.change(screen.getByLabelText('Invite Code'), { target: { value: 'ABCD1234' } });
    fireEvent.change(screen.getByLabelText('Username'), { target: { value: 'bad user!' } });
    fireEvent.change(screen.getByLabelText('Email'), { target: { value: 'test@example.com' } });
    fireEvent.change(screen.getByLabelText('Password'), { target: { value: 'password123' } });
    fireEvent.change(screen.getByLabelText('Confirm Password'), { target: { value: 'password123' } });

    fireEvent.click(screen.getByRole('button', { name: /Create Account/i }));

    expect(screen.getByText(/may only contain/)).toBeInTheDocument();
  });

  test('shows error for invalid email', async () => {
    render(<RegisterPage onSwitchToLogin={mockSwitchToLogin} />);

    fireEvent.change(screen.getByLabelText('Invite Code'), { target: { value: 'ABCD1234' } });
    fireEvent.change(screen.getByLabelText('Username'), { target: { value: 'testuser' } });
    fireEvent.change(screen.getByLabelText('Email'), { target: { value: 'not-an-email' } });
    fireEvent.change(screen.getByLabelText('Password'), { target: { value: 'password123' } });
    fireEvent.change(screen.getByLabelText('Confirm Password'), { target: { value: 'password123' } });

    fireEvent.click(screen.getByRole('button', { name: /Create Account/i }));

    await waitFor(() => {
      expect(screen.getByText('Please enter a valid email address.')).toBeInTheDocument();
    });
  });

  test('shows error for short password', () => {
    render(<RegisterPage onSwitchToLogin={mockSwitchToLogin} />);

    fireEvent.change(screen.getByLabelText('Invite Code'), { target: { value: 'ABCD1234' } });
    fireEvent.change(screen.getByLabelText('Username'), { target: { value: 'testuser' } });
    fireEvent.change(screen.getByLabelText('Email'), { target: { value: 'test@example.com' } });
    fireEvent.change(screen.getByLabelText('Password'), { target: { value: 'short' } });
    fireEvent.change(screen.getByLabelText('Confirm Password'), { target: { value: 'short' } });

    fireEvent.click(screen.getByRole('button', { name: /Create Account/i }));

    expect(screen.getByText('Password must be at least 8 characters.')).toBeInTheDocument();
  });

  test('shows error for mismatched passwords', () => {
    render(<RegisterPage onSwitchToLogin={mockSwitchToLogin} />);

    fireEvent.change(screen.getByLabelText('Invite Code'), { target: { value: 'ABCD1234' } });
    fireEvent.change(screen.getByLabelText('Username'), { target: { value: 'testuser' } });
    fireEvent.change(screen.getByLabelText('Email'), { target: { value: 'test@example.com' } });
    fireEvent.change(screen.getByLabelText('Password'), { target: { value: 'password123' } });
    fireEvent.change(screen.getByLabelText('Confirm Password'), { target: { value: 'differentpass' } });

    fireEvent.click(screen.getByRole('button', { name: /Create Account/i }));

    expect(screen.getByText('Passwords do not match.')).toBeInTheDocument();
  });

  test('shows passwords match indicator', () => {
    render(<RegisterPage onSwitchToLogin={mockSwitchToLogin} />);

    fireEvent.change(screen.getByLabelText('Password'), { target: { value: 'password123' } });
    fireEvent.change(screen.getByLabelText('Confirm Password'), { target: { value: 'password123' } });

    expect(screen.getByText('Passwords match')).toBeInTheDocument();
  });

  test('calls register with all fields', async () => {
    mockRegister.mockResolvedValueOnce({ username: 'testuser' });

    render(<RegisterPage onSwitchToLogin={mockSwitchToLogin} />);

    fireEvent.change(screen.getByLabelText('Invite Code'), { target: { value: 'abcd1234' } });
    fireEvent.change(screen.getByLabelText('Username'), { target: { value: 'testuser' } });
    fireEvent.change(screen.getByLabelText('Email'), { target: { value: 'test@example.com' } });
    fireEvent.change(screen.getByLabelText('Password'), { target: { value: 'password123' } });
    fireEvent.change(screen.getByLabelText('Confirm Password'), { target: { value: 'password123' } });

    fireEvent.click(screen.getByRole('button', { name: /Create Account/i }));

    await waitFor(() => {
      expect(mockRegister).toHaveBeenCalledWith(
        'testuser',
        'test@example.com',
        'password123',
        'ABCD1234' // Invite code is uppercased
      );
    });
  });

  test('shows error message on registration failure', async () => {
    mockRegister.mockRejectedValueOnce(new Error('Invalid or already used invite code'));

    render(<RegisterPage onSwitchToLogin={mockSwitchToLogin} />);

    fireEvent.change(screen.getByLabelText('Invite Code'), { target: { value: 'BADCODE' } });
    fireEvent.change(screen.getByLabelText('Username'), { target: { value: 'testuser' } });
    fireEvent.change(screen.getByLabelText('Email'), { target: { value: 'test@example.com' } });
    fireEvent.change(screen.getByLabelText('Password'), { target: { value: 'password123' } });
    fireEvent.change(screen.getByLabelText('Confirm Password'), { target: { value: 'password123' } });

    fireEvent.click(screen.getByRole('button', { name: /Create Account/i }));

    await waitFor(() => {
      expect(screen.getByText('Invalid or already used invite code')).toBeInTheDocument();
    });
  });

  test('shows loading state during registration', async () => {
    mockRegister.mockImplementation(() => new Promise(() => {}));

    render(<RegisterPage onSwitchToLogin={mockSwitchToLogin} />);

    fireEvent.change(screen.getByLabelText('Invite Code'), { target: { value: 'ABCD1234' } });
    fireEvent.change(screen.getByLabelText('Username'), { target: { value: 'testuser' } });
    fireEvent.change(screen.getByLabelText('Email'), { target: { value: 'test@example.com' } });
    fireEvent.change(screen.getByLabelText('Password'), { target: { value: 'password123' } });
    fireEvent.change(screen.getByLabelText('Confirm Password'), { target: { value: 'password123' } });

    fireEvent.click(screen.getByRole('button', { name: /Create Account/i }));

    await waitFor(() => {
      expect(screen.getByText('Creating account...')).toBeInTheDocument();
    });
  });

  test('uppercases invite code input', () => {
    render(<RegisterPage onSwitchToLogin={mockSwitchToLogin} />);

    const input = screen.getByLabelText('Invite Code');
    fireEvent.change(input, { target: { value: 'abcd1234' } });

    expect(input.value).toBe('ABCD1234');
  });
});
