import { View, Text, TextInput, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function SignUpScreen({ navigation }) {
  return (
    <SafeAreaView style={{ padding: 20 }}>
      <Text>Sign Up</Text>

      <TextInput placeholder="Email" style={{ borderWidth: 1, marginBottom: 10, padding: 8 }} />
      <TextInput placeholder="Password" secureTextEntry style={{ borderWidth: 1, marginBottom: 10, padding: 8 }} />
      <TextInput placeholder="Confirm Password" secureTextEntry style={{ borderWidth: 1, marginBottom: 10, padding: 8 }} />

      <TouchableOpacity onPress={() => navigation.replace('MainTabs')}>
        <Text>Register</Text>
      </TouchableOpacity>

      <TouchableOpacity onPress={() => navigation.navigate('Login')}>
        <Text>Already have an account? Log in</Text>
      </TouchableOpacity>
    </SafeAreaView>
  );
}