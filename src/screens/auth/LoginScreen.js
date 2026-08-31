import { View, Text, TextInput, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function LoginScreen({ navigation }) {
  return (
    <SafeAreaView style={{ padding: 20 }}>
      <Text>Log In</Text>

      <TextInput placeholder="Email" style={{ borderWidth: 1, marginBottom: 10, padding: 8 }} />
      <TextInput placeholder="Password" secureTextEntry style={{ borderWidth: 1, marginBottom: 10, padding: 8 }} />

      <TouchableOpacity onPress={() => navigation.replace('MainTabs')}>
        <Text>Log In</Text>
      </TouchableOpacity>

      <TouchableOpacity onPress={() => navigation.navigate('SignUp')}>
        <Text>Don't have an account? Sign up</Text>
      </TouchableOpacity>
    </SafeAreaView>
  );
}