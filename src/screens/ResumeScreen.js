import { useState, useEffect } from 'react';
import {
  View, Text, TouchableOpacity, ActivityIndicator, ScrollView, StyleSheet,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as DocumentPicker from 'expo-document-picker';
import { extractText } from 'expo-pdf-text-extract';
import * as FileSystem from 'expo-file-system/legacy';
import Pdf from 'react-native-pdf';
import { useCareer } from '../context/CareerContext';
import { askAI } from '../API/ai';
import { colors, typography, radius, spacing, shared } from '../styles/styles';

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

  useEffect(() => {
    if (resumeFile?.uri) return;

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
      <SafeAreaView style={[shared.screen, styles.centered]}>
        <ActivityIndicator color={colors.primary} />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={shared.screen} edges={['top']}>
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={typography.heading}>Resume</Text>

        {error && <Text style={styles.errorText}>{error}</Text>}

        <TouchableOpacity
          style={[shared.primaryButton, styles.gapBelow]}
          onPress={pickResume}
          disabled={extracting || uploading}
        >
          <Text style={shared.primaryButtonText}>
            {previewUri ? 'Replace Resume' : 'Upload Resume'}
          </Text>
        </TouchableOpacity>

        {extracting && <StatusLine text="Extracting text..." />}
        {uploading && <StatusLine text="Saving resume..." />}
        {downloadingPreview && <StatusLine text="Loading preview..." />}

        {previewUri && (
          <View style={[shared.card, styles.previewCard]}>
            <Text style={[typography.caption, styles.previewName]}>{displayName}</Text>
            <View style={styles.pdfWrap}>
              <Pdf
                source={{ uri: previewUri, cache: false }}
                style={styles.pdf}
                onError={(err) => console.log('PDF load error:', err)}
              />
            </View>
          </View>
        )}

        <TouchableOpacity
          style={[shared.primaryButton, styles.gapBelow, (!resumeText || stages.length === 0) && styles.disabledButton]}
          onPress={generateAIFeedback}
          disabled={!resumeText || stages.length === 0 || loadingFeedback}
        >
          {loadingFeedback ? (
            <ActivityIndicator color={colors.white} />
          ) : (
            <Text style={shared.primaryButtonText}>Generate AI Feedback</Text>
          )}
        </TouchableOpacity>

        {stages.length === 0 && (
          <Text style={[typography.caption, styles.gapSmall]}>
            Generate a career roadmap first on the Path tab.
          </Text>
        )}

        {resumeFeedback && (
          <View style={[shared.card, styles.gapBelow]}>
            <View style={styles.scoreRow}>
              <Text style={typography.section}>Match Score</Text>
              <Text style={[typography.heading, styles.scoreValue]}>
                {resumeFeedback.matchScore}
                <Text style={typography.caption}>/100</Text>
              </Text>
            </View>
            {resumeFeedback.feedback.map((point, i) => (
              <View key={i} style={styles.feedbackRow}>
                <Text style={styles.feedbackBullet}>•</Text>
                <Text style={[typography.normal, styles.feedbackText]}>{point}</Text>
              </View>
            ))}
          </View>
        )}

        {(resumeFile || resumeSignedUrl) && (
          <TouchableOpacity style={styles.removeLink} onPress={removeResume}>
            <Text style={styles.removeLinkText}>Remove resume</Text>
          </TouchableOpacity>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

function StatusLine({ text }) {
  return (
    <View style={styles.statusRow}>
      <ActivityIndicator size="small" color={colors.placeholder} />
      <Text style={[typography.caption, styles.statusText]}>{text}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  content: { padding: spacing.md, paddingBottom: spacing.xl },
  centered: { alignItems: 'center', justifyContent: 'center' },
  gapBelow: { marginTop: spacing.md },
  gapSmall: { marginTop: spacing.xs },
  errorText: { color: '#DC2626', marginTop: spacing.sm },
  disabledButton: { backgroundColor: colors.placeholder },
  statusRow: { flexDirection: 'row', alignItems: 'center', marginTop: spacing.sm },
  statusText: { marginLeft: spacing.sm },
  previewCard: { marginTop: spacing.md, padding: spacing.sm },
  previewName: { marginBottom: spacing.sm, marginLeft: 4 },
  pdfWrap: { height: 400, borderRadius: radius, overflow: 'hidden' },
  pdf: { flex: 1 },
  scoreRow: {
    flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between',
    marginBottom: spacing.sm,
  },
  scoreValue: { color: colors.primary },
  feedbackRow: { flexDirection: 'row', marginTop: 6 },
  feedbackBullet: { color: colors.primary, marginRight: spacing.sm, fontSize: 16 },
  feedbackText: { flex: 1 },
  removeLink: { alignSelf: 'center', marginTop: spacing.lg },
  removeLinkText: { color: colors.placeholder, fontSize: 13 },
});