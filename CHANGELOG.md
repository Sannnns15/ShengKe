# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [0.5.0] — 2026-07-21

### Added

#### Backend — Feed Optimization & Cursor Pagination
- `FeedItem` schema: includes `author_nickname`, `author_avatar_url`, `is_liked` in feed responses
- Feed sorting: `sort=latest` (default, created_at desc) and `sort=hot` (like_count desc, 30-day window)
- Cursor-based pagination: `GET /moments/cursor` with base64-encoded cursor, supports `sort` param
- `CursorParams`, `CursorMeta`, `CursorPaginatedResult` schemas in `schemas/common.py`
- Moment detail (`GET /moments/{id}`) returns `is_liked` flag via `get_moment_with_like_status`
- `get_feed` joins User and Like tables for author info and like status
- Privacy filtering: `is_archived` exclusion confirmed, privacy level checks in feed

#### Frontend — Feed Author UI & Like Interaction
- MomentCard header: author avatar (Ionicons person-circle fallback) + nickname display
- `useLikeToggle` hook: optimistic UI update on like/unlike
- Feed sort toggle: "最新" / "热门" buttons in feed header, resets pagination on switch
- Moment detail page (`[id].tsx`): like button with interaction
- `getMomentFeed` and `useMomentFeed` support sort parameter
- Profile page shows author avatar and nickname

## [0.6.0] — 2026-07-21

### Added

#### Backend — User Profile Enhancement
- `likes_received_count` added to `UserProfileResponse`: returns total likes across user's moments
- `get_user_profile` and `get_own_profile` compute likes received via SQL aggregate

#### Frontend — User Profile Page & Social Interactions
- User profile page shows user's Moment list (FlatList with infinite scroll via `useUserMoments`)
- Avatar upload: press avatar → pick image (expo-image-picker) → upload via `uploadMedia` → update profile with new URL
- Settings page: avatar preview + change button
- User profile routing: `profile/[id].tsx` for viewing other users' profiles
- Follow/unfollow interaction: `useFollowToggle` hook with optimistic UI updates
- Feed MomentCard author area clickable → navigates to user's profile page

### Fixed

#### Frontend — API Compatibility
- `toggleLike` and `getLikeStatus` target_type parameter: now properly maps "moment"→1, "comment"→2 (was sending string, backend expects int)

## [0.7.0] — 2026-07-21

### Added

#### Frontend — Component Library (Sprint 6)
- `components/common/` — 9 reusable components: Button (4 variants × 3 sizes, loading/disabled), Input (label/error/icons/multiline), Avatar (uri + letter fallback), LoadingView, EmptyState, ErrorView, PrivacyBadge, Card, SectionHeader
- `components/moment/` — MomentCard moved from root, refactored to use sub-components (Avatar, PrivacyBadge, LikeButton)
- `components/user/` — ProfileHeader (avatar + stats + bio)
- `components/social/` — LikeButton (heart toggle + count), FollowButton (follow/unfollow dual state)
- `components/media/` — ImageViewer placeholder
- `components/ai/` — AiChatBubble (user/assistant dual bubble + timestamp)
- All 6 component dirs have barrel index.ts exports

#### Frontend — Stores
- `stores/momentStore.tsx` — draft persistence + feed sort state
- `stores/uiStore.tsx` — toast message queue with 3s auto-dismiss

### Changed
- Import paths updated: `app/(tabs)/home/index.tsx` and `app/(tabs)/profile/index.tsx` now use barrel exports from `components/moment`
- Legacy `components/MomentCard.tsx` deleted (moved to `components/moment/`)

## [0.8.0] — 2026-07-22

### Added

#### Backend — WebSocket Notification Push
- WebSocket endpoint `GET /ws?token=...` with JWT authentication
- `ConnectionManager` managing per-user WebSocket connections with auto-cleanup
- `create_notification` now pushes real-time via WebSocket to the target user's active connections
- Notifications for like, comment, and follow events are now pushed instantly

