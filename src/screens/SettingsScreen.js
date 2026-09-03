import { useState, useEffect } from 'react';
import { View, Text, TextInput, Switch, TouchableOpacity, Image, Alert, Platform, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as ImagePicker from 'expo-image-picker';
import * as Notifications from 'expo-notifications';
import DateTimePicker from '@react-native-community/datetimepicker';
import { supabase } from '../API/supabaseClient';
import { useProfile } from '../context/ProfileContext';

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

// Android 8+ silently drops all notifications without a channel — no error, no log.
// This must run before any notification is scheduled.
if (Platform.OS === 'android') {
  Notifications.setNotificationChannelAsync('default', {
    name: 'default',
    importance: Notifications.AndroidImportance.HIGH,
  });
}

export default function SettingsScreen({ navigation }) {
  const {
    username, email, birthday, notificationsEnabled,
    avatarPublicUrl, uploadAvatar,
    loadingProfile, saveProfile,
  } = useProfile();

  const [avatarUri, setAvatarUri] = useState(null); // local preview shown instantly while uploading
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [usernameInput, setUsernameInput] = useState('');
  const [savingUsername, setSavingUsername] = useState(false);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [notifications, setNotifications] = useState(false);

  // context loads asynchronously — sync local editable fields once it arrives
  useEffect(() => {
    if (username && !usernameInput) setUsernameInput(username);
  }, [username]);

  useEffect(() => {
    setNotifications(notificationsEnabled);
  }, [notificationsEnabled]);

  // OS-level permission can be revoked outside the app, so still check it directly on mount
  useEffect(() => {
    Notifications.getPermissionsAsync().then(({ status }) => {
      if (status !== 'granted') setNotifications(false);
    });
  }, []);

  const saveUsername = async () => {
    if (!usernameInput.trim() || usernameInput === username) return;
    setSavingUsername(true);
    try {
      await saveProfile({ username: usernameInput.trim() });
    } catch (err) {
      Alert.alert('Could not save username', err.message);
    } finally {
      setSavingUsername(false);
    }
  };

  const toggleNotifications = async (value) => {
    if (value) {
      const { status } = await Notifications.requestPermissionsAsync();
      console.log('permission status:', status);
      if (status !== 'granted') {
        Alert.alert('Permission denied', 'Enable notifications in device settings.');
        return;
      }
      setNotifications(true);

      // schedule a daily reminder
      await Notifications.scheduleNotificationAsync({
        content: {
          title: 'CareeRoute',
          body: "Don't forget to check off today's tasks!",
        },
        trigger: {
          type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL,
          seconds: 5,
          channelId: 'default',
        },
      });
    } else {
      await Notifications.cancelAllScheduledNotificationsAsync();
      setNotifications(false);
    }

    try {
      await saveProfile({ notificationsEnabled: value });
    } catch (err) {
      console.log('saveProfile (notifications) error:', err.message);
    }
  };

  const saveAvatar = async (uri) => {
    setAvatarUri(uri); // instant local preview
    setUploadingAvatar(true);
    try {
      await uploadAvatar(uri);
    } catch (err) {
      Alert.alert('Could not save photo', err.message);
    } finally {
      setUploadingAvatar(false);
    }
  };

  const takeProfilePhoto = async () => {
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Camera permission needed');
      return;
    }
    const result = await ImagePicker.launchCameraAsync({
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.7,
    });
    if (!result.canceled) {
      saveAvatar(result.assets[0].uri);
    }
  };

   const pickFromGallery = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Gallery permission needed');
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.7,
    });
    if (!result.canceled) {
      saveAvatar(result.assets[0].uri);
    }
  };

  const choosePhoto = () => {
    Alert.alert('Profile Photo', 'Choose an option', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Camera', onPress: takeProfilePhoto },
      { text: 'Gallery', onPress: pickFromGallery },
    ]);
  };

  const handleLogout = async () => {
    const { error } = await supabase.auth.signOut();
    if (error) {
      Alert.alert('Logout failed', error.message);
      return;
    }
    // no manual navigation needed — the onAuthStateChange listener in App.js
    // detects the cleared session and swaps back to the Auth stack automatically
  };

  if (loadingProfile) {
    return (
      <SafeAreaView style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
        <ActivityIndicator />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView>
      <Text>Settings</Text>

      <TouchableOpacity onPress={choosePhoto} disabled={uploadingAvatar}>
        {avatarUri || avatarPublicUrl ? (
          <Image source={{ uri: avatarUri || avatarPublicUrl }} style={{ width: 200, height: 200 }} />
        ) : (
          <Text>Tap to add photo</Text>
        )}
      </TouchableOpacity>
      {uploadingAvatar && <ActivityIndicator />}

      <TextInput placeholder="Username" value={usernameInput} onChangeText={setUsernameInput} />
      <TouchableOpacity onPress={saveUsername} disabled={savingUsername || usernameInput === username}>
        {savingUsername ? <ActivityIndicator /> : <Text>Save username</Text>}
      </TouchableOpacity>

      <TextInput placeholder="Email" value={email} editable={false} style={{ color: '#888' }} />
      <TextInput placeholder="Password" value="········" editable={false} secureTextEntry style={{ color: '#888' }} />
      <Text style={{ color: '#888', fontSize: 12 }}>Email and password changes coming soon.</Text>

      <TouchableOpacity onPress={() => setShowDatePicker(true)}>
        <Text>Birthday: {birthday ? birthday.toDateString() : 'Not set'}</Text>
      </TouchableOpacity>

      {showDatePicker && (
        <DateTimePicker
          value={birthday || new Date()}
          mode="date"
          display="default"
          maximumDate={new Date()}
          onChange={async (event, selectedDate) => {
            setShowDatePicker(Platform.OS === 'ios'); // iOS keeps it open until dismissed manually
            if (selectedDate) {
              try {
                await saveProfile({ birthday: selectedDate });
              } catch (err) {
                Alert.alert('Could not save birthday', err.message);
              }
            }
          }}
        />
      )}

      <View>
        <Text>Notifications</Text>
        <Switch value={notifications} onValueChange={toggleNotifications} />
      </View>

      <TouchableOpacity>
        <Text>Help</Text>
      </TouchableOpacity>

      <TouchableOpacity>
        <Text>About</Text>
      </TouchableOpacity>

      <TouchableOpacity>
        <Text>Privacy Policy</Text>
      </TouchableOpacity>

      <TouchableOpacity onPress={handleLogout}>
        <Text>Logout</Text>
      </TouchableOpacity>
    </SafeAreaView>
  );
}