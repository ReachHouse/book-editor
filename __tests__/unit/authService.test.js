/**
 * =============================================================================
 * AUTH SERVICE TESTS
 * =============================================================================
 *
 * Tests for the authentication service including:
 * - Password hashing and verification
 * - JWT token generation and verification
 * - User registration with invite codes
 * - User login with lockout protection
 * - Token refresh with rotation
 * - Logout
 * - Profile retrieval
 *
 * Uses an in-memory database for isolation.
 *
 * =============================================================================
 */

const { DatabaseService } = require('../../services/database');

// We need to set up the database singleton before requiring authService
// because authService imports from database.js at module load time.
let db;
let authService, hashPassword, verifyPassword, generateAccessToken, verifyAccessToken;

beforeEach(() => {
  // Reset module cache so authService gets a fresh import each time
  jest.resetModules();

  // Set a stable JWT secret for testing
  process.env.JWT_SECRET = 'test-secret-key-for-jwt-signing-1234567890';

  // Create a fresh in-memory database
  db = new DatabaseService();
  db.init(':memory:');

  // Override the singleton in the database module
  const dbModule = require('../../services/database');
  dbModule.database.db = db.db;
  dbModule.database.initialized = true;

  // Now import authService (it will use the overridden database)
  const authModule = require('../../services/authService');
  authService = authModule.authService;
  hashPassword = authModule.hashPassword;
  verifyPassword = authModule.verifyPassword;
  generateAccessToken = authModule.generateAccessToken;
  verifyAccessToken = authModule.verifyAccessToken;
});

afterEach(() => {
  db.close();
  delete process.env.JWT_SECRET;
});

// =============================================================================
// PASSWORD UTILITIES
// =============================================================================

describe('Password Hashing', () => {
  test('hashPassword returns a bcrypt hash', async () => {
    const hash = await hashPassword('myPassword123');
    expect(hash).toBeDefined();
    expect(hash).not.toBe('myPassword123');
    expect(hash.startsWith('$2a$') || hash.startsWith('$2b$')).toBe(true);
  });

  test('verifyPassword validates correct password', async () => {
    const hash = await hashPassword('myPassword123');
    const isValid = await verifyPassword('myPassword123', hash);
    expect(isValid).toBe(true);
  });

  test('verifyPassword rejects wrong password', async () => {
    const hash = await hashPassword('myPassword123');
    const isValid = await verifyPassword('wrongPassword', hash);
    expect(isValid).toBe(false);
  });

  test('verifyPassword handles plain-text marker from v1.25.0 seed', async () => {
    const isValid = await verifyPassword('admin123', 'plain:admin123');
    expect(isValid).toBe(true);

    const isInvalid = await verifyPassword('wrong', 'plain:admin123');
    expect(isInvalid).toBe(false);
  });
});

// =============================================================================
// JWT TOKEN UTILITIES
// =============================================================================

describe('JWT Tokens', () => {
  test('generateAccessToken creates a valid JWT', () => {
    const user = { id: 1, username: 'testuser', role: 'user' };
    const token = generateAccessToken(user);
    expect(token).toBeDefined();
    expect(typeof token).toBe('string');
    expect(token.split('.')).toHaveLength(3); // JWT has 3 parts
  });

  test('verifyAccessToken decodes a valid token', () => {
    const user = { id: 1, username: 'testuser', role: 'user' };
    const token = generateAccessToken(user);
    const decoded = verifyAccessToken(token);

    expect(decoded.userId).toBe(1);
    expect(decoded.username).toBe('testuser');
    expect(decoded.role).toBe('user');
    expect(decoded.exp).toBeDefined();
  });

  test('verifyAccessToken rejects tampered token', () => {
    const user = { id: 1, username: 'testuser', role: 'user' };
    const token = generateAccessToken(user);
    const tampered = token.slice(0, -5) + 'XXXXX';

    expect(() => verifyAccessToken(tampered)).toThrow();
  });

  test('verifyAccessToken rejects random string', () => {
    expect(() => verifyAccessToken('not-a-jwt')).toThrow();
  });
});

// =============================================================================
// REGISTRATION
// =============================================================================

