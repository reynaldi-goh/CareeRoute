import { useEffect, useRef, useState } from 'react';

import {
  View,
  Text,
  Image,
  ActivityIndicator,
  Linking,
  TouchableOpacity,
  Animated,
  StyleSheet,
} from 'react-native';

import { SafeAreaView } from 'react-native-safe-area-context';

import { useCareer } from '../context/CareerContext';
import { useProfile } from '../context/ProfileContext';
import { colors, typography, spacing, shared, radius } from '../styles/styles';

export default function HomeScreen({ navigation }) {
  const {
    goal,
    stages,
    activeStageIndex,
    checkedByStage,
    toggleTodo,
  } = useCareer();

  const { username } = useProfile();

  const [news, setNews] = useState([]);
  const [newsIndex, setNewsIndex] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const fadeAnim = useRef(new Animated.Value(0)).current;

  const activeStage =
    activeStageIndex >= 0 ? stages[activeStageIndex] : null;

  const activeChecked =
    checkedByStage[activeStageIndex] || {};

  // -------------------------
  // Fade in
  // -------------------------
  useEffect(() => {
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 400,
      useNativeDriver: true,
    }).start();
  }, []);

  // -------------------------
  // Fetch news
  // -------------------------
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
          `https://gnews.io/api/v4/search?q=${encodeURIComponent(
            goal
          )}&lang=en&max=5&apikey=${process.env.EXPO_PUBLIC_GNEWS_API_KEY}`
        );

        const data = await response.json();

        if (!response.ok) {
          throw new Error(
            data.errors?.[0] || 'GNews request failed'
          );
        }

        setNews(data.articles || []);
        setNewsIndex(0);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    const timeout = setTimeout(fetchNews, 800);

    return () => clearTimeout(timeout);
  }, [goal]);

  // -------------------------
  // News navigation
  // -------------------------
  const currentArticle = news[newsIndex];

  const formatNewsDate = (isoString) => {
    if (!isoString) return null;
    const date = new Date(isoString);
    if (isNaN(date)) return null;
    return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
  };

  const previousNews = () => {
    if (news.length === 0) return;

    setNewsIndex((prev) =>
      prev === 0 ? news.length - 1 : prev - 1
    );
  };

  const nextNews = () => {
    if (news.length === 0) return;

    setNewsIndex((prev) =>
      prev === news.length - 1 ? 0 : prev + 1
    );
  };

  return (
    <SafeAreaView
      style={shared.screen}
      edges={['top']}
    >
      <Animated.ScrollView
        style={{ opacity: fadeAnim }}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >

        {/* -------------------------
            Greeting
        ------------------------- */}

        <Text style={styles.greeting}>
          Welcome back, {username || 'there'}!
        </Text>


        {/* -------------------------
            Career Goal
        ------------------------- */}

        <View style={styles.goalCard}>
          <Text style={styles.cardTitle}>
            Career Goal
          </Text>

          <Text style={styles.goalText}>
            {goal || 'No goal set yet'}
          </Text>

          {activeStage && (
            <Text style={styles.currentStage}>
              {activeStage.title} (current)
            </Text>
          )}
        </View>


        {/* -------------------------
            Continue Learning
        ------------------------- */}

        <TouchableOpacity
          style={[shared.primaryButton, styles.sectionButton]}
          activeOpacity={0.8}
          onPress={() => navigation.navigate('Path')}
        >
          <Text style={shared.primaryButtonText}>
            continue learning
          </Text>
        </TouchableOpacity>


        {/* -------------------------
            Today's Tasks
        ------------------------- */}

        <Text style={styles.sectionTitle}>
          Today's Tasks
        </Text>

        <View style={styles.taskCard}>

          {activeStage ? (
            <>
              {activeStage.todos.map((todo, i) => (
                <View
                  key={i}
                  style={styles.taskRow}
                >
                  <View
                    style={[
                      styles.checkbox,
                      activeChecked[i] &&
                        styles.checkboxChecked,
                    ]}
                  >
                    {activeChecked[i] && (
                      <Text style={styles.checkboxTick}>
                        ✓
                      </Text>
                    )}
                  </View>

                  <Text
                    style={[
                      styles.taskLabel,
                      activeChecked[i] &&
                        styles.taskLabelDone,
                    ]}
                  >
                    {todo}
                  </Text>
                </View>
              ))}
            </>
          ) : (
            <Text style={typography.normal}>
              Generate a roadmap to see your tasks.
            </Text>
          )}

        </View>


        {/* -------------------------
            Finish Tasks
        ------------------------- */}

        <TouchableOpacity
          style={[shared.primaryButton, styles.sectionButton]}
          activeOpacity={0.8}
            onPress={() =>
            navigation.navigate('Path', {
              screen: 'StepDetail',
              params: { stageIndex: activeStageIndex },
            })
          }
        >
          <Text style={shared.primaryButtonText}>
            finish the tasks
          </Text>
        </TouchableOpacity>


        {/* -------------------------
            Latest News
        ------------------------- */}

        <Text style={styles.sectionTitle}>
          Latest News
        </Text>

        {loading && (
          <ActivityIndicator
            color={colors.primary}
            style={styles.newsLoader}
          />
        )}

        {error && (
          <Text style={styles.errorText}>
            {error}
          </Text>
        )}

        {!loading && !error && currentArticle && (
          <View style={styles.newsContainer}>

            {/* Left arrow */}
            <TouchableOpacity
              style={styles.newsArrow}
              onPress={previousNews}
            >
              <Text style={styles.arrowText}>
                ←
              </Text>
            </TouchableOpacity>


            {/* News Card */}
            <View style={styles.newsCard}>
              {currentArticle.image ? (
                <Image
                  source={{ uri: currentArticle.image }}
                  style={styles.newsImage}
                  resizeMode="cover"
                />
              ) : (
                <View style={styles.newsImagePlaceholder}>
                  <Text style={styles.newsImagePlaceholderIcon}>📰</Text>
                </View>
              )}

              <View style={styles.newsCardBody}>
                {(currentArticle.source?.name || formatNewsDate(currentArticle.publishedAt)) && (
                  <Text style={styles.newsMeta}>
                    {currentArticle.source?.name}
                    {currentArticle.source?.name && formatNewsDate(currentArticle.publishedAt) ? '  ·  ' : ''}
                    {formatNewsDate(currentArticle.publishedAt)}
                  </Text>
                )}

                <Text
                  style={styles.newsTitle}
                  numberOfLines={2}
                >
                  {currentArticle.title}
                </Text>

                {currentArticle.description && (
                  <Text
                    style={styles.newsDescription}
                    numberOfLines={3}
                  >
                    {currentArticle.description}
                  </Text>
                )}

                <TouchableOpacity
                  onPress={() => Linking.openURL(currentArticle.url)}
                  hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
                >
                  <Text style={styles.newsReadMore}>
                    Read full article →
                  </Text>
                </TouchableOpacity>
              </View>
            </View>


            {/* Right arrow */}
            <TouchableOpacity
              style={styles.newsArrow}
              onPress={nextNews}
            >
              <Text style={styles.arrowText}>
                →
              </Text>
            </TouchableOpacity>

          </View>
        )}

        {!loading && !error && !currentArticle && (
          <View style={styles.newsCard}>
            <View style={styles.newsCardBody}>
              <Text style={typography.normal}>
                No news available.
              </Text>
            </View>
          </View>
        )}

      </Animated.ScrollView>
    </SafeAreaView>
  );
}


