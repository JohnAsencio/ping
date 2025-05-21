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

import { getFirestore, collection, getDocs } from 'firebase/firestore';
import { useNavigation } from '@react-navigation/native';

const db = getFirestore();

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

  const loadPosts = async () => {
    if (!coords) {
      setLoading(false);
      return;
    }

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

  const handleLike = (postId: string) => {
    console.log(`Liked post with ID: ${postId}`);
  };

  const getRelativeTime = (date: Date): string => {
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
      if (count >= 1) {
        return `${count} ${interval.label}${count > 1 ? 's' : ''} ago`;
      }
    }
    return 'Just now';
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
            <View key={post.id} style={styles.postContainer}>
              <View style={styles.postHeader}>
                <View style={styles.userContainer}>
                  {/* Placeholder avatar - you can replace with real user avatar if available */}
                  <View style={styles.avatarPlaceholder} />
                  <Text style={styles.username}>{post.userID}</Text>
                </View>
                <Text style={styles.optionsPlaceholder}>...</Text>
              </View>

              <View style={styles.postContent}>
                <Text style={styles.postText}>{post.content}</Text>
              </View>

              <View style={styles.postInfo}>
                <Text style={styles.distancePlaceholder}>
                  {post.distance !== undefined ? `~ ${post.distance.toFixed(1)} miles away` : 'Distance unavailable'}
                </Text>
                <Text style={styles.timePlaceholder}>
                  {post.timestamp ? getRelativeTime(post.timestamp) : 'Time unavailable'}
                </Text>
              </View>

              <View style={styles.postActions}>
                <TouchableOpacity onPress={() => handleLike(post.id)} style={styles.likeButton}>
                  <View style={styles.iconPlaceholder} />
                  <Text style={styles.likeCount}>Like</Text>
                </TouchableOpacity>
              </View>
            </View>
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
  postContainer: {
    backgroundColor: 'white',
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
padding: 15,
},
postHeader: {
flexDirection: 'row',
justifyContent: 'space-between',
alignItems: 'center',
},
userContainer: {
flexDirection: 'row',
alignItems: 'center',
},
avatarPlaceholder: {
width: 30,
height: 30,
backgroundColor: '#BDBDBD',
borderRadius: 15,
marginRight: 10,
},
username: {
fontWeight: 'bold',
},
optionsPlaceholder: {
fontSize: 22,
fontWeight: 'bold',
color: '#BDBDBD',
},
postContent: {
marginVertical: 10,
},
postText: {
fontSize: 16,
color: '#212121',
},
postInfo: {
flexDirection: 'row',
justifyContent: 'space-between',
},
distancePlaceholder: {
fontSize: 14,
color: '#757575',
},
timePlaceholder: {
fontSize: 14,
color: '#757575',
},
postActions: {
marginTop: 10,
flexDirection: 'row',
},
likeButton: {
flexDirection: 'row',
alignItems: 'center',
},
iconPlaceholder: {
width: 20,
height: 20,
backgroundColor: '#BDBDBD',
borderRadius: 10,
marginRight: 8,
},
likeCount: {
fontSize: 14,
color: '#212121',
},
});

export default FeedScreen;
