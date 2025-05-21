import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { getDocs, getDoc, doc } from 'firebase/firestore';
import { db } from './firebaseConfig';
import { calculateDistance } from './utils/calculateDistance'; // we'll define this

export async function createPost({ userId, content, location }) {
  const post = {
    userId,
    content,
    location,
    createdAt: serverTimestamp(),
  };
  const docRef = await addDoc(collection(db, 'posts'), post);
  return docRef.id;
}


export const fetchPostsNearby = async (currentCoords, radiusInMiles = 1) => {
  const postsSnapshot = await getDocs(collection(db, 'posts'));
  const posts = [];

  for (const docSnap of postsSnapshot.docs) {
    const postData = docSnap.data();
    const postCoords = postData.location;
    const distance = postCoords
      ? calculateDistance(currentCoords, postCoords)
      : null;

    // Skip if no location or outside radius
    if (!distance || distance > radiusInMiles) continue;

    // Fetch username from user collection
    let username = 'Unknown';
    try {
      const userSnap = await getDoc(doc(db, 'users', postData.userId));
      username = userSnap.exists() ? userSnap.data().username : 'Unknown';
    } catch (err) {
      console.warn(`Could not fetch user for ID ${postData.userId}`);
    }

    posts.push({
      id: docSnap.id,
      username,
      text: postData.content,
      likes: postData.likes || 0,
      distance,
      timestamp: postData.createdAt?.toDate?.() || new Date(), // if using Firestore timestamp
    });
  }

  return posts;
};
