import { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity } from 'react-native';

export default function PathScreen() {
  const [goal, setGoal] = useState('');
  const [stages, setStages] = useState([]);

  const generateRoadmap = async () => {
    console.log('button pressed');
    try {
      const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${process.env.EXPO_PUBLIC_GROQ_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'openai/gpt-oss-20b',
          messages: [
            { role: 'system', content: 'Return ONLY valid JSON: {"stages": [{"title": string, "description": string}]}' },
            { role: 'user', content: `My career goal: ${goal}` },
          ],
          response_format: { type: 'json_object' },
        }),
      });

      const data = await response.json();
      console.log('raw response:', data);

      const parsed = JSON.parse(data.choices[0].message.content);
      setStages(parsed.stages);
    } catch (err) {
      console.log('ERROR:', err.message);
    }
  };

  return (
    <View style={{ padding: 20 }}>
      <TextInput value={goal} onChangeText={setGoal} placeholder="Your goal" style={{ borderWidth: 1, marginBottom: 10, padding: 8 }} />
      <TouchableOpacity onPress={generateRoadmap}>
        <Text>Generate</Text>
      </TouchableOpacity>

      {stages.map((s, i) => (
        <Text key={i}>{s.title}</Text>
      ))}
    </View>
  );
}