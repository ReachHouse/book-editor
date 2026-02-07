/**
 * LoginPage Component Tests
 */
import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import LoginPage from '../LoginPage';

// Mock the AuthContext
const mockLogin = jest.fn();
const mockEnterGuestMode = jest.fn();
jest.mock('../../contexts/AuthContext', () => ({
  useAuth: () => ({
    login: mockLogin,
    enterGuestMode: mockEnterGuestMode
  })
}));

describe('LoginPage', () => {
  const mockSwitchToRegister = jest.fn();

  beforeEach(() => {
    mockLogin.mockClear();
    mockSwitchToRegister.mockClear();
  });

  test('renders login form', () => {
    render(<LoginPage onSwitchToRegister={mockSwitchToRegister} />);

    expect(screen.getByText('Sign in to your account')).toBeInTheDocument();
    expect(screen.getByLabelText('Email or Username')).toBeInTheDocument();
    expect(screen.getByLabelText('Password')).toBeInTheDocument();
    expect(screen.getByText('Sign In')).toBeInTheDocument();
  });

  test('renders app title', () => {
    render(<LoginPage onSwitchToRegister={mockSwitchToRegister} />);

    expect(screen.getByText('Reach House Book Editor')).toBeInTheDocument();
  });

  test('renders register link', () => {
    render(<LoginPage onSwitchToRegister={mockSwitchToRegister} />);

    expect(screen.getByText('Register with invite code')).toBeInTheDocument();
  });

  test('calls onSwitchToRegister when register link clicked', () => {
    render(<LoginPage onSwitchToRegister={mockSwitchToRegister} />);

    fireEvent.click(screen.getByText('Register with invite code'));
    expect(mockSwitchToRegister).toHaveBeenCalledTimes(1);
  });

  test('shows error for empty fields', async () => {
    render(<LoginPage onSwitchToRegister={mockSwitchToRegister} />);

    fireEvent.click(screen.getByText('Sign In'));

    expect(screen.getByText('Please enter your email/username and password.')).toBeInTheDocument();
    expect(mockLogin).not.toHaveBeenCalled();
  });

  test('calls login with identifier and password', async () => {
    mockLogin.mockResolvedValueOnce({ username: 'testuser' });

    render(<LoginPage onSwitchToRegister={mockSwitchToRegister} />);

    fireEvent.change(screen.getByLabelText('Email or Username'), {
      target: { value: 'testuser' }
    });
    fireEvent.change(screen.getByLabelText('Password'), {
      target: { value: 'password123' }
    });

    fireEvent.click(screen.getByText('Sign In'));

    await waitFor(() => {
      expect(mockLogin).toHaveBeenCalledWith('testuser', 'password123');
    });
  });

  test('shows error message on login failure', async () => {
    mockLogin.mockRejectedValueOnce(new Error('Invalid credentials'));

    render(<LoginPage onSwitchToRegister={mockSwitchToRegister} />);

    fireEvent.change(screen.getByLabelText('Email or Username'), {
      target: { value: 'testuser' }
    });
    fireEvent.change(screen.getByLabelText('Password'), {
      target: { value: 'wrongpass' }
    });

    fireEvent.click(screen.getByText('Sign In'));

    await waitFor(() => {
      expect(screen.getByText('Invalid credentials')).toBeInTheDocument();
    });
  });

  test('shows loading state during login', async () => {
    // Make login hang
    mockLogin.mockImplementation(() => new Promise(() => {}));

    render(<LoginPage onSwitchToRegister={mockSwitchToRegister} />);

    fireEvent.change(screen.getByLabelText('Email or Username'), {
      target: { value: 'testuser' }
    });
    fireEvent.change(screen.getByLabelText('Password'), {
      target: { value: 'password123' }
    });

    fireEvent.click(screen.getByText('Sign In'));

    await waitFor(() => {
      expect(screen.getByText('Signing in...')).toBeInTheDocument();
    });
  });

  test('disables inputs while submitting', async () => {
    mockLogin.mockImplementation(() => new Promise(() => {}));

    render(<LoginPage onSwitchToRegister={mockSwitchToRegister} />);

    fireEvent.change(screen.getByLabelText('Email or Username'), {
      target: { value: 'testuser' }
    });
    fireEvent.change(screen.getByLabelText('Password'), {
      target: { value: 'password123' }
    });

    fireEvent.click(screen.getByText('Sign In'));

    await waitFor(() => {
      expect(screen.getByLabelText('Email or Username')).toBeDisabled();
      expect(screen.getByLabelText('Password')).toBeDisabled();
    });
  });

  // Guest mode tests
  test('renders Continue as Guest button', () => {
    render(<LoginPage onSwitchToRegister={mockSwitchToRegister} />);

    expect(screen.getByText('Continue as Guest')).toBeInTheDocument();
    expect(screen.getByText('Preview the app without an account')).toBeInTheDocument();
  });

  test('calls enterGuestMode when Continue as Guest clicked', () => {
    render(<LoginPage onSwitchToRegister={mockSwitchToRegister} />);

    fireEvent.click(screen.getByText('Continue as Guest'));
    expect(mockEnterGuestMode).toHaveBeenCalledTimes(1);
  });
});
