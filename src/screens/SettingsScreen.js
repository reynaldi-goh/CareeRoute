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

// TODO: swap these text placeholders for real icon components (e.g. @expo/vector-icons)
// once icon assets are downloaded.
const ICON_CAMERA = '📷';
const ICON_EDIT = '✎';

export default function SettingsScreen({ navigation }) {
  const {
    username, email, birthday, notificationsEnabled,
    avatarPublicUrl, uploadAvatar,
    loadingProfile, saveProfile,
  } = useProfile();

  const [avatarUri, setAvatarUri] = useState(null);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [usernameInput, setUsernameInput] = useState('');
  const [editingUsername, setEditingUsername] = useState(false);
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
    if (!usernameInput.trim() || usernameInput === username) {
      setEditingUsername(false);
      return;
    }
    setSavingUsername(true);
    try {
      await saveProfile({ username: usernameInput.trim() });
      setEditingUsername(false);
    } catch (err) {
      Alert.alert('Could not save username', err.message);
    } finally {
      setSavingUsername(false);
    }
  };

  const cancelEditUsername = () => {
    setUsernameInput(username || '');
    setEditingUsername(false);
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
        {/* Avatar + camera badge */}
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
            <View style={styles.avatarBadge}>
              <Text style={styles.avatarBadgeIcon}>{ICON_CAMERA}</Text>
            </View>
          </TouchableOpacity>

          {/* Username row, inline-editable */}
          {editingUsername ? (
            <View style={styles.usernameEditRow}>
              <TextInput
                value={usernameInput}
                onChangeText={setUsernameInput}
                placeholder="Username"
                placeholderTextColor={colors.placeholder}
                style={styles.usernameInput}
                autoFocus
              />
              {savingUsername ? (
                <ActivityIndicator color={colors.primary} style={styles.usernameActionIcon} />
              ) : (
                <>
                  <TouchableOpacity onPress={saveUsername} style={styles.usernameActionIcon}>
                    <Text style={styles.usernameActionText}>Save</Text>
                  </TouchableOpacity>
                  <TouchableOpacity onPress={cancelEditUsername} style={styles.usernameActionIcon}>
                    <Text style={[styles.usernameActionText, styles.cancelText]}>Cancel</Text>
                  </TouchableOpacity>
                </>
              )}
            </View>
          ) : (
            <View style={styles.usernameRow}>
              <Text style={styles.usernameText}>{username || 'Username'}</Text>
              <TouchableOpacity onPress={() => setEditingUsername(true)} hitSlop={8}>
                <Text style={styles.editIcon}>{ICON_EDIT}</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>

        {/* Unified profile fields card */}
        <View style={[shared.card, styles.gapLg]}>
          <View style={styles.fieldRow}>
            <View style={styles.fieldTextWrap}>
              <Text style={typography.caption}>Email</Text>
              <Text style={[typography.normal, styles.disabledField]}>{email}</Text>
            </View>
            <TouchableOpacity
              onPress={() => Alert.alert('Coming soon', 'Email changes are not supported yet.')}
              hitSlop={8}
            >
              <Text style={[styles.editIcon, styles.editIconDisabled]}>{ICON_EDIT}</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.divider} />

          <View style={styles.fieldRow}>
            <View style={styles.fieldTextWrap}>
              <Text style={typography.caption}>Password</Text>
              <Text style={[typography.normal, styles.disabledField]}>········</Text>
            </View>
            <TouchableOpacity
              onPress={() => Alert.alert('Coming soon', 'Password changes are not supported yet.')}
              hitSlop={8}
            >
              <Text style={[styles.editIcon, styles.editIconDisabled]}>{ICON_EDIT}</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.divider} />

          <View style={styles.fieldRow}>
            <View style={styles.fieldTextWrap}>
              <Text style={typography.caption}>Birthday</Text>
              <Text style={typography.normal}>
                {birthday ? birthday.toDateString() : 'Not set'}
              </Text>
            </View>
            <TouchableOpacity onPress={() => setShowDatePicker(true)} hitSlop={8}>
              <Text style={styles.editIcon}>{ICON_EDIT}</Text>
            </TouchableOpacity>
          </View>
        </View>

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

        <View style={[shared.card, styles.rowBetween, styles.gapLg]}>
          <Text style={typography.normal}>Notifications</Text>
          <Switch
            value={notifications}
            onValueChange={toggleNotifications}
            trackColor={{ true: colors.primary }}
          />
        </View>

        <View style={[shared.card, styles.gapLg]}>
          <TouchableOpacity style={styles.listRow} onPress={() => navigation.navigate('About')}>
            <Text style={typography.normal}>About</Text>
          </TouchableOpacity>
          <View style={styles.divider} />
          <TouchableOpacity style={styles.listRow} onPress={() => navigation.navigate('PrivacyPolicy')}>
            <Text style={typography.normal}>Privacy Policy</Text>
          </TouchableOpacity>
        </View>

        <TouchableOpacity style={[shared.dangerButton, styles.logoutButton]} onPress={handleLogout}>
          <Text style={shared.dangerButtonText}>logout</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  content: { padding: spacing.md, paddingBottom: spacing.xl },
  centered: { alignItems: 'center', justifyContent: 'center' },
  sectionSpacing: { marginTop: spacing.lg, marginBottom: spacing.sm },
  gapLg: { marginTop: spacing.lg },

  avatarSection: { alignItems: 'center', marginTop: spacing.md },
  avatarWrap: { width: 100, height: 100, borderRadius: 50 },
  avatarImage: { width: 100, height: 100, borderRadius: 50 },
  avatarPlaceholder: {
    backgroundColor: colors.cardBackground, alignItems: 'center', justifyContent: 'center',
  },
  avatarOverlay: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: 50,
    backgroundColor: 'rgba(0,0,0,0.4)', alignItems: 'center', justifyContent: 'center',
  },
  avatarBadge: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarBadgeIcon: { fontSize: 13 },

  usernameRow: {
    flexDirection: 'row', alignItems: 'center', marginTop: spacing.sm, gap: spacing.xs,
  },
  usernameText: { fontSize: 16, fontWeight: '600', color: colors.text },
  editIcon: { fontSize: 15, color: colors.primary, marginLeft: spacing.xs },
  editIconDisabled: { color: colors.placeholder },

  usernameEditRow: {
    flexDirection: 'row', alignItems: 'center', marginTop: spacing.sm, width: '100%', paddingHorizontal: spacing.lg,
  },
  usernameInput: {
    flex: 1,
    fontSize: 16,
    color: colors.text,
    borderBottomWidth: 1,
    borderBottomColor: colors.primary,
    paddingVertical: 2,
  },
  usernameActionIcon: { marginLeft: spacing.sm },
  usernameActionText: { color: colors.primary, fontWeight: '600', fontSize: 13 },
  cancelText: { color: colors.placeholder },

  fieldRow: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
  },
  fieldTextWrap: { flex: 1 },
  disabledField: { color: colors.placeholder },

  rowBetween: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  listRow: { paddingVertical: spacing.sm },
  divider: { height: 1, backgroundColor: '#E5E7EB', marginVertical: spacing.sm },

  logoutButton: { marginTop: spacing.xl },
});