import { useState, useEffect, useRef } from 'react';
import {
  View, Text, TouchableOpacity, ScrollView, Animated, StyleSheet,
} from 'react-native';
import * as Haptics from 'expo-haptics';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useCareer } from '../context/CareerContext';
import { askAI } from '../API/ai';
import { colors, typography, spacing, shared } from '../styles/styles';
import Button from '../components/Button';
import BackLink from '../components/BackLink';

export default function StepDetailScreen({ route, navigation }) {
  const { stageIndex, fromDiagram } = route.params;
  const { goal, stages, checkedByStage, toggleTodo } = useCareer();

  const stage = stages[stageIndex];
  const checked = checkedByStage[stageIndex] || {};

  const [elaborated, setElaborated] = useState(null);
  const [loading, setLoading] = useState(false);

  const doneCount = stage ? stage.todos.filter((_, i) => checked[i]).length : 0;
  const progressPct = stage && stage.todos.length > 0
    ? Math.round((doneCount / stage.todos.length) * 100)
    : 0;

  const handleBack = () => {
    // Only skip PathDiagram's reveal animation when we actually came from there —
    // arrivals from Home/Settings/Resume etc. should still see the full animation.
    navigation.navigate('PathDiagram', fromDiagram ? { skipAnim: true } : undefined);
  };

  const borderAnim = useRef(new Animated.Value(0)).current;
  const wasComplete = useRef(progressPct === 100);

  useEffect(() => {
    const justCompleted = progressPct === 100 && !wasComplete.current;
    wasComplete.current = progressPct === 100;

    if (!justCompleted) return;

    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

    Animated.sequence([
      Animated.timing(borderAnim, { toValue: 1, duration: 250, useNativeDriver: false }),
      Animated.delay(600),
      Animated.timing(borderAnim, { toValue: 0, duration: 500, useNativeDriver: false }),
    ]).start();
  }, [progressPct]);

  const animatedBorderColor = borderAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [colors.cardBorder || '#E5E7EB', '#22C55E'],
  });

  useEffect(() => {
    if (!stage) {
      navigation.navigate('PathDiagram');
    }
  }, [stage]);

  const handleToggleTodo = (i) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    toggleTodo(stageIndex, i);
  };

  const elaborateWithAI = async () => {
    if (!stage) return;
    setLoading(true);
    try {
      const parsed = await askAI(
        `You are a learning coach helping someone pursue a specific career goal. Given the person's career goal, the current stage title, and a list of short todo items, expand EACH todo into a short explanation (2-3 sentences): what it is, and specifically why/how it matters in the context of becoming a ${goal}. Tailor every explanation to that career goal, not a generic definition. Return ONLY valid JSON in this shape: {"items": [{"todo": string, "explanation": string}]}`,
        `Career goal: ${goal}\nStage: ${stage.title}\nTodos: ${stage.todos.join(', ')}`
      );

      setElaborated(parsed.items);
    } catch (err) {
      console.log('ERROR:', err.message);
    } finally {
      setLoading(false);
    }
  };

  if (!stage) return null;

  return (
    <SafeAreaView edges={['top']} style={shared.screen}>
      <ScrollView contentContainerStyle={styles.content}>
        <BackLink label="Path" onPress={handleBack} />

        <Animated.View
          style={[
            shared.card,
            styles.stageCard,
            { borderColor: animatedBorderColor, borderWidth: 1.5 },
          ]}
        >
          <Text style={styles.stageTitle}>{stage.title}</Text>
          <Text style={styles.progressText}>Progress: {progressPct}%</Text>

          <Text style={styles.tasksLabel}>Tasks</Text>
          {stage.todos.map((todo, i) => (
            <TouchableOpacity
              key={i}
              style={styles.taskRow}
              onPress={() => handleToggleTodo(i)}
              accessibilityRole="checkbox"
              accessibilityLabel={todo}
              accessibilityState={{ checked: !!checked[i] }}
            >
              <View style={[styles.checkbox, checked[i] && styles.checkboxChecked]}>
                {checked[i] && <Text style={styles.checkboxTick}>✓</Text>}
              </View>
              <Text style={[typography.normal, styles.taskLabel]}>{todo}</Text>
            </TouchableOpacity>
          ))}
        </Animated.View>

        <View style={styles.gapBelow}>
          <Button
            label={elaborated ? 'regenerate explanations' : 'elaborate with AI'}
            onPress={elaborateWithAI}
            loading={loading}
          />
        </View>

        {elaborated && (
          <View style={styles.gapBelow}>
            {elaborated.map((item, i) => (
              <View key={i} style={[shared.card, styles.explanationCard]}>
                <Text style={[typography.normal, styles.explanationTodo]}>{item.todo}</Text>
                <Text style={[typography.normal, styles.explanationText]}>
                  {item.explanation}
                </Text>
              </View>
            ))}
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  content: { padding: spacing.md, paddingBottom: spacing.xl },
  title: { fontSize: 24, fontWeight: '700', color: colors.text, textAlign: 'center', marginBottom: spacing.lg },
  stageCard: {},
  stageTitle: { fontSize: 18, fontWeight: '700', color: colors.text, textAlign: 'center' },
  progressText: { fontSize: 12, color: colors.placeholder, marginTop: spacing.sm },
  tasksLabel: { fontSize: 13, fontWeight: '600', color: colors.text, marginTop: spacing.md, marginBottom: 4 },
  gapBelow: { marginTop: spacing.md },
  taskRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 6 },
  checkbox: {
    width: 16, height: 16, borderWidth: 1.5, borderColor: colors.placeholder,
    alignItems: 'center', justifyContent: 'center', marginRight: spacing.sm,
  },
  checkboxChecked: { borderColor: colors.primary },
  checkboxTick: { color: colors.primary, fontSize: 11, fontWeight: '700' },
  taskLabel: { flex: 1, fontSize: 13 },
  explanationCard: { marginTop: spacing.sm },
  explanationTodo: { fontWeight: '600', marginBottom: 4 },
  explanationText: { color: colors.placeholder },
});