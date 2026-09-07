import { useState } from 'react';
import { View, Text, TextInput, StyleSheet, Image, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { supabase } from '../../API/supabaseClient';
import { colors, spacing, shared } from '../../styles/styles';
import Button from '../../components/Button';

export default function LoginScreen({ navigation }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // handle login (validate fields, then attempt Supabase sign-in)
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
            <View style={styles.inputWrap}>
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
            </View>

            <View style={[styles.inputWrap, styles.gapSmall]}>
              <TextInput
                placeholder="password"
                placeholderTextColor={colors.placeholder}
                value={password}
                onChangeText={setPassword}
                secureTextEntry
                style={styles.input}
                accessibilityLabel="Password"
              />
            </View>
          </View>

          {error && <Text style={styles.errorText} accessibilityRole="alert">{error}</Text>}

          <View style={styles.buttonSpacing}>
            <Button label="login" onPress={handleLogin} loading={loading} />
          </View>

          <TouchableOpacity
            style={styles.linkWrap}
            onPress={() => navigation.navigate('SignUp')}
            accessibilityRole="button"
            accessibilityLabel="Don't have an account? Register here"
          >
            <Text style={styles.linkText}>
              Don't have account? <Text style={styles.linkAccent}>Register here</Text>
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
  inputWrap: { width: '100%', borderWidth: 1, borderColor: '#D1D5DB', borderRadius: 24, overflow: 'hidden' },
  input: { width: '100%', color: 'black', paddingVertical: spacing.md, paddingHorizontal: spacing.md, fontSize: 14 },
  gapSmall: { marginTop: spacing.lg },
  buttonSpacing: { width: '100%', marginTop: spacing.xl },
  errorText: { color: '#DC2626', marginTop: spacing.md, alignSelf: 'flex-start' },
  linkWrap: { marginTop: spacing.md },
  linkText: { fontSize: 12, color: colors.text },
  linkAccent: { color: colors.primary, fontWeight: '600', textDecorationLine: 'underline' },
});