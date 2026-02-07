# Reach House Book Editor - API Reference

## Base URL

| Environment | URL |
|-------------|-----|
| Development | `http://localhost:3001` |
| Production  | `https://your-domain:3002` |

## Authentication

Most endpoints require a JWT access token in the `Authorization` header:

```
Authorization: Bearer <access-token>
```

Tokens expire after 15 minutes. Use the refresh endpoint to obtain a new access token.

---

## Setup Endpoints

### Check Setup Status

```
GET /api/setup/status
```

Check if first-time setup is required (no users in database).

**Response:**
```json
{
  "needsSetup": true,
  "setupEnabled": true
}
```

### Complete Setup

```
POST /api/setup/complete
```

Create the initial admin account. Only works when no users exist.

**Rate limited:** 5 requests per 15 minutes.

**Body:**
```json
{
  "username": "admin",
  "email": "admin@example.com",
  "password": "SecurePass123",
  "setup_secret": "your-setup-secret"
}
```

**Validation:**
- `username`: 3-50 characters, alphanumeric/underscores
- `email`: Valid email, max 254 characters
- `password`: Min 8 characters, must include uppercase, lowercase, and number
- `setup_secret`: Must match SETUP_SECRET environment variable

---

## Authentication Endpoints

### Login

```
POST /api/auth/login
```

**Body:**
```json
{
  "identifier": "user@example.com",
  "password": "password123"
}
```

**Response (200):**
```json
{
  "accessToken": "eyJhbG...",
  "refreshToken": "eyJhbG...",
  "user": {
    "id": 1,
    "username": "admin",
    "email": "admin@example.com",
    "role": "admin"
  }
}
```

**Errors:**
- `401` - Invalid credentials
- `429` - Account locked after 5 failed attempts (15 min lockout)

### Register

```
POST /api/auth/register
```

**Body:**
```json
{
  "username": "newuser",
  "email": "user@example.com",
  "password": "SecurePass123",
  "inviteCode": "ABCD1234"
}
```

**Response (201):** Same as login response.

### Refresh Token

```
POST /api/auth/refresh
```

**Body:**
```json
{
  "refreshToken": "eyJhbG..."
}
```

**Response (200):**
```json
{
  "accessToken": "eyJhbG...",
  "refreshToken": "eyJhbG..."
}
```

### Logout

```
POST /api/auth/logout
```

Requires: Authentication

**Body:**
```json
{
  "refreshToken": "eyJhbG..."
}
```

---

## Editing Endpoints

### Edit Chunk

```
POST /api/edit-chunk
```

Requires: Authentication

Send a text chunk to Claude AI for editing.

**Body:**
```json
{
  "text": "The text to edit...",
  "styleGuide": "Document-specific style notes from first chunk",
  "isFirst": true,
  "customStyleGuide": "Optional custom style guide text"
}
```

**Response (200):**
```json
{
  "text": "The edited text...",
  "usage": {
    "input_tokens": 1500,
    "output_tokens": 1600
  }
}
```

**Errors:**
- `400` - Missing or invalid text
- `429` - Token limit exceeded
- `503` - Claude API unavailable (circuit breaker open)

### Generate Style Guide

```
POST /api/generate-style-guide
```

Requires: Authentication

Generate a document-specific style guide from edited text.

**Body:**
```json
{
  "editedText": "The first edited chunk text..."
}
```

### Generate DOCX

```
POST /api/generate-docx
```

Requires: Authentication

Generate a Word document with Track Changes.

**Body:**
```json
{
  "original": "Original full text",
  "edited": "Edited full text",
  "fileName": "manuscript_EDITED.docx"
}
```

**Response:** Binary `.docx` file download.

---

## Project Endpoints

### List Projects

```
GET /api/projects?limit=20&offset=0
```

Requires: Authentication

**Query Parameters:**
| Param | Type | Default | Description |
|-------|------|---------|-------------|
| limit | number | 20 | Max results (1-50) |
| offset | number | 0 | Skip N results |

**Response (200):**
```json
{
  "projects": [
    {
      "id": "1707123456789",
      "fileName": "manuscript.docx",
      "isComplete": false,
      "chunksCompleted": 3,
      "totalChunks": 10,
      "chunkSize": 2000,
      "timestamp": 1707123456789,
      "createdAt": "2026-02-06 12:00:00",
      "updatedAt": "2026-02-06 12:30:00"
    }
  ],
  "total": 5,
  "limit": 20,
  "offset": 0
}
```

**Caching:** Returns `ETag` header. Send `If-None-Match` to receive `304 Not Modified`.

### Get Project

```
GET /api/projects/:id
```

Requires: Authentication

Returns full project data including text content.

### Save Project

```
PUT /api/projects/:id
```

Requires: Authentication

Creates or updates a project (upsert).

### Delete Project

```
DELETE /api/projects/:id
```

Requires: Authentication

---

## Usage Endpoints

### Get Usage Summary

```
GET /api/usage
```

Requires: Authentication

**Response (200):**
```json
{
  "daily": {
    "input": 5000,
    "output": 5500,
    "total": 10500,
    "limit": 500000,
    "percentage": 2,
    "isUnlimited": false,
    "isRestricted": false
  },
  "monthly": {
    "input": 50000,
    "output": 55000,
    "total": 105000,
    "limit": 10000000,
    "percentage": 1,
    "isUnlimited": false,
    "isRestricted": false
  }
}
```

### Get Usage History

```
GET /api/usage/history?days=7
```

Requires: Authentication

---

## Admin Endpoints

All admin endpoints require the `admin` role.

### List Users

```
GET /api/admin/users
```

### Update User

```
PUT /api/admin/users/:id
```

**Body:**
```json
{
  "role": "user",
  "dailyTokenLimit": 500000,
  "monthlyTokenLimit": 10000000,
  "isActive": true
}
```

### Delete User

```
DELETE /api/admin/users/:id
```

### List Invite Codes

```
GET /api/admin/invite-codes
```

### Create Invite Code

```
POST /api/admin/invite-codes
```

### Delete Invite Code

```
DELETE /api/admin/invite-codes/:id
```

### List Role Defaults

```
GET /api/admin/role-defaults
```

### Update Role Defaults

```
PUT /api/admin/role-defaults/:role
```

---

## Health Check

```
GET /health
```

No authentication required.

**Response (200):**
```json
{
  "status": "ok",
  "timestamp": "2026-02-06T12:00:00.000Z",
  "version": "1.52.0",
  "database": "connected"
}
```

---

## Error Responses

All errors follow this format:

```json
{
  "error": "Human-readable error message",
  "code": "MACHINE_READABLE_CODE",
  "errorId": "abc123"
}
```

### HTTP Status Codes

| Code | Meaning |
|------|---------|
| 200 | Success |
| 201 | Created |
| 304 | Not Modified (ETag match) |
| 400 | Validation error |
| 401 | Authentication required or failed |
| 403 | Insufficient permissions |
| 404 | Resource not found |
| 429 | Rate limited or token limit exceeded |
| 500 | Internal server error |
| 503 | Service unavailable (circuit breaker) |

---

## Rate Limits

| Endpoint | Window | Max Requests |
|----------|--------|-------------|
| General API | 15 min | 100 |
| Login | 15 min | 20 |
| Register | 15 min | 10 |
| Token Refresh | 15 min | 30 |
| Setup Complete | 15 min | 5 |

Rate limit headers are included in responses:
- `RateLimit-Limit`
- `RateLimit-Remaining`
- `RateLimit-Reset`
