import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Image,
  ScrollView,
  Pressable,
  ActivityIndicator,
  Dimensions,
  SafeAreaView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { auth, db } from '../../firebaseConfig'; // make sure db is your Firestore instance
import { useRouter, useLocalSearchParams } from 'expo-router';
import { onAuthStateChanged } from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';
import type { User } from 'firebase/auth';
import { signOut } from 'firebase/auth';  // add this import

export default function Profile() {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [viewedUser, setViewedUser] = useState<User | null>(null);
  const [profileData, setProfileData] = useState<{ username?: string; 
                                                   bio?: string; 
                                                   firstName?: string;
                                                   followingCount?: number;
                                                   followerCount?: number;
                                                   postCount?: number;
                                                  } | null>(null);
  const [loading, setLoading] = useState(true);

  const router = useRouter();
  const { profileUserId } = useLocalSearchParams();

  // Auth state listener
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (authUser) => {
      setCurrentUser(authUser);
      setLoading(false);

      if (profileUserId && authUser?.uid !== profileUserId) {
        setViewedUser({ ...authUser, uid: profileUserId } as User); // Fake viewedUser with uid only
      } else {
        setViewedUser(authUser);
      }
    });

    return () => unsubscribe();
  }, [profileUserId]);

  // Fetch profile data from Firestore for viewedUser
  useEffect(() => {
    async function fetchProfileData() {
      if (!viewedUser?.uid) {
        setProfileData(null);
        return;
      }

      try {
        const docRef = doc(db, 'users', viewedUser.uid);
        const docSnap = await getDoc(docRef);

        if (docSnap.exists()) {
          setProfileData(docSnap.data() as 
          { username?: string; 
            bio?: string; 
            firstName?: string;
            followerCount: number;
            followingCount?: number;
            postCount?: number
          });

        } else {
          setProfileData(null);
        }
      } catch (error) {
        console.error('Error fetching profile data:', error);
        setProfileData(null);
      }
    }

    fetchProfileData();
  }, [viewedUser]);

  const isOwnProfile = currentUser?.uid === viewedUser?.uid;

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

  if (!viewedUser) {
    return (
      <SafeAreaView style={styles.centered}>
        <Text style={styles.title}>User not found</Text>
        <Text style={styles.description}>The profile could not be loaded.</Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeContainer}>
      <ScrollView contentContainerStyle={styles.scrollContainer}>
        <View style={styles.headerBar}>
          <Text style={styles.headerTitle}>{profileData?.username || viewedUser.displayName || 'Profile'}</Text>
          <Pressable
            onPress={async () => {
              try {
                await signOut(auth);
                router.replace('/');  // navigate to landing page
                  } catch (error) {
              console.error('Error signing out:', error);
              }
    }}
          ><Ionicons name="settings-outline" size={24} color="#444" />
  </Pressable>
        </View>

        <View style={styles.profileContainer}>
          <Image
            style={styles.avatar}
            source={{
              uri:
                viewedUser.photoURL ||
                `https://ui-avatars.com/api/?name=${encodeURIComponent(
                  profileData?.username || (viewedUser.displayName || 'User')
                )}`,
            }}
          />

          <Text style={styles.username}>@{profileData?.username || viewedUser.displayName || 'User'}</Text>

          <View style = {styles.statsContainer}>
            <View style={styles.stat}>
              <Text style={styles.statNumber}>{profileData?.postCount ?? 0}</Text>
                <Text style={styles.statLabel}>Posts</Text>
            </View>
            <View style={styles.stat}>
              <Text style={styles.statNumber}>{profileData?.followerCount ?? 0}</Text>
                <Text style={styles.statLabel}>Followers</Text>
            </View>
            <View style={styles.stat}>
              <Text style={styles.statNumber}>{profileData?.followingCount ?? 0}</Text>
                <Text style={styles.statLabel}>Following</Text>
            </View>
          </View>

          {profileData?.firstName ? (
            <Text style={styles.firstname}>
              {profileData.firstName}
            </Text>
          ) : null}

          {profileData?.bio ? (
            <Text style={styles.bio}>
              {profileData.bio}
            </Text>
          ) : null}

          {isOwnProfile ? (
            <Pressable
              style={styles.editButton}
              onPress={() => console.log('Edit Profile pressed')}
            >
              <Text style={styles.editButtonText}>Edit Profile</Text>
            </Pressable>
          ) : (
            <Pressable
              style={styles.followButton}
              onPress={() => console.log('Follow button pressed')}
            >
              <Text style={styles.followButtonText}>Follow</Text>
            </Pressable>
          )}
        </View>

        <View style={styles.contentPlaceholder}>
          <Text style={styles.placeholderText}>User posts will appear here.</Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const { width } = Dimensions.get('window');

const styles = StyleSheet.create({
  safeContainer: {
    flex: 1,
    backgroundColor: '#fff',
  },
  scrollContainer: {
    padding: 20,
    paddingBottom: 100,
    alignItems: 'center',
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
    backgroundColor: '#fff',
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
  headerBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderColor: '#eee',
    marginBottom: 16,
    width: width - 40,
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#222',
  },
  profileContainer: {
    alignItems: 'center',
    marginBottom: 30,
    width: width - 40,
  },
  avatar: {
    width: 100,
    height: 100,
    borderRadius: 50,
    borderWidth: 2,
    borderColor: '#52FF7F',
    marginBottom: 12,
  },
  username: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 12,
    color: '#333',
  },
  firstname: {
    fontSize: 16,
    fontWeight: '600',
    color: '#222',
    marginBottom: 8,
    width: '100%',
    textAlign: 'center',
  },
  statsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    width: '100%',
    marginBottom: 16,
  },
  stat: {
    alignItems: 'center',
    flex: 1,
  },
  statNumber: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#222',
  },
  statLabel: {
    fontSize: 12,
    color: '#666',
  },
  bio: {
    fontSize: 14,
    color: '#444',
    textAlign: 'center',
    marginBottom: 16,
    lineHeight: 20,
    width: '100%',
  },
  editButton: {
    backgroundColor: '#52FF7F',
    paddingVertical: 10,
    paddingHorizontal: 24,
    borderRadius: 8,
    alignItems: 'center',
    marginBottom: 16,
    width: '100%',
  },
  editButtonText: {
    color: '#000',
    fontWeight: '600',
    fontSize: 14,
    textAlign: 'center',
  },
  followButton: {
    backgroundColor: '#007bff',
    paddingVertical: 10,
    paddingHorizontal: 24,
    borderRadius: 8,
    alignItems: 'center',
    marginBottom: 16,
    width: '100%',
  },
  followButtonText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 14,
    textAlign: 'center',
  },
  contentPlaceholder: {
    marginTop: 20,
    alignItems: 'center',
    padding: 40,
    borderColor: '#ddd',
    borderWidth: 1,
    borderRadius: 12,
    backgroundColor: '#fafafa',
    width: width - 40,
  },
  placeholderText: {
    color: '#999',
  },
});
