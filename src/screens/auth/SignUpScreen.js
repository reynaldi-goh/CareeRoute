import { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Image } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { supabase } from '../../API/supabaseClient';
import { colors, spacing, shared } from '../../styles/styles';
import Button from '../../components/Button';

export default function SignUpScreen({ navigation }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [message, setMessage] = useState(null);

  const handleSignUp = async () => {
    if (!email || !password || !confirmPassword) {
      setError('Please fill in all fields.');
      return;
    }
    if (password !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }
    if (password.length < 6) {
      setError('Password must be at least 6 characters.');
      return;
    }

    setLoading(true);
    setError(null);
    setMessage(null);

    const { data, error } = await supabase.auth.signUp({ email, password });
    setLoading(false);

    if (error) {
      setError(error.message);
      return;
    }

    if (!data.session) {
      setMessage('Check your email to confirm your account before logging in.');
      return;
    }
  };

  return (
    <SafeAreaView style={shared.screen}>
      <View style={styles.content}>
        <View style={styles.card}>
          <Image
            source={require('../../../assets/logo.png')}
            style={styles.logo}
            resizeMode="contain"
            accessibilityLabel="CareeRoute logo"
          />

          <View style={styles.form}>
            <TextInput
              placeholder="email address"
              placeholderTextColor={colors.placeholder}
              value={email}
              onChangeText={setEmail}
              autoCapitalize="none"
              keyboardType="email-address"
              style={styles.input}
              accessibilityLabel="Email address"
            />

            <TextInput
              placeholder="password"
              placeholderTextColor={colors.placeholder}
              value={password}
              onChangeText={setPassword}
              secureTextEntry
              style={[styles.input, styles.gapSmall]}
              accessibilityLabel="Password"
            />

            <TextInput
              placeholder="confirm password"
              placeholderTextColor={colors.placeholder}
              value={confirmPassword}
              onChangeText={setConfirmPassword}
              secureTextEntry
              style={[styles.input, styles.gapSmall]}
              accessibilityLabel="Confirm password"
            />
          </View>

          {error && <Text style={styles.errorText} accessibilityRole="alert">{error}</Text>}
          {message && <Text style={styles.successText} accessibilityRole="alert">{message}</Text>}

          <View style={styles.buttonSpacing}>
            <Button label="register" onPress={handleSignUp} loading={loading} />
          </View>

          <TouchableOpacity
            style={styles.linkWrap}
            onPress={() => navigation.navigate('Login')}
            accessibilityRole="button"
            accessibilityLabel="Already have an account? Login here"
          >
            <Text style={styles.linkText}>
              Already have account? <Text style={styles.linkAccent}>Login here</Text>
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  content: { flex: 1, padding: spacing.lg, paddingTop: spacing.xl, justifyContent: 'flex-start', alignItems: 'center' },
  card: {
    width: '100%', maxWidth: 460, backgroundColor: colors.white, borderRadius: 16,
    paddingVertical: spacing.xl, paddingHorizontal: spacing.md, alignItems: 'center',
  },
  logo: { width: 350, height: 200, marginTop: spacing.sm, marginBottom: spacing.sm },
  form: { width: '100%', marginTop: spacing.xl },
  input: {
    width: '100%', color: 'black', borderWidth: 1, borderColor: '#D1D5DB', borderRadius: 24,
    paddingVertical: spacing.md, paddingHorizontal: spacing.md, fontSize: 14,
  },
  gapSmall: { marginTop: spacing.lg },
  buttonSpacing: { width: '100%', marginTop: spacing.xl },
  errorText: { color: '#DC2626', marginTop: spacing.md, alignSelf: 'flex-start' },
  successText: { color: '#16A34A', marginTop: spacing.md, alignSelf: 'flex-start' },
  linkWrap: { marginTop: spacing.md },
  linkText: { fontSize: 12, color: colors.text },
  linkAccent: { color: colors.primary, fontWeight: '600', textDecorationLine: 'underline' },
});