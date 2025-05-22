import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  SafeAreaView,
  ActivityIndicator,
  TouchableOpacity,
  Image,
} from 'react-native';
import Slider from '@react-native-community/slider';
import { calculateDistance } from '../../utils/calculateDistance';
import useLocation from '../../hooks/useLocation';
import type { User } from 'firebase/auth'; // Importing Firebase User type
import { getAuth } from 'firebase/auth';
import { getFirestore, collection, doc, getDoc, onSnapshot, query, orderBy } from 'firebase/firestore';
import { useRouter } from 'expo-router';
import Post from '../../components/PostStyle';

const db = getFirestore();

// Defining Post interface
interface Post {
  id: string;
  userID: string;
  username?: string;
  userPhotoURL?: string;
  content: string;
  location: {
    latitude: number;
    longitude: number;
  };
  createdAt?: {
    toDate: () => Date;
  };
  distance: number;
  timestamp: Date;
}

// UserProfileData interface (copied from your UserProfile component for consistency)
interface UserProfileData {
  username?: string;
  bio?: string;
  firstName?: string;
  followingCount?: number;
  followerCount?: number;
  postCount?: number;
  photoURL?: string;
}

// FeedHeader component
const FeedHeader = ({ user, currentUserProfileData }: { user: User | null; currentUserProfileData: UserProfileData | null }) => {
  const router = useRouter();

  // Prefer profileData for display, fall back to auth.user properties if profileData is null/empty
  const displayPhoto = currentUserProfileData?.photoURL || user?.photoURL;
  const displayName = currentUserProfileData?.username || currentUserProfileData?.firstName || user?.displayName || 'User';

  return (
    <View style={styles.topBar}>
      {user ? (
        <TouchableOpacity onPress={() => router.push('/profile')}>
          <Image
            source={{ uri: displayPhoto || `https://ui-avatars.com/api/?name=${encodeURIComponent(displayName)}` }}
            style={styles.profilePlaceholder}
          />
        </TouchableOpacity>
      ) : (
        <View style={styles.profilePlaceholder} />
      )}

      <TouchableOpacity style={styles.pingButton}>
        <Text style={styles.pingText}>P</Text>
      </TouchableOpacity>

      <TouchableOpacity style={styles.dmButton}>
        <View style={styles.dmIconPlaceholder} />
      </TouchableOpacity>
    </View>
  );
};

