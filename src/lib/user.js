import { writable } from "svelte/store";
import { serverTimestamp } from "firebase/firestore";
import { db } from "./firebase";

// Svelte auth user store
export const user = writable(undefined);

/**
 * Fetches a user's profile from Firestore.
 * @param {string} uid - User ID
 * @returns {Promise<Object|null>} Profile data or null if not found
 */
export async function getUserProfile(uid) {
  try {
    const { doc, getDoc } = await import("firebase/firestore");
    const docRef = doc(db, "users", uid);
    const docSnap = await getDoc(docRef);
    if (docSnap.exists()) {
      return { id: docSnap.id, ...docSnap.data() };
    }
    return null;
  } catch (error) {
    console.error("Error fetching user profile: ", error);
    throw error;
  }
}

/**
 * Updates or creates a user's profile in Firestore.
 * @param {string} uid - User ID
 * @param {Object} data - Profile data to merge
 * @returns {Promise<void>}
 */
export async function updateUserProfile(uid, data) {
  try {
    const { doc, setDoc } = await import("firebase/firestore");
    const docRef = doc(db, "users", uid);
    // Use merge: true to update existing fields or create new document
    await setDoc(docRef, { ...data, updatedAt: serverTimestamp() }, { merge: true });
  } catch (error) {
    console.error("Error updating user profile: ", error);
    throw error;
  }
}
