import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  ActivityIndicator,
  SafeAreaView,
} from 'react-native';
import { auth, db } from '../../firebaseConfig';
import { useRouter } from 'expo-router';
import { onAuthStateChanged } from 'firebase/auth';
import { doc, getDoc, collection, query, where, onSnapshot, orderBy } from 'firebase/firestore';
import type { User as FirebaseAuthUser } from 'firebase/auth';
import { signOut } from 'firebase/auth';
import Post from '../../components/PostStyle';
import { calculateDistance } from '../../utils/calculateDistance';
import useLocation from '../../hooks/useLocation';
import UserProfile from '../../components/UserProfile';

interface PostData {
  id: string;
  userID: string;
  username: string;
  userPhotoURL?: string;
  content: string;
  location?: {
    latitude: number;
    longitude: number;
  };
  createdAt?: {
    toDate: () => Date;
  };
  timestamp: Date;
  distance?: number;
}

// Define tab types
type ProfileTab = 'posts' | 'replies' | 'likes';

export default function Profile() {
  const [currentUser, setCurrentUser] = useState<FirebaseAuthUser | null>(null);
  const [profileData, setProfileData] = useState<{
    username?: string;
    bio?: string;
    firstName?: string;
    followingCount?: number;
    followerCount?: number;
    postCount?: number;
    photoURL?: string;
  } | null>(null);
  const [userPosts, setUserPosts] = useState<PostData[]>([]);
  const [userReplies, setUserReplies] = useState<PostData[]>([]); // Keep state for replies
  const [userLikes, setUserLikes] = useState<PostData[]>([]);     // Keep state for likes
  const [activeTab, setActiveTab] = useState<ProfileTab>('posts');
  const [loading, setLoading] = useState(true);
  const [postsLoading, setPostsLoading] = useState(false);
  const [repliesLoading, setRepliesLoading] = useState(false); // Keep loading state for replies
  const [likesLoading, setLikesLoading] = useState(false);     // Keep loading state for likes

  const router = useRouter();
  const { coords } = useLocation(currentUser?.uid, false);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (authUser) => {
      setCurrentUser(authUser);
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    async function fetchProfileData() {
      if (!currentUser?.uid) {
        setProfileData(null);
        return;
      }
      try {
        const docRef = doc(db, 'users', currentUser.uid);
        const docSnap = await getDoc(docRef);

        if (docSnap.exists()) {
          setProfileData(docSnap.data() as {
            username?: string;
            bio?: string;
            firstName?: string;
            followerCount: number;
            followingCount?: number;
            postCount?: number;
            photoURL?: string;
          });
        } else {
          setProfileData(null);
          console.warn(`Profile data not found for current user UID: ${currentUser.uid}`);
        }
      } catch (error) {
        console.error('Error fetching profile data:', error);
        setProfileData(null);
      }
    }
    fetchProfileData();
  }, [currentUser]);

  useEffect(() => {
    let unsubscribePosts: () => void;
    let unsubscribeReplies: () => void; // Keep unsubscribe for replies
    let unsubscribeLikes: () => void;   // Keep unsubscribe for likes

    async function setupUserContentListeners() {
      if (!currentUser?.uid) {
        setUserPosts([]);
        setUserReplies([]); // Clear replies on no user
        setUserLikes([]);   // Clear likes on no user
        setPostsLoading(false);
        setRepliesLoading(false); // Reset replies loading
        setLikesLoading(false);   // Reset likes loading
        return;
      }

      const authorUsername = profileData?.username || profileData?.firstName || 'User';
      const authorPhotoURL = profileData?.photoURL;

      // --- Posts Listener ---
      setPostsLoading(true);
      try {
        const postsRef = collection(db, 'posts');
        const qPosts = query(postsRef,
          where('userId', '==', currentUser.uid),
          orderBy('createdAt', 'desc')
        );

        unsubscribePosts = onSnapshot(qPosts, async (snapshot) => {
          const fetchedPosts: PostData[] = [];
          for (const docSnapshot of snapshot.docs) {
            const postData = docSnapshot.data();
            if (
              !postData.location ||
              typeof postData.location.latitude !== 'number' ||
              typeof postData.location.longitude !== 'number'
            ) {
              continue;
            }
            let distance = coords ? calculateDistance(coords, postData.location) : undefined;
            fetchedPosts.push({
              id: docSnapshot.id,
              userID: currentUser.uid,
              username: authorUsername,
              userPhotoURL: authorPhotoURL,
              content: postData.content || '',
              location: postData.location,
              createdAt: postData.createdAt,
              timestamp: postData.createdAt ? postData.createdAt.toDate() : new Date(),
              distance: distance,
            });
          }
          setUserPosts(fetchedPosts);
          setPostsLoading(false);
        }, (error) => {
          console.error('Error listening to user posts:', error);
          setPostsLoading(false);
          setUserPosts([]);
        });
      } catch (error) {
        console.error('Error setting up user posts listener:', error);
        setPostsLoading(false);
        setUserPosts([]);
      }

      // --- Replies Listener (Logic commented out for now) ---
      setRepliesLoading(true);
      // try {
      //   const repliesRef = collection(db, 'posts');
      //   const qReplies = query(repliesRef,
      //     where('userId', '==', currentUser.uid),
      //     where('isReply', '==', true),
      //     orderBy('createdAt', 'desc')
      //   );
      //   unsubscribeReplies = onSnapshot(qReplies, async (snapshot) => {
      //     const fetchedReplies: PostData[] = [];
      //     for (const docSnapshot of snapshot.docs) {
      //       const postData = docSnapshot.data();
      //       let distance = coords && postData.location ? calculateDistance(coords, postData.location) : undefined;
      //       fetchedReplies.push({
      //         id: docSnapshot.id,
      //         userID: currentUser.uid,
      //         username: authorUsername,
      //         userPhotoURL: authorPhotoURL,
      //         content: postData.content || '',
      //         location: postData.location,
      //         createdAt: postData.createdAt,
      //         timestamp: postData.createdAt ? postData.createdAt.toDate() : new Date(),
      //         distance: distance,
      //       });
      //     }
      //     setUserReplies(fetchedReplies);
      //     setRepliesLoading(false);
      //   }, (error) => {
      //     console.error('Error listening to user replies:', error);
      //     setRepliesLoading(false);
      //     setUserReplies([]);
      //   });
      // } catch (error) {
      //   console.error('Error setting up user replies listener:', error);
      //   setRepliesLoading(false);
      //   setUserReplies([]);
      // }
      setUserReplies([]); // Manually clear replies if not fetching
      setRepliesLoading(false); // Set loading to false as no fetch is happening

      // --- Likes Listener (Logic commented out for now) ---
      setLikesLoading(true);
      // try {
      //   const userLikedPostsRef = collection(db, 'users', currentUser.uid, 'likedPosts');
      //   unsubscribeLikes = onSnapshot(userLikedPostsRef, async (snapshot) => {
      //     const likedPostIds: string[] = snapshot.docs.map(doc => doc.id);
      //     const fetchedLikes: PostData[] = [];

      //     for (const postId of likedPostIds) {
      //       const postDocRef = doc(db, 'posts', postId);
      //       const postDocSnap = await getDoc(postDocRef);
      //       if (postDocSnap.exists()) {
      //         const postData = postDocSnap.data();
      //         const likedPostAuthorDoc = await getDoc(doc(db, 'users', postData.userId));
      //         const likedPostAuthorData = likedPostAuthorDoc.exists() ? likedPostAuthorDoc.data() : {};

      //         let distance = coords && postData.location ? calculateDistance(coords, postData.location) : undefined;
      //         fetchedLikes.push({
      //           id: postDocSnap.id,
      //           userID: postData.userId,
      //           username: likedPostAuthorData.username || likedPostAuthorData.firstName || 'User',
      //           userPhotoURL: likedPostAuthorData.photoURL,
      //           content: postData.content || '',
      //           location: postData.location,
      //           createdAt: postData.createdAt,
      //           timestamp: postData.createdAt ? postData.createdAt.toDate() : new Date(),
      //           distance: distance,
      //         });
      //       }
      //     }
      //     setUserLikes(fetchedLikes);
      //     setLikesLoading(false);
      //   }, (error) => {
      //     console.error('Error listening to user likes:', error);
      //     setLikesLoading(false);
      //     setUserLikes([]);
      //   });
      // } catch (error) {
      //   console.error('Error setting up user likes listener:', error);
      //   setLikesLoading(false);
      //   setUserLikes([]);
      // }
      setUserLikes([]); // Manually clear likes if not fetching
      setLikesLoading(false); // Set loading to false as no fetch is happening
    }

    setupUserContentListeners();

    return () => {
      if (unsubscribePosts) unsubscribePosts();
      // if (unsubscribeReplies) unsubscribeReplies(); // No need to unsubscribe if not subscribed
      // if (unsubscribeLikes) unsubscribeLikes();     // No need to unsubscribe if not subscribed
    };
  }, [currentUser, profileData, coords]);

  const handleLike = (postId: string) => {
    console.log(`Liked post with ID: ${postId} from profile.`);
    // Implement your like logic here (e.g., update Firestore)
  };

  const handlePressUser = (userId: string) => {
    // Navigate to the dedicated 'OtherUserProfile' component
    if (userId != currentUser?.uid) {
    router.push({ pathname: '/profile-viewer/profile_viewer', params: { userId: userId } });
    }
  };

  const handleSignOut = async () => {
    try {
      await signOut(auth);
      router.replace('/login');
    } catch (error) {
      console.error('Error signing out:', error);
    }
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.centered}>
        <ActivityIndicator size="large" />
      </SafeAreaView>
    );
  }

  if (!currentUser || currentUser.isAnonymous) {
    return (
      <SafeAreaView style={styles.centered}>
        <Text style={styles.title}>Welcome!</Text>
        <Text style={styles.description}>Please sign in to view your profile.</Text>
        <Pressable style={styles.signInButton} onPress={() => router.push('/login')}>
          <Text style={styles.signInButtonText}>Sign In</Text>
        </Pressable>
      </SafeAreaView>
    );
  }

  const renderContentForTab = () => {
    switch (activeTab) {
      case 'posts':
        return postsLoading ? (
          <ActivityIndicator size="small" color="#00C6FF" style={styles.tabContentLoader} />
        ) : userPosts.length > 0 ? (
          userPosts.map((post) => (
            <Post
              key={post.id}
              id={post.id}
              userID={post.userID}
              username={post.username}
              userPhotoURL={post.userPhotoURL}
              content={post.content}
              location={post.location}
              distance={post.distance}
              timestamp={post.timestamp}
              onLike={handleLike}
              onPressUser={() => handlePressUser(post.userID)}
            />
          ))
        ) : (
          <View style={styles.contentPlaceholder}>
            <Text style={styles.placeholderText}>No posts yet.</Text>
          </View>
        );
      case 'replies':
        // Keep repliesLoading and the placeholder for visualization
        return repliesLoading ? (
          <ActivityIndicator size="small" color="#00C6FF" style={styles.tabContentLoader} />
        ) : (
          <View style={styles.contentPlaceholder}>
            <Text style={styles.placeholderText}>No replies yet.</Text>
          </View>
        );
      case 'likes':
        // Keep likesLoading and the placeholder for visualization
        return likesLoading ? (
          <ActivityIndicator size="small" color="#00C6FF" style={styles.tabContentLoader} />
        ) : (
          <View style={styles.contentPlaceholder}>
            <Text style={styles.placeholderText}>No liked posts yet.</Text>
          </View>
        );
      default:
        return null;
    }
  };

  return (
    <SafeAreaView style={styles.safeContainer}>
      <ScrollView contentContainerStyle={styles.scrollContainer}>
        <UserProfile
          profileData={profileData}
          viewedUserDisplayName={currentUser?.displayName || ''}
          isOwnProfile={true}
          onEditProfile={() => console.log('Edit Profile pressed')}
          onFollow={undefined}
          onSettingsPress={handleSignOut}
        />

        {/* Tab Navigator */}
        <View style={styles.tabContainer}>
          <Pressable
            style={[styles.tabButton, activeTab === 'posts' && styles.activeTabButton]}
            onPress={() => setActiveTab('posts')}
          >
            <Text style={[styles.tabButtonText, activeTab === 'posts' && styles.activeTabButtonText]}>Posts</Text>
          </Pressable>
          <Pressable
            style={[styles.tabButton, activeTab === 'replies' && styles.activeTabButton]}
            onPress={() => setActiveTab('replies')}
          >
            <Text style={[styles.tabButtonText, activeTab === 'replies' && styles.activeTabButtonText]}>Replies</Text>
          </Pressable>
          <Pressable
            style={[styles.tabButton, activeTab === 'likes' && styles.activeTabButton]}
            onPress={() => setActiveTab('likes')}
          >
            <Text style={[styles.tabButtonText, activeTab === 'likes' && styles.activeTabButtonText]}>Likes</Text>
          </Pressable>
        </View>

        {/* Tab Content - This will render the posts based on the active tab */}
        <View style={styles.tabContent}>
          {renderContentForTab()}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeContainer: {
    flex: 1,
    backgroundColor: '#FAFAFA',
  },
  scrollContainer: {
    paddingBottom: 100,
    alignItems: 'center',
    backgroundColor: '#FAFAFA',
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
    backgroundColor: '#FAFAFA',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 10,
    color: '#222',
  },
  description: {
    fontSize: 16,
    color: '#555',
    textAlign: 'center',
    marginBottom: 20,
  },
  signInButton: {
    backgroundColor: '#52FF7F',
    paddingVertical: 12,
    paddingHorizontal: 32,
    borderRadius: 8,
  },
  signInButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  tabContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    width: '100%',
    borderBottomWidth: 1,
    borderColor: '#E0E0E0',
    backgroundColor: '#FAFAFA',
  },
  tabButton: {
    paddingVertical: 12,
    paddingHorizontal: 15,
    borderBottomWidth: 2,
    borderColor: 'transparent',
    flex: 1,
    alignItems: 'center',
  },
  activeTabButton: {
    borderColor: '#52FF7F',
  },
  tabButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#666',
  },
  activeTabButtonText: {
    color: '#222',
  },
  tabContent: {
    width: '100%',
  },
  tabContentLoader: {
    marginTop: 20,
    alignSelf: 'center',
  },
  contentPlaceholder: {
    marginTop: 20,
    alignItems: 'center',
    padding: 40,
    borderColor: '#ddd',
    borderWidth: 1,
    borderRadius: 12,
    backgroundColor: '#fafafa',
    width: '90%',
    alignSelf: 'center',
  },
  placeholderText: {
    color: '#999',
  },
});