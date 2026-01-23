
import { initializeApp } from 'firebase/app';
import { getFirestore, collection, addDoc, serverTimestamp } from 'firebase/firestore';
// Hardcoded config for verification script
const firebaseConfig = {
    apiKey: "AIzaSyBBlyZqdAJw_yNNfUQfVW59eYgkrBJLUCQ",
    authDomain: "exam-coach-ai-platform.firebaseapp.com",
    projectId: "exam-coach-ai-platform",
    storageBucket: "exam-coach-ai-platform.firebasestorage.app",
    messagingSenderId: "980138578480",
    appId: "1:980138578480:web:f796be8a414d778a6bd3f5"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

async function createTestIssue() {
    console.log("Creating test issue...");
    try {
        const docRef = await addDoc(collection(db, "reported_issues"), {
            app: "Exam Coach PWA",
            type: "feedback",
            message: "This is a test issue created by the Verification Script (AG).",
            userId: "test-user-123",
            url: "https://examcoach.app/question/123",
            createdAt: serverTimestamp()
        });
        console.log("Test Issue Created with ID: ", docRef.id);
    } catch (e) {
        console.error("Error adding document: ", e);
        process.exit(1);
    }
}

createTestIssue();
