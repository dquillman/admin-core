# Admin Core Styling & Conventions: Versioning

## Source of Truth

The application version is defined in a single location:
`src/config.ts`

```typescript
export const ADMIN_CORE_VERSION = '0.3.0';
```

## How to Update

1. Open `src/config.ts`.
2. Update the version string.
3. Commit the change.

## Where it Appears

The version string is automatically imported and displayed in the **Sidebar Footer** via `src/components/Sidebar.tsx`.
