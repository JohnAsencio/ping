// components/Post.tsx
import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Image } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

interface PostProps {
  id: string;
  userID: string;
  username?: string; // Add username prop
  userPhotoURL?: string; // Add userPhotoURL prop for avatar
  content: string;
  location?: {
    latitude: number;
    longitude: number;
  };
  distance?: number;
  timestamp: Date;
  onLike: (postId: string) => void;
  // Optional: Add onPress for navigating to user profile
  onPressUser?: (userId: string) => void; // Pass userId if you want to navigate to user profile
}

const Post: React.FC<PostProps> = ({
  id,
  userID,
  username, // Use username prop
  userPhotoURL, // Use userPhotoURL prop
  content,
  distance,
  timestamp,
  onLike,
  onPressUser,
}) => {
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
    <View key={id} style={styles.postContainer}>
      <View style={styles.postHeader}>
        <TouchableOpacity
          onPress={() => onPressUser && onPressUser(userID)}
          style={styles.userContainer}
        >
          <Image
            style={styles.avatar}
            source={{
              uri:
                userPhotoURL ||
                `https://ui-avatars.com/api/?name=${encodeURIComponent(username || 'User')}`,
            }}
          />
          {/* FIX: Ensure username is always a string before rendering in Text component */}
          <Text style={styles.username}>{username || 'undefined'}</Text>
        </TouchableOpacity>
        <TouchableOpacity>
          <Ionicons name="ellipsis-horizontal" size={24} color="#BDBDBD" />
        </TouchableOpacity>
      </View>

      <View style={styles.postContent}>
        <Text style={styles.postText}>{content}</Text>
      </View>

      <View style={styles.postInfo}>
        {distance !== undefined && (
          <Text style={styles.distanceText}>~ {distance.toFixed(1)} miles away</Text>
        )}
        <Text style={styles.timeText}>
          {timestamp ? getRelativeTime(timestamp) : 'Time unavailable'}
        </Text>
      </View>

      <View style={styles.postActions}>
        <TouchableOpacity onPress={() => onLike(id)} style={styles.likeButton}>
          <Ionicons name="heart-outline" size={20} color="#757575" />
          <Text style={styles.likeCount}>Like</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  postContainer: {
    backgroundColor: 'white',
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
    padding: 15,
    width: '100%',
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
  avatar: {
    width: 30,
    height: 30,
    backgroundColor: '#BDBDBD',
    borderRadius: 15,
    marginRight: 10,
  },
  username: {
    fontWeight: 'bold',
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
    alignItems: 'center',
    marginTop: 5,
  },
  distanceText: {
    fontSize: 12,
    color: '#757575',
  },
  timeText: {
    fontSize: 12,
    color: '#757575',
  },
  postActions: {
    marginTop: 10,
    flexDirection: 'row',
  },
  likeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 5,
    paddingHorizontal: 10,
    borderRadius: 5,
  },
  likeCount: {
    fontSize: 14,
    color: '#212121',
    marginLeft: 5,
  },
});

export default Post;