/**
 * AdminDashboard Component Tests
 */
import React from 'react';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import AdminDashboard from '../AdminDashboard';

// Mock the AuthContext
jest.mock('../../contexts/AuthContext', () => ({
  useAuth: () => ({
    user: { userId: 999 }
  })
}));

// Mock the API module
const mockAdminListUsers = jest.fn();
const mockAdminUpdateUser = jest.fn();
const mockAdminDeleteUser = jest.fn();
const mockAdminListInviteCodes = jest.fn();
const mockAdminCreateInviteCode = jest.fn();

jest.mock('../../services/api', () => ({
  adminListUsers: (...args) => mockAdminListUsers(...args),
  adminUpdateUser: (...args) => mockAdminUpdateUser(...args),
  adminDeleteUser: (...args) => mockAdminDeleteUser(...args),
  adminListInviteCodes: (...args) => mockAdminListInviteCodes(...args),
  adminCreateInviteCode: (...args) => mockAdminCreateInviteCode(...args)
}));

const mockUsers = [
  {
    id: 1,
    username: 'admin',
    email: 'admin@example.com',
    role: 'admin',
    isActive: true,
    dailyTokenLimit: 500000,
    monthlyTokenLimit: 10000000,
    projectCount: 5,
    createdAt: '2026-01-01T00:00:00Z',
    lastLoginAt: '2026-02-05T10:00:00Z',
    daily: { total: 10000, limit: 500000, percentage: 2 },
    monthly: { total: 50000, limit: 10000000, percentage: 1 }
  },
  {
    id: 2,
    username: 'testuser',
    email: 'test@example.com',
    role: 'user',
    isActive: true,
    dailyTokenLimit: 100000,
    monthlyTokenLimit: 1000000,
    projectCount: 2,
    createdAt: '2026-01-15T00:00:00Z',
    lastLoginAt: '2026-02-04T09:00:00Z',
    daily: { total: 5000, limit: 100000, percentage: 5 },
    monthly: { total: 20000, limit: 1000000, percentage: 2 }
  }
];

const mockInviteCodes = [
  {
    id: 1,
    code: 'ABC123DEF456',
    isUsed: false,
    createdBy: 'admin',
    usedBy: null,
    createdAt: '2026-02-01T00:00:00Z',
    usedAt: null
  },
  {
    id: 2,
    code: 'XYZ789GHI012',
    isUsed: true,
    createdBy: 'admin',
    usedBy: 'testuser',
    createdAt: '2026-01-20T00:00:00Z',
    usedAt: '2026-01-25T00:00:00Z'
  }
];

