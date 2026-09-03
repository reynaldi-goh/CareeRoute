import { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, ActivityIndicator, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { supabase } from '../../API/supabaseClient';
import { colors, typography, spacing, shared } from '../../styles/styles';

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
        <Text style={typography.heading}>Sign Up</Text>
        <Text style={[typography.caption, styles.subtitle]}>
          Create an account to start building your roadmap.
        </Text>

        <View style={styles.form}>
          <Text style={typography.caption}>Email</Text>
          <TextInput
            placeholder="you@example.com"
            placeholderTextColor={colors.placeholder}
            value={email}
            onChangeText={setEmail}
            autoCapitalize="none"
            keyboardType="email-address"
            style={[shared.input, styles.gapXs]}
          />

          <Text style={[typography.caption, styles.gapSmall]}>Password</Text>
          <TextInput
            placeholder="••••••••"
            placeholderTextColor={colors.placeholder}
            value={password}
            onChangeText={setPassword}
            secureTextEntry
            style={[shared.input, styles.gapXs]}
          />

          <Text style={[typography.caption, styles.gapSmall]}>Confirm Password</Text>
          <TextInput
            placeholder="••••••••"
            placeholderTextColor={colors.placeholder}
            value={confirmPassword}
            onChangeText={setConfirmPassword}
            secureTextEntry
            style={[shared.input, styles.gapXs]}
          />
        </View>

        {error && <Text style={styles.errorText}>{error}</Text>}
        {message && <Text style={styles.successText}>{message}</Text>}

        <TouchableOpacity
          style={[shared.primaryButton, styles.gapBelow]}
          onPress={handleSignUp}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color={colors.white} />
          ) : (
            <Text style={shared.primaryButtonText}>Register</Text>
          )}
        </TouchableOpacity>

        <TouchableOpacity style={styles.linkWrap} onPress={() => navigation.navigate('Login')}>
          <Text style={typography.caption}>
            Already have an account? <Text style={styles.linkAccent}>Log in</Text>
          </Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  content: { flex: 1, padding: spacing.md, justifyContent: 'center' },
  subtitle: { marginTop: spacing.xs },
  form: { marginTop: spacing.lg },
  gapXs: { marginTop: spacing.xs },
  gapSmall: { marginTop: spacing.md },
  gapBelow: { marginTop: spacing.lg },
  errorText: { color: '#DC2626', marginTop: spacing.sm },
  successText: { color: '#16A34A', marginTop: spacing.sm },
  linkWrap: { alignSelf: 'center', marginTop: spacing.lg },
  linkAccent: { color: colors.primary, fontWeight: '600' },
});