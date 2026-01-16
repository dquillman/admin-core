/**
 * Security Verification Script
 * 
 * Attempts various operations to ensure security rules are enforced.
 * Run with: node scripts/verify-security.mjs
 */

import { initializeApp } from "firebase/app";
import {
    getFirestore,
    doc,
    getDoc,
    setDoc,
    updateDoc,
    deleteDoc,
    collection,
    getDocs
} from "firebase/firestore";
import 'dotenv/config';

const firebaseConfig = {
    apiKey: process.env.VITE_FIREBASE_API_KEY,
    authDomain: process.env.VITE_FIREBASE_AUTH_DOMAIN,
    projectId: process.env.VITE_FIREBASE_PROJECT_ID,
    storageBucket: process.env.VITE_FIREBASE_STORAGE_BUCKET,
    messagingSenderID: process.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
    appID: process.env.VITE_FIREBASE_APP_ID
};

console.log("🔍 Starting Security Verification...");

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

const testAppId = "security-test-app";

async function verify() {
    console.log(`\n--- Testing App: ${testAppId} ---`);

    // 1. Test unauthorized read (if not signed in, which this script likely isn't)
    try {
        console.log("Testing unauthorized read of config...");
        await getDoc(doc(db, `apps/${testAppId}/config/plans`));
        console.log("❌ FAIL: Was able to read config without admin auth");
    } catch (e) {
        console.log("✅ PASS: Unauthorized read blocked");
    }

    // 2. Test unauthorized write
    try {
        console.log("Testing unauthorized write of config...");
        await setDoc(doc(db, `apps/${testAppId}/config/plans`), { trialDays: 999 });
        console.log("❌ FAIL: Was able to write config without admin auth");
    } catch (e) {
        console.log("✅ PASS: Unauthorized write blocked");
    }

    // 3. Test unauthorized read of users
    try {
        console.log("Testing unauthorized read of user collection...");
        await getDocs(collection(db, "users"));
        console.log("❌ FAIL: Was able to read users without admin auth");
    } catch (e) {
        console.log("✅ PASS: Unauthorized user read blocked");
    }

    // 4. Test public issue creation (Should PASS based on rules)
    try {
        console.log("Testing public issue creation...");
        const issueRef = doc(collection(db, "issues"));
        await setDoc(issueRef, {
            title: "Security Test Issue",
            description: "Automatically created by script",
            timestamp: new Date()
        });
        console.log("✅ PASS: Public issue creation success");

        // Clean up if admin (unlikely here but good practice)
        try {
            await deleteDoc(issueRef);
            console.log("ℹ️ Issue cleaned up (if allowed)");
        } catch (e) {
            console.log("ℹ️ Issue cleanup skipped (expected for non-admin)");
        }
    } catch (e) {
        console.log("❌ FAIL: Public issue creation blocked unexpectedly", e.message);
    }

    console.log("\n--- Verification Complete ---");
    console.log("Note: To test admin-level access, run this script with an admin service account (not recommended for client side verification) or check via browser console while logged in.");
}

verify().catch(console.error);
