import { db, storage } from "$lib/firebase";
import { collection, addDoc, getDocs, query, where, orderBy, serverTimestamp } from "firebase/firestore";
import { ref, uploadString, getDownloadURL } from "firebase/storage";

export async function saveLevel(uid, stage, blocks, thumbnailDataUrl) {
  try {
    // 1. Upload thumbnail
    const thumbnailId = crypto.randomUUID();
    const storageRef = ref(storage, `thumbnails/${uid}/${thumbnailId}.png`);
    await uploadString(storageRef, thumbnailDataUrl, 'data_url');
    const thumbnailUrl = await getDownloadURL(storageRef);

    // 2. Save document to firestore
    const levelsCol = collection(db, "levels");
    const docRef = await addDoc(levelsCol, {
      uid,
      name: stage.name || "Untitled Level",
      skybox: stage.skybox || "default",
      par: stage.par || 2,
      blocks,
      thumbnailUrl,
      createdAt: serverTimestamp()
    });
    return docRef.id;
  } catch (error) {
    console.error("Error saving level: ", error);
    throw error;
  }
}

export async function getMyLevels(uid) {
  try {
    const levelsCol = collection(db, "levels");
    const q = query(levelsCol, where("uid", "==", uid), orderBy("createdAt", "desc"));
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
