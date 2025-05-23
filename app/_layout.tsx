// app/_layout.tsx
import { Stack, useRouter, useSegments } from 'expo-router';
import { StatusBar } from 'react-native';
import React from 'react';
import { View, TouchableOpacity, StyleSheet } from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';
import { useAuth } from '../hooks/useAuth';
import useUserLocation from '../hooks/useLocation';

export default function AppLayout() {
  const router = useRouter();
  const segments = useSegments();
  const { user } = useAuth();

  const isOnAuthScreen = segments[0] === undefined || segments[0] === 'home' || segments[0] === '(login)';
  const showPostButton = user && !isOnAuthScreen;

  //useUserLocation(user?.uid ?? null, isOnAuthScreen);

  return (
    <View style={{ flex: 1 }}>
      {/* The main Stack navigator with global options */}
      <Stack screenOptions={{ headerShown: false, gestureEnabled: false }}>
        {/*
          By default, all screens here will have headerShown: false and gestureEnabled: false.
          However, you can override these options for individual screens.
        */}

        {/* Your tabs layout. This should have its own _layout.tsx inside (tabs) folder */}
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />

        {/* Your login/auth pages */}
        <Stack.Screen name="(login)" options={{ presentation: 'modal' }} />

        {/*
          THIS IS THE CRUCIAL PART FOR PROFILE-VIEWER:
          Set presentation to 'modal' or 'card', and ensure gestureEnabled is true.
        */}
        <Stack.Screen
          name="profile-viewer" // Use the dynamic segment name
          options={{
            headerShown: false, // Keep it hidden if you manage header within the component
            presentation: 'modal', // Make it overlap/stack on top of the current screen
            gestureEnabled: true, // Enable swipe back for this specific screen
          }}
        />

        {/* Add other specific screens here if they are direct children of the root stack */}
        <Stack.Screen name="post" options={{ presentation: 'modal' }} />

      </Stack>
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