import { initializeApp } from "firebase/app";
import { getFirestore, doc, updateDoc, serverTimestamp } from "firebase/firestore";

const firebaseConfig = {
    apiKey: "AIzaSyBBlyZqdAJw_yNNfUQfVW59eYgkrBJLUCQ",
    authDomain: "exam-coach-ai-platform.firebaseapp.com",
    projectId: "exam-coach-ai-platform",
    storageBucket: "exam-coach-ai-platform.firebasestorage.app",
    messagingSenderId: "980138578480",
    appId: "1:980138578480:web:f796be8a414d778a6bd3f5"
};

console.log("🚀 Patching ExamCoach Pro Health Status...");

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

async function patch() {
    try {
        await updateDoc(doc(db, "apps", "examcoachpro"), {
            health: {
                state: "ok",
                issues: [],
                last_check_at: serverTimestamp()
            }
        });
        console.log("✅ App 'examcoachpro' patched successfully!");
        process.exit(0);
    } catch (e) {
        console.error("❌ Failed to patch app:", e);
        process.exit(1);
    }
}

patch();
