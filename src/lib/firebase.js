import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore, collection, addDoc, getDocs, query, where, serverTimestamp, doc, deleteDoc } from "firebase/firestore";
import { get } from "svelte/store";
import { user } from "$lib/user";
import { userProfile } from "$lib/stores/profile";
import {
  PUBLIC_FIREBASE_API_KEY,
  PUBLIC_FIREBASE_AUTH_DOMAIN,
  PUBLIC_FIREBASE_PROJECT_ID,
  PUBLIC_FIREBASE_STORAGE_BUCKET,
  PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  PUBLIC_FIREBASE_APP_ID
} from "$env/static/public";

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: PUBLIC_FIREBASE_API_KEY,
  authDomain: PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: PUBLIC_FIREBASE_APP_ID
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);

/**
 * Saves a level configuration and upload its thumbnail to Firebase.
 *
 * @param {string} uid - User ID
 * @param {Object} stage - Stage config details
 * @param {Array} controlPoints - Spline track control points array
 * @param {string} thumbnailDataUrl - Data URL representation of thumbnail image
 * @param {Array} blocks - Custom obstacles array
 * @returns {Promise<string>} Saved level Firestore document ID
 */
export async function saveLevel(uid, stage, controlPoints, thumbnailDataUrl, blocks = []) {
  try {
    // We now bypass Storage entirely and embed the thumbnail data directly.
    let thumbnailUrl = thumbnailDataUrl;
    
    const profile = get(userProfile);
    const author = profile?.nickname || "Unknown Player";
    
    // Save document to firestore
    const levelsCol = collection(db, "levels");
    const cleanHoles = JSON.parse(JSON.stringify([
      {
        par: stage.par || 2,
        controlPoints,
        blocks
      }
    ]));

    const docRef = await addDoc(levelsCol, {
      uid,
      author,
      name: stage.name || "Untitled Level",
      theme: stage.theme || "clear",
      difficulty: "Custom",
      holes: cleanHoles,
      thumbnailUrl,
      createdAt: serverTimestamp()
    });
    return docRef.id;
  } catch (error) {
    console.error("Error saving level: ", error);
    throw error;
  }
}

/**
 * Saves a bundled campaign to Firebase.
 *
 * @param {string} uid - User ID
 * @param {string} name - Campaign name
 * @param {string} theme - Campaign theme
 * @param {string} thumbnailUrl - Inherited thumbnail URL
 * @param {Array} holes - Array of holes from selected levels
 * @param {Array} sourceLevelIds - Array of original level IDs used in this campaign
 * @returns {Promise<string>} Saved campaign Firestore document ID
 */
export async function saveCampaign(uid, name, theme, thumbnailUrl, holes, sourceLevelIds = []) {
  try {
    const profile = get(userProfile);
    const author = profile?.nickname || "Unknown Player";
    
    const levelsCol = collection(db, "levels");
    const cleanHoles = JSON.parse(JSON.stringify(holes));
    const docRef = await addDoc(levelsCol, {
      uid,
      author,
      name: name || "Untitled Campaign",
      theme: theme || "clear",
      difficulty: "Campaign",
      isCampaign: true,
      sourceLevelIds,
      holes: cleanHoles,
      thumbnailUrl,
      createdAt: serverTimestamp()
    });
    return docRef.id;
  } catch (error) {
    console.error("Error saving campaign: ", error);
    throw error;
  }
}

/**
 * Fetches all levels belonging to a specific user.
 *
 * @param {string} uid - User ID
 * @returns {Promise<Array>} List of user levels
 */
export async function getMyLevels(uid) {
  try {
    const levelsCol = collection(db, "levels");
    const q = query(levelsCol, where("uid", "==", uid));
    const querySnapshot = await getDocs(q);
    const levels = [];
    querySnapshot.forEach((doc) => {
      levels.push({ id: doc.id, ...doc.data() });
    });
    return levels;
  } catch (error) {
    console.error("Error getting levels: ", error);
    throw error;
  }
}

/**
 * Fetches a specific level by document ID.
 *
 * @param {string} levelId - Level Document ID
 * @returns {Promise<Object>} Level data
 */
export async function getLevel(levelId) {
  try {
    const { doc, getDoc } = await import("firebase/firestore");
    const docRef = doc(db, "levels", levelId);
    const docSnap = await getDoc(docRef);
    if (docSnap.exists()) {
      const data = docSnap.data();
      
      // Enforce privacy: Only the creator or an admin can load this level
      const currentUser = get(user);
      const profile = get(userProfile);
      const isAdmin = profile?.role === 'super-admin' || profile?.role === 'admin';
      
      if (!isAdmin && data.uid !== currentUser?.uid) {
        throw new Error("You do not have permission to view this level.");
      }
      
      return { id: docSnap.id, ...data };
    } else {
      throw new Error("No such level found!");
    }
  } catch (error) {
    console.error("Error fetching level: ", error);
    throw error;
  }
}

/**
 * Deletes a specific level by document ID.
 *
 * @param {string} levelId - Level Document ID
 * @returns {Promise<void>}
 */
export async function deleteLevel(levelId) {
  try {
    const docRef = doc(db, "levels", levelId);
    await deleteDoc(docRef);
  } catch (error) {
    console.error("Error deleting level: ", error);
    throw error;
  }
}
