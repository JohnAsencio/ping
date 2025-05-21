import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  Pressable,
  StyleSheet,
  ScrollView,
  Platform,
  StatusBar,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { createUserWithEmailAndPassword } from 'firebase/auth';
import DateTimePickerModal from 'react-native-modal-datetime-picker';
import { auth } from '../../firebaseConfig';
import { createUserDoc } from '@/userService';

const STATUSBAR_HEIGHT = Platform.OS === 'android' ? StatusBar.currentHeight ?? 0 : 0;

export default function CreateAccount() {
  const router = useRouter();

  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [city, setCity] = useState('');
  const [dob, setDob] = useState(''); // formatted string YYYY-MM-DD
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [isDatePickerVisible, setDatePickerVisibility] = useState(false);

  const handleCreateAccount = async () => {
    if (password !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }
    if (!firstName || !lastName || !city || !dob || !email || !password) {
      setError('Please fill all fields');
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      const user = userCredential.user;

      await createUserDoc(user.uid, {
        email,
        firstName,
        lastName,
        city,
        dob,
        profilePictureUrl: '',
        createdAt: new Date(),
        postCount: 0,
        followerCount: 0,
        followingCount: 0,
        followers: [],
        following: [],
        posts: []
      });

      router.replace('/feed');
    } catch (error: any) {
      console.error('Create account failed:', error);
      if (error.code === 'auth/email-already-in-use') {
        setError('Email already in use');
      } else if (error.code === 'auth/weak-password') {
        setError('Password should be at least 6 characters');
      } else if (error.code === 'auth/invalid-email') {
        setError('Invalid email address');
      } else {
        setError('Failed to create account');
      }
    } finally {
      setLoading(false);
    }
  };

  const showDatePicker = () => setDatePickerVisibility(true);
  const hideDatePicker = () => setDatePickerVisibility(false);

  const handleConfirm = (date: Date) => {
    const formatted = date.toISOString().split('T')[0];
    setDob(formatted);
    hideDatePicker();
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#fff' }}>
      <View style={styles.header}>
        <Pressable
          style={styles.backButton}
          onPress={() => router.back()}
          hitSlop={{ top: 15, bottom: 15, left: 15, right: 15 }}
        >
          <Text style={styles.backButtonText}>← Back</Text>
        </Pressable>
      </View>

      <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
        <Text style={styles.title}>Create an Account</Text>

        <TextInput
          style={styles.input}
          placeholder="First Name"
          placeholderTextColor="#999"
          value={firstName}
          onChangeText={setFirstName}
          editable={!loading}
          selectionColor="#52FF7F"
          autoCapitalize="words"
          spellCheck={false}
          keyboardAppearance="light"
        />

        <TextInput
          style={styles.input}
          placeholder="Last Name"
          placeholderTextColor="#999"
          value={lastName}
          onChangeText={setLastName}
          editable={!loading}
          selectionColor="#52FF7F"
          autoCapitalize="words"
          spellCheck={false}
          keyboardAppearance="light"
        />

        <TextInput
          style={styles.input}
          placeholder="City"
          placeholderTextColor="#999"
          value={city}
          onChangeText={setCity}
          editable={!loading}
          selectionColor="#52FF7F"
          autoCapitalize="words"
          spellCheck={false}
          keyboardAppearance="light"
        />

        <Pressable onPress={showDatePicker} style={[styles.input, styles.dobInput]}>
          <Text style={{ color: dob ? '#000' : '#999', fontSize: 16 }}>
            {dob || 'Date of Birth (YYYY-MM-DD)'}
          </Text>
        </Pressable>

        <DateTimePickerModal
          isVisible={isDatePickerVisible}
          mode="date"
          onConfirm={handleConfirm}
          onCancel={hideDatePicker}
          maximumDate={new Date()}
        />

        <TextInput
          style={styles.input}
          placeholder="Email"
          placeholderTextColor="#999"
          keyboardType="email-address"
          autoCapitalize="none"
          value={email}
          onChangeText={setEmail}
          editable={!loading}
          selectionColor="#52FF7F"
          keyboardAppearance="light"
        />

        <TextInput
          style={styles.input}
          placeholder="Password"
          placeholderTextColor="#999"
          secureTextEntry
          value={password}
          onChangeText={setPassword}
          editable={!loading}
          selectionColor="#52FF7F"
          keyboardAppearance="light"
        />

        <TextInput
          style={styles.input}
          placeholder="Confirm Password"
          placeholderTextColor="#999"
          secureTextEntry
          value={confirmPassword}
          onChangeText={setConfirmPassword}
          editable={!loading}
          selectionColor="#52FF7F"
          keyboardAppearance="light"
        />

        {error ? <Text style={styles.errorText}>{error}</Text> : null}

        <Pressable
          style={[styles.button, loading && { backgroundColor: '#999' }]}
          onPress={handleCreateAccount}
          disabled={loading}
        >
          <Text style={styles.buttonText}>{loading ? 'Creating...' : 'Create Account'}</Text>
        </Pressable>

        <View style={styles.signInPrompt}>
          <Text>Already have an account? </Text>
          <Pressable onPress={() => router.push('/login')}>
            <Text style={styles.linkText}>Sign in</Text>
          </Pressable>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  header: {
    paddingHorizontal: 20,
    paddingTop: 70,
    paddingBottom: 10,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
  },
  backButton: {
    zIndex: 100,
    padding: 10,
    left: 25,
    top: STATUSBAR_HEIGHT,
    position: 'absolute',
    alignItems: 'center',
  },
  backButtonText: {
    fontSize: 18,
    color: '#52FF7F',
    marginLeft: 5,
  },
  container: {
    paddingTop: 20,
    paddingHorizontal: 30,
    paddingBottom: 80,
    backgroundColor: '#fff',
  },
  title: {
    fontSize: 26,
    fontWeight: 'bold',
    marginBottom: 40,
    textAlign: 'center',
  },
  input: {
    borderColor: '#ccc',
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 14,
    paddingVertical: 12,
    marginBottom: 15,
    fontSize: 16,
    color: '#000',
  },
  dobInput: {
    justifyContent: 'center',
  },
  button: {
    backgroundColor: '#333',
    padding: 14,
    borderRadius: 8,
    alignItems: 'center',
  },
  buttonText: {
    color: '#fff',
    fontWeight: 'bold',
  },
  errorText: {
    color: '#d00',
    marginBottom: 15,
    textAlign: 'center',
  },
  linkText: {
    color: '#52FF7F',
    fontSize: 14,
  },
  signInPrompt: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: 20,
  },
});
