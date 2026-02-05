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

  // Seed test data (previously done by _seedDefaults, now manual)
  // Create an admin user for tests
  db.users.create({
    username: 'admin',
    email: 'admin@test.com',
    password_hash: '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/X4.BNitPrG6R3rZMK', // "TestPass123"
    role: 'admin'
  });

  // Create invite codes for tests
  db.inviteCodes.create('TESTCODE1', 1);
  db.inviteCodes.create('TESTCODE2', 1);

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
  // Test setup creates admin user and invite codes.
  let validInviteCode;

  beforeEach(() => {
    // Get an available invite code from test setup
    const codes = db.inviteCodes.listAll().filter(c => c.is_used === 0);
    validInviteCode = codes[0].code;
  });

  test('registers a new user with valid invite code', async () => {
    const result = await authService.register({
      username: 'newuser',
      email: 'new@example.com',
      password: 'SecurePass1',
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
      password: 'SecurePass1',
      inviteCode: validInviteCode
    });

    expect(db.inviteCodes.isValid(validInviteCode)).toBe(false);
  });

  test('rejects registration with invalid invite code', async () => {
    await expect(
      authService.register({
        username: 'newuser',
        email: 'new@example.com',
        password: 'SecurePass1',
        inviteCode: 'INVALID-CODE'
      })
    ).rejects.toThrow('Invalid or already used invite code');
  });

  test('rejects registration with used invite code', async () => {
    // Use the code first
    await authService.register({
      username: 'user1',
      email: 'user1@example.com',
      password: 'SecurePass1',
      inviteCode: validInviteCode
    });

    // Try to use it again
    // Need a new invite code first
    await expect(
      authService.register({
        username: 'user2',
        email: 'user2@example.com',
        password: 'SecurePass1',
        inviteCode: validInviteCode
      })
    ).rejects.toThrow('Invalid or already used invite code');
  });

  test('rejects duplicate email', async () => {
    await authService.register({
      username: 'user1',
      email: 'dup@example.com',
      password: 'SecurePass1',
      inviteCode: validInviteCode
    });

    // Create a new invite code for the second registration
    const code2 = db.inviteCodes.create('CODE2TEST', 1);

    await expect(
      authService.register({
        username: 'user2',
        email: 'dup@example.com',
        password: 'SecurePass1',
        inviteCode: code2.code
      })
    ).rejects.toThrow('Email already registered');
  });

  test('rejects duplicate username', async () => {
    await authService.register({
      username: 'sameuser',
      email: 'first@example.com',
      password: 'SecurePass1',
      inviteCode: validInviteCode
    });

    const code2 = db.inviteCodes.create('CODE2TEST', 1);

    await expect(
      authService.register({
        username: 'sameuser',
        email: 'second@example.com',
        password: 'SecurePass1',
        inviteCode: code2.code
      })
    ).rejects.toThrow(/already/i);
  });

  test('rejects short username', async () => {
    await expect(
      authService.register({
        username: 'ab',
        email: 'new@example.com',
        password: 'SecurePass1',
        inviteCode: validInviteCode
      })
    ).rejects.toThrow('Username must be 3');
  });

  test('rejects invalid username characters', async () => {
    await expect(
      authService.register({
        username: 'bad user!',
        email: 'new@example.com',
        password: 'SecurePass1',
        inviteCode: validInviteCode
      })
    ).rejects.toThrow('may only contain');
  });

  test('rejects invalid email format', async () => {
    await expect(
      authService.register({
        username: 'newuser',
        email: 'not-an-email',
        password: 'SecurePass1',
        inviteCode: validInviteCode
      })
    ).rejects.toThrow('Invalid email');
  });

  test('rejects email exceeding 254 characters', async () => {
    // RFC 5321 specifies max 254 characters for email addresses
    const longEmail = 'a'.repeat(250) + '@b.co'; // 256 characters
    await expect(
      authService.register({
        username: 'newuser',
        email: longEmail,
        password: 'SecurePass1',
        inviteCode: validInviteCode
      })
    ).rejects.toThrow('Email address too long');
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

  test('rejects password without uppercase letter', async () => {
    await expect(
      authService.register({
        username: 'newuser',
        email: 'new@example.com',
        password: 'lowercase1',
        inviteCode: validInviteCode
      })
    ).rejects.toThrow('Password must contain at least one uppercase letter');
  });

  test('rejects password without lowercase letter', async () => {
    await expect(
      authService.register({
        username: 'newuser',
        email: 'new@example.com',
        password: 'UPPERCASE1',
        inviteCode: validInviteCode
      })
    ).rejects.toThrow('Password must contain at least one lowercase letter');
  });

  test('rejects password without number', async () => {
    await expect(
      authService.register({
        username: 'newuser',
        email: 'new@example.com',
        password: 'NoNumberHere',
        inviteCode: validInviteCode
      })
    ).rejects.toThrow('Password must contain at least one number');
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
    const codes = db.inviteCodes.listAll().filter(c => c.is_used === 0);
    validInviteCode = codes[0].code;

    // Register a test user
    await authService.register({
      username: 'testuser',
      email: 'test@example.com',
      password: 'SecurePass1',
      inviteCode: validInviteCode
    });
  });

  test('logs in with correct email and password', async () => {
    const result = await authService.login({
      identifier: 'test@example.com',
      password: 'SecurePass1'
    });

    expect(result.user).toBeDefined();
    expect(result.user.username).toBe('testuser');
    expect(result.accessToken).toBeDefined();
    expect(result.refreshToken).toBeDefined();
  });

  test('logs in with correct username and password', async () => {
    const result = await authService.login({
      identifier: 'testuser',
      password: 'SecurePass1'
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
      authService.login({ identifier: 'testuser', password: 'SecurePass1' })
    ).rejects.toThrow('Account locked');
  });

  test('rejects login for deactivated user', async () => {
    db.users.update(db.users.findByUsername('testuser').id, { is_active: 0 });

    await expect(
      authService.login({ identifier: 'testuser', password: 'SecurePass1' })
    ).rejects.toThrow('deactivated');
  });

  test('re-hashes plain-text password marker on first login', async () => {
    // Create a user with plain-text password marker (legacy migration format)
    db.users.create({
      username: 'plainuser',
      email: 'plain@test.com',
      password_hash: 'plain:MigrationPass1',
      role: 'user'
    });

    const user = db.users.findByUsername('plainuser');
    expect(user.password_hash.startsWith('plain:')).toBe(true);

    await authService.login({
      identifier: 'plainuser',
      password: 'MigrationPass1'
    });

    // After login, password should be bcrypt hashed
    const updated = db.users.findByUsername('plainuser');
    expect(updated.password_hash.startsWith('plain:')).toBe(false);
    expect(updated.password_hash.startsWith('$2')).toBe(true);
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
      password: 'SecurePass1'
    });

    const user = db.users.findByUsername('testuser');
    expect(user.failed_login_attempts).toBe(0);
  });

  test('updates last_login_at on successful login', async () => {
    const before = db.users.findByUsername('testuser');

    await authService.login({
      identifier: 'testuser',
      password: 'SecurePass1'
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
    const codes = db.inviteCodes.listAll().filter(c => c.is_used === 0);
    await authService.register({
      username: 'refreshuser',
      email: 'refresh@example.com',
      password: 'SecurePass1',
      inviteCode: codes[0].code
    });

    loginResult = await authService.login({
      identifier: 'refreshuser',
      password: 'SecurePass1'
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
    const codes = db.inviteCodes.listAll().filter(c => c.is_used === 0);
    await authService.register({
      username: 'logoutuser',
      email: 'logout@example.com',
      password: 'SecurePass1',
      inviteCode: codes[0].code
    });

    const loginResult = await authService.login({
      identifier: 'logoutuser',
      password: 'SecurePass1'
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
