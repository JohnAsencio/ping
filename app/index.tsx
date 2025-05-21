import React, { useState, useEffect, useRef } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Animated, Easing } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';

const phrases = [
  "Connect with people nearby",
  "Find your next move",
  "See what's going on",
  "Share your thoughts",
];

export default function Home() {
  const router = useRouter();
  const [index, setIndex] = useState(0);
  const fadeAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    const interval = setInterval(() => {
      Animated.timing(fadeAnim, {
        toValue: 0,
        duration: 400,
        useNativeDriver: true,
        easing: Easing.out(Easing.ease),
      }).start(() => {
        setIndex((prev) => (prev + 1) % phrases.length);
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 400,
          useNativeDriver: true,
          easing: Easing.in(Easing.ease),
        }).start();
      });
    }, 3000);

    return () => clearInterval(interval);
  }, []);

  return (
    <LinearGradient
      colors={['#52FF7F', '#00C6FF']}
      style={styles.container}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
    >
      <View style={styles.card}>
        <Text style={styles.logo}>Ping</Text>

        <Animated.Text style={[styles.subtitle, { opacity: fadeAnim }]}>
          {phrases[index]}
        </Animated.Text>

        <TouchableOpacity style={styles.loginButton} onPress={() => router.push('/login')}>
          <Text style={styles.loginText}>Log In</Text>
        </TouchableOpacity>
      </View>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  card: {
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    padding: 30,
    borderRadius: 16,
    width: '80%',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.15,
    shadowRadius: 10,
    elevation: 6,
  },
  logo: {
    fontSize: 36,
    fontWeight: 'bold',
    color: '#000',
    marginBottom: 12,
  },
  subtitle: {
    fontSize: 16,
    color: '#333',
    textAlign: 'center',
    marginBottom: 20,
  },
  loginButton: {
    backgroundColor: '#52FF7F',
    paddingVertical: 12,
    paddingHorizontal: 30,
    borderRadius: 30,
    height: 50,
    width: 250,
  },
  loginText: {
    fontSize: 16,
    fontWeight: 'bold',
    paddingTop: 3,
    color: '#000',
    textAlign: 'center'
  },
});