#### Backend — Comment Tree Structure
- `CommentTreeItem` schema with recursive `replies` field for nested comment display
- `GET /moments/{id}/comments` returns tree structure (root comments → child replies)
- Comments JOIN User table for `author_nickname` and `author_avatar_url`
- Soft-deleted comments show `"[该评论已被删除]"` placeholder
- `DELETE /comments/{id}` decrements Moment.comment_count

#### Backend — User Settings API
- `GET /users/me/settings` — reads `settings_json` on User model, returns structured response
- `PATCH /users/me/settings` — partial update, merges into `settings_json`
- `UserSettingsResponse` with `notification_enabled` and `privacy_default` fields

#### Frontend — Comment Components
- `components/social/CommentItem.tsx` — avatar, nickname, time, content, reply/like/delete buttons, recursive child indentation
- `components/social/CommentList.tsx` — FlatList with recursive rendering, loading/empty states, load more
- `components/social/CommentComposer.tsx` — TextInput + send, reply banner with @nickname, auto-focus
- Barrel exports in `components/social/index.ts`
- `app/(tabs)/home/[id].tsx` refactored to use CommentList + CommentComposer, with reply-to state and delete mutation

#### Frontend — WebSocket Real-time Notifications
- `hooks/useWebSocket.ts` — auto-connect with JWT, 30s heartbeat ping, 5s auto-reconnect
- Notifications page upgraded: WebSocket inserts new notifications at top in real-time
- Actor avatar displayed in notification items (using Avatar component)
- Click notification navigates to target Moment
- Retained polling as fallback; removed mock data dependency
- Tab navigation shows unread badge on notification icon

#### Frontend — User Settings UI
- `services/userSettings.ts` — `getMySettings` / `updateMySettings`
- Settings page: notification toggle (`notification_enabled`), privacy level radio selector (`privacy_default`)

## [0.10.0] — 2026-07-22

### Added

#### Backend — Full-Text Search (tsvector)
- GIN index on `moments` table: `to_tsvector('simple', coalesce(title,'') || ' ' || coalesce(content,''))`
- Alembic migration `add_tsvector_gin_index`
- `GET /search/moments` upgraded: tsvector full-text search with weighted ranking (title=A, content=B)
- Search sort modes: `relevance` (ts_rank DESC), `latest` (created_at DESC), `hot` (like_count DESC, 30-day window)
- Search returns `FeedItem` format (with author info)
- `sort` query parameter added to search endpoint

#### Backend — Core API Tests
- `tests/test_moments.py` — create, get, update, delete, feed, archive, privacy tests
- `tests/test_comments.py` — create (plain + reply), list, delete, count decrement
- `tests/test_likes.py` — like, unlike, idempotent, count update
- `tests/test_follows.py` — follow, unfollow, self-follow prevention, follower/following lists
- `tests/test_search.py` — moment search, user search, empty results
- All 5 test files passing with auth fixture

#### Frontend — Search Page
- `services/search.ts` — `searchMoments()` and `searchUsers()` real API services
- Explore page fully rewritten: 500ms debounced auto-search, results with infinite scroll pagination
- Search history persisted to AsyncStorage (max 10 items, clear single/all)
- Hot tags extracted from feed (AI tag word frequency top 10)
- Empty/error states with retry, loading indicators

#### Frontend — Dark Mode
- `stores/themeStore.tsx` — system/light/dark three-state, persisted, computed `isDark`
- `DarkColors` palette in `constants/theme.ts` (deep navy/coral scheme)
- `hooks/useColors.ts` — `useColors()` returns active palette
- `app/_layout.tsx` — ThemeInitializer loads persisted theme, listens to system Appearance
- Settings page: "主题" section with radio-style selector (跟随系统/浅色/深色)
- StatusBar adapts to dark/light mode

