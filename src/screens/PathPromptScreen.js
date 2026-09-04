import { useState, useEffect } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, ActivityIndicator, Switch,
  StyleSheet, KeyboardAvoidingView, Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useCareer } from '../context/CareerContext';
import { askAI } from '../API/ai';
import { colors, typography, spacing, shared } from '../styles/styles';

export default function PathPromptScreen({ navigation }) {
  const { goal, setGoal, stages, saveRoadmap, resumeText } = useCareer();

  const [input, setInput] = useState(goal || '');
  const [loading, setLoading] = useState(false);
  const [useResume, setUseResume] = useState(!!resumeText);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (goal && !input) setInput(goal);
  }, [goal]);

  const hasExistingRoadmap = stages.length > 0;
  const includeResume = useResume && !!resumeText;

  const generateRoadmap = async () => {
    if (!input.trim()) {
      setError("Tell us what career you're aiming for first.");
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const { jobTitle } = await askAI(
        'Extract the specific job/career title from the user\'s message, even if phrased casually or with extra commentary. Return ONLY valid JSON: {"jobTitle": string}. Use standard title casing (e.g. "ML Engineer", "UX Designer").',
        input
      );
      setGoal(jobTitle);

      const parsed = await askAI(
        `You are a career roadmap generator, similar to roadmap.sh.

        Given a career goal and (optionally) the user's resume, break it down into a clear, ordered, step-by-step learning path.

        Rules:
        - Return EXACTLY 10 stages, ordered from foundational/beginner to advanced.
        - The FINAL stage's title MUST be the career goal itself (e.g. if the goal is "AI Engineer", the last stage is titled "AI Engineer"). It represents the destination, not another skill topic — give it exactly ONE todo: "Apply for [goal] roles".
        - The other 9 stages each represent one skill area or topic, in logical prerequisite order.
        - Each of those stages must include a "todos" array of 3-6 short (2-4 word) sub-topics.
        - If a resume is provided, assess which todos the user has LIKELY ALREADY satisfied based on their stated experience/skills. For each stage, include "completedTodos": an array of the 0-based indexes of todos already satisfied. If no resume is provided, "completedTodos" should be empty for every stage.
        - Do not include any explanation, preamble, or markdown outside the JSON.

        Return ONLY valid JSON in this exact shape:
        {"stages": [{"title": string, "todos": string[], "completedTodos": number[]}]}`,

        `My career goal: ${jobTitle}\n\n${includeResume ? `My resume:\n${resumeText}` : 'No resume provided.'}`
      );

      await saveRoadmap(jobTitle, parsed.stages);
      navigation.replace('PathDiagram');
    } catch (err) {
      console.log('ERROR:', err.message);
      setError(err.message || 'Something went wrong generating your roadmap. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView edges={['top']} style={shared.screen}>
      {hasExistingRoadmap && (
        <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
          <Text style={styles.backArrow}>←</Text>
          <Text style={[typography.normal, styles.backLabel]}>Path</Text>
        </TouchableOpacity>
      )}

      <KeyboardAvoidingView
        style={styles.content}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <Text style={typography.heading}>
          {hasExistingRoadmap ? 'Update your goal' : "What's your career goal?"}
        </Text>
        <Text style={[typography.caption, styles.subtitle]}>
          Tell us where you want to end up — we'll map the path to get there.
        </Text>

        <TextInput
          value={input}
          onChangeText={setInput}
          placeholder="e.g. I want to become an ML Engineer"
          placeholderTextColor={colors.placeholder}
          multiline
          style={[styles.bigInput, styles.gapBelow]}
        />

        {resumeText && (
          <View style={[styles.resumeToggleRow, styles.gapBelow]}>
            <Text style={[typography.normal, { color: useResume ? colors.primary : colors.placeholder }]}>
              {useResume ? 'Using your uploaded resume' : 'Not using your resume'}
            </Text>
            <Switch value={useResume} onValueChange={setUseResume} trackColor={{ true: colors.primary }} />
          </View>
        )}
        {!resumeText && (
          <Text style={[typography.caption, styles.gapBelow]}>
            Tip: upload your resume on the Resume tab first to get a personalized starting point.
          </Text>
        )}

        {error && <Text style={styles.errorText}>{error}</Text>}

        <TouchableOpacity
          style={[shared.primaryButton, styles.gapBelow]}
          onPress={generateRoadmap}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color={colors.white} />
          ) : (
            <Text style={shared.primaryButtonText}>
              {hasExistingRoadmap ? 'Regenerate Roadmap' : 'Generate Roadmap'}
            </Text>
          )}
        </TouchableOpacity>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  content: { flex: 1, padding: spacing.md, justifyContent: 'center' },
  subtitle: { marginTop: spacing.xs },
  bigInput: {
    backgroundColor: colors.cardBackground,
    borderRadius: 16,
    padding: spacing.lg,
    fontSize: 18,
    color: colors.text,
    minHeight: 120,
    textAlignVertical: 'top',
  },
  gapBelow: { marginTop: spacing.lg },
  resumeToggleRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  errorText: { color: '#DC2626', marginTop: spacing.sm },
  backButton: { flexDirection: 'row', alignItems: 'center', margin: spacing.md, alignSelf: 'flex-start' },
  backArrow: { fontSize: 20, color: colors.primary, marginRight: 4 },
  backLabel: { color: colors.primary, fontWeight: '600' },
});