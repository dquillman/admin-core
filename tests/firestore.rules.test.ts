import {
    initializeTestEnvironment,
    RulesTestEnvironment,
    assertFails,
    assertSucceeds,
} from "@firebase/rules-unit-testing";
import { setDoc, getDoc, doc } from "firebase/firestore";
import { readFileSync } from "fs";
import { describe, it, beforeAll, afterAll, beforeEach } from "vitest";

let testEnv: RulesTestEnvironment;

describe("Firestore security rules", () => {
    beforeAll(async () => {
        testEnv = await initializeTestEnvironment({
            projectId: "admin-core-test",
            firestore: {
                rules: readFileSync("firestore.rules", "utf8"),
                host: "127.0.0.1",
                port: 8080,
            },
        });
    });

    afterAll(async () => {
        await testEnv.cleanup();
    });

    beforeEach(async () => {
        await testEnv.clearFirestore();
    });

    const appId = "test-app";

    it("prevents non-authenticated users from reading anything", async () => {
        const unauthedDb = testEnv.unauthenticatedContext().firestore();
        await assertFails(getDoc(doc(unauthedDb, "users/any")));
        await assertFails(getDoc(doc(unauthedDb, `apps/${appId}/config/plans`)));
    });

    it("prevents non-admin users from reading app config", async () => {
        const aliceDb = testEnv.authenticatedContext("alice", { role: "user" }).firestore();

        // Setupalice profile
        await testEnv.withSecurityRulesDisabled(async (context) => {
            const db = context.firestore();
            await setDoc(doc(db, "users/alice"), { role: "user", email: "alice@example.com" });
            await setDoc(doc(db, `apps/${appId}/config/plans`), { trialDays: 7 });
        });

        await assertFails(getDoc(doc(aliceDb, `apps/${appId}/config/plans`)));
    });

    it("allows admin users to read and write app config", async () => {
        const adminDb = testEnv.authenticatedContext("admin_guy", { role: "admin" }).firestore();

        // Setup admin profile
        await testEnv.withSecurityRulesDisabled(async (context) => {
            const db = context.firestore();
            await setDoc(doc(db, "users/admin_guy"), { role: "admin", email: "admin@example.com" });
        });

        await assertSucceeds(setDoc(doc(adminDb, `apps/${appId}/config/plans`), { trialDays: 14 }));
        const snap = await getDoc(doc(adminDb, `apps/${appId}/config/plans`));
        assertSucceeds(Promise.resolve(snap.exists()));
    });

    it("prevents users from promoting themselves to admin", async () => {
        const aliceDb = testEnv.authenticatedContext("alice", { role: "user" }).firestore();

        await testEnv.withSecurityRulesDisabled(async (context) => {
            const db = context.firestore();
            await setDoc(doc(db, "users/alice"), { role: "user", email: "alice@example.com" });
        });

        await assertFails(setDoc(doc(aliceDb, "users/alice"), { role: "admin" }));
    });

    it("allows users to read their own profile", async () => {
        const aliceDb = testEnv.authenticatedContext("alice", { role: "user" }).firestore();

        await testEnv.withSecurityRulesDisabled(async (context) => {
            const db = context.firestore();
            await setDoc(doc(db, "users/alice"), { role: "user", email: "alice@example.com" });
        });

        await assertSucceeds(getDoc(doc(aliceDb, "users/alice")));
    });

    it("prevents non-admins from writing to sources", async () => {
        const aliceDb = testEnv.authenticatedContext("alice", { role: "user" }).firestore();

        await testEnv.withSecurityRulesDisabled(async (context) => {
            const db = context.firestore();
            await setDoc(doc(db, "users/alice"), { role: "user" });
        });

        await assertFails(setDoc(doc(aliceDb, `apps/${appId}/sources/source1`), { url: "http://hacked.com" }));
    });
});
