import { useState, useEffect, useRef } from 'react';
import {
  Text, TextInput, TouchableOpacity, ScrollView,
  ActivityIndicator, Switch, Animated, StyleSheet, View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useCareer } from '../context/CareerContext';
import { askAI } from '../API/ai';
import { colors, typography, radius, spacing, shared } from '../styles/styles';

export default function PathScreen({ navigation }) {
  const {
    goal, setGoal,
    stages, saveRoadmap, removeRoadmap,
    loadingRoadmap,
    getStageStatus,
    resumeText,
  } = useCareer();

  const [input, setInput] = useState(goal || '');
  const [loading, setLoading] = useState(false);
  const [useResume, setUseResume] = useState(!!resumeText);
  const [error, setError] = useState(null);

  const fadeAnims = useRef([]).current;
  const arrowAnims = useRef([]).current;

  useEffect(() => {
    if (goal && !input) setInput(goal);
  }, [goal]);

  useEffect(() => {
    if (stages.length === 0) return;

    fadeAnims.length = 0;
    arrowAnims.length = 0;
    stages.forEach(() => {
      fadeAnims.push(new Animated.Value(0));
      arrowAnims.push(new Animated.Value(0));
    });

    const sequence = [];
    stages.forEach((_, i) => {
      sequence.push(
        Animated.timing(fadeAnims[i], { toValue: 1, duration: 350, useNativeDriver: true })
      );
      if (i < stages.length - 1) {
        sequence.push(
          Animated.timing(arrowAnims[i], { toValue: 1, duration: 200, useNativeDriver: true })
        );
      }
    });

    Animated.stagger(80, sequence).start();
  }, [stages]);

  const includeResume = useResume && !!resumeText;

  const generateRoadmap = async () => {
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
    } catch (err) {
      console.log('ERROR:', err.message);
      setError(err.message || 'Something went wrong generating your roadmap. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  if (loadingRoadmap) {
    return (
      <SafeAreaView edges={['top']} style={[shared.screen, styles.centered]}>
        <ActivityIndicator color={colors.primary} />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView edges={['top']} style={shared.screen}>
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={typography.heading}>Your Path</Text>

        {error && <Text style={styles.errorText}>{error}</Text>}

        <TextInput
          value={input}
          onChangeText={setInput}
          placeholder="e.g. ML Engineer"
          placeholderTextColor={colors.placeholder}
          style={[shared.input, styles.gapBelow]}
        />

        {!resumeText && (
          <Text style={[typography.caption, styles.gapBelow]}>
            Tip: upload your resume on the Resume tab first to get a personalized starting point.
          </Text>
        )}

        {resumeText && (
          <View style={[styles.resumeToggleRow, styles.gapBelow]}>
            <Text style={[typography.normal, { color: useResume ? colors.primary : colors.placeholder }]}>
              {useResume ? 'Using your uploaded resume' : 'Not using your resume'}
            </Text>
            <Switch
              value={useResume}
              onValueChange={setUseResume}
              trackColor={{ true: colors.primary }}
            />
          </View>
        )}

        <TouchableOpacity
          style={[shared.primaryButton, styles.gapBelow]}
          onPress={generateRoadmap}
          disabled={loading}
        >
          {loading ? <ActivityIndicator color={colors.white} /> : (
            <Text style={shared.primaryButtonText}>
              {stages.length > 0 ? 'Regenerate Roadmap' : 'Generate Roadmap'}
            </Text>
          )}
        </TouchableOpacity>

        {stages.map((s, i) => (
          <View key={i}>
            <Animated.View style={{ opacity: fadeAnims[i] || 1 }}>
              <TouchableOpacity
                style={[shared.card, styles.stageCard]}
                onPress={() => navigation.navigate('StepDetail', { stageIndex: i })}
              >
                <View style={[styles.statusDot, statusDotStyle(getStageStatus(i))]} />
                <View style={styles.stageTextWrap}>
                  <Text style={typography.section}>{s.title}</Text>
                  <Text style={typography.caption}>{statusLabel(getStageStatus(i))}</Text>
                </View>
              </TouchableOpacity>
            </Animated.View>

            {i < stages.length - 1 && (
              <Animated.View style={[styles.arrowWrap, { opacity: arrowAnims[i] || 1 }]}>
                <Text style={styles.arrow}>↓</Text>
              </Animated.View>
            )}
          </View>
        ))}

        {stages.length > 0 && (
          <TouchableOpacity style={styles.removeLink} onPress={removeRoadmap}>
            <Text style={styles.removeLinkText}>Remove roadmap</Text>
          </TouchableOpacity>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

function statusDotStyle(status) {
  if (status === 'done') return { backgroundColor: colors.primary };
  if (status === 'current') return { backgroundColor: colors.primary, borderWidth: 2, borderColor: colors.text };
  return { backgroundColor: colors.placeholder };
}

function statusLabel(status) {
  if (status === 'done') return 'Completed';
  if (status === 'current') return 'In progress';
  return 'Upcoming';
}

const styles = StyleSheet.create({
  content: { padding: spacing.md, paddingBottom: spacing.xl },
  centered: { alignItems: 'center', justifyContent: 'center' },
  gapBelow: { marginTop: spacing.md },
  errorText: { color: '#DC2626', marginBottom: spacing.sm },
  resumeToggleRow: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
  },
  stageCard: {
    flexDirection: 'row', alignItems: 'center', marginTop: spacing.md,
  },
  statusDot: {
    width: 12, height: 12, borderRadius: 6, marginRight: spacing.md,
  },
  stageTextWrap: { flex: 1 },
  arrowWrap: { alignItems: 'center', paddingVertical: 2 },
  arrow: { fontSize: 20, color: colors.placeholder },
  removeLink: { alignSelf: 'center', marginTop: spacing.lg },
  removeLinkText: { color: colors.placeholder, fontSize: 13 },
});