# STEP-00: Project Scaffolding and Infrastructure

## Goal
Create a working, deployable empty shell: monorepo structure, both project skeletons, shared tooling, full Prisma schema, Docker config, and CI/CD pipeline skeleton. No business logic. After this step both apps can start, connect to a database, and the Docker build passes.

## Prerequisites
- None (first step)

## Repository Structure
```
export-business-manager/
  backend/         — NestJS API
  mobile/          — React Native Expo app
  requirements/    — existing spec documents
  docker-compose.yml
  .github/workflows/ci.yml
  .gitignore
```

---

## Reference Documents
- `requirements/grocery_export_backend_spec.md` — full stack decisions, module list, env config
- `requirements/grocery_export_database_schema.md` — all 37 tables + indexes + views
- `requirements/grocery_export_ai_design_brief.md` — frontend stack decisions

---

## Backend Files to Create

### `backend/package.json`
Key dependencies:
```json
{
  "@nestjs/common": "^10",
  "@nestjs/core": "^10",
  "@nestjs/platform-express": "^10",
  "@nestjs/jwt": "^10",
  "@nestjs/passport": "^10",
  "@nestjs/schedule": "^4",
  "@nestjs/swagger": "^7",
  "@nestjs/config": "^3",
  "@prisma/client": "^5",
  "prisma": "^5",
  "passport": "^0.7",
  "passport-jwt": "^4",
  "passport-local": "^1",
  "bcrypt": "^5",
  "class-validator": "^0.14",
  "class-transformer": "^0.5",
  "@aws-sdk/client-secrets-manager": "^3",
  "@aws-sdk/client-ses": "^3",
  "@aws-sdk/client-s3": "^3",
  "pdfkit": "^0.14",
  "exceljs": "^4",
  "@anthropic-ai/sdk": "^0.27"
}
```

### `backend/tsconfig.json`
Standard NestJS tsconfig with `"strict": true` and `"emitDecoratorMetadata": true`.

### `backend/nest-cli.json`
Standard NestJS CLI config.

### `backend/.env.example`
```env
APP_PORT=3000
NODE_ENV=development
AWS_REGION=eu-west-1
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/exportmanager
JWT_EXPIRES_IN=15m
JWT_REFRESH_EXPIRES_IN=7d
STORAGE_BUCKET=export-manager-assets
SES_FROM_EMAIL=noreply@yourdomain.com
# Loaded from AWS Secrets Manager in production:
# JWT_SECRET=
# JWT_REFRESH_SECRET=
# ANTHROPIC_API_KEY=
```

### `backend/Dockerfile`
Multi-stage build:
- Stage 1 `builder`: `node:20-alpine` → copy package files, `npm ci`, copy src, `npm run build`
- Stage 2 `runner`: `node:20-alpine` → copy `dist/` and `node_modules/` (prod deps only), `CMD ["node", "dist/main"]`
- Expose port 3000

### `backend/src/main.ts`
Bootstrap with:
- `app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true, forbidNonWhitelisted: true }))`
- Global `HttpExceptionFilter`
- Global `ResponseInterceptor`
- `app.enableCors()` — configure origins from env
- Swagger setup: `DocumentBuilder` with title, version, Bearer auth scheme
- Listen on `APP_PORT`

### `backend/src/app.module.ts`
- `ConfigModule.forRoot({ isGlobal: true })`
- `PrismaModule` (global)
- `ScheduleModule.forRoot()`
- Import all feature modules (stubs for now)

### `backend/src/common/filters/http-exception.filter.ts`
Implements `ExceptionFilter`. Catches `HttpException`, returns:
```json
{ "statusCode": 400, "error": "Bad Request", "message": ["..."] }
```

### `backend/src/common/interceptors/response.interceptor.ts`
Implements `NestInterceptor`. Wraps successful responses:
```json
{ "data": {...}, "meta": { "timestamp": "2024-01-01T00:00:00Z" } }
```

### `backend/src/common/dto/pagination.dto.ts`
```typescript
export class PaginationDto {
  @IsOptional() @IsInt() @Min(1) @Type(() => Number)
  page?: number = 1;

  @IsOptional() @IsInt() @Min(1) @Max(100) @Type(() => Number)
  limit?: number = 20;
}
```

### `backend/src/prisma/prisma.module.ts` and `backend/src/prisma/prisma.service.ts`
Standard NestJS Prisma service extending `PrismaClient`, implements `OnModuleInit` with `$connect()`.

### `backend/src/config/secrets.config.ts`
On module init in non-development environments, fetches secrets from AWS Secrets Manager using `GetSecretValueCommand` and sets them on `process.env`. Called before HTTP server starts.

### `backend/prisma/schema.prisma`
Full schema matching all tables in `grocery_export_database_schema.md` plus the additional `refresh_tokens` table:
```prisma
model RefreshToken {
  id          String    @id @default(uuid())
  userId      String
  user        User      @relation(fields: [userId], references: [id])
  tokenHash   String
  deviceLabel String?
  issuedAt    DateTime  @default(now())
  expiresAt   DateTime
  revokedAt   DateTime?
}
```
Include all `@@index` directives from the schema spec. Use `uuid()` for all PKs. Use `Decimal` for monetary fields.

