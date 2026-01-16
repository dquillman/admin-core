# Admin Core

A standalone, multi-app admin application for managing the Exam Coach Pro AI platform and related apps.

## 🚀 Multi-App Support

Admin Core is designed to manage multiple applications within the same Firebase project.

### How it works

- **App ID Selection**: The active `appId` can be selected via the dropdown in the sidebar.
- **Persistence**: Selected `appId` is persisted in `localStorage` and optionally driven by the `?appId=` URL parameter.
- **Namespacing**: Most data is namespaced under `apps/{appId}/...` in Firestore.

### App Selector

- Switch quickly between `examcoachpro`, `deadline-shield`, and `machine-tracker`.
- Add custom `appId`s directly in the UI.

## 🎯 Security Enforcement

Admin Core implements a 3-layer security model to ensure zero data leaks.

### 1. UI Route Guards

- Immediate render-blocking loading gates.
- Strict `isAdmin` checks before mounting any protected route content.

### 2. Service Layer Defense

- All privileged operations in `firestoreService.ts` call `requireAdmin()` which verifies the user's role in Firestore before execution.

### 3. Firestore Security Rules

- "Deny-by-default" policy.
- Detailed rules in `firestore.rules` enforcing app-scoped access and preventing self-promotion.

## 🧪 Testing & Verification

### Automated Rules Tests

We use `@firebase/rules-unit-testing` and `Vitest` to assert security barriers on a local emulator.

```bash
# Run unit tests for firestore rules
npm run test:rules
```

### Manual Security Audit

1. Run the verification script to check basic access blocks:

   ```bash
   node scripts/verify-security.mjs
   ```

2. Follow the detailed protocol in [docs/SECURITY_VERIFICATION.md](docs/SECURITY_VERIFICATION.md).

## 📋 Data Collections (New Schema)

### App-Scoped (Preferred)

#### `apps/{appId}/config/plans`

- Trial and plan configuration for the specific app.

#### `apps/{appId}/audit/{eventId}`

- Admin action logs for the specific app.

#### `apps/{appId}/sources/{sourceId}`

- External update sources monitored for the specific app.

### Global / Legacy

#### `users/{uid}`

- Global user profiles and roles.
- `role`: "admin" | "user"

#### `admin_config/plans` (Legacy)

- Automatically migrated to `apps/{appId}/config/plans` upon admin login.

## 🚀 Getting Started

### Prerequisites

- Node.js 18+
- Firebase CLI: `npm install -g firebase-tools`
- Java (for Firebase Emulators)

### Installation

```bash
cd admin-core
npm install
```

### Environment Variables

Create `.env` file (see `.env.example`):

```env
VITE_FIREBASE_API_KEY=...
VITE_FIREBASE_AUTH_DOMAIN=...
VITE_FIREBASE_PROJECT_ID=...
VITE_FIREBASE_STORAGE_BUCKET=...
VITE_FIREBASE_MESSAGING_SENDER_ID=...
VITE_FIREBASE_APP_ID=...
VITE_ADMIN_BOOTSTRAP_EMAIL=your_email@example.com
```

### Development

```bash
# Start dev server
npm run dev

# Start emulators for testing
firebase emulators:start
```

### Build & Deploy

```bash
# Prepare production build
npm run build

# Deploy to Hosting
firebase deploy --only hosting

# Deploy Security Rules
firebase deploy --only firestore:rules
```

---

**Built with ❤️ for multi-app scalability.**
