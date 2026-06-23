import { collection, addDoc, getDocs, query, where, serverTimestamp, doc, deleteDoc, updateDoc, writeBatch, getDoc } from "firebase/firestore";
import { get } from "svelte/store";
import { user } from "$lib/user";
import { userProfile } from "$lib/stores/profile";
import { db } from "./firebase";

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
 * @param {string} difficulty - Campaign difficulty
 * @param {string} thumbnailUrl - Inherited thumbnail URL
 * @param {Array} sourceLevelIds - Array of original level IDs used in this campaign
 * @returns {Promise<string>} Saved campaign Firestore document ID
 */
export async function saveCampaign(uid, name, theme, difficulty, thumbnailUrl, sourceLevelIds = [], isOfficial = false) {
  try {
    const profile = get(userProfile);
    const author = profile?.nickname || "Unknown Player";
    
    const campaignsCol = collection(db, "campaigns");
    const campaignDocRef = doc(campaignsCol);
    
    const batch = writeBatch(db);
    batch.set(campaignDocRef, {
      uid,
      author,
      name: name || "Untitled Campaign",
      theme: theme || "clear",
      difficulty: difficulty || "Normal",
      isOfficial,
      levelIds: sourceLevelIds,
      totalHoles: sourceLevelIds.length,
      thumbnailUrl,
      createdAt: serverTimestamp()
    });

    sourceLevelIds.forEach(levelId => {
      const levelRef = doc(db, "levels", levelId);
      batch.update(levelRef, { campaignId: campaignDocRef.id });
    });

    await batch.commit();
    return campaignDocRef.id;
  } catch (error) {
    console.error("Error saving campaign: ", error);
    throw error;
  }
}

/**
 * Updates an existing bundled campaign in Firebase.
 *
 * @param {string} campaignId - Campaign Document ID
 * @param {string} name - Campaign name
 * @param {string} theme - Campaign theme
 * @param {string} difficulty - Campaign difficulty
 * @param {string} thumbnailUrl - Inherited thumbnail URL
 * @param {Array} sourceLevelIds - Array of original level IDs used in this campaign
 * @param {boolean} isOfficial - Whether the campaign is official
 * @returns {Promise<void>}
 */
export async function updateCampaign(campaignId, name, theme, difficulty, thumbnailUrl, sourceLevelIds = [], isOfficial = false) {
  try {
    const campaignRef = doc(db, "campaigns", campaignId);
    const campaignSnap = await getDoc(campaignRef);
    if (!campaignSnap.exists()) throw new Error("Campaign not found");
    
    const oldLevelIds = campaignSnap.data().levelIds || [];
    
    const batch = writeBatch(db);
    batch.update(campaignRef, {
      name: name || "Untitled Campaign",
      theme: theme || "clear",
      difficulty: difficulty || "Normal",
      isOfficial,
      levelIds: sourceLevelIds,
      totalHoles: sourceLevelIds.length,
      thumbnailUrl,
      updatedAt: serverTimestamp()
    });

    oldLevelIds.forEach(levelId => {
      if (!sourceLevelIds.includes(levelId)) {
        const levelRef = doc(db, "levels", levelId);
        batch.update(levelRef, { campaignId: null });
      }
    });

    sourceLevelIds.forEach(levelId => {
      if (!oldLevelIds.includes(levelId)) {
        const levelRef = doc(db, "levels", levelId);
        batch.update(levelRef, { campaignId: campaignId });
      }
    });

    await batch.commit();
  } catch (error) {
    console.error("Error updating campaign: ", error);
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
 * Fetches all official campaigns.
 *
 * @returns {Promise<Array>} List of official campaigns
 */
export async function getOfficialCampaigns() {
  try {
    const q = query(collection(db, "campaigns"), where("isOfficial", "==", true));
    const querySnapshot = await getDocs(q);
    const campaigns = [];
    querySnapshot.forEach((docSnap) => {
      campaigns.push({ id: docSnap.id, ...docSnap.data(), isCampaign: true });
    });
    return campaigns;
  } catch (error) {
    console.error("Error getting official campaigns: ", error);
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

/**
 * Fetches all campaigns belonging to a specific user.
 *
 * @param {string} uid - User ID
 * @returns {Promise<Array>} List of user campaigns
 */
export async function getCampaigns(uid) {
  try {
    const q = query(collection(db, "campaigns"), where("uid", "==", uid));
    const querySnapshot = await getDocs(q);
    const campaigns = [];
    querySnapshot.forEach((docSnap) => {
      campaigns.push({ id: docSnap.id, ...docSnap.data(), isCampaign: true });
    });
    return campaigns;
  } catch (error) {
    console.error("Error getting campaigns: ", error);
    throw error;
  }
}

/**
 * Fetches a specific campaign by document ID.
 *
 * @param {string} campaignId - Campaign Document ID
 * @returns {Promise<Object>} Campaign data
 */
export async function getCampaign(campaignId) {
  try {
    const docRef = doc(db, "campaigns", campaignId);
    const docSnap = await getDoc(docRef);
    if (docSnap.exists()) {
      const data = docSnap.data();
      const currentUser = get(user);
      const profile = get(userProfile);
      const isAdmin = profile?.role === 'super-admin' || profile?.role === 'admin';
      
      if (!isAdmin && data.uid !== currentUser?.uid && !data.isOfficial) {
        throw new Error("You do not have permission to view this campaign.");
      }
      
      return { id: docSnap.id, ...data, isCampaign: true };
    } else {
      throw new Error("No such campaign found!");
    }
  } catch (error) {
    console.error("Error fetching campaign: ", error);
    throw error;
  }
}

/**
 * Deletes a campaign, optionally deleting its levels.
 *
 * @param {string} campaignId - Campaign Document ID
 * @param {boolean} deleteLevels - Whether to delete the bundled levels permanently
 * @returns {Promise<void>}
 */
export async function deleteCampaign(campaignId, deleteLevels = false) {
  try {
    const campaignRef = doc(db, "campaigns", campaignId);
    const campaignSnap = await getDoc(campaignRef);
    if (!campaignSnap.exists()) return;
    
    const levelIds = campaignSnap.data().levelIds || [];
    const batch = writeBatch(db);
    
    levelIds.forEach(levelId => {
      const levelRef = doc(db, "levels", levelId);
      if (deleteLevels) {
        batch.delete(levelRef);
      } else {
        batch.update(levelRef, { campaignId: null });
      }
    });
    
    batch.delete(campaignRef);
    await batch.commit();
  } catch (error) {
    console.error("Error deleting campaign: ", error);
    throw error;
  }
}
