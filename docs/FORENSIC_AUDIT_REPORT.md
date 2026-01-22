# Admin Core Forensic Audit Report

## Root Cause Diagnosis

* **Tailwind CSS Configuration Missing**: The project depends on Tailwind CSS v4 (`tailwindcss`, `postcss`, `autoprefixer` are installed) and uses `@import "tailwindcss";` in `src/index.css`. However, there is **no `postcss.config.js`** file and `vite.config.ts` does not include the `@tailwindcss/vite` plugin. Consequently, Tailwind CSS is never processed, resulting in zero utility classes being generated. The app renders a "shell" because of raw CSS variables and resets, but layout utilities like `fixed`, `w-64`, and `flex` are ignored.
* **Favicon Mismatch**: The `index.html` file currently points to `/vite.svg`, which is the default Vite logo. This confirms the user's observation of the incorrect favicon.

## Exact File(s) Causing the Issue

1. `postcss.config.js` (Missing)
2. `index.html` (Incorrect Favicon reference)

## Exact Code Changes Required

### 1. Create `postcss.config.js` in the project root

This file is required to activate Tailwind CSS processing via PostCSS.

```javascript
export default {
  plugins: {
    tailwindcss: {},
    autoprefixer: {},
  },
}
```

*Note: Since `package.json` sets `"type": "module"`, we use ESM export syntax.*

### 2. Update `index.html`

Update the favicon link to use a project-specific asset. If no asset exists yet, removing the default Vite reference avoids confusion.

```html
<!-- In <head> -->
<!-- [MODIFY] Remove or update the default Vite favicon -->
<link rel="icon" type="image/svg+xml" href="/vite.svg" />
<!-- TO -->
<!-- <link rel="icon" type="image/png" href="/favicon.png" /> -->
```

*(Assuming the user will provide a `favicon.png`, or they can temporarily comment it out)*

## Verification Checklist

1. [ ] Create `postcss.config.js` with the content above.
2. [ ] Run `npm run build`.
3. [ ] Verify Sidebar appears (white text on dark slate sidebar).
4. [ ] Verify layout columns are respected (`ml-64` works).
5. [ ] Verify Favicon is updated or default is gone.
