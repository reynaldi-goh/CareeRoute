import { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, ScrollView, ActivityIndicator, Switch } from 'react-native';
import { useCareer } from '../context/CareerContext';
import { askAI } from '../API/ai';

export default function PathScreen({ navigation }) {
  const {
    goal, setGoal,
    stages, applyRoadmap, removeRoadmap,
    getStageStatus,
    resumeText,
  } = useCareer();

  const [input, setInput] = useState(goal || '');
  const [loading, setLoading] = useState(false);
  const [useResume, setUseResume] = useState(!!resumeText);

  const includeResume = useResume && !!resumeText;

  const generateRoadmap = async () => {
    setLoading(true);
    try {
      const { jobTitle } = await askAI(
        'Extract the specific job/career title from the user\'s message, even if phrased casually or with extra commentary. Return ONLY valid JSON: {"jobTitle": string}. Use standard title casing (e.g. "ML Engineer", "UX Designer").',
        input
      );
      setGoal(jobTitle); // overwrite the messy input with the clean title

      const parsed = await askAI(
        `You are a career roadmap generator, similar to roadmap.sh.

        Given a career goal and (optionally) the user's resume, break it down into a clear, ordered, step-by-step learning path.

        Rules:
        - Return EXACTLY 10 stages, ordered from foundational/beginner to advanced.
        - The FINAL stage's title MUST be the career goal itself (e.g. if the goal is "AI Engineer", the last stage is titled "AI Engineer"). It represents the destination, not another skill topic — give it exactly ONE todo: "Apply for [goal] roles".
        - The other 9 stages each represent one skill area or topic, in logical prerequisite order.
        - Each of those stages must include a "todos" array of 3-6 short (2-4 word) sub-topics.
        - If a resume is provided, assess which todos the user has LIKELY ALREADY satisfied based on their stated experience/skills. For each stage, include "completedTodos": an array of the 0-based indexes of todos already satisfied. If no resume is provided, "completedTodos" should be empty for every stage.
        - Do not include any explanation, preamble, or markdown outside the JSON.

        Return ONLY valid JSON in this exact shape:
        {"stages": [{"title": string, "todos": string[], "completedTodos": number[]}]}`,

        `My career goal: ${jobTitle}\n\n${includeResume ? `My resume:\n${resumeText}` : 'No resume provided.'}`
      );

      applyRoadmap(parsed.stages);
    } catch (err) {
      console.log('ERROR:', err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <ScrollView contentContainerStyle={{ padding: 20 }}>
      <TextInput
        value={input}
        onChangeText={setInput}
        placeholder="Your goal"
        style={{ borderWidth: 1, marginBottom: 10, padding: 8 }}
      />

      {!resumeText && (
        <Text style={{ marginBottom: 10, color: '#888' }}>
          Tip: upload your resume on the Resume tab first to get a personalized starting point.
        </Text>
      )}

      {resumeText && (
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'space-between',
            marginBottom: 10,
          }}
        >
          <Text style={{ color: useResume ? '#4A7CFF' : '#888' }}>
            {useResume
              ? 'Using your uploaded resume to assess progress'
              : 'Not using your resume for this roadmap'}
          </Text>
          <Switch value={useResume} onValueChange={setUseResume} />
        </View>
      )}

      <TouchableOpacity onPress={generateRoadmap} disabled={loading}>
        {loading ? <ActivityIndicator /> : <Text>Generate</Text>}
      </TouchableOpacity>

      {stages.map((s, i) => (
        <TouchableOpacity
          key={i}
          onPress={() => navigation.navigate('StepDetail', { stageIndex: i })}
        >
          <Text>[{getStageStatus(i)}] {s.title}</Text>
        </TouchableOpacity>
      ))}

      <TouchableOpacity onPress={removeRoadmap}>
        <Text>remove roadmap</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}