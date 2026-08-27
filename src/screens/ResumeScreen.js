import { useState } from 'react';
import { View, Text, TouchableOpacity, Image, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as DocumentPicker from 'expo-document-picker';
import { PdfThumbnail } from 'react-native-pdf-thumbnail';

export default function ResumeScreen() {
  const [file, setFile] = useState(null);
  const [thumbnail, setThumbnail] = useState(null);
  const [loadingThumbnail, setLoadingThumbnail] = useState(false);
  const [aiResponse, setAiResponse] = useState(null);
  const [loadingFeedback, setLoadingFeedback] = useState(false);

  const pickResume = async () => {
    const result = await DocumentPicker.getDocumentAsync({
      type: 'application/pdf',
    });

    if (!result.canceled) {
      const selectedFile = result.assets[0];
      setFile(selectedFile);
      generateThumbnail(selectedFile.uri);
    }
  };

  const generateThumbnail = async (uri) => {
    setLoadingThumbnail(true);
    setThumbnail(null);
    try {
      const { uri: thumbUri } = await PdfThumbnail.generate(uri, 0);
      setThumbnail(thumbUri);
    } catch (e) {
      console.log('Thumbnail generation error:', e);
    } finally {
      setLoadingThumbnail(false);
    }
  };

  const generateAIFeedback = async () => {
    setLoadingFeedback(true);
    try {
      const dummyResumeText = `John Doe
Software Engineer
Experience: 2 years building React Native apps.
Skills: JavaScript, React, Node.js, basic Python.
Education: BSc Computer Science.`;

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
              content: 'You are a resume reviewer. Return ONLY valid JSON in this shape: {"matchScore": number, "feedback": string[]}',
            },
            {
              role: 'user',
              content: `Resume:\n${dummyResumeText}\n\nCareer goal: AI Engineer`,
            },
          ],
          response_format: { type: 'json_object' },
        }),
      });

      const data = await response.json();
      console.log('raw response:', data);

      const parsed = JSON.parse(data.choices[0].message.content);
      setAiResponse(parsed);
    } catch (err) {
      console.log('ERROR:', err.message);
    } finally {
      setLoadingFeedback(false);
    }
  };

  return (
    <SafeAreaView>
      <Text>Resume</Text>

      <TouchableOpacity onPress={pickResume}>
        <Text>Upload Resume</Text>
      </TouchableOpacity>

      {file && <Text>{file.name}</Text>}

      {loadingThumbnail && <ActivityIndicator />}

      {thumbnail && <Image source={{ uri: thumbnail }} />}

      <TouchableOpacity onPress={generateAIFeedback}>
        <Text>generate AI feedbacks</Text>
      </TouchableOpacity>

      {loadingFeedback && <ActivityIndicator />}

      {aiResponse && (
        <View>
          <Text>Match score: {aiResponse.matchScore}/10</Text>
          {aiResponse.feedback.map((point, i) => (
            <Text key={i}>• {point}</Text>
          ))}
        </View>
      )}
    </SafeAreaView>
  );
}