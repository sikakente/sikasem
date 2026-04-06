# STEP-01: Authentication and Role-Based Access Control

## Goal
Implement the full auth system: login, JWT issuance, refresh token rotation with theft detection, logout (single and all devices), password reset via email, and role/permission-based access control. After this step every other module can protect its routes with guards and decorators.

## Prerequisites
- STEP-00 complete (project scaffolded, Prisma schema migrated, Docker running)

## Reference Documents
- `requirements/grocery_export_backend_spec.md` — sections 4.1 and 4.2 for full auth/authz design
- `requirements/grocery_export_prd.md` — section 6.1 for role definitions

---

## Key Decisions
- Access tokens are **stateless JWTs** (15 min), verified via `JWT_SECRET`
- Refresh tokens are **hashed and stored** in `refresh_tokens` table (7 days)
- On mobile: access token stored **in-memory only** (Zustand), refresh token in `expo-secure-store`
- Refresh rotation: each use issues a new refresh token and revokes the old one
- Reuse detection: if a revoked token is presented, **all sessions for that user are killed**
- Password reset uses a short-lived signed JWT (10 min) sent as a deep link via AWS SES — no extra table
- In development, password reset logs the link to console instead of sending email
- Roles are embedded in the JWT payload — no DB call per request for role checks
- Permissions are loaded from DB once per role set and cached in-process for 5 minutes

---

## Backend Files to Create

### `backend/src/modules/auth/auth.module.ts`
Imports: `JwtModule.registerAsync` (secret from config), `PassportModule`, `UsersModule`. Exports `AuthService`, `JwtAuthGuard`.

### `backend/src/modules/auth/auth.controller.ts`
```
POST /api/v1/auth/login           @Public()
POST /api/v1/auth/refresh         @Public()
POST /api/v1/auth/logout          @UseGuards(JwtAuthGuard)
POST /api/v1/auth/logout-all      @UseGuards(JwtAuthGuard)
POST /api/v1/auth/forgot-password @Public()
POST /api/v1/auth/reset-password  @Public()
```

### `backend/src/modules/auth/auth.service.ts`
Methods:
- `login(email, password)` — bcrypt compare, generate access + refresh tokens, insert `refresh_tokens` row with hashed token, return both tokens + user object
- `refresh(rawRefreshToken)` — find matching unhashed token, check not revoked/expired, detect reuse (revoke all if reused), rotate: revoke old, insert new, return new pair
- `logout(userId, rawRefreshToken)` — set `revokedAt` on the specific token
- `logoutAll(userId)` — set `revokedAt` on all tokens for the user
- `forgotPassword(email)` — sign a 10-min JWT containing userId and `purpose: 'reset'`, send via SES (or log in dev)
- `resetPassword(resetToken, newPassword)` — verify token, check purpose, bcrypt hash new password, update user, revoke all refresh tokens for that user

### `backend/src/modules/auth/strategies/jwt.strategy.ts`
Passport JWT strategy. Extracts `Bearer` token from `Authorization` header. Validates against `JWT_SECRET`. Attaches `{ sub, email, roles }` to `request.user`.

### `backend/src/modules/auth/guards/jwt-auth.guard.ts`
Extends `AuthGuard('jwt')`. Checks for `@Public()` metadata — if present, skips validation and allows through.

### `backend/src/modules/auth/guards/roles.guard.ts`
Implements `CanActivate`. Reads `@Roles(...)` metadata from handler and class. Checks `request.user.roles` includes at least one of the required roles.

### `backend/src/modules/auth/guards/permissions.guard.ts`
Implements `CanActivate`. Reads `@RequirePermission(...)` metadata. Looks up permissions for user's roles from the in-process cache. Falls back to DB if not cached. Denies if permission not found.

### `backend/src/modules/auth/decorators/public.decorator.ts`
```typescript
export const Public = () => SetMetadata('isPublic', true);
```

### `backend/src/modules/auth/decorators/roles.decorator.ts`
```typescript
export const Roles = (...roles: string[]) => SetMetadata('roles', roles);
```

