"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __generator = (this && this.__generator) || function (thisArg, body) {
    var _ = { label: 0, sent: function() { if (t[0] & 1) throw t[1]; return t[1]; }, trys: [], ops: [] }, f, y, t, g = Object.create((typeof Iterator === "function" ? Iterator : Object).prototype);
    return g.next = verb(0), g["throw"] = verb(1), g["return"] = verb(2), typeof Symbol === "function" && (g[Symbol.iterator] = function() { return this; }), g;
    function verb(n) { return function (v) { return step([n, v]); }; }
    function step(op) {
        if (f) throw new TypeError("Generator is already executing.");
        while (g && (g = 0, op[0] && (_ = 0)), _) try {
            if (f = 1, y && (t = op[0] & 2 ? y["return"] : op[0] ? y["throw"] || ((t = y["return"]) && t.call(y), 0) : y.next) && !(t = t.call(y, op[1])).done) return t;
            if (y = 0, t) op = [op[0] & 2, t.value];
            switch (op[0]) {
                case 0: case 1: t = op; break;
                case 4: _.label++; return { value: op[1], done: false };
                case 5: _.label++; y = op[1]; op = [0]; continue;
                case 7: op = _.ops.pop(); _.trys.pop(); continue;
                default:
                    if (!(t = _.trys, t = t.length > 0 && t[t.length - 1]) && (op[0] === 6 || op[0] === 2)) { _ = 0; continue; }
                    if (op[0] === 3 && (!t || (op[1] > t[0] && op[1] < t[3]))) { _.label = op[1]; break; }
                    if (op[0] === 6 && _.label < t[1]) { _.label = t[1]; t = op; break; }
                    if (t && _.label < t[2]) { _.label = t[2]; _.ops.push(op); break; }
                    if (t[2]) _.ops.pop();
                    _.trys.pop(); continue;
            }
            op = body.call(thisArg, _);
        } catch (e) { op = [6, e]; y = 0; } finally { f = t = 0; }
        if (op[0] & 5) throw op[1]; return { value: op[0] ? op[1] : void 0, done: true };
    }
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.autoExpireTesterPro = exports.disableUser = exports.extendTesterPro = exports.revokeTesterPro = exports.grantTesterPro = void 0;
var functions = __importStar(require("firebase-functions"));
var admin = __importStar(require("firebase-admin"));
admin.initializeApp();
var db = admin.firestore();
/**
 * Grant "Pro (Tester)" access to a user.
 * - Sets testerOverride=true
 * - Sets testerExpiresAt = now + 14 days
 * - Sets plan="pro" (optional, depending on app logic, but requested in checking)
 */
