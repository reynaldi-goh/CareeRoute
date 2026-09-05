import { useState, useEffect } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, ActivityIndicator, Switch,
  StyleSheet, KeyboardAvoidingView, Platform, Image,
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
        - Decide the number of stages based on what the career genuinely requires — don't pad thin topics or cram unrelated skills together to hit a target count. Most roadmaps will naturally land somewhere between 8 and 12 stages, but let the topic decide, not this range.
        - The FINAL stage's title MUST be the career goal itself (e.g. if the goal is "AI Engineer", the last stage is titled "AI Engineer"). It represents the destination, not another skill topic — give it exactly ONE todo: "Apply for [goal] roles".
        - Every other stage represents one skill area or topic, in logical prerequisite order.
        - Each of those stages must include a "todos" array of short (2-5 word) sub-topics — typically 3-6, but include more if the topic genuinely has that many distinct parts (e.g. a broad foundational stage like "JavaScript Fundamentals" might reasonably need variables, loops, conditionals, functions, ES6 syntax, classes, and exception handling as separate todos rather than merging them).
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
        <Image
          source={require('../../assets/logo.png')}
          style={styles.logo}
          resizeMode="contain"
        />

        <View style={styles.inputWrap}>
          <Text style={styles.inputIcon}>🎯</Text>
          <TextInput
            value={input}
            onChangeText={setInput}
            placeholder={'Describe your goal\ne.g. "I want to become an AI Engineer"'}
            placeholderTextColor={colors.placeholder}
            multiline
            style={styles.bigInput}
          />
        </View>

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
              {hasExistingRoadmap ? 'regenerate roadmap' : 'generate roadmap'}
            </Text>
          )}
        </TouchableOpacity>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  content: { flex: 1, padding: spacing.md, justifyContent: 'flex-start' },
  logo: { width: 350, height: 200, alignSelf: 'center', marginBottom: spacing.md },
  inputWrap: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: 24,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    backgroundColor: colors.white,
  },
  inputIcon: { fontSize: 16, marginRight: spacing.sm, marginTop: 2 },
  bigInput: {
    flex: 1,
    fontSize: 14,
    color: colors.text,
    minHeight: 50,
    textAlignVertical: 'top',
    padding: 0,
  },
  gapBelow: { marginTop: spacing.lg },
  resumeToggleRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  errorText: { color: '#DC2626', marginTop: spacing.sm },
  backButton: { flexDirection: 'row', alignItems: 'center', margin: spacing.md, alignSelf: 'flex-start' },
  backArrow: { fontSize: 20, color: colors.primary, marginRight: 4 },
  backLabel: { color: colors.primary, fontWeight: '600' },
});