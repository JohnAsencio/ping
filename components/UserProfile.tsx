// components/UserProfile.tsx
import React from 'react';
import { View, Text, StyleSheet, Image, Pressable, Dimensions } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

interface UserProfileData {
  username?: string;
  bio?: string;
  firstName?: string;
  followingCount?: number;
  followerCount?: number;
  postCount?: number;
  photoURL?: string;
}

interface UserProfileProps {
  profileData: UserProfileData | null;
  viewedUserDisplayName: string;
  isOwnProfile: boolean;
  onEditProfile?: () => void;
  onFollow?: () => void;
  onSettingsPress?: () => void;
}

const { width } = Dimensions.get('window');

export default function UserProfile({
  profileData,
  viewedUserDisplayName,
  isOwnProfile,
  onEditProfile,
  onFollow,
  onSettingsPress,
}: UserProfileProps) {
  const displayUsername = profileData?.username || viewedUserDisplayName || 'User';

  return (
    <View style={styles.container}>
      <View style={styles.headerBar}>
        <Text style={styles.headerTitle}>
          {displayUsername}
        </Text>
        {isOwnProfile && onSettingsPress && (
          <Pressable onPress={onSettingsPress}>
            <Ionicons name="settings-outline" size={24} color="#444" />
          </Pressable>
        )}
      </View>

      <View style={styles.profileInfoSection}>
        <Image
          style={styles.avatar}
          source={{
            uri:
              profileData?.photoURL ||
              `https://ui-avatars.com/api/?name=${encodeURIComponent(displayUsername)}`,
          }}
        />

        <Text style={styles.username}>
          @{displayUsername}
        </Text>

        <View style={styles.statsContainer}>
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
          <Text style={styles.firstname}>{profileData.firstName}</Text>
        ) : null}

        {profileData?.bio ? <Text style={styles.bio}>{profileData.bio}</Text> : null}

        {isOwnProfile ? (
          <Pressable style={styles.editButton} onPress={onEditProfile}>
            <Text style={styles.editButtonText}>Edit Profile</Text>
          </Pressable>
        ) : (
          <Pressable style={styles.followButton} onPress={onFollow}>
            <Text style={styles.followButtonText}>Follow</Text>
          </Pressable>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: '100%',
    alignItems: 'center',
    backgroundColor: '#FAFAFA',
  },
  headerBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingBottom: 16,
    paddingHorizontal: 20,
    borderBottomWidth: 1,
    borderColor: '#eee',
    marginBottom: 16,
    width: '100%',
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#222',
  },
  profileInfoSection: {
    alignItems: 'center',
    marginBottom: 30,
    width: width - 40,
    paddingHorizontal: 20,
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
});