import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

export default function WorldPage() {
  return (
    <View style={styles.container}>
      <Text style={styles.text}>🌍 This is the World page — more content coming soon!</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  text: {
    fontSize: 18,
    textAlign: 'center',
  },
});
