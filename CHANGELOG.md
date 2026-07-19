# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [0.3.0] — 2026-07-20

### Added

#### Backend — Social Features
- Comment model + service + API: create comment (with reply support), paginated list by moment, soft-delete
- Like model + service + API: toggle like/unlike, get status, count, auto-update parent entity counts
- Follow model + service + API: follow/unfollow (with re-follow support), paginated followers/following lists, self-follow prevention
- All relationships wired into `User`, `Moment`, and `Comment` models
- Alembic env.py imports new models for autogenerate detection

#### Frontend — Moment UI
- Moment Feed with `useInfiniteQuery` pagination, pull-to-refresh, infinite scroll
- MomentCard component: content truncation (80 chars), mood, privacy badge, AI tags, stats
- Moment detail page: full content, AI summary/tags, like button, mock comments section
- Create Moment page: title, multi-line content with char count, 6-emoji mood picker, privacy level selector, form validation
- Type definitions aligned with backend (`MomentFeedItem`, `MomentDetail`, `CreateMomentParams`)

### Changed
- Front-end TypeScript: zero errors (`tsc --noEmit` ✓)
- Backend: all module imports verified (`python -c` import test ✓)

## [0.2.0] — 2026-07-19

### Added

#### Backend
- Database connection layer: SQLAlchemy async engine + session factory (`app/core/database.py`)
- `init_db()` helper for development table creation
- Auth service layer (`app/services/auth.py`): `create_user`, `authenticate_user`, `create_login_tokens`, refresh token store (in-memory, Redis-ready)
- Full Auth API endpoints (`/api/v1/auth/`): register, login, refresh, logout, send-code (stub), reset-password (stub)
- Alembic env.py properly configured with `Settings.database_url` and `Base.metadata`

#### Frontend
- Axios client with auto Bearer token injection and 401 auto-refresh (`services/client.ts`)
- Auth API service: `registerAPI`, `loginAPI`, `refreshTokenAPI`, `logoutAPI`, `sendCodeAPI`
- Zustand auth store: `login`, `register`, `logout`, `refreshAccessToken`, `loadStoredAuth` (token persisted via expo-secure-store)
- `useAuth` hook for page components
- Complete Login page with phone/password validation, loading state, navigation links
- Complete Register page with verification code (60s countdown), full form validation

#### Infrastructure
- `docker-compose.dev.yml`: PostgreSQL 16 + Redis 7 for local development
- `.env.example`: full environment variable template

## [0.1.0] — 2026-07-20

### Added
- Initial project scaffolding: monorepo structure with `backend/`, `frontend/`, `docs/`
- Core data model implemented: `User`, `Moment`, `Media`, `Tag`, `Comment`, `Like` (PostgreSQL + SQLAlchemy 2.0 async)
- Basic authentication flow: phone number login, JWT token issuance & refresh
- Minimal frontend UI: Expo-based login, moment creation, and feed view
- First AI capabilities: automatic tag extraction and summary generation for Moments using Qwen API
- Development documentation: `README.md`, `DEVELOPMENT.md`, `architecture.md`, `data-model.md`
- CI pipeline stubs: GitHub Actions for linting (black, eslint) and unit test coverage

### Changed
- N/A (initial release)

### Deprecated
- N/A (initial release)

### Removed
- N/A (initial release)

### Fixed
- N/A (initial release)

### Security
- All passwords hashed with bcrypt; JWT tokens use short-lived access + long-lived refresh
- Content moderation via Alibaba Cloud Content Security API for all user uploads

[0.1.0]: https://github.com/shengke-project/shengke/releases/tag/v0.1.0