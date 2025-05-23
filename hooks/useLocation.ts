import { useState, useEffect } from 'react';
import * as Location from 'expo-location';
import { doc, setDoc, getFirestore } from 'firebase/firestore'; // Import getFirestore
import { db } from '../firebaseConfig'; // Ensure this is correctly exported from your config

interface Coords {
  latitude: number;
  longitude: number;
}

export default function useUserLocation(
  uid?: string | null,
  updateFirestore: boolean = false // Renamed from shouldTrack for clarity
) {
  const [coords, setCoords] = useState<Coords | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState<boolean>(true); // Add loading state for location

  useEffect(() => {
    let subscriber: Location.LocationSubscription | null = null;

    const getLocation = async () => {
      setLoading(true);
      setError(null);
      try {
        const { status } = await Location.requestForegroundPermissionsAsync();

        if (status !== 'granted') {
          setError('Permission to access location was denied');
          setLoading(false);
          return;
        }

        // Get initial current location immediately
        const initialLocation = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.High });
        const initialCoords = {
          latitude: initialLocation.coords.latitude,
          longitude: initialLocation.coords.longitude,
        };
        setCoords(initialCoords);
        if (uid && updateFirestore) { // Only update Firestore if uid exists and updateFirestore is true
            try {
                await updateUserLocation(uid, initialCoords);
            } catch (err) {
                console.error('Error updating initial location to Firestore:', err);
            }
        }
        console.log('[useUserLocation] Initial location obtained:', initialCoords);

        // If continuous tracking and Firestore updates are desired
        if (updateFirestore && uid) {
          console.log('[useUserLocation] Starting continuous tracking for UID:', uid);
          subscriber = await Location.watchPositionAsync(
            {
              accuracy: Location.Accuracy.High,
              timeInterval: 15000, // Update every 15 seconds
              distanceInterval: 10, // Or every 10 meters
            },
            async (location) => {
              const { latitude, longitude } = location.coords;
              const newCoords = { latitude, longitude };
              setCoords(newCoords); // Update local state
              try {
                await updateUserLocation(uid, newCoords); // Update Firestore
              } catch (err) {
                console.error('Error updating location to Firestore:', err);
              }
            }
          );
        }
      } catch (err) {
        console.error('Error in getLocation:', err);
        setError('Error getting location: ' + (err as Error).message);
      } finally {
        setLoading(false);
      }
    };

    // If no UID is provided AND we're supposed to update Firestore,
    // or if we're not supposed to update Firestore at all,
    // ensure we don't start watchPositionAsync for that purpose.
    // However, we still want to GET the location for the feed.
    if (!uid && updateFirestore) {
        // If uid is null and updateFirestore is true, it means
        // we're waiting for uid but shouldn't update yet.
        // Or if we are explicitly told NOT to update Firestore,
        // then we still get the location, just don't watch/update.
        console.log('[useUserLocation] Skipping continuous tracking due to missing UID or updateFirestore=false');
        setLoading(false); // Indicate not loading tracking
        setCoords(null); // Clear coords if UID is gone
        return; // Exit, as we'll get the location below or if conditions change.
    }

    getLocation(); // Always try to get initial location

    return () => {
      console.log('[useUserLocation] Cleaning up location subscriber.');
      if (subscriber) {
        subscriber.remove();
        subscriber = null;
      }
    };
  }, [uid, updateFirestore]); // Dependencies

  return { coords, error, loading }; // Return loading state
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
    console.log(`[Firestore] User ${uid} location updated.`);
  } catch (error) {
    console.error('Failed to set location in Firestore:', error);
    throw error;
  }
}