import { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, ActivityIndicator, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { supabase } from '../../API/supabaseClient';
import { colors, typography, spacing, shared } from '../../styles/styles';

export default function LoginScreen({ navigation }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const handleLogin = async () => {
    if (!email || !password) {
      setError('Please enter both email and password.');
      return;
    }
    setLoading(true);
    setError(null);
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    setLoading(false);
    if (error) {
      setError(error.message);
      return;
    }
    // No manual navigation needed if you gate navigation on session state (see note below)
  };

  return (
    <SafeAreaView style={shared.screen}>
      <View style={styles.content}>
        <Text style={typography.heading}>Log In</Text>
        <Text style={[typography.caption, styles.subtitle]}>
          Welcome back — enter your details to continue.
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
        </View>

        {error && <Text style={styles.errorText}>{error}</Text>}

        <TouchableOpacity
          style={[shared.primaryButton, styles.gapBelow]}
          onPress={handleLogin}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color={colors.white} />
          ) : (
            <Text style={shared.primaryButtonText}>Log In</Text>
          )}
        </TouchableOpacity>

        <TouchableOpacity style={styles.linkWrap} onPress={() => navigation.navigate('SignUp')}>
          <Text style={typography.caption}>
            Don't have an account? <Text style={styles.linkAccent}>Sign up</Text>
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
  linkWrap: { alignSelf: 'center', marginTop: spacing.lg },
  linkAccent: { color: colors.primary, fontWeight: '600' },
});