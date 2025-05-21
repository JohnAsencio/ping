import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  TextInput,
  Text,
  TouchableOpacity,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  Keyboard,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';

import { createPost } from '../postService'; // Adjust path
import { useAuth } from '../hooks/useAuth'; // your auth hook
import { getAuth } from 'firebase/auth';
import useUserLocation from '../hooks/useLocation'; // import your location hook

export default function CreatePostScreen() {
  const navigation = useNavigation();
  const [isKeyboardVisible, setKeyboardVisible] = useState(false);
  const [postContent, setPostContent] = useState('');
  const inputRef = useRef<TextInput>(null);

  // Get Firebase Auth instance
  const auth = getAuth();

  // Get user ID (or undefined if not logged in)
  const userId = auth.currentUser?.uid;

  // Call hook at top level with userId (can be undefined)
  const { coords } = useUserLocation(userId);

  useEffect(() => {
    const showSub = Keyboard.addListener('keyboardDidShow', () => setKeyboardVisible(true));
    const hideSub = Keyboard.addListener('keyboardDidHide', () => setKeyboardVisible(false));
    inputRef.current?.focus();

    return () => {
      showSub.remove();
      hideSub.remove();
    };
  }, []);

  const handlePost = async () => {
    if (!postContent.trim()) {
      alert('Please write something before posting!');
      return;
    }

    if (!userId) {
      alert('You must be logged in to post.');
      return;
    }

    try {
      await createPost({ 
        userId, 
        content: postContent, 
        location: coords ? { latitude: coords.latitude, longitude: coords.longitude } : null 
      });

      alert('Post created!');
      setPostContent('');
      navigation.goBack();
    } catch (error) {
      console.error('Error creating post:', error);
      alert('Failed to create post. Please try again.');
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={24} color="black" />
        </TouchableOpacity>
        <TouchableOpacity onPress={handlePost}>
          <Text style={styles.postButton}>Post</Text>
        </TouchableOpacity>
      </View>

      {/* Text Input */}
      <TextInput
        ref={inputRef}
        style={styles.textInput}
        multiline
        placeholder="What's happening?"
        placeholderTextColor="#aaa"
        value={postContent}
        onChangeText={setPostContent}
      />

      {/* Toolbar */}
      {isKeyboardVisible && (
        <View style={styles.toolbar}>
          <TouchableOpacity style={styles.toolButton}>
            <Text style={styles.toolText}>Tags</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.toolButton}>
            <Ionicons name="image-outline" size={20} color="black" />
          </TouchableOpacity>
          <TouchableOpacity style={styles.toolButton}>
            <Text style={styles.toolText}>Gif</Text>
          </TouchableOpacity>
        </View>
      )}
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
    paddingHorizontal: 20,
    paddingTop: 60,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  postButton: {
    fontSize: 16,
    color: '#52FF7F',
    fontWeight: 'bold',
  },
  textInput: {
    flex: 1,
    fontSize: 18,
    textAlignVertical: 'top',
    color: '#000',
  },
  toolbar: {
    flexDirection: 'row',
    justifyContent: 'flex-start',
    paddingVertical: 10,
    gap: 16,
    backgroundColor: '#fff',
  },
  toolButton: {
    borderWidth: 1,
    borderColor: '#52FF7F',
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 6,
    flexDirection: 'row',
    alignItems: 'center',
  },
  toolText: {
    fontSize: 14,
    color: '#333',
  },
});
