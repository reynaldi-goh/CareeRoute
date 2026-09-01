import { useState } from 'react';
import { View, Text, TouchableOpacity, ActivityIndicator, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as DocumentPicker from 'expo-document-picker';
import { extractText } from 'expo-pdf-text-extract';
import Pdf from 'react-native-pdf';
import { useCareer } from '../context/CareerContext';
import { askAI } from '../API/ai';

export default function ResumeScreen() {
  const {
    goal, stages,
    resumeFile, setResumeFile,
    resumeText, setResumeText,
    resumeFeedback, setResumeFeedback,
    removeResume,
  } = useCareer();

  const [extracting, setExtracting] = useState(false);
  const [loadingFeedback, setLoadingFeedback] = useState(false);

  const pickResume = async () => {
    const result = await DocumentPicker.getDocumentAsync({ type: 'application/pdf' });
    if (!result.canceled) {
      const picked = result.assets[0];
      setResumeFile(picked);
      setResumeFeedback(null);
      setExtracting(true);
      try {
        const text = await extractText(picked.uri);
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
      const skillsList = stages.flatMap((s) => s.todos).join(', ');

      const parsed = await askAI(
        'You are a resume reviewer. Given a resume, a career goal, and the specific skills required for that career path, assess how well the resume matches. Return ONLY valid JSON in this shape: {"matchScore": number, "feedback": string[]}',
        `Resume:\n${resumeText}\n\nCareer goal: ${goal}\n\nRequired skills for this path: ${skillsList || 'not yet defined'}`
      );

      setResumeFeedback(parsed);
    } catch (err) {
      console.log('ERROR:', err.message);
    } finally {
      setLoadingFeedback(false);
    }
  };

  return (
    <SafeAreaView style={{ flex: 1 }}>
      <ScrollView>
      <Text>Resume</Text>

      <TouchableOpacity onPress={pickResume}>
        <Text>Upload Resume</Text>
      </TouchableOpacity>

      {resumeFile && (
        <>
          <Text>{resumeFile.name}</Text>
          <View style={{ flex: 1, height: 400 }}>
            <Pdf source={{ uri: resumeFile.uri, cache: false }} style={{ flex: 1 }} />
          </View>
        </>
      )}

      {extracting && <Text>Extracting text...</Text>}

      <TouchableOpacity onPress={generateAIFeedback} disabled={!resumeText || stages.length === 0 || loadingFeedback}>
        <Text>generate AI feedbacks</Text>
      </TouchableOpacity>
      {stages.length === 0 && <Text>Generate a career roadmap first on the Path tab.</Text>}

      {loadingFeedback && <ActivityIndicator />}

      {resumeFeedback && (
        <View>
          <Text>Match score: {resumeFeedback.matchScore}/100</Text>
          {resumeFeedback.feedback.map((point, i) => (
            <Text key={i}>• {point}</Text>
          ))}
        </View>
      )}

      {resumeFile && (
        <TouchableOpacity onPress={removeResume}>
          <Text>remove resume</Text>
        </TouchableOpacity>
      )}
      </ScrollView>
    </SafeAreaView>
  );
}