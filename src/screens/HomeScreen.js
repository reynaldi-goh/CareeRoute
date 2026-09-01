import { useEffect, useState } from 'react';
import { View, Text, ActivityIndicator, Linking, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useCareer } from '../context/CareerContext';

export default function HomeScreen() {
  const { goal, stages, activeStageIndex, checkedByStage, toggleTodo } = useCareer();
  const [news, setNews] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const activeStage = activeStageIndex >= 0 ? stages[activeStageIndex] : null;
  const activeChecked = checkedByStage[activeStageIndex] || {};

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
    <SafeAreaView>
      <Text>Career Goal</Text>
      <Text>{goal || 'No goal set yet'}</Text>

      <Text>Today's Tasks</Text>
      {!activeStage && <Text>Generate a roadmap on the Path tab to see tasks here.</Text>}
      {activeStage && (
        <View>
          <Text>{activeStage.title}</Text>
          {activeStage.todos.map((todo, i) => (
            <TouchableOpacity key={i} onPress={() => toggleTodo(activeStageIndex, i)}>
              <Text>{activeChecked[i] ? '☑' : '☐'} {todo}</Text>
            </TouchableOpacity>
          ))}
        </View>
      )}

      <Text>Latest News</Text>
      {!goal && <Text>Set a career goal on the Path tab to see relevant news.</Text>}
      {loading && <ActivityIndicator />}
      {error && <Text>{error}</Text>}
      {news.map((article, i) => (
        <View key={i}>
          <Text>{article.title}</Text>
          <Text>{article.source?.name}</Text>
          <Text onPress={() => Linking.openURL(article.url)}>{article.url}</Text>
        </View>
      ))}
    </SafeAreaView>
  );
}