// FeedScreen component
const FeedScreen = () => {
  const [posts, setPosts] = useState<Post[]>([]);
  const [radius, setRadius] = useState(1);
  const [loading, setLoading] = useState(false);
  const [initialLoading, setInitialLoading] = useState(true);

  const auth = getAuth();
  const currentUser = auth.currentUser; // Get the current authenticated user

  // State for current user's profile data fetched from Firestore
  const [currentUserProfileData, setCurrentUserProfileData] = useState<UserProfileData | null>(null);
  const [isCurrentUserProfileLoading, setIsCurrentUserProfileLoading] = useState(true);

  const { coords } = useLocation(currentUser?.uid, false);
  const router = useRouter();

  // Cache for user data to avoid redundant fetches (for other users)
  const userCache = useRef(new Map<string, { username: string; photoURL?: string }>());

  // Effect to fetch current user's profile data from Firestore
  useEffect(() => {
    async function fetchCurrentUserProfile() {
      if (!currentUser?.uid) {
        setCurrentUserProfileData(null);
        setIsCurrentUserProfileLoading(false); // Done loading if no current user
        return;
      }
      try {
        const userDocRef = doc(db, 'users', currentUser.uid);
        const userDocSnap = await getDoc(userDocRef);
        if (userDocSnap.exists()) {
          setCurrentUserProfileData(userDocSnap.data() as UserProfileData);
        } else {
          setCurrentUserProfileData(null);
          console.warn(`Firestore user document not found for current user: ${currentUser.uid}`);
        }
      } catch (error) {
        console.error('Error fetching current user profile data:', error);
        setCurrentUserProfileData(null);
      } finally {
        setIsCurrentUserProfileLoading(false); // Always set to false after attempt
      }
    }

    fetchCurrentUserProfile();
    // Dependency: Re-run if currentUser object changes (e.g., login/logout)
  }, [currentUser]);

  // Effect to set up real-time listener for posts
  useEffect(() => {
    let unsubscribe: () => void;

    const setupPostsListener = async () => {
      // CRITICAL: Wait for both coordinates AND current user's profile data to be loaded
      // This ensures currentUserProfileData is ready when used for current user's posts.
      if (isCurrentUserProfileLoading || !coords) {
        setLoading(false); // Stop main loading if prerequisites aren't met
        setInitialLoading(false);
        return;
      }

      // Start main post loading only if prerequisites are met
      if (initialLoading) setLoading(true);

      try {
        const postsCollectionRef = collection(db, 'posts');
        const q = query(postsCollectionRef, orderBy('createdAt', 'desc'));

        unsubscribe = onSnapshot(q, async (snapshot) => {
          const postsData: Post[] = [];
          const userPromises: Promise<void>[] = [];

          for (const docSnapshot of snapshot.docs) {
            const postData = docSnapshot.data();

            if (
              !postData.location ||
              typeof postData.location.latitude !== 'number' ||
              typeof postData.location.longitude !== 'number'
            ) {
              continue; // Skip posts without valid location data
            }

            const dist = calculateDistance(coords, postData.location);

            if (dist <= radius) {
              const postId = docSnapshot.id;
              const postAuthorId = postData.userId;

              userPromises.push((async () => {
                let usernameToDisplay: string | undefined;
                let userPhotoURLToDisplay: string | undefined;

                if (postAuthorId) {
                  // --- FIX: Use currentUserProfileData if the author is the current user ---
                  if (currentUser && postAuthorId === currentUser.uid && currentUserProfileData) {
                    // If the post is by the CURRENTLY LOGGED-IN user, use the pre-fetched profile data from Firestore.
                    usernameToDisplay = currentUserProfileData.username || currentUserProfileData.firstName || 'Unknown User (Self)';
                    userPhotoURLToDisplay = currentUserProfileData.photoURL;

                    // Cache this data for consistency
                    userCache.current.set(postAuthorId, { username: usernameToDisplay, photoURL: userPhotoURLToDisplay });

                  } else {
                    // For other users, or if current user data isn't loaded yet (though this path should be rare now),
                    // use cache or fetch from Firestore.
                    if (userCache.current.has(postAuthorId)) {
                      const cachedUser = userCache.current.get(postAuthorId)!;
                      usernameToDisplay = cachedUser.username;
                      userPhotoURLToDisplay = cachedUser.photoURL;
                    } else {
                      const userDocRef = doc(db, 'users', postAuthorId);
                      const userDocSnap = await getDoc(userDocRef);
                      if (userDocSnap.exists()) {
                        const userData = userDocSnap.data();
                        usernameToDisplay = userData.username || userData.firstName || userData.email || 'Anonymous';
                        userPhotoURLToDisplay = userData.photoURL;
                        userCache.current.set(postAuthorId, { username: usernameToDisplay!, photoURL: userPhotoURLToDisplay });
                      } else {
                         usernameToDisplay = 'Anonymous';
                         console.log(`No user document found for ID: ${postAuthorId}`);
                      }
                    }
                  }
                } else {
                    usernameToDisplay = 'Anonymous';
                    console.log(`Post ID ${postId} has no associated userID.`);
                }

                postsData.push({
                  id: postId,
                  userID: postAuthorId,
                  username: usernameToDisplay,
                  userPhotoURL: userPhotoURLToDisplay,
                  content: postData.content || '',
                  location: postData.location,
                  distance: dist,
                  timestamp: postData.createdAt ? postData.createdAt.toDate() : new Date(),
                  createdAt: postData.createdAt,
                });
              })());
            }
          }

          await Promise.all(userPromises);
          postsData.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
          setPosts(postsData);
          setLoading(false);
          setInitialLoading(false);
        }, (error) => {
          console.error('Error listening to posts from Firestore', error);
          setLoading(false);
          setInitialLoading(false);
        });

      } catch (err) {
        console.error('Error setting up posts listener', err);
        setLoading(false);
        setInitialLoading(false);
      }
    };

    setupPostsListener();

    return () => {
      if (unsubscribe) {
        unsubscribe();
      }
    };
    // Dependencies: Re-run effect if radius, coords, currentUser, or currentUserProfileData changes
    // This ensures that when currentUserProfileData finishes loading, the posts re-render with correct names.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [radius, coords, currentUser, currentUserProfileData, isCurrentUserProfileLoading]);


  const handleRadiusChange = (value: number) => setRadius(value);

  const handleLike = (postId: string) => {
    console.log(`Liked post with ID: ${postId}`);
    // Implement your like logic here (e.g., update Firestore)
  };

  const handlePressUser = (userId: string) => {
    console.log(`Attempting to navigate to user profile for ID: ${userId}`);
    if (currentUser && userId === currentUser.uid) {
      console.log('Navigating to current user profile tab: /profile');
      router.push('/profile');
    } else {
      console.log('Navigating to other user profile viewer: /profile-viewer with ID:', userId);
      router.push({ pathname: '/profile-viewer/profile_viewer', params: { profileUserId: userId } });
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <FeedHeader user={currentUser} currentUserProfileData={currentUserProfileData} />

      <View style={styles.radiusContainer}>
        <Text style={styles.radiusLabel}>Show posts within {radius.toFixed(1)} miles</Text>
        <Slider
          style={styles.slider}
          minimumValue={0.1}
          maximumValue={5}
          step={0.1}
          value={radius}
          onValueChange={handleRadiusChange}
          thumbTintColor="#00C6FF"
          minimumTrackTintColor="#52FF7F"
          maximumTrackTintColor="#ccc"
        />
      </View>

      {/* Show loading while current user profile loads OR main posts are loading */}
      {(loading || isCurrentUserProfileLoading) && (
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
          <ActivityIndicator size="large" color="#00C6FF" />
        </View>
      )}

      {/* Only render content if both loading states are false */}
      {!loading && !isCurrentUserProfileLoading && (
        <ScrollView style={styles.container}>
          {posts.length === 0 && (
            <View style={{ padding: 20, alignItems: 'center' }}>
              <Text>No posts found within this radius.</Text>
            </View>
          )}

          {posts.map((post) => (
            <Post
              key={post.id}
              id={post.id}
              userID={post.userID}
              username={post.username}
              userPhotoURL={post.userPhotoURL}
              content={post.content}
              distance={post.distance}
              timestamp={post.timestamp}
              onLike={handleLike}
              onPressUser={handlePressUser}
            />
          ))}
        </ScrollView>
      )}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#FAFAFA',
  },
  topBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 15,
    paddingVertical: 10,
    backgroundColor: '#FAFAFA',
  },
  profilePlaceholder: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: '#BDBDBD',
  },
  pingButton: {
    backgroundColor: '#52FF7F',
    width: 30,
    height: 30,
    borderRadius: 15,
    justifyContent: 'center',
    alignItems: 'center',
  },
  pingText: {
    color: 'white',
    fontWeight: 'bold',
    fontSize: 18,
  },
  dmButton: {
    width: 30,
    height: 30,
    backgroundColor: '#BDBDBD',
    borderRadius: 15,
    justifyContent: 'center',
    alignItems: 'center',
  },
  dmIconPlaceholder: {
    width: 20,
    height: 20,
    backgroundColor: 'white',
  },
  radiusContainer: {
    padding: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
    alignItems: 'center',
    backgroundColor: '#FAFAFA',
  },
  radiusLabel: {
    marginBottom: 10,
    fontWeight: 'bold',
  },
  slider: {
    width: '80%',
    height: 40,
  },
  container: {
    flex: 1,
    backgroundColor: '#FAFAFA',
  },
});

export default FeedScreen;