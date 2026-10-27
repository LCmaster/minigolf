import { collection, addDoc, getDocs, query, where, serverTimestamp, doc, deleteDoc, updateDoc, getDoc } from "firebase/firestore";
import { get } from "svelte/store";
import { user } from "$lib/user";
import { userProfile } from "$lib/stores/profile";
import { db } from "./firebase";

function buildCleanHoles(stage, controlPoints, blocks) {
  return JSON.parse(
    JSON.stringify([
      {
        par: stage.par || 2,
        controlPoints,
        blocks: blocks || [],
        groundFriction: stage.groundFriction ?? 0.75,
        groundRestitution: stage.groundRestitution ?? 0.05,
        wallFriction: stage.wallFriction ?? 0.75,
        wallRestitution: stage.wallRestitution ?? 0.95,
        tileColor: stage.tileColor || "#567D46",
        terrainMode: stage.terrainMode || "heightmap",
      },
    ])
  );
}

/**
 * Saves a level configuration and embeds its thumbnail in Firebase.
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
    const profile = get(userProfile);
    const author = profile?.nickname || "Unknown Player";
    const cleanHoles = buildCleanHoles(stage, controlPoints, blocks);

    const levelsCol = collection(db, "levels");
    const docRef = await addDoc(levelsCol, {
      uid,
      author,
      name: stage.name || "Untitled Level",
      theme: stage.theme || "clear",
      difficulty: "Custom",
      holes: cleanHoles,
      thumbnailUrl: thumbnailDataUrl,
      createdAt: serverTimestamp(),
    });
    return docRef.id;
  } catch (error) {
    console.error("Error saving level: ", error);
    throw error;
  }
}

/**
 * Updates an existing level configuration in Firebase.
 *
 * @param {string} levelId - Existing Level Document ID
 * @param {Object} stage - Stage config details
 * @param {Array} controlPoints - Spline track control points array
 * @param {string} thumbnailDataUrl - Data URL representation of thumbnail image
 * @param {Array} blocks - Custom obstacles array
 * @returns {Promise<string>} Updated level Firestore document ID
 */
export async function updateLevel(levelId, stage, controlPoints, thumbnailDataUrl, blocks = []) {
  try {
    const cleanHoles = buildCleanHoles(stage, controlPoints, blocks);
    const docRef = doc(db, "levels", levelId);

    await updateDoc(docRef, {
      name: stage.name || "Untitled Level",
      theme: stage.theme || "clear",
      holes: cleanHoles,
      thumbnailUrl: thumbnailDataUrl,
      updatedAt: serverTimestamp(),
    });
    return levelId;
  } catch (error) {
    console.error("Error updating level: ", error);
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
    querySnapshot.forEach((docSnap) => {
      levels.push({ id: docSnap.id, ...docSnap.data() });
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
    const docRef = doc(db, "levels", levelId);
    const docSnap = await getDoc(docRef);
    if (docSnap.exists()) {
      const data = docSnap.data();

      // Enforce privacy: Only the creator or an admin can load this level
      const currentUser = get(user);
      const profile = get(userProfile);
      const isAdmin = profile?.role === "super-admin" || profile?.role === "admin";

      if (!isAdmin && data.uid !== currentUser?.uid && !data.isOfficial) {
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
