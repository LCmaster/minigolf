import { collection, getDocs, query, where, serverTimestamp, doc, writeBatch, getDoc } from "firebase/firestore";
import { get } from "svelte/store";
import { user } from "$lib/user";
import { userProfile } from "$lib/stores/profile";
import { db } from "./firebase";

/**
 * Saves a bundled campaign to Firebase.
 *
 * @param {string} uid - User ID
 * @param {string} name - Campaign name
 * @param {string} theme - Campaign theme
 * @param {string} difficulty - Campaign difficulty
 * @param {string} thumbnailUrl - Inherited thumbnail URL
 * @param {Array} sourceLevelIds - Array of original level IDs used in this campaign
 * @param {string} visibility - Visibility status of the campaign ("private" or "public")
 * @param {boolean} isOfficial - Whether the campaign is official
 * @param {number} totalPar - Total par value of all levels in the campaign
 * @returns {Promise<string>} Saved campaign Firestore document ID
 */
export async function saveCampaign(uid, name, theme, difficulty, thumbnailUrl, sourceLevelIds = [], visibility = "private", isOfficial = false, totalPar = 0) {
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
      visibility,
      isOfficial,
      levelIds: sourceLevelIds,
      totalHoles: sourceLevelIds.length,
      totalPar,
      thumbnailUrl,
      createdAt: serverTimestamp()
    });

    sourceLevelIds.forEach(levelId => {
      const levelRef = doc(db, "levels", levelId);
      batch.update(levelRef, { campaignId: campaignDocRef.id, isOfficial, visibility });
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
 * @param {string} visibility - Visibility status of the campaign ("private" or "public")
 * @param {boolean} isOfficial - Whether the campaign is official
 * @param {number} totalPar - Total par value of all levels in the campaign
 * @returns {Promise<void>}
 */
export async function updateCampaign(campaignId, name, theme, difficulty, thumbnailUrl, sourceLevelIds = [], visibility = "private", isOfficial = false, totalPar = 0) {
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
      visibility,
      isOfficial,
      levelIds: sourceLevelIds,
      totalHoles: sourceLevelIds.length,
      totalPar,
      thumbnailUrl,
      updatedAt: serverTimestamp()
    });

    oldLevelIds.forEach(levelId => {
      if (!sourceLevelIds.includes(levelId)) {
        const levelRef = doc(db, "levels", levelId);
        batch.update(levelRef, { campaignId: null, isOfficial: false, visibility: "private" });
      }
    });

    sourceLevelIds.forEach(levelId => {
      if (!oldLevelIds.includes(levelId)) {
        const levelRef = doc(db, "levels", levelId);
        batch.update(levelRef, { campaignId: campaignId, isOfficial, visibility });
      } else if (isOfficial !== campaignSnap.data().isOfficial || visibility !== campaignSnap.data().visibility) {
        // If the official status or visibility changed, update existing bundled levels too
        const levelRef = doc(db, "levels", levelId);
        batch.update(levelRef, { isOfficial, visibility });
      }
    });

    await batch.commit();
  } catch (error) {
    console.error("Error updating campaign: ", error);
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
 * Fetches all official campaigns.
 *
 * @returns {Promise<Array>} List of official campaigns
 */
export async function getOfficialCampaigns() {
  try {
    const q = query(
      collection(db, "campaigns"), 
      where("isOfficial", "==", true),
      where("visibility", "==", "public")
    );
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
 * Unbundles a specific level from a campaign.
 *
 * @param {string} campaignId - Campaign Document ID
 * @param {string} levelId - Level Document ID
 * @returns {Promise<void>}
 */
export async function unbundleLevelFromCampaign(campaignId, levelId) {
  try {
    const campaignRef = doc(db, "campaigns", campaignId);
    const levelRef = doc(db, "levels", levelId);
    
    // Fetch campaign to get current levelIds
    const campaignSnap = await getDoc(campaignRef);
    if (!campaignSnap.exists()) throw new Error("Campaign not found");
    
    const campaignData = campaignSnap.data();
    const newLevelIds = (campaignData.levelIds || []).filter(id => id !== levelId);
    
    const batch = writeBatch(db);
    batch.update(campaignRef, { 
      levelIds: newLevelIds,
      totalHoles: newLevelIds.length 
    });
    batch.update(levelRef, { campaignId: null });
    
    await batch.commit();
  } catch (error) {
    console.error("Error unbundling level: ", error);
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
