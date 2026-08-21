import React, { useState } from 'react';
import {
  View,
  Text,
  Image,
  Pressable,
  StyleSheet,
  Alert,
  TextInput,
  ActivityIndicator,
  ScrollView,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';

// ---- Settings screen: camera profile picture ----
function SettingsScreen() {
  const [avatarUri, setAvatarUri] = useState(null);

  const takeProfilePhoto = async () => {
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert(
        'Camera permission needed',
        'Enable camera access in your device settings to set a profile picture.'
      );
      return;
    }

    const result = await ImagePicker.launchCameraAsync({
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.7,
    });

    if (!result.canceled) {
      setAvatarUri(result.assets[0].uri);
    }
  };

  return (
    <View style={styles.screen}>
      <Text style={styles.heading}>Settings</Text>

      <Pressable onPress={takeProfilePhoto} style={styles.avatarWrap}>
        {avatarUri ? (
          <Image source={{ uri: avatarUri }} style={styles.avatar} />
        ) : (
          <View style={[styles.avatar, styles.avatarPlaceholder]}>
            <Text style={{ color: '#888' }}>Tap to add photo</Text>
          </View>
        )}
      </Pressable>
    </View>
  );
}

// ---- Career Path screen: placeholder for now ----
// ---- Career Path screen: goal input -> AI-generated roadmap ----
function PathScreen() {
  const [goal, setGoal] = useState('');
  const [loading, setLoading] = useState(false);
  const [stages, setStages] = useState([]);

  const generateRoadmap = async () => {
    if (!goal.trim()) {
      Alert.alert('Add a goal', 'Describe your goal first, e.g. "I want to become a UX Designer".');
      return;
    }

    setLoading(true);
    try {
      const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${process.env.EXPO_PUBLIC_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'openai/gpt-oss-20b',
          messages: [
            {
              role: 'system',
              content:
                'You are a career coach. Return ONLY valid JSON, no markdown, no commentary, ' +
                'in this exact shape: {"stages": [{"title": string, "description": string}]}. ' +
                'Return 3 to 5 stages ordered from beginner to the goal.',
            },
            { role: 'user', content: `My career goal: ${goal}` },
          ],
          temperature: 0.4,
          response_format: { type: 'json_object' },
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error?.message || 'Groq API request failed');
      }

      const parsed = JSON.parse(data.choices[0].message.content);
      setStages(parsed.stages || []);
    } catch (err) {
      Alert.alert('Could not generate roadmap', err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <ScrollView contentContainerStyle={styles.screen}>
      <Text style={styles.heading}>Career Path</Text>

      <TextInput
        style={styles.input}
        placeholder='e.g. "I want to become a UX Designer"'
        value={goal}
        onChangeText={setGoal}
      />

      <Pressable style={styles.generateButton} onPress={generateRoadmap} disabled={loading}>
        {loading ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <Text style={styles.generateButtonText}>Generate roadmap</Text>
        )}
      </Pressable>

      {stages.map((stage, i) => (
        <View key={i} style={styles.stageCard}>
          <Text style={styles.stageTitle}>{stage.title}</Text>
          <Text style={styles.stageDescription}>{stage.description}</Text>
        </View>
      ))}
    </ScrollView>
  );
}

// ---- App: simple state-based screen switcher, no nav library ----
export default function App() {
  const [tab, setTab] = useState('path');

  return (
    <SafeAreaProvider>
      <SafeAreaView style={{ flex: 1, backgroundColor: '#fff' }}>
        {tab === 'path' ? <PathScreen /> : <SettingsScreen />}

        <View style={styles.tabBar}>
          <Pressable onPress={() => setTab('path')} style={styles.tabButton}>
            <Text style={tab === 'path' ? styles.tabActive : styles.tabInactive}>Path</Text>
          </Pressable>
          <Pressable onPress={() => setTab('settings')} style={styles.tabButton}>
            <Text style={tab === 'settings' ? styles.tabActive : styles.tabInactive}>
              Settings
            </Text>
          </Pressable>
        </View>
      </SafeAreaView>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, padding: 24, alignItems: 'center', justifyContent: 'center' },
  heading: { fontSize: 22, fontWeight: '700', marginBottom: 16 },
  avatarWrap: { marginTop: 12 },
  avatar: { width: 120, height: 120, borderRadius: 60 },
  avatarPlaceholder: {
    backgroundColor: '#eee',
    justifyContent: 'center',
    alignItems: 'center',
  },
  tabBar: {
    flexDirection: 'row',
    borderTopWidth: 1,
    borderTopColor: '#eee',
    height: 60,
  },
  tabButton: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  tabActive: { color: '#4A7CFF', fontWeight: '700' },
  tabInactive: { color: '#999' },
    input: {
    width: '100%',
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 10,
    padding: 12,
    marginBottom: 12,
  },
  generateButton: {
    backgroundColor: '#4A7CFF',
    borderRadius: 999,
    paddingVertical: 12,
    paddingHorizontal: 24,
    alignItems: 'center',
    width: '100%',
    marginBottom: 16,
  },
  generateButtonText: { color: '#fff', fontWeight: '700' },
  stageCard: {
    width: '100%',
    backgroundColor: '#f7f7f7',
    borderRadius: 10,
    padding: 14,
    marginBottom: 10,
  },
  stageTitle: { fontWeight: '700', fontSize: 16, marginBottom: 4 },
  stageDescription: { color: '#666' },
});