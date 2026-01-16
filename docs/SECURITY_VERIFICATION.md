# Admin Core: Security Verification Checklist

This document provides a protocol for manually verifying the security boundaries of the Admin Core console.

## 1. UI Access Control (Non-Admin)

- [ ] **Login as Non-Admin**: Use an account that exists in `users` but has `role: "user"`.
- [ ] **Expect Redirection**: You should be immediately redirected to `/access-denied`.
- [ ] **Direct URL Access**: Try navigating directly to:
  - `/dashboard`
  - `/users`
  - `/plans`
  - `/sources`
- [ ] **Result**: Every attempts must redirect to `/access-denied` or `/login`.

## 2. Firestore Data Leaks (Non-Admin)

Using the browser console while signed in as a non-admin:

- [ ] **Attempt Config Read**:

  ```javascript
  // In Browser Console
  import { getDoc, doc } from 'firebase/firestore';
  const snap = await getDoc(doc(db, 'apps/examcoachpro/config/plans'));
  console.log(snap.exists());
  ```

- [ ] **Expected Result**: Firebase Error: `Missing or insufficient permissions`.

- [ ] **Attempt Role Promotion**:

  ```javascript
  // Try to make yourself admin
  import { updateDoc, doc } from 'firebase/firestore';
  await updateDoc(doc(db, 'users', auth.currentUser.uid), { role: 'admin' });
  ```

- [ ] **Expected Result**: Firebase Error: `Missing or insufficient permissions`.

## 3. Bootstrap Logic Verification

- [ ] **First Login**: Login with the email defined in `VITE_ADMIN_BOOTSTRAP_EMAIL` on a fresh project.
- [ ] **Success**: Verify you are promoted to `admin` and an event appears in `apps/{appId}/audit`.
- [ ] **Second Login**: Use a different email and check if you can promote it to admin without using the first account.
- [ ] **Expected Result**: Operation should fail; only one bootstrap is allowed when zero admins exist.

## 4. Audit Trail

- [ ] **Change App Config**: Update a plan setting in the `/plans` page.
- [ ] **Verification**: Check the `Overview` (Dashboard) page or the `apps/{appId}/audit` collection in Firebase Console.
- [ ] **Expected Result**: An entry for `update_config_plans` should exist with your UID.