const styles = StyleSheet.create({

  content: {
    paddingHorizontal: spacing.md,
    paddingTop: spacing.sm,
    paddingBottom: spacing.xl,
  },

  // Greeting
  greeting: {
    fontSize: 24,
    fontWeight: '700',
    color: colors.text,
    marginBottom: spacing.lg,
  },

  // Career Goal
  goalCard: {
    backgroundColor: colors.cardBackground,
    borderRadius: radius,
    borderWidth: 1,
    borderColor: '#9CA3AF',
    padding: spacing.md,
    alignItems: 'center',
  },

  cardTitle: {
    fontSize: 20,
    fontWeight: '500',
    color: colors.text,
  },

  goalText: {
    fontSize: 28,
    fontWeight: '500',
    color: colors.text,
    marginTop: spacing.sm,
    textAlign: 'center',
  },

  currentStage: {
    fontSize: 12,
    color: colors.text,
    marginTop: spacing.sm,
    textAlign: 'center',
  },

  // Section
  sectionTitle: {
    fontSize: 22,
    fontWeight: '600',
    color: colors.text,
    marginTop: spacing.xl,
    marginBottom: spacing.lg,
  },

  sectionButton: {
    marginVertical: spacing.lg,
  },

  // Tasks
  taskCard: {
    backgroundColor: colors.cardBackground,
    borderRadius: radius,
    borderWidth: 1,
    borderColor: '#9CA3AF',
    padding: spacing.md,
  },

  taskRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 5,
  },

  checkbox: {
    width: 15,
    height: 15,
    borderWidth: 1,
    borderColor: colors.placeholder,
    marginRight: spacing.sm,
    alignItems: 'center',
    justifyContent: 'center',
  },

  checkboxChecked: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },

  checkboxTick: {
    color: colors.white,
    fontSize: 10,
    fontWeight: '700',
  },

  taskLabel: {
    flex: 1,
    fontSize: 13,
    color: colors.text,
  },

  taskLabelDone: {
    color: colors.placeholder,
    textDecorationLine: 'line-through',
  },

  // News
  newsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },

  newsArrow: {
    width: 28,
    alignItems: 'center',
    justifyContent: 'center',
  },

  arrowText: {
    fontSize: 25,
    color: colors.text,
  },

  newsCard: {
    flex: 1,
    backgroundColor: colors.cardBackground,
    borderRadius: radius,
    borderWidth: 1,
    borderColor: '#9CA3AF',
    overflow: 'hidden',
  },

  newsImage: {
    width: '100%',
    height: 130,
    backgroundColor: '#E5E7EB',
  },

  newsImagePlaceholder: {
    width: '100%',
    height: 130,
    backgroundColor: '#E5E7EB',
    alignItems: 'center',
    justifyContent: 'center',
  },

  newsImagePlaceholderIcon: {
    fontSize: 32,
  },

  newsCardBody: {
    padding: spacing.md,
  },

  newsMeta: {
    fontSize: 10,
    fontWeight: '600',
    color: colors.primary,
    textTransform: 'uppercase',
    letterSpacing: 0.3,
    marginBottom: 4,
  },

  newsTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.text,
  },

  newsDescription: {
    fontSize: 12,
    color: colors.placeholder,
    lineHeight: 17,
    marginTop: 4,
  },

  newsReadMore: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.primary,
    marginTop: spacing.sm,
  },

  newsLoader: {
    marginTop: spacing.sm,
  },

  errorText: {
    color: '#DC2626',
    marginTop: spacing.sm,
  },
});