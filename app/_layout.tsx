import { Stack, useRouter, useSegments } from 'expo-router';
import { StatusBar } from 'react-native';
import React from 'react';
import { View, TouchableOpacity, StyleSheet } from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';
import { useAuth } from '../hooks/useAuth'; // your auth hook
import useUserLocation from '../hooks/useLocation'; // import your location hook

export default function AppLayout() {
  const router = useRouter();
  const segments = useSegments();
  const { user } = useAuth();

  // Only start location tracking if user is logged in and has a uid

  // Show FAB only on logged-in screens, not auth pages like login/signup
  const isOnAuthScreen = segments[0] === undefined || segments[0] === 'home' || segments[0] === '(login)';
  const showPostButton = user && !isOnAuthScreen;
  
  useUserLocation(user?.uid ?? null, isOnAuthScreen);

  return (
    <View style={{ flex: 1 }}>
      <Stack screenOptions={{ headerShown: false, gestureEnabled: false }} />
      <StatusBar barStyle="dark-content" />

      {showPostButton && (
        <TouchableOpacity
          style={styles.fab}
          onPress={() => router.push('/post')}
        >
          <Icon name="add" size={32} color="#fff" />
        </TouchableOpacity>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  fab: {
    position: 'absolute',
    bottom: 80,
    right: 20,
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#00C6FF',
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 5,
  },
});
