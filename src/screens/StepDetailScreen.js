import { View, Text, ScrollView } from 'react-native';

export default function StepDetailScreen({ route }) {
  const { stage } = route.params;

  return (
    <ScrollView contentContainerStyle={{ padding: 20 }}>
      <Text>{stage.title}</Text>

      {stage.todos.map((todo, i) => (
        <Text key={i}>{i + 1}. {todo}</Text>
      ))}
    </ScrollView>
  );
}