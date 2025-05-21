import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  SafeAreaView,
  ActivityIndicator,
  Image,
  TouchableOpacity,
} from 'react-native';
import Slider from '@react-native-community/slider';
import { calculateDistance } from '../../utils/calculateDistance';
import useLocation from '../../hooks/useLocation';
import type { User } from 'firebase/auth';
import { getAuth } from 'firebase/auth';

import { getFirestore, collection, getDocs } from 'firebase/firestore';
import { useNavigation } from '@react-navigation/native';

const db = getFirestore();

// Define post type
interface Post {
  id: string;
  userID: string;
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

// Header Component
const FeedHeader = ({ user }: { user: User | null }) => {
  const navigation = useNavigation();

  return (
    <View style={styles.headerContainer}>
      {user && (
        <Image
          source={{ uri: user.photoURL || 'https://example.com/default-profile-pic.png' }}
          style={styles.profilePic}
        />
      )}
      <Text style={styles.headerTitle}>Feed</Text>
      <TouchableOpacity onPress={() => navigation.navigate('DirectMessages' as never)}>
        <Text style={styles.dmButton}>DM</Text>
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

  // useLocation hook returns coords and locationLoading
  const { coords } = useLocation(user?.uid, false);

  // Fetch posts from Firestore and filter by radius
  const loadPosts = async () => {
    if (!coords) {
      setLoading(false);
      return;
    }

    // Only show loading spinner on initial load
    if (initialLoading) setLoading(true);

    try {
      const postsSnapshot = await getDocs(collection(db, 'posts'));
      const postsData: Post[] = [];

      for (const doc of postsSnapshot.docs) {
        const postData = doc.data();

        if (
          !postData.location ||
          typeof postData.location.latitude !== 'number' ||
          typeof postData.location.longitude !== 'number'
        )
          continue;

        const dist = calculateDistance(coords, postData.location);

        if (dist <= radius) {
          postsData.push({
            id: doc.id,
            userID: postData.userID || 'Unknown',
            content: postData.content || '',
            location: postData.location,
            distance: dist,
            timestamp: postData.createdAt ? postData.createdAt.toDate() : new Date(),
            createdAt: postData.createdAt,
          });
        }
      }

      postsData.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());

      setPosts(postsData);
    } catch (err) {
      console.error('Error loading posts from Firestore', err);
    } finally {
      setLoading(false);
      setInitialLoading(false);
    }
  };

  useEffect(() => {
    if (coords) {
      loadPosts();
    } else {
      setLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [radius, coords]);

  const handleRadiusChange = (value: number) => setRadius(value);

  const getRelativeTime = (date: Date) => {
    const now = new Date();
    const seconds = Math.round((now.getTime() - date.getTime()) / 1000);
    const intervals = [
      { label: 'year', seconds: 31536000 },
      { label: 'month', seconds: 2592000 },
      { label: 'day', seconds: 86400 },
      { label: 'hour', seconds: 3600 },
      { label: 'minute', seconds: 60 },
      { label: 'second', seconds: 1 },
    ];
    for (const interval of intervals) {
      const count = Math.floor(seconds / interval.seconds);
      if (count >= 1) return `${count} ${interval.label}${count > 1 ? 's' : ''} ago`;
    }
    return 'Just now';
  };

  if (loading && initialLoading) {
    return (
      <View style={[styles.container, { justifyContent: 'center', alignItems: 'center' }]}>
        <ActivityIndicator size="large" color="#00C6FF" />
      </View>
    );
  }

  if (!coords) {
    return (
      <View style={[styles.container, { justifyContent: 'center', alignItems: 'center' }]}>
        <Text>Waiting for location...</Text>
      </View>
    );
  }

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

      <ScrollView style={styles.container}>
        {posts.length === 0 ? (
          <Text style={{ textAlign: 'center', marginTop: 20 }}>No posts nearby.</Text>
        ) : (
          posts.map((post) => (
            <View key={post.id} style={styles.postContainer}>
              <View style={styles.postHeader}>
                <Text style={styles.username}>{post.userID}</Text>
                <Text style={styles.optionsPlaceholder}>...</Text>
              </View>
              <View style={styles.postContent}>
                <Text>{post.content}</Text>
              </View>
              <View style={styles.postInfo}>
                <Text>{`~ ${post.distance.toFixed(1)} miles away`}</Text>
                <Text>{getRelativeTime(post.timestamp)}</Text>
              </View>
            </View>
          ))
        )}
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#FAFAFA' },
  radiusContainer: { padding: 15, borderBottomWidth: 1, borderBottomColor: '#E0E0E0' },
  radiusLabel: { marginBottom: 10, fontWeight: 'bold', textAlign: 'center' },
  slider: { width: '100%', height: 40 },
  container: { flex: 1, padding: 10 },
  postContainer: { backgroundColor: 'white', marginBottom: 10, padding: 10, borderRadius: 5 },
  postHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 5 },
  username: { fontWeight: 'bold' },
  optionsPlaceholder: { fontSize: 18 },
  postContent: { marginBottom: 8 },
  postInfo: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    color: '#757575',
    fontSize: 12,
  },
  // Header styles
  headerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 15,
    paddingVertical: 10,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  profilePic: {
    width: 36,
    height: 36,
    borderRadius: 18,
    marginRight: 10,
  },
  headerTitle: {
    flex: 1,
    fontSize: 20,
    fontWeight: 'bold',
  },
  dmButton: {
    fontSize: 16,
    color: '#00C6FF',
    fontWeight: '600',
  },
});

export default FeedScreen;
