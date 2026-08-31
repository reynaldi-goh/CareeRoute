import { useState, useEffect } from 'react';
import { View, Text, TextInput, Switch, TouchableOpacity, Image, Alert, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as ImagePicker from 'expo-image-picker';
import * as Notifications from 'expo-notifications';
import DateTimePicker from '@react-native-community/datetimepicker';

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

export default function SettingsScreen({ navigation }) {
  const [avatarUri, setAvatarUri] = useState(null);
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [birthday, setBirthday] = useState(new Date());
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [notifications, setNotifications] = useState(false);

  // check current permission status on mount
  useEffect(() => {
    Notifications.getPermissionsAsync().then(({ status }) => {
      setNotifications(status === 'granted');
    });
  }, []);

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
          seconds: 5,
        },
      });
    } else {
      await Notifications.cancelAllScheduledNotificationsAsync();
      setNotifications(false);
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
      setAvatarUri(result.assets[0].uri);
    }
  };

    const handleLogout = () => {
      navigation.reset({
        index: 0,
        routes: [{ name: 'Auth' }],
      });
    };

  return (
    <SafeAreaView>
      <Text>Settings</Text>

      <TouchableOpacity onPress={takeProfilePhoto}>
        {avatarUri ? (
          <Image source={{ uri: avatarUri }} style={{ width: 80, height: 80 }} />
        ) : (
          <Text>Tap to add photo</Text>
        )}
      </TouchableOpacity>

      <TextInput placeholder="Username" value={username} onChangeText={setUsername} />
      <TextInput placeholder="Email" value={email} onChangeText={setEmail} />
      <TextInput placeholder="Password" value={password} onChangeText={setPassword} secureTextEntry />

      <TouchableOpacity onPress={() => setShowDatePicker(true)}>
        <Text>Birthday: {birthday.toDateString()}</Text>
      </TouchableOpacity>

      {showDatePicker && (
        <DateTimePicker
          value={birthday}
          mode="date"
          display="default"
          maximumDate={new Date()}
          onChange={(event, selectedDate) => {
            setShowDatePicker(Platform.OS === 'ios'); // iOS keeps it open until dismissed manually
            if (selectedDate) setBirthday(selectedDate);
          }}
        />
      )}

      <View>
        <Text>Notifications</Text>
        <Switch value={notifications} onValueChange={toggleNotifications} />
      </View>

      <TouchableOpacity onPress={handleLogout}>
        <Text>Logout</Text>
      </TouchableOpacity>
    </SafeAreaView>
  );
}