describe('Registration', () => {
  // The seed creates an admin user and one invite code.
  // We need to get the invite code for testing.
  let validInviteCode;

  beforeEach(() => {
    // Get the seeded invite code
    const codes = db.inviteCodes.listAll();
    validInviteCode = codes[0].code;
  });

  test('registers a new user with valid invite code', async () => {
    const result = await authService.register({
      username: 'newuser',
      email: 'new@example.com',
      password: 'securePass123',
      inviteCode: validInviteCode
    });

    expect(result.user).toBeDefined();
    expect(result.user.username).toBe('newuser');
    expect(result.user.email).toBe('new@example.com');
    expect(result.user.role).toBe('user');
    expect(result.accessToken).toBeDefined();
    expect(result.refreshToken).toBeDefined();
    // Password hash should NOT be exposed
    expect(result.user.password_hash).toBeUndefined();
  });

  test('marks invite code as used after registration', async () => {
    await authService.register({
      username: 'newuser',
      email: 'new@example.com',
      password: 'securePass123',
      inviteCode: validInviteCode
    });

    expect(db.inviteCodes.isValid(validInviteCode)).toBe(false);
  });

  test('rejects registration with invalid invite code', async () => {
    await expect(
      authService.register({
        username: 'newuser',
        email: 'new@example.com',
        password: 'securePass123',
        inviteCode: 'INVALID-CODE'
      })
    ).rejects.toThrow('Invalid or already used invite code');
  });

  test('rejects registration with used invite code', async () => {
    // Use the code first
    await authService.register({
      username: 'user1',
      email: 'user1@example.com',
      password: 'securePass123',
      inviteCode: validInviteCode
    });

    // Try to use it again
    // Need a new invite code first
    await expect(
      authService.register({
        username: 'user2',
        email: 'user2@example.com',
        password: 'securePass123',
        inviteCode: validInviteCode
      })
    ).rejects.toThrow('Invalid or already used invite code');
  });

  test('rejects duplicate email', async () => {
    await authService.register({
      username: 'user1',
      email: 'dup@example.com',
      password: 'securePass123',
      inviteCode: validInviteCode
    });

    // Create a new invite code for the second registration
    const code2 = db.inviteCodes.create('CODE2TEST', 1);

    await expect(
      authService.register({
        username: 'user2',
        email: 'dup@example.com',
        password: 'securePass123',
        inviteCode: code2.code
      })
    ).rejects.toThrow('Email or username already registered');
  });

  test('rejects duplicate username', async () => {
    await authService.register({
      username: 'sameuser',
      email: 'first@example.com',
      password: 'securePass123',
      inviteCode: validInviteCode
    });

    const code2 = db.inviteCodes.create('CODE2TEST', 1);

    await expect(
      authService.register({
        username: 'sameuser',
        email: 'second@example.com',
        password: 'securePass123',
        inviteCode: code2.code
      })
    ).rejects.toThrow(/already/i);
  });

  test('rejects short username', async () => {
    await expect(
      authService.register({
        username: 'ab',
        email: 'new@example.com',
        password: 'securePass123',
        inviteCode: validInviteCode
      })
    ).rejects.toThrow('Username must be 3');
  });

  test('rejects invalid username characters', async () => {
    await expect(
      authService.register({
        username: 'bad user!',
        email: 'new@example.com',
        password: 'securePass123',
        inviteCode: validInviteCode
      })
    ).rejects.toThrow('may only contain');
  });

  test('rejects invalid email format', async () => {
    await expect(
      authService.register({
        username: 'newuser',
        email: 'not-an-email',
        password: 'securePass123',
        inviteCode: validInviteCode
      })
    ).rejects.toThrow('Invalid email');
  });

  test('rejects short password', async () => {
    await expect(
      authService.register({
        username: 'newuser',
        email: 'new@example.com',
        password: 'short',
        inviteCode: validInviteCode
      })
    ).rejects.toThrow('Password must be at least 8');
  });

  test('rejects missing fields', async () => {
    await expect(
      authService.register({
        username: '',
        email: '',
        password: '',
        inviteCode: ''
      })
    ).rejects.toThrow('All fields are required');
  });
});

// =============================================================================
// LOGIN
// =============================================================================

