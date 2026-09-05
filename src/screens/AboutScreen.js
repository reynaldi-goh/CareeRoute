import { Text, ScrollView, StyleSheet, Image } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors, typography, spacing, shared } from '../styles/styles';
import BackLink from '../components/BackLink';

export default function AboutScreen({ navigation }) {
  return (
    <SafeAreaView edges={['top']} style={shared.screen}>
      <ScrollView contentContainerStyle={styles.content}>
        <BackLink label="Settings" onPress={() => navigation.goBack()} />

        <Image
          source={require('../../assets/logo.png')}
          style={styles.logo}
          resizeMode="contain"
          accessibilityRole="image"
          accessibilityLabel="CareeRoute logo"
        />

        <Text style={[typography.section, styles.gapBelow]} accessibilityRole="header">
          What is CareeRoute?
        </Text>
        <Text style={[typography.normal, styles.paragraph]}>
          CareeRoute helps you turn a career goal into a clear, step-by-step plan. Tell it
          where you want to end up, and it builds a personalized roadmap of skills and
          milestones to get there, then tracks your progress as you complete each step.
        </Text>

        <Text style={[typography.section, styles.gapBelow]} accessibilityRole="header">
          What it does
        </Text>
        <Text style={[typography.normal, styles.paragraph]}>
          • Generates a 8-to-12-stage learning roadmap tailored to your goal{'\n'}
          • Scores your resume against the skills your target career needs{'\n'}
          • Surfaces recent news relevant to your chosen field{'\n'}
          • Lets you check off tasks and track progress over time
        </Text>

        <Text style={[typography.section, styles.gapBelow]} accessibilityRole="header">
          Built with
        </Text>
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
  logo: { width: 180, height: 90, alignSelf: 'center', marginBottom: spacing.lg },
  gapBelow: { marginTop: spacing.lg, marginBottom: spacing.sm },
  paragraph: { lineHeight: 22 },
  version: { textAlign: 'center', marginTop: spacing.xl },
});