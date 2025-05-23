// app/profile-viewer/[userId].tsx
import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  SafeAreaView,
  Pressable,
} from 'react-native';
import { useLocalSearchParams } from 'expo-router'; // Correctly import useLocalSearchParams
import { db } from '../../firebaseConfig';
import { doc, getDoc, collection, query, where, onSnapshot, orderBy } from 'firebase/firestore';
import Post from '../../components/PostStyle'; // Assuming PostStyle.tsx is your post component
import { calculateDistance } from '../../utils/calculateDistance';
import useLocation from '../../hooks/useLocation'; // Assuming this hook works without current auth user
import UserProfile from '../../components/UserProfile'; // Your existing UserProfile component

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

type ProfileTab = 'posts' | 'replies' | 'likes'; // Define tab types

export default function OtherUserProfileScreen() {
  // Get the userId directly from the dynamic route segment
  const { userId } = useLocalSearchParams<{ userId: string }>(); // TypeScript hint for params

  const [viewedUserProfileData, setViewedUserProfileData] = useState<{
    username?: string;
    bio?: string;
    firstName?: string;
    followingCount?: number;
    followerCount?: number;
    postCount?: number;
    photoURL?: string;
  } | null>(null);
  const [userPosts, setUserPosts] = useState<PostData[]>([]);
  const [userReplies, setUserReplies] = useState<PostData[]>([]);
  const [userLikes, setUserLikes] = useState<PostData[]>([]);
  const [activeTab, setActiveTab] = useState<ProfileTab>('posts');
  const [loadingProfile, setLoadingProfile] = useState(true);
  const [postsLoading, setPostsLoading] = useState(false);
  const [repliesLoading, setRepliesLoading] = useState(false);
  const [likesLoading, setLikesLoading] = useState(false);

  // You might still need current user's location for distance calculation,
  // even if not displaying their profile.
  const { coords: currentUserCoords } = useLocation(null, false); // Pass null or a dummy ID if location is global

  // 1. Fetch the viewed user's profile data
  useEffect(() => {
    async function fetchViewedUserProfileData() {
      if (!userId) { // Check userId directly
        setLoadingProfile(false);
        return;
      }
      try {
        const docRef = doc(db, 'users', userId); // Use userId directly
        const docSnap = await getDoc(docRef);

        if (docSnap.exists()) {
          setViewedUserProfileData(docSnap.data() as {
            username?: string;
            bio?: string;
            firstName?: string;
            followerCount: number;
            followingCount?: number;
            postCount?: number;
            photoURL?: string;
          });
        } else {
          setViewedUserProfileData(null);
          console.warn(`Profile data not found for UID: ${userId}`);
        }
        setLoadingProfile(false);
      } catch (error) {
        console.error('Error fetching viewed user profile data:', error);
        setViewedUserProfileData(null);
        setLoadingProfile(false);
      }
    }
    fetchViewedUserProfileData();
  }, [userId]); // Depend on userId

  // 2. Fetch the viewed user's content (posts, replies, likes)
  useEffect(() => {
    let unsubscribePosts: () => void;
    // let unsubscribeReplies: () => void;
    // let unsubscribeLikes: () => void;

    async function setupUserContentListeners() {
      if (!userId) { // Check userId directly
        setUserPosts([]);
        setUserReplies([]);
        setUserLikes([]);
        setPostsLoading(false);
        setRepliesLoading(false);
        setLikesLoading(false);
        return;
      }

      const authorUsername = viewedUserProfileData?.username || viewedUserProfileData?.firstName || 'User';
      const authorPhotoURL = viewedUserProfileData?.photoURL;

      // --- Posts Listener ---
      setPostsLoading(true);
      try {
        const postsRef = collection(db, 'posts');
        const qPosts = query(postsRef,
          where('userId', '==', userId), // Query for the specific userId
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
            let distance = currentUserCoords ? calculateDistance(currentUserCoords, postData.location) : undefined;
            fetchedPosts.push({
              id: docSnapshot.id,
              userID: postData.userId,
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

      // --- Replies Listener (Placeholder) ---
      setRepliesLoading(true);
      setUserReplies([]);
      setRepliesLoading(false);

      // --- Likes Listener (Placeholder) ---
      setLikesLoading(true);
      setUserLikes([]);
      setLikesLoading(false);
    }

    setupUserContentListeners();

    return () => {
      if (unsubscribePosts) unsubscribePosts();
      // if (unsubscribeReplies) unsubscribeReplies();
      // if (unsubscribeLikes) unsubscribeLikes();
    };
  }, [userId, viewedUserProfileData, currentUserCoords]);


  const handleLike = (postId: string) => {
    console.log(`Liked post with ID: ${postId} from other user's profile.`);
    // Implement your like logic here. You'll need the current authenticated user's ID
    // to perform the like action against this post.
  };

  const handleFollow = () => {
    console.log(`Follow button pressed for user: ${userId}`);
    // Implement follow/unfollow logic here
  };

  // Helper to render content for the active tab
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
              onPressUser={() => { /* Already on this user's profile, maybe do nothing or show toast */ }}
            />
          ))
        ) : (
          <View style={styles.contentPlaceholder}>
            <Text style={styles.placeholderText}>No posts yet.</Text>
          </View>
        );
      case 'replies':
        return repliesLoading ? (
          <ActivityIndicator size="small" color="#00C6FF" style={styles.tabContentLoader} />
        ) : (
          <View style={styles.contentPlaceholder}>
            <Text style={styles.placeholderText}>No replies yet.</Text>
          </View>
        );
      case 'likes':
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

  if (loadingProfile || !userId) { // Check userId directly
    return (
      <SafeAreaView style={styles.centered}>
        <ActivityIndicator size="large" />
        {!userId && <Text style={styles.description}>User ID not provided in route.</Text>}
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeContainer}>
      <ScrollView contentContainerStyle={styles.scrollContainer}>
        {/* UserProfile component for the header/stats */}
        <UserProfile
          profileData={viewedUserProfileData}
          viewedUserDisplayName={viewedUserProfileData?.username || viewedUserProfileData?.firstName || 'User'}
          isOwnProfile={false} // Crucially, this is always false for other users
          onFollow={handleFollow} // Provide the follow handler
          onEditProfile={undefined} // No edit button for other users
          onSettingsPress={undefined} // No settings button for other users
        />

        {/* Tab Navigator */}
        <View style={styles.tabContainer}>
          <Pressable
            style={[styles.tabButton, activeTab === 'posts' && styles.activeTabButton]}
            onPress={() => setActiveTab('posts')}
          >
            <Text style={[styles.tabButtonText, activeTab === 'posts' && styles.tabButtonText]}>Posts</Text>
          </Pressable>
          <Pressable
            style={[styles.tabButton, activeTab === 'replies' && styles.activeTabButton]}
            onPress={() => setActiveTab('replies')}
          >
            <Text style={[styles.tabButtonText, activeTab === 'replies' && styles.tabButtonText]}>Replies</Text>
          </Pressable>
          <Pressable
            style={[styles.tabButton, activeTab === 'likes' && styles.activeTabButton]}
            onPress={() => setActiveTab('likes')}
          >
            <Text style={[styles.tabButtonText, activeTab === 'likes' && styles.tabButtonText]}>Likes</Text>
          </Pressable>
        </View>

        {/* Tab Content */}
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