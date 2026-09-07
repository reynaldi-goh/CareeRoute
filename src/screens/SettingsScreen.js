import { useState, useEffect } from 'react';
import {
  View, Text, TextInput, Switch, TouchableOpacity, Image, Alert,
  Platform, ActivityIndicator, ScrollView, StyleSheet,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as ImagePicker from 'expo-image-picker';
import * as Notifications from 'expo-notifications';
import DateTimePicker from '@react-native-community/datetimepicker';
import * as Haptics from 'expo-haptics';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '../API/supabaseClient';
import { useProfile } from '../context/ProfileContext';
import { colors, typography, radius, spacing, shared } from '../styles/styles';
import Button from '../components/Button';
import LoadingScreen from '../components/LoadingScreen';
import { confirmAction } from '../utils/confirmAction';

// configure notification handler (controls how a notification appears while
// the app is in the foreground, must be set once at module load, not per-render)
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: false,
    shouldSetBadge: false,
  }),
});

// create notification channel (Android 8+ silently drops all notifications
// without one, no error, no log; so this must run before any notification
// is ever scheduled)
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
  const [editingUsername, setEditingUsername] = useState(false);
  const [savingUsername, setSavingUsername] = useState(false);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [notifications, setNotifications] = useState(false);

  // sync input with username (context loads async, fill the editable field
  // once it arrives, without clobbering anything the user's already typed)
  useEffect(() => {
    if (username && !usernameInput) setUsernameInput(username);
  }, [username]);

  useEffect(() => {
    setNotifications(notificationsEnabled);
  }, [notificationsEnabled]);

  // recheck permission (OS-level permission can be revoked outside the app,
  // so don't trust the saved DB flag alone — verify against the real permission on mount)
  useEffect(() => {
    Notifications.getPermissionsAsync().then(({ status }) => {
      if (status !== 'granted') setNotifications(false);
    });
  }, []);

  // save username (skip the write entirely if nothing actually changed)
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

  // toggle notifications (request OS permission on enable, schedule a daily
  // reminder, and cancel all scheduled notifications on disable)
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
        // Swap to the daily trigger below before shipping to production:
        //
        // trigger: {
        //   type: Notifications.SchedulableTriggerInputTypes.DAILY,
        //   hour: 9,
        //   minute: 0,
        //   channelId: 'default',
        // },
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

  // save avatar (show an instant local preview while the actual upload runs in the background)
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
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    Alert.alert('Profile Photo', 'Choose an option', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Camera', onPress: takeProfilePhoto },
      { text: 'Gallery', onPress: pickFromGallery },
    ]);
  };

  const doLogout = async () => {
    const { error } = await supabase.auth.signOut();
    if (error) {
      Alert.alert('Logout failed', error.message);
    }
  };

  // handle logout (confirm first, signing out ends the session, though it
  // doesn't delete any data)
  const handleLogout = () => {
    confirmAction({
      title: 'Log out?',
      message: "You'll need to sign back in to access your roadmap and resume.",
      confirmLabel: 'Log out',
      onConfirm: doLogout,
    });
  };

  if (loadingProfile) {
    return <LoadingScreen label="Loading your profile" />;
  }

  return (
    <SafeAreaView style={shared.screen} edges={['top']}>
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.avatarSection}>
          <TouchableOpacity
            onPress={choosePhoto}
            disabled={uploadingAvatar}
            style={styles.avatarWrap}
            accessibilityRole="button"
            accessibilityLabel="Change profile photo"
            accessibilityState={{ busy: uploadingAvatar }}
          >
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
              <Ionicons name="camera" size={14} color={colors.text} />
            </View>
          </TouchableOpacity>

          {editingUsername ? (
            <View style={styles.usernameEditRow}>
              <TextInput
                value={usernameInput}
                onChangeText={setUsernameInput}
                placeholder="Username"
                placeholderTextColor={colors.placeholder}
                style={styles.usernameInput}
                autoFocus
                accessibilityLabel="Edit username"
              />
              {savingUsername ? (
                <ActivityIndicator color={colors.primary} style={styles.usernameActionIcon} />
              ) : (
                <>
                  <TouchableOpacity
                    onPress={() => {
                      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                      saveUsername();
                    }}
                    style={styles.usernameActionIcon}
                    accessibilityRole="button"
                    accessibilityLabel="Save username"
                  >
                    <Text style={styles.usernameActionText}>Save</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    onPress={cancelEditUsername}
                    style={styles.usernameActionIcon}
                    accessibilityRole="button"
                    accessibilityLabel="Cancel editing username"
                  >
                    <Text style={[styles.usernameActionText, styles.cancelText]}>Cancel</Text>
                  </TouchableOpacity>
                </>
              )}
            </View>
          ) : (
            <View style={styles.usernameRow}>
              <Text style={styles.usernameText}>{username || 'Username'}</Text>
              <TouchableOpacity
                onPress={() => setEditingUsername(true)}
                hitSlop={8}
                accessibilityRole="button"
                accessibilityLabel="Edit username"
              >
                <Ionicons name="pencil" size={15} color={colors.primary} style={styles.editIcon} />
              </TouchableOpacity>
            </View>
          )}
        </View>

        <View style={[shared.card, styles.gapLg]}>
          <View style={styles.fieldRow}>
            <View style={styles.fieldTextWrap}>
              <Text style={typography.caption}>Email</Text>
              <Text style={[typography.normal, styles.disabledField]}>{email}</Text>
            </View>
          </View>

          <View style={styles.divider} />

          <View style={styles.fieldRow}>
            <View style={styles.fieldTextWrap}>
              <Text style={typography.caption}>Password</Text>
              <Text style={[typography.normal, styles.disabledField]}>········</Text>
            </View>
          </View>

          <View style={styles.divider} />

          <View style={styles.fieldRow}>
            <View style={styles.fieldTextWrap}>
              <Text style={typography.caption}>Birthday</Text>
              <Text style={typography.normal}>
                {birthday ? birthday.toDateString() : 'Not set'}
              </Text>
            </View>
            <TouchableOpacity
              onPress={() => setShowDatePicker(true)}
              hitSlop={8}
              accessibilityRole="button"
              accessibilityLabel="Edit birthday"
            >
              <Ionicons name="pencil" size={15} color={colors.primary} style={styles.editIcon} />
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
              setShowDatePicker(Platform.OS === 'ios'); // iOS keeps the picker open until dismissed manually
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
            accessibilityLabel="Toggle notifications"
            accessibilityRole="switch"
          />
        </View>

        <View style={[shared.card, styles.gapLg]}>
          <TouchableOpacity
            style={[styles.listRow, styles.rowBetween]}
            onPress={() => navigation.navigate('About')}
            accessibilityRole="button"
            accessibilityLabel="About"
          >
            <Text style={typography.normal}>About</Text>
            <Ionicons name="chevron-forward" size={18} color={colors.placeholder} />
          </TouchableOpacity>
          <View style={styles.divider} />
          <TouchableOpacity
            style={[styles.listRow, styles.rowBetween]}
            onPress={() => navigation.navigate('PrivacyPolicy')}
            accessibilityRole="button"
            accessibilityLabel="Privacy Policy"
          >
            <Text style={typography.normal}>Privacy Policy</Text>
            <Ionicons name="chevron-forward" size={18} color={colors.placeholder} />
          </TouchableOpacity>
        </View>

        <View style={styles.logoutButton}>
          <Button label="logout" variant="danger" onPress={handleLogout} />
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  content: { padding: spacing.md, paddingBottom: spacing.xl },
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

  usernameRow: {
    flexDirection: 'row', alignItems: 'center', marginTop: spacing.sm, gap: spacing.xs,
  },
  usernameText: { fontSize: 16, fontWeight: '600', color: colors.text },
  editIcon: { marginLeft: spacing.xs },

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