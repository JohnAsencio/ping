import { useState, useEffect } from 'react';
import * as Location from 'expo-location';
import { doc, setDoc } from 'firebase/firestore';
import { db } from '../firebaseConfig';

interface Coords {
  latitude: number;
  longitude: number;
}

export default function useUserLocation(
  uid?: string | null,
  shouldTrack?: boolean 
) {
  const [coords, setCoords] = useState<Coords | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!uid || (shouldTrack==true)) {
      console.log('Location tracking disabled:', { uid, shouldTrack });
      setCoords(null);
      setError(null);
      return;
    }

    let subscriber: Location.LocationSubscription | null = null;

    const startTracking = async () => {
      try {
        const { status } = await Location.requestForegroundPermissionsAsync();

        if (status !== 'granted') {
          setError('Permission to access location was denied');
          return;
        }

        subscriber = await Location.watchPositionAsync(
          {
            accuracy: Location.Accuracy.High,
            timeInterval: 15000,
            distanceInterval: 10,
          },
          async (location) => {
            const { latitude, longitude } = location.coords;
            const newCoords = { latitude, longitude };
            setCoords(newCoords);

            try {
              await updateUserLocation(uid, newCoords);
            } catch (err) {
              console.error('Error updating location to Firestore:', err);
            }
          }
        );
      } catch (err) {
        console.error('Error initializing location tracking:', err);
        setError('Error initializing location tracking');
      }
    };

    startTracking();

    return () => {
      subscriber?.remove();
    };
  }, [uid, shouldTrack]);

  return { coords, error };
}

async function updateUserLocation(
  uid: string,
  coords: Coords
): Promise<void> {
  const userRef = doc(db, 'users', uid);

  try {
    await setDoc(
      userRef,
      {
        location: {
          lat: coords.latitude,
          lng: coords.longitude,
        },
        locationUpdatedAt: new Date(),
      },
      { merge: true }
    );
  } catch (error) {
    console.error('Failed to set location in Firestore:', error);
    throw error;
  }
}
