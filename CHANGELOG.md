# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

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