exports.grantTesterPro = functions.https.onCall(function (data, context) { return __awaiter(void 0, void 0, void 0, function () {
    var callerUid, callerDoc, targetUid, now, expiresAt, targetRef, targetDoc, prevState;
    var _a;
    return __generator(this, function (_b) {
        switch (_b.label) {
            case 0:
                if (!context.auth)
                    throw new functions.https.HttpsError("unauthenticated", "Must be logged in");
                callerUid = context.auth.uid;
                return [4 /*yield*/, db.collection("users").doc(callerUid).get()];
            case 1:
                callerDoc = _b.sent();
                if (((_a = callerDoc.data()) === null || _a === void 0 ? void 0 : _a.role) !== "admin") {
                    throw new functions.https.HttpsError("permission-denied", "Must be an admin");
                }
                targetUid = data.targetUid;
                if (!targetUid)
                    throw new functions.https.HttpsError("invalid-argument", "Target UID required");
                now = new Date();
                expiresAt = new Date(now.getTime() + 14 * 24 * 60 * 60 * 1000);
                targetRef = db.collection("users").doc(targetUid);
                return [4 /*yield*/, targetRef.get()];
            case 2:
                targetDoc = _b.sent();
                if (!targetDoc.exists)
                    throw new functions.https.HttpsError("not-found", "User not found");
                prevState = targetDoc.data();
                // Update User
                return [4 /*yield*/, targetRef.update({
                        testerOverride: true,
                        testerExpiresAt: admin.firestore.Timestamp.fromDate(expiresAt),
                        testerGrantedBy: callerUid,
                        testerGrantedAt: admin.firestore.FieldValue.serverTimestamp(),
                        // We set 'isPro' to true so the app sees them as Pro immediately without complex logic changes
                        isPro: true
                    })];
            case 3:
                // Update User
                _b.sent();
                // Log Audit
                return [4 /*yield*/, db.collection("admin_audit").add({
                        action: "GRANT_TESTER_PRO",
                        adminUid: callerUid,
                        targetUserId: targetUid,
                        targetUserEmail: (prevState === null || prevState === void 0 ? void 0 : prevState.email) || "unknown",
                        prevState: {
                            testerOverride: (prevState === null || prevState === void 0 ? void 0 : prevState.testerOverride) || false,
                            isPro: (prevState === null || prevState === void 0 ? void 0 : prevState.isPro) || false
                        },
                        newState: {
                            testerOverride: true,
                            isPro: true,
                            expiresAt: expiresAt.toISOString()
                        },
                        createdAt: admin.firestore.FieldValue.serverTimestamp()
                    })];
            case 4:
                // Log Audit
                _b.sent();
                return [2 /*return*/, { success: true }];
        }
    });
}); });
exports.revokeTesterPro = functions.https.onCall(function (data, context) { return __awaiter(void 0, void 0, void 0, function () {
    var callerUid, callerDoc, targetUid, targetRef, targetDoc, prevState;
    var _a;
    return __generator(this, function (_b) {
        switch (_b.label) {
            case 0:
                if (!context.auth)
                    throw new functions.https.HttpsError("unauthenticated", "Must be logged in");
                callerUid = context.auth.uid;
                return [4 /*yield*/, db.collection("users").doc(callerUid).get()];
            case 1:
                callerDoc = _b.sent();
                if (((_a = callerDoc.data()) === null || _a === void 0 ? void 0 : _a.role) !== "admin") {
                    throw new functions.https.HttpsError("permission-denied", "Must be an admin");
                }
                targetUid = data.targetUid;
                if (!targetUid)
                    throw new functions.https.HttpsError("invalid-argument", "Target UID required");
                targetRef = db.collection("users").doc(targetUid);
                return [4 /*yield*/, targetRef.get()];
            case 2:
                targetDoc = _b.sent();
                if (!targetDoc.exists)
                    throw new functions.https.HttpsError("not-found", "User not found");
                prevState = targetDoc.data();
                return [4 /*yield*/, targetRef.update({
                        testerOverride: false,
                        testerExpiresAt: null,
                        isPro: false // Revert to standard
                    })];
            case 3:
                _b.sent();
                return [4 /*yield*/, db.collection("admin_audit").add({
                        action: "REVOKE_TESTER_PRO",
                        adminUid: callerUid,
                        targetUserId: targetUid,
                        targetUserEmail: (prevState === null || prevState === void 0 ? void 0 : prevState.email) || "unknown",
                        prevState: {
                            testerOverride: prevState === null || prevState === void 0 ? void 0 : prevState.testerOverride,
                            isPro: prevState === null || prevState === void 0 ? void 0 : prevState.isPro
                        },
                        newState: {
                            testerOverride: false,
                            isPro: false
                        },
                        createdAt: admin.firestore.FieldValue.serverTimestamp()
                    })];
            case 4:
                _b.sent();
                return [2 /*return*/, { success: true }];
        }
    });
}); });
exports.extendTesterPro = functions.https.onCall(function (data, context) { return __awaiter(void 0, void 0, void 0, function () {
    var callerUid, callerDoc, targetUid, targetRef, targetDoc, currentExpire, currentDate, newExpire;
    var _a, _b;
    return __generator(this, function (_c) {
        switch (_c.label) {
            case 0:
                if (!context.auth)
                    throw new functions.https.HttpsError("unauthenticated", "Must be logged in");
                callerUid = context.auth.uid;
                return [4 /*yield*/, db.collection("users").doc(callerUid).get()];
            case 1:
                callerDoc = _c.sent();
                if (((_a = callerDoc.data()) === null || _a === void 0 ? void 0 : _a.role) !== "admin") {
                    throw new functions.https.HttpsError("permission-denied", "Must be an admin");
                }
                targetUid = data.targetUid;
                targetRef = db.collection("users").doc(targetUid);
                return [4 /*yield*/, targetRef.get()];
            case 2:
                targetDoc = _c.sent();
                if (!targetDoc.exists)
                    throw new functions.https.HttpsError("not-found", "User not found");
                currentExpire = (_b = targetDoc.data()) === null || _b === void 0 ? void 0 : _b.testerExpiresAt;
                if (!currentExpire)
                    throw new functions.https.HttpsError("failed-precondition", "User is not currently a tester");
                currentDate = currentExpire.toDate();
                newExpire = new Date(currentDate.getTime() + 7 * 24 * 60 * 60 * 1000);
                return [4 /*yield*/, targetRef.update({
                        testerExpiresAt: admin.firestore.Timestamp.fromDate(newExpire)
                    })];
            case 3:
                _c.sent();
                return [4 /*yield*/, db.collection("admin_audit").add({
                        action: "EXTEND_TESTER_PRO",
                        adminUid: callerUid,
                        targetUserId: targetUid,
                        metadata: {
                            extendedByDays: 7,
                            oldExpire: currentDate.toISOString(),
                            newExpire: newExpire.toISOString()
                        },
                        createdAt: admin.firestore.FieldValue.serverTimestamp()
                    })];
            case 4:
                _c.sent();
                return [2 /*return*/, { success: true, newExpire: newExpire }];
        }
    });
}); });
exports.disableUser = functions.https.onCall(function (data, context) { return __awaiter(void 0, void 0, void 0, function () {
    var callerUid, callerDoc, targetUid, disabled;
    var _a;
    return __generator(this, function (_b) {
        switch (_b.label) {
            case 0:
                if (!context.auth)
                    throw new functions.https.HttpsError("unauthenticated", "Must be logged in");
                callerUid = context.auth.uid;
                return [4 /*yield*/, db.collection("users").doc(callerUid).get()];
            case 1:
                callerDoc = _b.sent();
                if (((_a = callerDoc.data()) === null || _a === void 0 ? void 0 : _a.role) !== "admin") {
                    throw new functions.https.HttpsError("permission-denied", "Must be an admin");
                }
                targetUid = data.targetUid, disabled = data.disabled;
                if (!targetUid)
                    throw new functions.https.HttpsError("invalid-argument", "Target UID required");
                // 1. Update Auth (requires Firebase Admin)
                return [4 /*yield*/, admin.auth().updateUser(targetUid, { disabled: disabled })];
            case 2:
                // 1. Update Auth (requires Firebase Admin)
                _b.sent();
                // 2. Update Firestore
                return [4 /*yield*/, db.collection("users").doc(targetUid).update({
                        disabled: !!disabled,
                        updatedAt: admin.firestore.FieldValue.serverTimestamp()
                    })];
            case 3:
                // 2. Update Firestore
                _b.sent();
                // 3. Log Audit
                return [4 /*yield*/, db.collection("admin_audit").add({
                        action: disabled ? "DISABLE_USER" : "ENABLE_USER",
                        adminUid: callerUid,
                        targetUserId: targetUid,
                        createdAt: admin.firestore.FieldValue.serverTimestamp()
                    })];
            case 4:
                // 3. Log Audit
                _b.sent();
                return [2 /*return*/, { success: true }];
        }
    });
}); });
/**
 * Scheduled Job: Auto-expire testers
 * Runs every 6 hours
 */
