import React from 'react';
import {
  StyleSheet,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  SafeAreaView,
  Dimensions,
} from 'react-native';

const categories = [
  'Events', 'Thoughts', 'Restaurants', 'Concerts', 'Sports',
  'Deals', 'Campus', 'Clubs', 'Jobs', 'More',
];

export default function ExploreScreen() {
  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        <Text style={styles.title}>Explore</Text>

        <TextInput
          style={styles.searchInput}
          placeholder="Search"
          placeholderTextColor="#888"
        />

        <Text style={styles.subtitle}>Find near you…</Text>

        <ScrollView contentContainerStyle={styles.gridContainer}>
          {categories.map((category, index) => (
            <TouchableOpacity key={index} style={styles.categoryButton}>
              <Text style={styles.categoryText}>{category}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>
    </SafeAreaView>
  );
}

const screenWidth = Dimensions.get('window').width;
const sidePadding = 32;
const buttonGap = 16;
const buttonWidth = (screenWidth - sidePadding * 2 - buttonGap) / 2;
const buttonHeight = (screenWidth - sidePadding * 2 - buttonGap) / 4;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
    alignItems: 'center', 
    justifyContent: 'flex-start', 
    paddingTop: 60,
  },
  content: {
    width: '90%', 
  },
  title: {
    fontSize: 36,
    fontWeight: 'bold',
    color: '#33aa55',
    marginBottom: 20,
  },
  searchInput: {
    backgroundColor: '#f0f0f0',
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 20,
    fontSize: 16,
    marginBottom: 24,
  },
  subtitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 16,
  },
  gridContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    paddingBottom: 100,
  },
  categoryButton: {
    width: buttonWidth,
    height: buttonHeight,
    paddingVertical: 14,
    backgroundColor: '#e8ffe8',
    borderRadius: 30,
    marginBottom: buttonGap,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#52FF7F',
  },
  categoryText: {
    fontSize: 16,
    color: '#33aa55',
    fontWeight: '500',
  },
});