#### Frontend — Component Tests
- Installed `@testing-library/react-native` v14 + `@testing-library/jest-native`
- `test-setup.ts` mocking RN modules (icons, safe-area, gesture-handler, expo-router, tanstack-query)
- `Button.test.tsx` — 10 tests: variants, sizes, disabled/loading states, callbacks
- `Input.test.tsx` — 10 tests: placeholder, onChangeText, error, label, multiline, icons
- `MomentCard.test.tsx` — 10 tests: content rendering, counts, callbacks, tags, truncation
- **45 tests total, all passing**

## [0.9.0] — 2026-07-22

### Added

#### Backend — Data Export (async)
- `POST /users/me/export` — creates export task with `BackgroundTasks`, returns `task_id`
- `GET /users/me/export/{task_id}` — query task status (pending/processing/done/failed)
- `GET /users/me/export/{task_id}/download` — download exported JSON file
- `app/services/export.py` — `ExportTaskStore` (in-memory), `export_user_data` async builder with moments + comments + media

#### Backend — OSS Pre-signed URL Direct Upload
- `POST /media/upload-signature` — returns OSS pre-signed URL + object_key
- `app/services/media.py` — real `oss2` pre-signed URL generation; graceful fallback to mock when OSS unconfigured
- OSS config fields (`ali_oss_endpoint`, `ali_oss_bucket`, `ali_oss_access_key_id`, `ali_oss_access_key_secret`) in Settings
- 3-step flow: signature → PUT to OSS → confirm

#### Backend — Content Audit (MVP)
- `app/services/audit.py` — `audit_text()` with sensitive word filtering, `audit_image()` stub
- Moment creation now runs audit on content; rejected content returns specific reason
- `AuditRejected` exception for clean error handling

#### Backend — Blurhash
- `blurhash` field added to Media model + alembic migration
- `app/utils/blurhash_utils.py` — `compute_blurhash()` using Pillow + blurhash library
- Upload endpoint computes and stores blurhash automatically
- Dependencies: `blurhash>=1.1.4`, `Pillow`, `numpy>=1.24.0`

#### Frontend — Data Export UI
- `services/export.ts` — `requestExport`, `getExportStatus`, `getDownloadUrl`
- Settings page "数据管理" section with "导出我的数据" button
- Status polling (2s interval) from pending → done, download button on completion

#### Frontend — OSS Direct Upload
- `services/media.ts` — `getUploadSignature`, `uploadToPresignedUrl`, `confirmUpload`, `uploadMediaDirect`
- Create moment and avatar upload flows updated to use OSS direct upload

#### Frontend — Blurhash Image Component
- `components/media/BlurhashImage.tsx` — grey placeholder → image fade-in transition
- Barrel export in `components/media/index.ts`

## [0.4.0] — 2026-07-20

### Added

#### Backend — Notifications & Feed Optimization
- Notification model + service + API: create, list (paginated), mark-read, mark-all-read, unread-count
- Automatic notification triggers: comment creates notification for moment author, like creates notification, follow creates notification
- Feed optimized: properly filters by Follow table (followed users' visible moments + public moments), excludes archived/deleted
- User profile counts: moment_count, follower_count, following_count now use real SQL queries
- Alembic env.py imports Notification model

#### Frontend — Notifications, Settings, Comment/Like
- Notifications page: icon per type (❤️💬👤🔔), unread badges, mark-read on tap, pull-to-refresh
- Settings page: edit profile form, change password UI (stub), data export (stub), account deletion with confirmation modal
- Profile layout with Settings route registration
- Moment detail page: real comments API integration (list + create with input), real like toggle (❤️ toggleLike API)
- Notifications API service

#### CI/CD
- GitHub Actions workflow: `backend` job (ruff lint + pytest with PG 16 + Redis 7), `frontend` job (tsc --noEmit + expo export --platform web)
- 4 auth tests (register, login, refresh, duplicate) — all 4 passed
- pytest with async fixtures, coverage reporting
- Model fixes: ForeignKey constraint on Moment.user_id, relationship hygiene

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