### `backend/src/modules/auth/decorators/require-permission.decorator.ts`
```typescript
export const RequirePermission = (code: string) => SetMetadata('permission', code);
```

### `backend/src/modules/auth/dto/login.dto.ts`
```typescript
export class LoginDto {
  @IsEmail() email: string;
  @IsString() @MinLength(8) password: string;
}
```

### `backend/src/modules/auth/dto/refresh-token.dto.ts`
```typescript
export class RefreshTokenDto {
  @IsString() refreshToken: string;
}
```

### `backend/src/modules/auth/dto/reset-password.dto.ts`
```typescript
export class ResetPasswordDto {
  @IsString() token: string;
  @IsString() @MinLength(8) newPassword: string;
}
```

### `backend/src/modules/users/users.module.ts`
Imports `PrismaModule`. Exports `UsersService`.

### `backend/src/modules/users/users.controller.ts`
```
GET    /api/v1/users              @Roles('admin')
POST   /api/v1/users              @Roles('admin')
GET    /api/v1/users/:id          @Roles('admin')
PATCH  /api/v1/users/:id          @Roles('admin')
DELETE /api/v1/users/:id          @Roles('admin')
GET    /api/v1/roles              @Roles('admin')
POST   /api/v1/roles              @Roles('admin')
PATCH  /api/v1/roles/:id/permissions  @Roles('admin')
```

### `backend/src/modules/users/users.service.ts`
- `findAll()` — paginated list
- `findById(id)` — includes roles
- `create(dto)` — bcrypt hash password, create user + assign role via `user_roles`
- `update(id, dto)` — partial update; if password in dto, hash it
- `deactivate(id)` — set `is_active: false`
- `findByEmail(email)` — used by auth service
- `getRoles()` — list all roles with their permissions
- `updateRolePermissions(roleId, permissionCodes)` — upsert role_permissions

### `backend/src/modules/users/dto/create-user.dto.ts`
Fields: `fullName`, `email`, `password`, `phone?`, `roleId`.

### `backend/src/modules/users/dto/update-user.dto.ts`
Partial of create-user (PartialType). `password` optional.

### Seed file: `backend/prisma/seed.ts`
Seeds default roles: `admin`, `operations`, `warehouse`, `pos_cashier`, `finance`, `viewer`.
Seeds default permissions from the permission codes list in the backend spec.
Creates a default admin user (email + password from env or hardcoded for dev).
Run via `npx prisma db seed`.

---

## Unit Tests to Write

### `backend/src/modules/auth/auth.service.spec.ts`
- `login()` with valid credentials returns `{ accessToken, refreshToken, user }`
- `login()` with wrong password throws `UnauthorizedException`
- `login()` with unknown email throws `UnauthorizedException`
- `refresh()` with valid token issues a new token pair and revokes the old token record
- `refresh()` with a revoked token revokes **all** sessions for that user and throws `UnauthorizedException`
- `refresh()` with an expired token throws `UnauthorizedException`
- `logout()` sets `revokedAt` on the specific token row only
- `logoutAll()` sets `revokedAt` on every token row for the user
- `resetPassword()` with a valid reset JWT updates `passwordHash` and revokes all refresh tokens

### `backend/src/modules/auth/strategies/jwt.strategy.spec.ts`
- `validate()` returns the decoded `{ sub, email, roles }` payload for a valid token
- Throws when the token signature is invalid

### `backend/src/modules/auth/guards/jwt-auth.guard.spec.ts`
- Routes decorated with `@Public()` pass through without a token
- Routes without `@Public()` are rejected with 401 when no `Authorization` header is present

### `backend/src/modules/auth/guards/roles.guard.spec.ts`
- Returns `true` when `request.user.roles` includes a required role
- Returns `false` when `request.user.roles` does not include any required role
- Returns `true` when no `@Roles()` metadata is set (guard is permissive when no restriction)

### `backend/src/modules/auth/guards/permissions.guard.spec.ts`
- Returns `true` when the user's roles include the required permission code
- Returns `false` when the required permission is absent
- Falls back to a DB query when the permission is not in the cache

