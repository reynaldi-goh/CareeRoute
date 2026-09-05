import { Text, TouchableOpacity, ScrollView, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors, typography, spacing, shared } from '../styles/styles';

export default function PrivacyPolicyScreen({ navigation }) {
  return (
    <SafeAreaView edges={['top']} style={shared.screen}>
      <ScrollView contentContainerStyle={styles.content}>
        <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
          <Text style={styles.backArrow}>←</Text>
          <Text style={[typography.normal, styles.backLabel]}>Settings</Text>
        </TouchableOpacity>

        <Text style={typography.heading}>Privacy Policy</Text>
        <Text style={[typography.caption, styles.lastUpdated]}>Last updated: September 2026</Text>

        <Text style={[typography.section, styles.gapBelow]}>What we collect</Text>
        <Text style={[typography.normal, styles.paragraph]}>
          To provide the app's features, CareeRoute stores your email address, the career
          goal and roadmap you generate, your progress on each task, your uploaded resume
          (including the text extracted from it), and, if you choose to add them, a
          username, profile photo, and birthday.
        </Text>

        <Text style={[typography.section, styles.gapBelow]}>How we use it</Text>
        <Text style={[typography.normal, styles.paragraph]}>
          Your career goal and resume text are sent to Groq, our AI provider, to generate your
          roadmap and resume feedback. Per Groq's terms, this data is not used to train their
          models and is not retained beyond what is needed to process the request. Your goal is
          also used to fetch relevant news articles from a third-party news API. Everything else,
          including your account details, roadmap, progress, resume file, and profile info, is
          stored securely with our backend provider, Supabase, and is only accessible to you.
        </Text>

        <Text style={[typography.section, styles.gapBelow]}>Notifications</Text>
        <Text style={[typography.normal, styles.paragraph]}>
          If you enable notifications, we use them only to send you task reminders. You
          can turn these off at any time in Settings or in your device's system settings.
        </Text>

        <Text style={[typography.section, styles.gapBelow]}>Your resume and photos</Text>
        <Text style={[typography.normal, styles.paragraph]}>
          Your resume is stored privately and is never shared publicly. Only you can
          access it. Profile photos are stored separately and are used only to display
          your avatar within the app.
        </Text>

        <Text style={[typography.section, styles.gapBelow]}>Your control over your data</Text>
        <Text style={[typography.normal, styles.paragraph]}>
          You can remove your saved roadmap or resume at any time from within the app.
          Logging out ends your session but does not delete your data. To request full
          account deletion, contact us using the details below.
        </Text>

        <Text style={[typography.section, styles.gapBelow]}>Contact</Text>
        <Text style={[typography.normal, styles.paragraph]}>
          Questions about this policy or your data can be sent to wiyogoReynaldiArdianto@gmail.com.
        </Text>

        <Text style={[typography.caption, styles.disclaimer]}>
          CareeRoute is a student coursework project built for CM3050 Mobile Development
          and is not a commercially distributed application.
        </Text>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  content: { padding: spacing.md, paddingBottom: spacing.xl },
  backButton: { flexDirection: 'row', alignItems: 'center', marginBottom: spacing.md, alignSelf: 'flex-start' },
  backArrow: { fontSize: 20, color: colors.primary, marginRight: 4 },
  backLabel: { color: colors.primary, fontWeight: '600' },
  lastUpdated: { marginTop: 2, marginBottom: spacing.sm },
  gapBelow: { marginTop: spacing.lg, marginBottom: spacing.sm },
  paragraph: { lineHeight: 22 },
  disclaimer: { marginTop: spacing.xl, fontStyle: 'italic' },
});