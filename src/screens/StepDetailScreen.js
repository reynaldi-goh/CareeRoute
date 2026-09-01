import { useState } from 'react';
import { View, Text, TouchableOpacity, ActivityIndicator, ScrollView } from 'react-native';
import { useCareer } from '../context/CareerContext';
import { askAI } from '../API/ai';

export default function StepDetailScreen({ route }) {
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

  return (
    <ScrollView contentContainerStyle={{ padding: 20 }}>
      <Text>{stage.title}</Text>

      {stage.todos.map((todo, i) => (
        <TouchableOpacity key={i} onPress={() => toggleTodo(stageIndex, i)}>
          <Text>{checked[i] ? '☑' : '☐'} {todo}</Text>
        </TouchableOpacity>
      ))}

      <TouchableOpacity onPress={elaborateWithAI}>
        <Text>Elaborate with AI</Text>
      </TouchableOpacity>

      {loading && <ActivityIndicator />}

      {elaborated && (
        <View>
          {elaborated.map((item, i) => (
            <View key={i}>
              <Text>{item.todo}</Text>
              <Text>{item.explanation}</Text>
            </View>
          ))}
        </View>
      )}
    </ScrollView>
  );
}