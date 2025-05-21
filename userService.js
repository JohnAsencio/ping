import { doc, setDoc, getDoc } from "firebase/firestore";
import { db } from "./firebaseConfig";

export function generateRandomUsername() {
  const randomNumber = Math.floor(100000 + Math.random() * 900000);
  return `user${randomNumber}`;
}

export async function createUserDoc(userId, data) {
  const userDocRef = doc(db, "users", userId);
  const userDocSnap = await getDoc(userDocRef);

  if (userDocSnap.exists()) {
    return;
  }

  const finalUsername = data.username || generateRandomUsername();

  await setDoc(userDocRef, {
    email: data.email,
    firstName: data.firstName || "",
    lastName: data.lastName || "",
    username: finalUsername,
    bio: "",
    followerCount: 0,
    followingCount: 0,
    postCount: 0,
    likes: 0,
    dob: data.dob || "",
    city: data.city || "",
    createdAt: data.createdAt || new Date(),
    profilePictureUrl: data.profilePictureUrl || ""
  });

  // Subcollections (followers, following, posts) will be created automatically
  // when you use `setDoc()` on their respective paths later, e.g.:
  // await setDoc(doc(db, "users", userId, "followers", otherUserId), { followedAt: new Date() });
}