---

## Frontend Files to Create

### `mobile/package.json`
Key dependencies:
```json
{
  "expo": "~51",
  "expo-router": "~3",
  "react-native": "0.74",
  "typescript": "^5",
  "zustand": "^4",
  "axios": "^1",
  "expo-secure-store": "~13",
  "expo-camera": "~15",
  "expo-barcode-scanner": "~13",
  "expo-print": "~12",
  "expo-sharing": "~12",
  "expo-font": "~12",
  "expo-linking": "~6",
  "react-native-svg": "^15",
  "@shopify/flash-list": "^1"
}
```

### `mobile/app.json`
Set `scheme: "exportapp"` for deep links (used by password reset). Set `bundleIdentifier` and `package` placeholders.

### `mobile/tsconfig.json`
Extend `expo/tsconfig.base` with `"strict": true`.

### `mobile/babel.config.js`
Use `babel-preset-expo`.

### `mobile/app/_layout.tsx`
Root layout:
- Load fonts
- Wrap with auth gate: check `expo-secure-store` for refresh token on mount
- If token exists, restore session silently via refresh call
- Render `<Stack>` with `(auth)` group (unauthenticated) and `(app)` group (authenticated)
- Use Zustand `authStore` to determine which group to show

### `mobile/lib/api/client.ts`
Axios instance:
- `baseURL` from `process.env.EXPO_PUBLIC_API_URL`
- Request interceptor: attach `Authorization: Bearer <accessToken>` from Zustand store
- Response interceptor: on 401, call `POST /auth/refresh` with refresh token from `expo-secure-store`, update store, retry original request. On second 401, clear tokens and redirect to login.

### `mobile/store/auth.store.ts`
Zustand store:
```typescript
interface AuthState {
  user: User | null;
  accessToken: string | null;
  isAuthenticated: boolean;
  setTokens: (access: string, refresh: string) => Promise<void>;
  clearTokens: () => Promise<void>;
  setUser: (user: User) => void;
}
```
`setTokens` saves refresh token to `expo-secure-store`, keeps access token in memory only.
`clearTokens` removes from both store and secure storage.

---

## Infrastructure Files to Create

### `docker-compose.yml`
```yaml
services:
  postgres:
    image: postgres:16-alpine
    environment:
      POSTGRES_DB: exportmanager
      POSTGRES_USER: postgres
      POSTGRES_PASSWORD: postgres
    ports:
      - "5432:5432"
    volumes:
      - postgres_data:/var/lib/postgresql/data

  backend:
    build: ./backend
    ports:
      - "3000:3000"
    environment:
      DATABASE_URL: postgresql://postgres:postgres@postgres:5432/exportmanager
      NODE_ENV: development
    depends_on:
      - postgres
```

### `.github/workflows/ci.yml`
Jobs:
1. `lint-and-test` — checkout, setup Node 20, `npm ci` in backend and mobile, `npm run lint`, `npm run test`
2. `build-and-push` (on main branch only) — Docker build, ECR login via `aws-actions/amazon-ecr-login`, push image tagged with commit SHA
3. `deploy` (on main branch only, after build-and-push) — run Prisma migrations as ECS one-off task, update ECS service with new task definition

### `backend/.gitignore` and `mobile/.gitignore`
Standard Node/Expo gitignore. Ensure `.env` is excluded.

---

## Implementation Steps

1. Create the monorepo directory structure
2. Scaffold NestJS: `npx @nestjs/cli new backend --package-manager npm --skip-git`
3. Scaffold Expo: `npx create-expo-app mobile --template tabs` then switch to Expo Router
4. Install all dependencies in both projects
5. Write `prisma/schema.prisma` with the full schema from the database spec
6. Run `npx prisma generate` to confirm schema is valid
7. Write `main.ts`, `app.module.ts`, global filter, interceptor, pagination DTO, Prisma service
8. Write `secrets.config.ts` (no-op in development)
9. Write `app/_layout.tsx`, `auth.store.ts`, `api/client.ts`
10. Write `docker-compose.yml` and `Dockerfile`
11. Start Docker Compose locally and confirm `GET /api/v1` returns 404 (server is up)
12. Run `npx prisma migrate dev --name init` inside the backend container
13. Confirm all tables are created in Postgres
14. Write CI workflow skeleton

## Acceptance Criteria
- `docker compose up` starts Postgres and the NestJS backend without errors
- `npx prisma migrate dev` runs without errors and creates all tables
- `GET http://localhost:3000/api/v1` returns a valid JSON response (even if 404)
- `GET http://localhost:3000/api/v1/docs` shows the Swagger UI
- Expo app runs on simulator with `npx expo start`
- No TypeScript compilation errors in either project
