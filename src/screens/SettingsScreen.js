import { useState, useEffect } from 'react';
import {
  View, Text, TextInput, Switch, TouchableOpacity, Image, Alert,
  Platform, ActivityIndicator, ScrollView, StyleSheet,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as ImagePicker from 'expo-image-picker';
import * as Notifications from 'expo-notifications';
import DateTimePicker from '@react-native-community/datetimepicker';
import { supabase } from '../API/supabaseClient';
import { useProfile } from '../context/ProfileContext';
import { colors, typography, radius, spacing, shared } from '../styles/styles';

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

  const [avatarUri, setAvatarUri] = useState(null);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [usernameInput, setUsernameInput] = useState('');
  const [savingUsername, setSavingUsername] = useState(false);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [notifications, setNotifications] = useState(false);

  useEffect(() => {
    if (username && !usernameInput) setUsernameInput(username);
  }, [username]);

  useEffect(() => {
    setNotifications(notificationsEnabled);
  }, [notificationsEnabled]);

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
    setAvatarUri(uri);
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
  };

  if (loadingProfile) {
    return (
      <SafeAreaView style={[shared.screen, styles.centered]}>
        <ActivityIndicator color={colors.primary} />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={shared.screen} edges={['top']}>
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={typography.heading}>Settings</Text>

        <View style={styles.avatarSection}>
          <TouchableOpacity onPress={choosePhoto} disabled={uploadingAvatar} style={styles.avatarWrap}>
            {avatarUri || avatarPublicUrl ? (
              <Image source={{ uri: avatarUri || avatarPublicUrl }} style={styles.avatarImage} />
            ) : (
              <View style={[styles.avatarImage, styles.avatarPlaceholder]}>
                <Text style={typography.caption}>Add photo</Text>
              </View>
            )}
            {uploadingAvatar && (
              <View style={styles.avatarOverlay}>
                <ActivityIndicator color={colors.white} />
              </View>
            )}
          </TouchableOpacity>
        </View>

        <Text style={[typography.section, styles.sectionSpacing]}>Profile</Text>

        <View style={[shared.card, styles.gapSmall]}>
          <Text style={typography.caption}>Username</Text>
          <TextInput
            value={usernameInput}
            onChangeText={setUsernameInput}
            placeholder="Username"
            placeholderTextColor={colors.placeholder}
            style={styles.fieldInput}
          />
          <TouchableOpacity
            style={[shared.primaryButton, styles.gapSmall, (savingUsername || usernameInput === username) && styles.disabledButton]}
            onPress={saveUsername}
            disabled={savingUsername || usernameInput === username}
          >
            {savingUsername ? (
              <ActivityIndicator color={colors.white} />
            ) : (
              <Text style={shared.primaryButtonText}>Save Username</Text>
            )}
          </TouchableOpacity>
        </View>

        <View style={[shared.card, styles.gapSmall]}>
          <Text style={typography.caption}>Email</Text>
          <TextInput value={email} editable={false} style={[styles.fieldInput, styles.disabledField]} />
          <Text style={[typography.caption, styles.gapXs]}>Password</Text>
          <TextInput
            value="········"
            editable={false}
            secureTextEntry
            style={[styles.fieldInput, styles.disabledField]}
          />
          <Text style={[typography.caption, styles.gapXs]}>
            Email and password changes coming soon.
          </Text>
        </View>

        <TouchableOpacity
          style={[shared.card, styles.gapSmall, styles.rowBetween]}
          onPress={() => setShowDatePicker(true)}
        >
          <Text style={typography.normal}>Birthday</Text>
          <Text style={[typography.normal, { color: colors.placeholder }]}>
            {birthday ? birthday.toDateString() : 'Not set'}
          </Text>
        </TouchableOpacity>

        {showDatePicker && (
          <DateTimePicker
            value={birthday || new Date()}
            mode="date"
            display="default"
            maximumDate={new Date()}
            onChange={async (event, selectedDate) => {
              setShowDatePicker(Platform.OS === 'ios');
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

        <Text style={[typography.section, styles.sectionSpacing]}>Preferences</Text>

        <View style={[shared.card, styles.gapSmall, styles.rowBetween]}>
          <Text style={typography.normal}>Notifications</Text>
          <Switch
            value={notifications}
            onValueChange={toggleNotifications}
            trackColor={{ true: colors.primary }}
          />
        </View>

        <Text style={[typography.section, styles.sectionSpacing]}>More</Text>

        <View style={[shared.card, styles.gapSmall]}>
          <TouchableOpacity style={styles.listRow}>
            <Text style={typography.normal}>Help</Text>
          </TouchableOpacity>
          <View style={styles.divider} />
          <TouchableOpacity style={styles.listRow}>
            <Text style={typography.normal}>About</Text>
          </TouchableOpacity>
          <View style={styles.divider} />
          <TouchableOpacity style={styles.listRow}>
            <Text style={typography.normal}>Privacy Policy</Text>
          </TouchableOpacity>
        </View>

        <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
          <Text style={styles.logoutText}>Logout</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  content: { padding: spacing.md, paddingBottom: spacing.xl },
  centered: { alignItems: 'center', justifyContent: 'center' },
  sectionSpacing: { marginTop: spacing.lg, marginBottom: spacing.sm },
  gapSmall: { marginTop: spacing.sm },
  gapXs: { marginTop: spacing.xs },
  avatarSection: { alignItems: 'center', marginTop: spacing.md },
  avatarWrap: { width: 100, height: 100, borderRadius: 50, overflow: 'hidden' },
  avatarImage: { width: 100, height: 100, borderRadius: 50 },
  avatarPlaceholder: {
    backgroundColor: colors.cardBackground, alignItems: 'center', justifyContent: 'center',
  },
  avatarOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.4)', alignItems: 'center', justifyContent: 'center',
  },
  fieldInput: {
    fontSize: 16, color: colors.text, paddingVertical: 4,
  },
  disabledField: { color: colors.placeholder },
  rowBetween: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  listRow: { paddingVertical: spacing.sm },
  divider: { height: 1, backgroundColor: '#E5E7EB' },
  disabledButton: { backgroundColor: colors.placeholder },
  logoutButton: { alignItems: 'center', marginTop: spacing.xl },
  logoutText: { color: '#DC2626', fontSize: 16, fontWeight: '600' },
});