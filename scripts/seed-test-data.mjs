import { initializeApp } from "firebase/app";
import {
    getFirestore,
    doc,
    setDoc,
    connectFirestoreEmulator
} from "firebase/firestore";
import 'dotenv/config';

const firebaseConfig = {
    apiKey: "test-api-key", // Emulator doesn't care
    projectId: "demo-admin-core",
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

// Connect to emulator
connectFirestoreEmulator(db, 'localhost', 8080);

async function seed() {
    console.log("🌱 Seeding test data to emulator...");

    const appId = "examcoachpro";

    // 1. Create Admin User
    await setDoc(doc(db, "users", "admin-uid"), {
        email: "admin@test.com",
        role: "admin",
        createdAt: new Date(),
        isPro: true
    });
    console.log("✅ Created admin user: admin-uid");

    // 2. Create Normal User
    await setDoc(doc(db, "users", "user-uid"), {
        email: "user@test.com",
        role: "user",
        createdAt: new Date(),
        isPro: false
    });
    console.log("✅ Created normal user: user-uid");

    // 3. Create App Config
    await setDoc(doc(db, "apps", appId, "config", "plans"), {
        trialDays: 7,
        trialHasFullProAccess: true,
        planLimits: {
            starter: { maxQuizzes: 5 },
            pro: { maxQuizzes: 100 }
        }
    });
    console.log("✅ Created app config for:", appId);

    // 4. Create App Source
    await setDoc(doc(db, "apps", appId, "sources", "test-source"), {
        url: "https://example.com/updates",
        frequency: "daily",
        status: "ok",
        createdAt: new Date()
    });
    console.log("✅ Created app source for:", appId);

    console.log("✨ Seeding complete!");
}

seed().catch(console.error);
