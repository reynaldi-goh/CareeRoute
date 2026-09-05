import { Text, TouchableOpacity, ScrollView, StyleSheet, Image } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors, typography, spacing, shared } from '../styles/styles';

export default function AboutScreen({ navigation }) {
  return (
    <SafeAreaView edges={['top']} style={shared.screen}>
      <ScrollView contentContainerStyle={styles.content}>
        <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
          <Text style={styles.backArrow}>←</Text>
          <Text style={[typography.normal, styles.backLabel]}>Settings</Text>
        </TouchableOpacity>

        <Image
          source={require('../../assets/logo.png')}
          style={styles.logo}
          resizeMode="contain"
        />

        <Text style={[typography.section, styles.gapBelow]}>What is CareeRoute?</Text>
        <Text style={[typography.normal, styles.paragraph]}>
          CareeRoute helps you turn a career goal into a clear, step-by-step plan. Tell it
          where you want to end up, and it builds a personalized roadmap of skills and
          milestones to get there, then tracks your progress as you complete each step.
        </Text>

        <Text style={[typography.section, styles.gapBelow]}>What it does</Text>
        <Text style={[typography.normal, styles.paragraph]}>
          • Generates a 8-to-12-stage learning roadmap tailored to your goal{'\n'}
          • Scores your resume against the skills your target career needs{'\n'}
          • Surfaces recent news relevant to your chosen field{'\n'}
          • Lets you check off tasks and track progress over time
        </Text>

        <Text style={[typography.section, styles.gapBelow]}>Built with</Text>
        <Text style={[typography.normal, styles.paragraph]}>
          React Native and Expo, with Supabase for accounts and data storage, and an AI
          model from Groq for generating roadmaps and resume feedback.
        </Text>

        <Text style={[typography.caption, styles.version]}>Version 1.0.0</Text>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  content: { padding: spacing.md, paddingBottom: spacing.xl },
  backButton: { flexDirection: 'row', alignItems: 'center', marginBottom: spacing.md, alignSelf: 'flex-start' },
  backArrow: { fontSize: 20, color: colors.primary, marginRight: 4 },
  backLabel: { color: colors.primary, fontWeight: '600' },
  logo: { width: 180, height: 90, alignSelf: 'center', marginBottom: spacing.lg },
  gapBelow: { marginTop: spacing.lg, marginBottom: spacing.sm },
  paragraph: { lineHeight: 22 },
  version: { textAlign: 'center', marginTop: spacing.xl },
});