describe('Login', () => {
  let validInviteCode;

  beforeEach(async () => {
    const codes = db.inviteCodes.listAll();
    validInviteCode = codes[0].code;

    // Register a test user
    await authService.register({
      username: 'testuser',
      email: 'test@example.com',
      password: 'securePass123',
      inviteCode: validInviteCode
    });
  });

  test('logs in with correct email and password', async () => {
    const result = await authService.login({
      identifier: 'test@example.com',
      password: 'securePass123'
    });

    expect(result.user).toBeDefined();
    expect(result.user.username).toBe('testuser');
    expect(result.accessToken).toBeDefined();
    expect(result.refreshToken).toBeDefined();
  });

  test('logs in with correct username and password', async () => {
    const result = await authService.login({
      identifier: 'testuser',
      password: 'securePass123'
    });

    expect(result.user.username).toBe('testuser');
  });

  test('rejects wrong password', async () => {
    await expect(
      authService.login({
        identifier: 'test@example.com',
        password: 'wrongPassword'
      })
    ).rejects.toThrow('Invalid credentials');
  });

  test('rejects non-existent user', async () => {
    await expect(
      authService.login({
        identifier: 'nobody@example.com',
        password: 'anything'
      })
    ).rejects.toThrow('Invalid credentials');
  });

  test('rejects missing fields', async () => {
    await expect(
      authService.login({ identifier: '', password: '' })
    ).rejects.toThrow('required');
  });

  test('tracks failed login attempts', async () => {
    for (let i = 0; i < 3; i++) {
      await expect(
        authService.login({ identifier: 'testuser', password: 'wrong' })
      ).rejects.toThrow('Invalid credentials');
    }

    const user = db.users.findByUsername('testuser');
    expect(user.failed_login_attempts).toBe(3);
  });

  test('locks account after max failed attempts', async () => {
    // Fail 5 times
    for (let i = 0; i < 5; i++) {
      await expect(
        authService.login({ identifier: 'testuser', password: 'wrong' })
      ).rejects.toThrow('Invalid credentials');
    }

    // 6th attempt should be locked
    await expect(
      authService.login({ identifier: 'testuser', password: 'securePass123' })
    ).rejects.toThrow('Account locked');
  });

  test('rejects login for deactivated user', async () => {
    db.users.update(db.users.findByUsername('testuser').id, { is_active: 0 });

    await expect(
      authService.login({ identifier: 'testuser', password: 'securePass123' })
    ).rejects.toThrow('deactivated');
  });

  test('re-hashes plain-text admin password on first login', async () => {
    // The seeded admin has a "plain:xxx" password
    const admin = db.users.findByUsername('admin');
    expect(admin.password_hash.startsWith('plain:')).toBe(true);

    const plainPassword = admin.password_hash.substring(6);

    await authService.login({
      identifier: 'admin',
      password: plainPassword
    });

    // After login, password should be bcrypt hashed
    const updatedAdmin = db.users.findByUsername('admin');
    expect(updatedAdmin.password_hash.startsWith('plain:')).toBe(false);
    expect(updatedAdmin.password_hash.startsWith('$2')).toBe(true);
  });

  test('resets failed attempts on successful login', async () => {
    // Fail twice
    for (let i = 0; i < 2; i++) {
      await expect(
        authService.login({ identifier: 'testuser', password: 'wrong' })
      ).rejects.toThrow();
    }

    // Successful login
    await authService.login({
      identifier: 'testuser',
      password: 'securePass123'
    });

    const user = db.users.findByUsername('testuser');
    expect(user.failed_login_attempts).toBe(0);
  });

  test('updates last_login_at on successful login', async () => {
    const before = db.users.findByUsername('testuser');

    await authService.login({
      identifier: 'testuser',
      password: 'securePass123'
    });

    const after = db.users.findByUsername('testuser');
    expect(after.last_login_at).toBeDefined();
    expect(after.last_login_at).not.toBe(before.last_login_at);
  });
});

// =============================================================================
// TOKEN REFRESH
// =============================================================================

describe('Token Refresh', () => {
  let loginResult;

  beforeEach(async () => {
    const codes = db.inviteCodes.listAll();
    await authService.register({
      username: 'refreshuser',
      email: 'refresh@example.com',
      password: 'securePass123',
      inviteCode: codes[0].code
    });

    loginResult = await authService.login({
      identifier: 'refreshuser',
      password: 'securePass123'
    });
  });

  test('refreshes tokens with valid refresh token', () => {
    const result = authService.refreshToken(loginResult.refreshToken);

    expect(result.accessToken).toBeDefined();
    expect(result.refreshToken).toBeDefined();
    expect(result.user.username).toBe('refreshuser');

    // New tokens should be different from old ones
    expect(result.refreshToken).not.toBe(loginResult.refreshToken);
  });

  test('invalidates old refresh token after rotation', () => {
    const result = authService.refreshToken(loginResult.refreshToken);

    // Old token should no longer work
    expect(() => authService.refreshToken(loginResult.refreshToken)).toThrow('Invalid refresh token');

    // New token should work
    const result2 = authService.refreshToken(result.refreshToken);
    expect(result2.accessToken).toBeDefined();
  });

  test('rejects invalid refresh token', () => {
    expect(() => authService.refreshToken('invalid-token-string')).toThrow('Invalid refresh token');
  });

  test('rejects empty refresh token', () => {
    expect(() => authService.refreshToken('')).toThrow('Refresh token is required');
  });

  test('rejects refresh for deactivated user', async () => {
    const user = db.users.findByUsername('refreshuser');
    db.users.update(user.id, { is_active: 0 });

    expect(() => authService.refreshToken(loginResult.refreshToken)).toThrow(/not found or deactivated/);
  });
});

// =============================================================================
// LOGOUT
// =============================================================================

describe('Logout', () => {
  test('invalidates refresh token on logout', async () => {
    const codes = db.inviteCodes.listAll();
    await authService.register({
      username: 'logoutuser',
      email: 'logout@example.com',
      password: 'securePass123',
      inviteCode: codes[0].code
    });

    const loginResult = await authService.login({
      identifier: 'logoutuser',
      password: 'securePass123'
    });

    authService.logout(loginResult.refreshToken);

    // Token should no longer work
    expect(() => authService.refreshToken(loginResult.refreshToken)).toThrow('Invalid refresh token');
  });

  test('logout with null token does not throw', () => {
    expect(() => authService.logout(null)).not.toThrow();
  });
});

// =============================================================================
// PROFILE
// =============================================================================

describe('Get Profile', () => {
  test('returns sanitized user profile', () => {
    const admin = db.users.findByUsername('admin');
    const profile = authService.getProfile(admin.id);

    expect(profile).toBeDefined();
    expect(profile.username).toBe('admin');
    expect(profile.password_hash).toBeUndefined();
    expect(profile.failed_login_attempts).toBeUndefined();
    expect(profile.locked_until).toBeUndefined();
  });

  test('returns null for non-existent user', () => {
    const profile = authService.getProfile(99999);
    expect(profile).toBeNull();
  });
});