### `backend/src/modules/users/users.service.spec.ts`
- `findByEmail()` returns the user record including roles
- `create()` hashes the password before storing — stored hash is not the plain-text password
- `deactivate()` sets `isActive: false` without deleting the record

---

## Frontend Files to Create

### `mobile/app/(auth)/_layout.tsx`
Stack layout for unauthenticated screens. No tab bar. Redirect to `(app)` if already authenticated.

### `mobile/app/(auth)/login.tsx`
Login Screen:
- Email input, password input (secureTextEntry), Sign In button
- On submit: call `POST /auth/login`, save tokens via `authStore.setTokens()`, navigate to `(app)`
- Forgot password link → `forgot-password`
- Large inputs, centered layout, works well on small phones
- Show error message on invalid credentials (401)

### `mobile/app/(auth)/forgot-password.tsx`
Forgot Password Screen:
- Email input, Submit button
- On submit: call `POST /auth/forgot-password`
- Show "if that email exists, a reset link has been sent" (do not reveal email existence)

### `mobile/app/(auth)/reset-password.tsx`
Reset Password Screen:
- Reads `token` param from deep link `exportapp://reset-password?token=...`
- New password input, confirm password input, Submit button
- On submit: call `POST /auth/reset-password`, redirect to login on success

### `mobile/lib/api/auth.api.ts`
```typescript
export const authApi = {
  login: (email: string, password: string) =>
    client.post('/auth/login', { email, password }),
  refresh: (refreshToken: string) =>
    client.post('/auth/refresh', { refreshToken }),
  logout: (refreshToken: string) =>
    client.post('/auth/logout', { refreshToken }),
  forgotPassword: (email: string) =>
    client.post('/auth/forgot-password', { email }),
  resetPassword: (token: string, newPassword: string) =>
    client.post('/auth/reset-password', { token, newPassword }),
};
```

### `mobile/hooks/useAuth.ts`
Convenience hook:
```typescript
export function useAuth() {
  const store = useAuthStore();
  const login = async (email, password) => { ... };
  const logout = async () => { ... };
  return { user: store.user, isAuthenticated: store.isAuthenticated, login, logout };
}
```

---

## Implementation Steps

1. Create `auth.module.ts`, `users.module.ts` shells and register them in `app.module.ts`
2. Write Prisma seed file and run `npx prisma db seed` — confirm roles, permissions, and admin user exist
3. Implement `UsersService.findByEmail()` and `create()` first (needed by auth)
4. Implement `AuthService.login()` — test with Swagger or curl
5. Implement JWT strategy and `JwtAuthGuard` — test that protected routes reject without token
6. Implement `@Public()` decorator — test that `/auth/login` is accessible without token
7. Implement refresh token creation, hashing, and rotation in `AuthService`
8. Implement `RolesGuard` and `@Roles()` — test that `GET /users` rejects non-admin tokens
9. Implement `PermissionsGuard` and permission caching
10. Implement `forgotPassword` and `resetPassword` (log link to console in dev)
11. Implement full `UsersController` (CRUD + roles endpoints)
12. Register `JwtAuthGuard` and `RolesGuard` as global guards in `app.module.ts`
13. Write and run all unit tests — `npm test` must pass before building frontend
14. Build frontend Login screen — confirm end-to-end login works on simulator
15. Build forgot/reset password screens — test deep link handling with Expo
16. Verify token refresh interceptor works by expiring access token manually in the store

## Acceptance Criteria
- `POST /auth/login` returns `accessToken`, `refreshToken`, and `user` object
- Protected routes return `401` without a valid token
- Protected routes return `403` when role is insufficient
- Refresh token rotation issues a new pair and revokes the old token in the DB
- Using a revoked refresh token revokes all sessions for that user
- Password reset deep link (`exportapp://reset-password?token=...`) opens the reset screen on the device
- Login screen works end-to-end on the Expo simulator
- Admin can create a new user via `POST /users` and that user can log in
- `npm test` passes with all auth and users unit tests green (no mocked DB skips)
