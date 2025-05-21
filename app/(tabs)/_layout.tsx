import React from 'react';
import { Tabs } from 'expo-router';
import Icon from 'react-native-vector-icons/Ionicons'; // or any icon set you want

export default function TabLayout() {
  return (
    <Tabs
      screenOptions={({ route }) => ({
        tabBarShowLabel: false, // hide text labels
        tabBarStyle: {
          backgroundColor: '#fff',
          borderTopWidth: 0,
          height: 60,
          paddingBottom: 5,
        },
        tabBarIcon: ({ focused, color, size }) => {
          let iconName = '';

          if (route.name === 'feed') {
            iconName = focused ? 'home' : 'home-outline';
          } else if (route.name === 'explore') {
            iconName = focused ? 'search' : 'search-outline';
          } else if (route.name === 'profile') {
            iconName = focused ? 'person' : 'person-outline';
          } else if (route.name === 'world') {
            iconName = focused ? 'earth' : 'earth-outline';
          }

          return <Icon name={iconName} size={28} color={color} />;
        },
        tabBarActiveTintColor: '#52FF7F',
        tabBarInactiveTintColor: 'gray',
        headerShown: false,
      })}
    >
      <Tabs.Screen name="feed" />
      <Tabs.Screen name="explore" />
      <Tabs.Screen name="world" />
      <Tabs.Screen name="profile" />

    </Tabs>

    
  );
}
