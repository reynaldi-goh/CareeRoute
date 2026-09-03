import { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, ActivityIndicator, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as DocumentPicker from 'expo-document-picker';
import { extractText } from 'expo-pdf-text-extract';
import * as FileSystem from 'expo-file-system/legacy';
import Pdf from 'react-native-pdf';
import { useCareer } from '../context/CareerContext';
import { askAI } from '../API/ai';

export default function ResumeScreen() {
  const {
    goal, stages,
    resumeFile, setResumeFile,
    resumeText,
    resumeFeedback,
    resumeSignedUrl,
    loadingResume,
    uploadResume, saveResumeFeedback, removeResume,
  } = useCareer();

  const [extracting, setExtracting] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [loadingFeedback, setLoadingFeedback] = useState(false);
  const [error, setError] = useState(null);
  const [cachedLocalUri, setCachedLocalUri] = useState(null);
  const [downloadingPreview, setDownloadingPreview] = useState(false);

  // For a saved resume (loaded via signed URL), download it privately straight to this device
  // using expo-file-system — never touches any third-party server. react-native-pdf then reads
  // it as a local file, which sidesteps the react-native-blob-util bug entirely (that only
  // breaks on *remote* URL fetches; local files never go through that code path).
  useEffect(() => {
    if (resumeFile?.uri) return; // just picked locally this session — nothing to download

    if (!resumeSignedUrl) {
      setCachedLocalUri(null);
      return;
    }

    let cancelled = false;
    const downloadForPreview = async () => {
      setDownloadingPreview(true);
      try {
        const localPath = `${FileSystem.cacheDirectory}resume_preview.pdf`;
        const { uri } = await FileSystem.downloadAsync(resumeSignedUrl, localPath);
        if (!cancelled) setCachedLocalUri(uri);
      } catch (err) {
        console.log('resume preview download error:', err.message);
        if (!cancelled) setError('Could not load your saved resume preview.');
      } finally {
        if (!cancelled) setDownloadingPreview(false);
      }
    };
    downloadForPreview();

    return () => { cancelled = true; };
  }, [resumeSignedUrl, resumeFile]);

  const pickResume = async () => {
    const result = await DocumentPicker.getDocumentAsync({ type: 'application/pdf' });
    if (result.canceled) return;

    const picked = result.assets[0];
    setResumeFile(picked);
    setError(null);

    let text = '';
    setExtracting(true);
    try {
      text = await extractText(picked.uri);
    } catch (err) {
      console.log('extraction error:', err.message);
      setError('Could not read text from that PDF. Try a different file.');
      setExtracting(false);
      return;
    }
    setExtracting(false);

    setUploading(true);
    try {
      await uploadResume(picked.uri, text);
    } catch (err) {
      console.log('resume upload error:', err.message);
      setError(err.message || 'Something went wrong saving your resume.');
    } finally {
      setUploading(false);
    }
  };

  const generateAIFeedback = async () => {
    setLoadingFeedback(true);
    setError(null);
    try {
      const skillsList = stages.flatMap((s) => s.todos).join(', ');

      const parsed = await askAI(
        'You are a resume reviewer. Given a resume, a career goal, and the specific skills required for that career path, assess how well the resume matches. Return ONLY valid JSON in this shape: {"matchScore": number, "feedback": string[]}',
        `Resume:\n${resumeText}\n\nCareer goal: ${goal}\n\nRequired skills for this path: ${skillsList || 'not yet defined'}`
      );

      await saveResumeFeedback(parsed.matchScore, parsed.feedback);
    } catch (err) {
      console.log('ERROR:', err.message);
      setError(err.message || 'Something went wrong generating feedback.');
    } finally {
      setLoadingFeedback(false);
    }
  };

  const previewUri = resumeFile?.uri || cachedLocalUri;
  const displayName = resumeFile?.name || (resumeSignedUrl ? 'resume.pdf' : null);

  if (loadingResume) {
    return (
      <SafeAreaView style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
        <ActivityIndicator />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={{ flex: 1 }}>
      <ScrollView>
      <Text>Resume</Text>

      {error && <Text style={{ color: 'red' }}>{error}</Text>}

      <TouchableOpacity onPress={pickResume} disabled={extracting || uploading}>
        <Text>Upload Resume</Text>
      </TouchableOpacity>

      {downloadingPreview && <Text>Loading preview...</Text>}

      {previewUri && (
        <>
          <Text>{displayName}</Text>
          <View style={{ flex: 1, height: 400 }}>
            <Pdf
              source={{ uri: previewUri, cache: false }}
              style={{ flex: 1 }}
              onError={(err) => console.log('PDF load error:', err)}
            />
          </View>
        </>
      )}

      {extracting && <Text>Extracting text...</Text>}
      {uploading && <Text>Saving resume...</Text>}

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

      {(resumeFile || resumeSignedUrl) && (
        <TouchableOpacity onPress={removeResume}>
          <Text>remove resume</Text>
        </TouchableOpacity>
      )}
      </ScrollView>
    </SafeAreaView>
  );
}