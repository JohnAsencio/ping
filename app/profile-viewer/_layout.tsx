import { Stack } from 'expo-router';

export default function ProfileViewerLayout() {
  return (
    <Stack
      screenOptions={{
        headerShown: false,
        gestureEnabled: true,  // Enable swipe back only for this stack (profile-viewer)
      }}
    />
  );
}
