import { initializeApp } from "firebase/app";
import { getFirestore, collection, getDocs } from "firebase/firestore";

const firebaseConfig = {
    apiKey: "AIzaSyBBlyZqdAJw_yNNfUQfVW59eYgkrBJLUCQ",
    authDomain: "exam-coach-ai-platform.firebaseapp.com",
    projectId: "exam-coach-ai-platform",
    storageBucket: "exam-coach-ai-platform.firebasestorage.app",
    messagingSenderId: "980138578480",
    appId: "1:980138578480:web:f796be8a414d778a6bd3f5"
};

console.log("🚀 Debugging Firestore Data...");

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

async function debug() {
    try {
        // Since client SDK can't listCollections, we'll just check specific known ones
        const collectionsToCheck = ['issues', 'reported_issues', 'feedback', 'users', 'user_sessions'];

        for (const colName of collectionsToCheck) {
            console.log(`\n--- Collection: ${colName} ---`);
            const snap = await getDocs(collection(db, colName));
            console.log(`Count: ${snap.size}`);
            snap.forEach(doc => {
                console.log(`[${doc.id}]:`, JSON.stringify(doc.data(), null, 2));
            });
        }

        process.exit(0);
    } catch (e) {
        console.error("❌ Failed to debug:", e);
        process.exit(1);
    }
}

debug();
