import React, { useState, useEffect, useRef, useCallback } from 'react';
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
import { calculateDistance } from '../../utils/calculateDistance'; // Assuming this is correct and returns raw number
import useUserLocation from '../../hooks/useLocation'; // Using 'useUserLocation'
import type { User } from 'firebase/auth';
import { getAuth, onAuthStateChanged } from 'firebase/auth';
import { getFirestore, collection, doc, getDoc, onSnapshot, query, orderBy } from 'firebase/firestore';
import { useRouter } from 'expo-router';
import Post from '../../components/PostStyle'; // Post component will receive formatted distance string

const db = getFirestore(); // Initialize Firestore

interface Post {
  id: string;
  userID: string; // Consistent with Post component prop and your decision
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

interface UserProfileData {
  uid: string;
  username?: string;
  bio?: string;
  firstName?: string;
  followingCount?: number;
  followerCount?: number;
  postCount?: number;
  photoURL?: string;
}

const FeedHeader = ({ user, currentUserProfileData }: { user: User | null; currentUserProfileData: UserProfileData | null }) => {
  const router = useRouter();

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

const FeedScreen = () => {
  const [posts, setPosts] = useState<Post[]>([]);
  const [radius, setRadius] = useState(1);
  const [loadingPosts, setLoadingPosts] = useState(true);
  const [currentUserProfileData, setCurrentUserProfileData] = useState<UserProfileData | null>(null);
  const [isLoadingUserProfile, setIsLoadingUserProfile] = useState(true);
  const [firebaseUser, setFirebaseUser] = useState<User | null>(null);

  const auth = getAuth();

  // useUserLocation hook
  const { coords, loading: loadingLocation, error: locationError } = useUserLocation(firebaseUser?.uid, false);
  const router = useRouter();

  // Function to format the distance if it is < 0.1
  const formatDistanceForDisplay = (dist: number): number => {
    if (dist < 0.1 && dist >= 0) {
      return 0.1;
    }
    return dist;
  };

  const userCache = useRef(new Map<string, { username: string; photoURL?: string }>());

  const fetchUserProfile = useCallback(async (userId: string): Promise<{ username: string; photoURL?: string }> => {
    if (userCache.current.has(userId)) {
      return userCache.current.get(userId)!;
    }

    const userDocRef = doc(db, 'users', userId);
    try {
      const userDocSnap = await getDoc(userDocRef);
      let usernameToSet: string;
      let photoURLToSet: string | undefined;

      if (userDocSnap.exists()) {
        const userData = userDocSnap.data() as UserProfileData;
        usernameToSet = userData.username || userData.firstName || 'Anonymous';
        photoURLToSet = userData.photoURL;
      } else {
        usernameToSet = 'Anonymous';
      }

      const userDataForCache = { username: usernameToSet, photoURL: photoURLToSet };
      userCache.current.set(userId, userDataForCache);
      return userDataForCache;

    } catch (error) {
      console.error('Error fetching user profile for:', userId, error);
      const fallbackUserData = { username: 'Anonymous', photoURL: undefined };
      userCache.current.set(userId, fallbackUserData);
      return fallbackUserData;
    }
  }, []);

  // Effect to listen for Firebase auth state changes
  useEffect(() => {
    const unsubscribeAuth = onAuthStateChanged(auth, (user) => {
      setFirebaseUser(user);
      if (!user) {
        setCurrentUserProfileData(null);
        setIsLoadingUserProfile(false);
      }
    });

    return () => unsubscribeAuth();
  }, [auth]);

  // Effect to fetch current user's profile for the header
  useEffect(() => {
    const fetchCurrentUserProfileForHeader = async () => {
      setIsLoadingUserProfile(true);
      if (!firebaseUser?.uid) {
        setCurrentUserProfileData(null);
        setIsLoadingUserProfile(false);
        return;
      }
      try {
        const userDocRef = doc(db, 'users', firebaseUser.uid);
        const userDocSnap = await getDoc(userDocRef);
        if (userDocSnap.exists()) {
          const data = userDocSnap.data() as UserProfileData;
          setCurrentUserProfileData(data);
          userCache.current.set(firebaseUser.uid, {
            username: data.username || data.firstName || firebaseUser.displayName || 'User',
            photoURL: data.photoURL,
          });
        } else {
          setCurrentUserProfileData(null);
          userCache.current.set(firebaseUser.uid, {
            username: firebaseUser.displayName || 'User',
            photoURL: firebaseUser.photoURL || undefined,
          });
        }
      } catch (error) {
        console.error('Error fetching current user profile data for header:', error);
        setCurrentUserProfileData(null);
        userCache.current.set(firebaseUser.uid, {
          username: firebaseUser.displayName || 'User',
          photoURL: firebaseUser.photoURL || undefined,
        });
      } finally {
        setIsLoadingUserProfile(false);
      }
    };

    if (firebaseUser?.uid) {
      fetchCurrentUserProfileForHeader();
    } else if (firebaseUser === null) {
        setIsLoadingUserProfile(false);
    }
  }, [firebaseUser]);

  // Effect to set up real-time listener for posts
  useEffect(() => {
    let unsubscribe: (() => void) | null = null;

    const subscribeToPosts = async () => {
      // Only proceed if coords are available AND user profile loading is complete
      if (!coords || isLoadingUserProfile) {
        setLoadingPosts(false);
        return; // Exit early if prerequisites are not met
      }

      setLoadingPosts(true);

      try {
        const postsCollectionRef = collection(db, 'posts');
        const q = query(postsCollectionRef, orderBy('createdAt', 'desc'));

        unsubscribe = onSnapshot(q, async (snapshot) => {
          const rawPostsData: Omit<Post, 'username' | 'userPhotoURL'>[] = [];
          const uniqueUserIds = new Set<string>();

          for (const docSnapshot of snapshot.docs) {
            const postData = docSnapshot.data();
            const postId = docSnapshot.id;
            // Read from Firestore as 'userId' (lowercase d)
            const postAuthorIdFromFirestore = postData.userId; 

            if (
              !postData.location ||
              typeof postData.location.latitude !== 'number' ||
              typeof postData.location.longitude !== 'number'
            ) {
              continue; // Skip posts with invalid location data
            }

            const dist = calculateDistance(coords, postData.location);

            if (dist <= radius) {
              rawPostsData.push({
                id: postId,
                // Assign to Post.userID (capital D) for consistency with Post interface
                userID: postAuthorIdFromFirestore,
                content: postData.content || '',
                location: postData.location,
                distance: formatDistanceForDisplay(dist), // <--- Use the formatting function here
                timestamp: postData.createdAt ? postData.createdAt.toDate() : new Date(),
                createdAt: postData.createdAt,
              });
              if (postAuthorIdFromFirestore) {
                uniqueUserIds.add(postAuthorIdFromFirestore);
              }
            }
          }

          const userProfiles = await Promise.all(
            Array.from(uniqueUserIds).map(userId => fetchUserProfile(userId))
          );

          const userProfileMap = new Map<string, { username: string; photoURL?: string }>();
          Array.from(uniqueUserIds).forEach((userId, index) => {
            userProfileMap.set(userId, userProfiles[index]);
          });

          const enrichedPosts: Post[] = rawPostsData.map(post => {
            // Use Post.userID (capital D) when getting from map
            const userProfile = userProfileMap.get(post.userID);
            return {
              ...post,
              username: userProfile?.username || 'Anonymous',
              userPhotoURL: userProfile?.photoURL,
            };
          });

          enrichedPosts.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
          setPosts(enrichedPosts);
          setLoadingPosts(false);
        }, (error) => {
          console.error('Error listening to posts from Firestore:', error);
          setLoadingPosts(false);
        });

      } catch (err) {
        console.error('Error setting up posts listener:', err);
        setLoadingPosts(false);
      }
    };

    subscribeToPosts();

    return () => {
      if (unsubscribe) {
        unsubscribe(); // Unsubscribe from the Firestore listener
      }
    };
  }, [radius, coords, isLoadingUserProfile, fetchUserProfile]);

  const handleRadiusChange = (value: number) => setRadius(value);

  const handleLike = (postId: string) => {
    // Implement like functionality here, e.g., update Firestore
  };

  const handlePressUser = (userId: string) => {
    if (firebaseUser && userId === firebaseUser.uid) {
      router.push('/profile');
    } else {
      router.push(`/profile-viewer/${userId}`);
    }
  };

  // Determine overall loading state more accurately, including location loading
  const showOverallLoading = isLoadingUserProfile || loadingPosts || loadingLocation || firebaseUser === undefined;

  return (
    <SafeAreaView style={styles.safeArea}>
      <FeedHeader user={firebaseUser} currentUserProfileData={currentUserProfileData} />

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

      {showOverallLoading ? (
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
          <ActivityIndicator size="large" color="#00C6FF" />
          <Text style={{ marginTop: 10 }}>{
            firebaseUser === undefined ? 'Authenticating...' :
            loadingLocation ? 'Getting your location...' :
            isLoadingUserProfile ? 'Loading your profile...' :
            'Loading posts...'
          }</Text>
        </View>
      ) : (
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
              distance={post.distance} // <--- Pass the formatted string here
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