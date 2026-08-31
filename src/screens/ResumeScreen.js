import { useState } from 'react';
import { View, Text, TouchableOpacity, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as DocumentPicker from 'expo-document-picker';
import Pdf from 'react-native-pdf';
import { extractText } from 'expo-pdf-text-extract';
import { useCareer } from '../context/CareerContext';
import { askAI } from '../API/ai';

export default function ResumeScreen() {
  const { goal, stages } = useCareer();
  const [file, setFile] = useState(null);
  const [resumeText, setResumeText] = useState('');
  const [extracting, setExtracting] = useState(false);
  const [aiResponse, setAiResponse] = useState(null);
  const [loadingFeedback, setLoadingFeedback] = useState(false);

  const pickResume = async () => {
    const result = await DocumentPicker.getDocumentAsync({
      type: 'application/pdf',
    });

    if (!result.canceled) {
      const picked = result.assets[0];
      setFile(picked);
      setAiResponse(null);

      setExtracting(true);
      try {
        const text = await extractText(picked.uri);
        console.log('extracted text:', text);
        setResumeText(text);
      } catch (err) {
        console.log('extraction error:', err.message);
      } finally {
        setExtracting(false);
      }
    }
  };

const generateAIFeedback = async () => {
  setLoadingFeedback(true);
  try {
    const skillsList = stages
      .flatMap((s) => s.todos)
      .join(', ');

    const parsed = await askAI(
      'You are a resume reviewer. Given a resume, a career goal, and the specific skills required for that career path, assess how well the resume matches. Return ONLY valid JSON in this shape: {"matchScore": number, "feedback": string[]}',
      `Resume:\n${resumeText}\n\nCareer goal: ${goal}\n\nRequired skills for this path: ${skillsList}`
    );

    setAiResponse(parsed);
  } catch (err) {
    console.log('ERROR:', err.message);
  } finally {
    setLoadingFeedback(false);
  }
};

  return (
    <SafeAreaView style={{ flex: 1 }}>
      <Text>Resume</Text>

      <TouchableOpacity onPress={pickResume}>
        <Text>Upload Resume</Text>
      </TouchableOpacity>

      {file && (
        <>
          <Text>{file.name}</Text>
          <View style={{ flex: 1, height: 600 }}>
            <Pdf source={{ uri: file.uri, cache: false }} style={{ flex: 1 }} />
          </View>
        </>
      )}

      {extracting && <Text>Extracting text...</Text>}

      <TouchableOpacity onPress={generateAIFeedback} disabled={!resumeText || loadingFeedback}>
        <Text>generate AI feedbacks</Text>
      </TouchableOpacity>

      {loadingFeedback && <ActivityIndicator />}

      {aiResponse && (
        <View>
          <Text>Match score: {aiResponse.matchScore}/100</Text>
          {aiResponse.feedback.map((point, i) => (
            <Text key={i}>• {point}</Text>
          ))}
        </View>
      )}
    </SafeAreaView>
  );
}