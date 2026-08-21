import { useState, useEffect } from 'react';
import { View, Text, ActivityIndicator, Linking } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function HomeScreen() {
  const [news, setNews] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchNews = async () => {
      try {
        const query = 'software engineer'; // hardcode for now to test
        const response = await fetch(
          `https://gnews.io/api/v4/search?q=${encodeURIComponent(query)}&lang=en&max=5&apikey=${process.env.EXPO_PUBLIC_GNEWS_API_KEY}`
        );
        const data = await response.json();

        if (!response.ok) {
          throw new Error(data.errors?.[0] || 'GNews request failed');
        }

        setNews(data.articles || []);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchNews();
  }, []);

  return (
    <SafeAreaView>
      <Text>Latest News</Text>

      {loading && <ActivityIndicator />}
      {error && <Text>{error}</Text>}
      {console.log(news)}
      {news.map((article, i) => (
        <View key={i} >
          <Text>{article.title}</Text>
          <Text>{article.source?.name}</Text>
          <Text onPress={() => Linking.openURL(article.url)}>
            {article.url}
          </Text>
        </View>
      ))}
    </SafeAreaView>
  );
}