describe('AdminDashboard', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockAdminListUsers.mockResolvedValue(mockUsers);
    mockAdminListInviteCodes.mockResolvedValue(mockInviteCodes);
    mockAdminUpdateUser.mockResolvedValue({});
    mockAdminDeleteUser.mockResolvedValue({});
    mockAdminCreateInviteCode.mockResolvedValue({
      id: 3,
      code: 'NEWCODE12345',
      isUsed: false,
      createdBy: 'admin',
      createdAt: '2026-02-05T12:00:00Z'
    });
  });

  test('renders admin dashboard header', async () => {
    await act(async () => {
      render(<AdminDashboard onClose={jest.fn()} />);
    });

    expect(screen.getByText('Admin Dashboard')).toBeInTheDocument();
    expect(screen.getByText('Manage users and invite codes')).toBeInTheDocument();
  });

  test('calls onClose when back button clicked', async () => {
    const onClose = jest.fn();
    await act(async () => {
      render(<AdminDashboard onClose={onClose} />);
    });

    const backButton = screen.getByLabelText('Back to editor');
    fireEvent.click(backButton);

    expect(onClose).toHaveBeenCalledTimes(1);
  });

  test('shows Users tab by default', async () => {
    await act(async () => {
      render(<AdminDashboard onClose={jest.fn()} />);
    });

    expect(mockAdminListUsers).toHaveBeenCalledTimes(1);
    // Check user emails as they're unique identifiers
    expect(screen.getByText('admin@example.com')).toBeInTheDocument();
    expect(screen.getByText('test@example.com')).toBeInTheDocument();
  });

  test('displays user details correctly', async () => {
    await act(async () => {
      render(<AdminDashboard onClose={jest.fn()} />);
    });

    expect(screen.getByText('admin@example.com')).toBeInTheDocument();
    expect(screen.getByText('test@example.com')).toBeInTheDocument();
    expect(screen.getByText('5 projects')).toBeInTheDocument();
    expect(screen.getByText('2 projects')).toBeInTheDocument();
  });

  test('shows loading state while fetching users', async () => {
    mockAdminListUsers.mockReturnValue(new Promise(() => {})); // never resolves
    render(<AdminDashboard onClose={jest.fn()} />);

    expect(screen.getByText('Loading users...')).toBeInTheDocument();
  });

  test('switches to Invite Codes tab when clicked', async () => {
    await act(async () => {
      render(<AdminDashboard onClose={jest.fn()} />);
    });

    const codesTab = screen.getByRole('tab', { name: /Invite Codes/i });
    fireEvent.click(codesTab);

    await waitFor(() => {
      expect(mockAdminListInviteCodes).toHaveBeenCalled();
    });

    expect(screen.getByText('ABC123DEF456')).toBeInTheDocument();
    expect(screen.getByText('XYZ789GHI012')).toBeInTheDocument();
  });

  test('shows available and used invite code sections', async () => {
    await act(async () => {
      render(<AdminDashboard onClose={jest.fn()} />);
    });

    fireEvent.click(screen.getByRole('tab', { name: /Invite Codes/i }));

    await waitFor(() => {
      expect(screen.getByText('Available')).toBeInTheDocument();
      expect(screen.getByText('Used')).toBeInTheDocument();
    });
  });

  test('shows user count in Users tab', async () => {
    await act(async () => {
      render(<AdminDashboard onClose={jest.fn()} />);
    });

    expect(screen.getByText('2 users')).toBeInTheDocument();
  });

  test('shows code counts in Invite Codes tab', async () => {
    await act(async () => {
      render(<AdminDashboard onClose={jest.fn()} />);
    });

    fireEvent.click(screen.getByRole('tab', { name: /Invite Codes/i }));

    await waitFor(() => {
      expect(screen.getByText('1 available, 1 used')).toBeInTheDocument();
    });
  });

  test('shows delete confirmation when delete button clicked', async () => {
    await act(async () => {
      render(<AdminDashboard onClose={jest.fn()} />);
    });

    // Find the delete button for testuser (second user)
    const deleteButtons = screen.getAllByTitle('Delete user');
    fireEvent.click(deleteButtons[1]); // Click delete for testuser

    // Check for confirmation dialog text (text is split across elements with <strong>)
    expect(screen.getByText(/This removes all their projects/)).toBeInTheDocument();
    // Also verify the username appears in the dialog somewhere
    const confirmDialog = screen.getByText(/This removes all their projects/).closest('div');
    expect(confirmDialog.textContent).toContain('testuser');
  });

  test('deletes user when confirmed', async () => {
    await act(async () => {
      render(<AdminDashboard onClose={jest.fn()} />);
    });

    const deleteButtons = screen.getAllByTitle('Delete user');
    fireEvent.click(deleteButtons[1]);

    const confirmButton = screen.getByRole('button', { name: 'Delete' });
    await act(async () => {
      fireEvent.click(confirmButton);
    });

    expect(mockAdminDeleteUser).toHaveBeenCalledWith(2);
  });

  test('cancels delete when cancel button clicked', async () => {
    await act(async () => {
      render(<AdminDashboard onClose={jest.fn()} />);
    });

    const deleteButtons = screen.getAllByTitle('Delete user');
    fireEvent.click(deleteButtons[1]);

    const cancelButton = screen.getByRole('button', { name: 'Cancel' });
    fireEvent.click(cancelButton);

    expect(screen.queryByText(/This removes all their projects/)).not.toBeInTheDocument();
  });

  test('generates new invite code', async () => {
    await act(async () => {
      render(<AdminDashboard onClose={jest.fn()} />);
    });

    fireEvent.click(screen.getByRole('tab', { name: /Invite Codes/i }));

    await waitFor(() => {
      expect(screen.getByText('Generate Code')).toBeInTheDocument();
    });

    const generateButton = screen.getByRole('button', { name: /Generate Code/i });
    await act(async () => {
      fireEvent.click(generateButton);
    });

    expect(mockAdminCreateInviteCode).toHaveBeenCalledTimes(1);
  });

  test('shows refresh button in Users tab', async () => {
    await act(async () => {
      render(<AdminDashboard onClose={jest.fn()} />);
    });

    const refreshButton = screen.getByRole('button', { name: /Refresh/i });
    expect(refreshButton).toBeInTheDocument();

    await act(async () => {
      fireEvent.click(refreshButton);
    });

    expect(mockAdminListUsers).toHaveBeenCalledTimes(2);
  });

  test('shows error message when API fails', async () => {
    mockAdminListUsers.mockRejectedValue(new Error('Network error'));

    await act(async () => {
      render(<AdminDashboard onClose={jest.fn()} />);
    });

    await waitFor(() => {
      expect(screen.getByText('Network error')).toBeInTheDocument();
    });
  });

  test('shows edit limits panel when Limits button clicked', async () => {
    await act(async () => {
      render(<AdminDashboard onClose={jest.fn()} />);
    });

    const limitsButtons = screen.getAllByTitle('Edit limits');
    fireEvent.click(limitsButtons[1]);

    expect(screen.getByText('Daily Token Limit')).toBeInTheDocument();
    expect(screen.getByText('Monthly Token Limit')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Save' })).toBeInTheDocument();
  });

  test('updates user limits when saved', async () => {
    await act(async () => {
      render(<AdminDashboard onClose={jest.fn()} />);
    });

    const limitsButtons = screen.getAllByTitle('Edit limits');
    fireEvent.click(limitsButtons[1]);

    const inputs = screen.getAllByRole('spinbutton');
    fireEvent.change(inputs[0], { target: { value: '200000' } });
    fireEvent.change(inputs[1], { target: { value: '2000000' } });

    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: 'Save' }));
    });

    expect(mockAdminUpdateUser).toHaveBeenCalledWith(2, {
      dailyTokenLimit: 200000,
      monthlyTokenLimit: 2000000
    });
  });

  test('shows role badges correctly', async () => {
    await act(async () => {
      render(<AdminDashboard onClose={jest.fn()} />);
    });

    // Each user card should have a role badge (labels are capitalized)
    const roleBadges = screen.getAllByText(/^(Admin|User)$/);
    // At least 2 badges (one per mock user) - may have more depending on UI
    expect(roleBadges.length).toBeGreaterThanOrEqual(2);
  });

  test('shows inactive badge for inactive users', async () => {
    const usersWithInactive = [
      ...mockUsers,
      {
        id: 3,
        username: 'inactive_user',
        email: 'inactive@example.com',
        role: 'user',
        isActive: false,
        dailyTokenLimit: 100000,
        monthlyTokenLimit: 1000000,
        projectCount: 0,
        daily: { total: 0, limit: 100000, percentage: 0 },
        monthly: { total: 0, limit: 1000000, percentage: 0 }
      }
    ];
    mockAdminListUsers.mockResolvedValue(usersWithInactive);

    await act(async () => {
      render(<AdminDashboard onClose={jest.fn()} />);
    });

    expect(screen.getByText('Inactive')).toBeInTheDocument();
  });
});