exports.autoExpireTesterPro = functions.pubsub.schedule('every 6 hours').onRun(function (context) { return __awaiter(void 0, void 0, void 0, function () {
    var now, expiredQuery, snapshot, batch, auditBatch, count, _i, _a, userDoc, userRef, auditRef;
    return __generator(this, function (_b) {
        switch (_b.label) {
            case 0:
                now = admin.firestore.Timestamp.now();
                expiredQuery = db.collection("users")
                    .where("testerOverride", "==", true)
                    .where("testerExpiresAt", "<", now);
                return [4 /*yield*/, expiredQuery.get()];
            case 1:
                snapshot = _b.sent();
                if (snapshot.empty) {
                    console.log("No expired testers found.");
                    return [2 /*return*/, null];
                }
                batch = db.batch();
                auditBatch = db.batch();
                count = 0;
                for (_i = 0, _a = snapshot.docs; _i < _a.length; _i++) {
                    userDoc = _a[_i];
                    userRef = db.collection("users").doc(userDoc.id);
                    batch.update(userRef, {
                        testerOverride: false,
                        testerExpiresAt: null,
                        isPro: false
                    });
                    auditRef = db.collection("admin_audit").doc();
                    auditBatch.set(auditRef, {
                        action: "AUTO_EXPIRE_TESTER_PRO",
                        adminUid: "SYSTEM",
                        targetUserId: userDoc.id,
                        targetUserEmail: userDoc.data().email || "unknown",
                        timestamp: admin.firestore.FieldValue.serverTimestamp()
                    });
                    count++;
                }
                return [4 /*yield*/, batch.commit()];
            case 2:
                _b.sent();
                return [4 /*yield*/, auditBatch.commit()];
            case 3:
                _b.sent();
                console.log("Expired ".concat(count, " tester accounts."));
                return [2 /*return*/, null];
        }
    });
}); });
