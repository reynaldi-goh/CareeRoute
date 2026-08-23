import { useState } from 'react';
import { View, Text, TextInput, Switch, TouchableOpacity, Image, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as ImagePicker from 'expo-image-picker';

export default function SettingsScreen() {
  const [avatarUri, setAvatarUri] = useState(null);
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [birthday, setBirthday] = useState('');
  const [notifications, setNotifications] = useState(true);

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
    console.log('logout pressed');
    // wire up actual auth logout later
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
      <TextInput placeholder="Birthday" value={birthday} onChangeText={setBirthday} />

      <View>
        <Text>Notifications</Text>
        <Switch value={notifications} onValueChange={setNotifications} />
      </View>

      <TouchableOpacity onPress={handleLogout}>
        <Text>Logout</Text>
      </TouchableOpacity>
    </SafeAreaView>
  );
}