import { useState } from 'react';
import {
  View, Text, TouchableOpacity, ActivityIndicator, ScrollView, StyleSheet,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useCareer } from '../context/CareerContext';
import { askAI } from '../API/ai';
import { colors, typography, spacing, shared } from '../styles/styles';

export default function StepDetailScreen({ route, navigation }) {
  const { stageIndex } = route.params;
  const { goal, stages, checkedByStage, toggleTodo } = useCareer();
  const stage = stages[stageIndex];
  const checked = checkedByStage[stageIndex] || {};

  const [elaborated, setElaborated] = useState(null);
  const [loading, setLoading] = useState(false);

  const elaborateWithAI = async () => {
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

  const doneCount = stage.todos.filter((_, i) => checked[i]).length;

  return (
    <SafeAreaView edges={['top']} style={shared.screen}>
      <ScrollView contentContainerStyle={styles.content}>
        <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
          <Text style={styles.backArrow}>←</Text>
          <Text style={[typography.normal, styles.backLabel]}>Path</Text>
        </TouchableOpacity>

        <Text style={typography.heading}>{stage.title}</Text>
        <Text style={[typography.caption, styles.progressText]}>
          {doneCount} of {stage.todos.length} completed
        </Text>

        <View style={[shared.card, styles.gapBelow]}>
          {stage.todos.map((todo, i) => (
            <TouchableOpacity
              key={i}
              style={[styles.taskRow, i > 0 && styles.taskRowDivider]}
              onPress={() => toggleTodo(stageIndex, i)}
            >
              <View style={[styles.checkbox, checked[i] && styles.checkboxChecked]}>
                {checked[i] && <Text style={styles.checkboxTick}>✓</Text>}
              </View>
              <Text
                style={[
                  typography.normal,
                  styles.taskLabel,
                  checked[i] && styles.taskLabelDone,
                ]}
              >
                {todo}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        <TouchableOpacity
          style={[shared.primaryButton, styles.gapBelow]}
          onPress={elaborateWithAI}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color={colors.white} />
          ) : (
            <Text style={shared.primaryButtonText}>
              {elaborated ? 'Regenerate Explanations' : 'Elaborate with AI'}
            </Text>
          )}
        </TouchableOpacity>

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
  backButton: {
    flexDirection: 'row', alignItems: 'center', marginBottom: spacing.md,
    alignSelf: 'flex-start',
  },
  backArrow: { fontSize: 20, color: colors.primary, marginRight: 4 },
  backLabel: { color: colors.primary, fontWeight: '600' },
  progressText: { marginTop: 2 },
  gapBelow: { marginTop: spacing.md },
  taskRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: spacing.sm },
  taskRowDivider: { borderTopWidth: 1, borderTopColor: '#E5E7EB' },
  checkbox: {
    width: 20, height: 20, borderRadius: 6, borderWidth: 1.5,
    borderColor: colors.placeholder, alignItems: 'center', justifyContent: 'center',
    marginRight: spacing.sm,
  },
  checkboxChecked: { backgroundColor: colors.primary, borderColor: colors.primary },
  checkboxTick: { color: colors.white, fontSize: 12, fontWeight: '700' },
  taskLabel: { flex: 1 },
  taskLabelDone: { color: colors.placeholder, textDecorationLine: 'line-through' },
  explanationCard: { marginTop: spacing.sm },
  explanationTodo: { fontWeight: '600', marginBottom: 4 },
  explanationText: { color: colors.placeholder },
});