// app/profile-viewer/[profileUserId].tsx
import React from 'react';
import Profile from '../(tabs)/profile'; // Assuming your original Profile.tsx is at app/profile.tsx

export default function OtherUserProfileScreen() {
  // Profile component will automatically pick up profileUserId from useLocalSearchParams()
  // because this route is defined with a dynamic segment.
  return <Profile />;
}