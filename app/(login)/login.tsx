import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  Pressable,
  StyleSheet,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from 'react-native';
import * as Google from 'expo-auth-session/providers/google';
import * as WebBrowser from 'expo-web-browser';
import { useRouter } from 'expo-router';
import { StatusBar } from 'react-native';

import { createUserDoc } from '../../userService';
import { useAuth } from '../../hooks/useAuth';

const STATUSBAR_HEIGHT = Platform.OS === 'android' ? (StatusBar.currentHeight ?? 0) : 0;

WebBrowser.maybeCompleteAuthSession();

export default function Login() {
  const router = useRouter();
  const { user, error, loginAnonymously, loginWithEmail, loginWithGoogle } = useAuth();

  const [request, response, promptAsync] = Google.useAuthRequest({
    clientId:
      '205598545489-itnka9o96bd6d5589s9vc51n7td7juuc.apps.googleusercontent.com',
  });

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  // Navigate to feed if user is logged in
  useEffect(() => {
    if (user) {
      // Create user doc after login if needed
      console.log('Successfully signed in user: ', user.uid)
      router.replace('/feed');
    }
  }, [user]);

  // Listen for Google sign-in response
  useEffect(() => {
    if (response?.type === 'success') {
      const { id_token } = response.params;
      if (id_token) {
        loginWithGoogle(id_token);
      }
    }
  }, [response]);

  return (
    <KeyboardAvoidingView
      behavior={undefined} // prevents screen push up on keyboard appearance
      style={styles.container}
    >
      <ScrollView
        contentContainerStyle={{ flexGrow: 1, justifyContent: 'center' }}
        keyboardShouldPersistTaps="handled"
      >
        <Pressable
          style={styles.backButton}
          onPress={() => router.back()}
          hitSlop={{ top: 15, bottom: 15, left: 15, right: 15 }}
        >
          <Text style={styles.backButtonText}>← Back</Text>
        </Pressable>

        <Text style={styles.title}>Welcome to Ping</Text>

        <TextInput
          style={styles.input}
          placeholder="Email"
          placeholderTextColor="#888"
          autoCapitalize="none"
          keyboardType="email-address"
          value={email}
          onChangeText={setEmail}
          textContentType="emailAddress"
          autoCorrect={false}
          keyboardAppearance="light"
        />

        <TextInput
          style={styles.input}
          placeholder="Password"
          placeholderTextColor="#888"
          secureTextEntry
          value={password}
          onChangeText={setPassword}
          textContentType="password"
          autoCorrect={false}
          keyboardAppearance="light"
        />

        {!!error && <Text style={styles.errorText}>{error}</Text>}

        <Pressable style={styles.button} onPress={() => loginWithEmail(email, password)}>
          <Text style={styles.buttonText}>Sign In</Text>
        </Pressable>

        <Pressable onPress={() => router.push('/login')}>
          <Text style={styles.linkText}>Forgot password?</Text>
        </Pressable>

        <View style={styles.separatorContainer}>
          <View style={styles.line} />
          <Text style={styles.separatorText}>or sign in with Google or anonymously</Text>
          <View style={styles.line} />
        </View>

        <Pressable
          style={[styles.button, !request && styles.disabledButton]}
          onPress={() => promptAsync()}
          disabled={!request}
        >
          <Text style={styles.buttonText}>Sign in with Google</Text>
        </Pressable>

        <Pressable style={styles.button} onPress={loginAnonymously}>
          <Text style={styles.buttonText}>Continue as Guest</Text>
        </Pressable>

        <View style={{ marginTop: 40 }}>
          <Text style={styles.createAccountText}>
            Don’t have an account?{' '}
            <Text
              style={styles.linkInline}
              onPress={() => router.push('/create_account')}
            >
              Create one
            </Text>
          </Text>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 30,
    backgroundColor: '#fff',
  },
  backButton: {
    position: 'absolute',
    top: STATUSBAR_HEIGHT + 33,
    zIndex: 100,
    padding: 10,
    borderRadius: 8,
  },
  backButtonText: {
    fontSize: 18,
    color: '#52FF7F',
  },
  title: {
    fontSize: 26,
    marginBottom: 30,
    fontWeight: 'bold',
    textAlign: 'center',
  },
  input: {
    height: 48,
    borderColor: '#ccc',
    borderWidth: 1,
    borderRadius: 8,
    marginBottom: 15,
    paddingHorizontal: 15,
    fontSize: 16,
    color: '#000',
    backgroundColor: '#fff',
  },
  button: {
    backgroundColor: '#333',
    padding: 14,
    borderRadius: 8,
    alignItems: 'center',
    marginVertical: 10,
  },
  disabledButton: {
    backgroundColor: '#999',
  },
  buttonText: {
    color: '#fff',
    fontWeight: 'bold',
  },
  linkText: {
    textAlign: 'center',
    color: '#52FF7F',
    fontSize: 14,
    marginBottom: 25,
    marginTop: 8,
  },
  separatorContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 20,
  },
  separatorText: {
    marginHorizontal: 10,
    color: '#888',
    fontSize: 12,
  },
  line: {
    flex: 1,
    height: 1,
    backgroundColor: '#ccc',
  },
  createAccountText: {
    textAlign: 'center',
    color: '#444',
    fontSize: 14,
  },
  linkInline: {
    color: '#52FF7F',
    fontWeight: '600',
  },
  errorText: {
    color: 'red',
    textAlign: 'center',
    marginBottom: 10,
  },
});
