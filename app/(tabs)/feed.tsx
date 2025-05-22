import React, { useState, useEffect } from 'react';
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
import type { User } from 'firebase/auth';
import { getAuth } from 'firebase/auth';
// Import onSnapshot for real-time updates
import { getFirestore, collection, getDocs, doc, getDoc, onSnapshot, query, orderBy } from 'firebase/firestore';
import { useNavigation } from '@react-navigation/native';
import Post from '../../components/PostStyle'; // Corrected path to Post component

const db = getFirestore();

interface Post {
  id: string;
  userID: string;
  username?: string; // Add username
  userPhotoURL?: string; // Add userPhotoURL
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

const FeedHeader = ({ user }: { user: User | null }) => {
  const navigation = useNavigation();

  return (
    <View style={styles.topBar}>
      {user ? (
        <TouchableOpacity>
          <Image
            source={{ uri: user.photoURL || 'https://example.com/default-profile-pic.png' }}
            style={styles.profilePlaceholder}
          />
        </TouchableOpacity>
      ) : (
        <View style={styles.profilePlaceholder} />
      )}

      <TouchableOpacity style={styles.pingButton}>
        <Text style={styles.pingText}>P</Text>
      </TouchableOpacity>

      <TouchableOpacity onPress={() => navigation.navigate('DirectMessages' as never)} style={styles.dmButton}>
        <View style={styles.dmIconPlaceholder} />
      </TouchableOpacity>
    </View>
  );
};

const FeedScreen = () => {
  const [posts, setPosts] = useState<Post[]>([]);
  const [radius, setRadius] = useState(1); // miles
  const [loading, setLoading] = useState(false);
  const [initialLoading, setInitialLoading] = useState(true);
  const auth = getAuth();
  const user = auth.currentUser;

  const { coords } = useLocation(user?.uid, false);
  const navigation = useNavigation();

  // Use a ref or useCallback to ensure loadPosts function doesn't change unnecessarily
  // or wrap the logic directly in useEffect. For onSnapshot, it's best in useEffect.

  useEffect(() => {
    let unsubscribe: () => void; // Declare unsubscribe variable

    const setupPostsListener = async () => {
      if (!coords) {
        setLoading(false);
        setInitialLoading(false); // Make sure initialLoading is set to false even if no coords
        return;
      }

      if (initialLoading) setLoading(true);

      try {
        // Create a query to the 'posts' collection, ordered by creation time
        const postsCollectionRef = collection(db, 'posts');
        const q = query(postsCollectionRef, orderBy('createdAt', 'desc')); // Order by 'createdAt' to get newest first

        // Set up the real-time listener
        unsubscribe = onSnapshot(q, async (snapshot) => {
          const postsData: Post[] = [];

          for (const docSnapshot of snapshot.docs) {
            const postData = docSnapshot.data();

            if (
              !postData.location ||
              typeof postData.location.latitude !== 'number' ||
              typeof postData.location.longitude !== 'number'
            ) {
              continue;
            }

            const dist = calculateDistance(coords, postData.location);

            if (dist <= radius) {
              let username: string | undefined;
              let userPhotoURL: string | undefined;

              if (postData.userId) {
                const userDocRef = doc(db, 'users', postData.userId);
                const userDocSnap = await getDoc(userDocRef); // Still need a one-time fetch for user data
                if (userDocSnap.exists()) {
                  const userData = userDocSnap.data();
                  username = userData.username || userData.email || 'Anonymous';
                  userPhotoURL = userData.photoURL;
                }
              }

              postsData.push({
                id: docSnapshot.id,
                userID: postData.userId,
                username: username,
                userPhotoURL: userPhotoURL,
                content: postData.content || '',
                location: postData.location,
                distance: dist,
                timestamp: postData.createdAt ? postData.createdAt.toDate() : new Date(),
                createdAt: postData.createdAt,
              });
            }
          }

          // No need to sort here if orderBy('createdAt', 'desc') is used in query
          // postsData.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());

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

    // Cleanup function: Unsubscribe from the listener when the component unmounts or dependencies change
    return () => {
      if (unsubscribe) {
        unsubscribe();
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [radius, coords]); // Dependencies: Re-run effect if radius or coords change

  const handleRadiusChange = (value: number) => setRadius(value);

  const handleLike = (postId: string) => {
    console.log(`Liked post with ID: ${postId}`);
    // Implement your like logic here (e.g., update Firestore)
  };

  const handlePressUser = (userId: string) => {
    console.log(`Navigating to user profile for ID: ${userId}`);
    // Example navigation: navigation.navigate('UserProfile', { userId });
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <FeedHeader user={user} />

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

      {loading && (
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
          <ActivityIndicator size="large" color="#00C6FF" />
        </View>
      )}

      {!loading && (
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