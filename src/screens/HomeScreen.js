import { useEffect, useRef, useState } from 'react';
import {
  View, Text, ActivityIndicator, Linking, TouchableOpacity, Animated, StyleSheet,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useCareer } from '../context/CareerContext';
import { colors, typography, spacing, shared } from '../styles/styles';

export default function HomeScreen() {
  const { goal, stages, activeStageIndex, checkedByStage, toggleTodo } = useCareer();
  const [news, setNews] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const fadeAnim = useRef(new Animated.Value(0)).current;

  const activeStage = activeStageIndex >= 0 ? stages[activeStageIndex] : null;
  const activeChecked = checkedByStage[activeStageIndex] || {};

  useEffect(() => {
    Animated.timing(fadeAnim, { toValue: 1, duration: 400, useNativeDriver: true }).start();
  }, []);

  useEffect(() => {
    if (!goal) {
      setNews([]);
      return;
    }
    const fetchNews = async () => {
      setLoading(true);
      setError(null);
      try {
        const response = await fetch(
          `https://gnews.io/api/v4/search?q=${encodeURIComponent(goal)}&lang=en&max=5&apikey=${process.env.EXPO_PUBLIC_GNEWS_API_KEY}`
        );
        const data = await response.json();
        if (!response.ok) throw new Error(data.errors?.[0] || 'GNews request failed');
        setNews(data.articles || []);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };
    const timeout = setTimeout(fetchNews, 800);
    return () => clearTimeout(timeout);
  }, [goal]);

  return (
    <SafeAreaView style={shared.screen} edges={['top']}>
      <Animated.ScrollView
        style={{ opacity: fadeAnim }}
        contentContainerStyle={styles.content}
      >
        <Text style={typography.caption}>Career Goal</Text>
        <Text style={[typography.heading, styles.goalText]}>
          {goal || 'No goal set yet'}
        </Text>

        <Text style={[typography.section, styles.sectionSpacing]}>Today's Tasks</Text>

        {!activeStage && (
          <View style={[shared.card, styles.emptyCard]}>
            <Text style={typography.normal}>
              Generate a roadmap on the Path tab to see tasks here.
            </Text>
          </View>
        )}

        {activeStage && (
          <View style={[shared.card, styles.taskCard]}>
            <Text style={[typography.normal, styles.taskCardTitle]}>{activeStage.title}</Text>
            {activeStage.todos.map((todo, i) => (
              <TouchableOpacity
                key={i}
                style={styles.taskRow}
                onPress={() => toggleTodo(activeStageIndex, i)}
              >
                <View style={[styles.checkbox, activeChecked[i] && styles.checkboxChecked]}>
                  {activeChecked[i] && <Text style={styles.checkboxTick}>✓</Text>}
                </View>
                <Text
                  style={[
                    typography.normal,
                    styles.taskLabel,
                    activeChecked[i] && styles.taskLabelDone,
                  ]}
                >
                  {todo}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        )}

        <Text style={[typography.section, styles.sectionSpacing]}>Latest News</Text>

        {!goal && (
          <View style={[shared.card, styles.emptyCard]}>
            <Text style={typography.normal}>
              Set a career goal on the Path tab to see relevant news.
            </Text>
          </View>
        )}

        {loading && <ActivityIndicator color={colors.primary} style={styles.newsLoader} />}
        {error && <Text style={styles.errorText}>{error}</Text>}

        {news.map((article, i) => (
          <TouchableOpacity
            key={i}
            style={[shared.card, styles.newsCard]}
            onPress={() => Linking.openURL(article.url)}
          >
            <Text style={[typography.normal, styles.newsTitle]} numberOfLines={2}>
              {article.title}
            </Text>
            <Text style={typography.caption}>{article.source?.name}</Text>
          </TouchableOpacity>
        ))}
      </Animated.ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  content: { padding: spacing.md, paddingBottom: spacing.xl },
  goalText: { marginTop: 2 },
  sectionSpacing: { marginTop: spacing.lg, marginBottom: spacing.sm },
  emptyCard: { alignItems: 'flex-start' },
  taskCard: {},
  taskCardTitle: { fontWeight: '600', marginBottom: spacing.sm },
  taskRow: {
    flexDirection: 'row', alignItems: 'center', paddingVertical: 6,
  },
  checkbox: {
    width: 20, height: 20, borderRadius: 6, borderWidth: 1.5,
    borderColor: colors.placeholder, alignItems: 'center', justifyContent: 'center',
    marginRight: spacing.sm,
  },
  checkboxChecked: {
    backgroundColor: colors.primary, borderColor: colors.primary,
  },
  checkboxTick: { color: colors.white, fontSize: 12, fontWeight: '700' },
  taskLabel: { flex: 1 },
  taskLabelDone: { color: colors.placeholder, textDecorationLine: 'line-through' },
  newsLoader: { marginTop: spacing.sm },
  errorText: { color: '#DC2626', marginTop: spacing.sm },
  newsCard: { marginTop: spacing.sm },
  newsTitle: { fontWeight: '600', marginBottom: 4 },
});