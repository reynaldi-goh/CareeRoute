import { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, ScrollView } from 'react-native';
import { useCareer } from '../context/CareerContext';

export default function PathScreen({ navigation }) {
  const { goal, setGoal, stages, setStages, removeRoadmap } = useCareer();

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
          {
            role: 'system',
            content: `You are a career roadmap generator, similar to roadmap.sh.

            Given a career goal, break it down into a clear, ordered, step-by-step learning path.

            Rules:
            - Return EXACTLY 10 stages, ordered from foundational/beginner to advanced.
            - Each stage represents one skill area or topic (e.g. "Python Foundations", "Machine Learning Basics", "LangChain & LLM Apps").
            - Stages must be in logical progression — earlier stages should be prerequisites for later ones.
            - Each stage must include a "todos" array of 3-6 concrete, specific sub-topics or action items to learn/do within that stage (e.g. for "Python Foundations": "Variables", "Conditionals", "Loops", "OOP").
            - Todos should be short (2-4 words each), not full sentences.
            - Do not include any explanation, preamble, or markdown formatting outside the JSON.

            Return ONLY valid JSON in this exact shape:
            {"stages": [{"title": string, "todos": string[]}]}`
          },
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
    <ScrollView contentContainerStyle={{ padding: 20 }}>
      <TextInput value={goal} onChangeText={setGoal} placeholder="Your goal" style={{ borderWidth: 1, marginBottom: 10, padding: 8 }} />
      <TouchableOpacity onPress={generateRoadmap}>
        <Text>Generate</Text>
      </TouchableOpacity>

      {stages.map((s, i) => (
        <TouchableOpacity
          key={i}
          onPress={() => navigation.navigate('StepDetail', {stageIndex: i})}
        >
          <Text>
            {s.title}
          </Text>
        </TouchableOpacity>
      ))}

      <TouchableOpacity onPress={removeRoadmap}>
        <Text>remove roadmap</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}