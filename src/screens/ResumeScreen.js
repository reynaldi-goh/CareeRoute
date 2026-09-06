import { useState, useEffect } from 'react';
import {
  View, Text, TouchableOpacity, ActivityIndicator, ScrollView, StyleSheet
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as DocumentPicker from 'expo-document-picker';
import { extractText } from 'expo-pdf-text-extract';
import * as FileSystem from 'expo-file-system/legacy';
import Pdf from 'react-native-pdf';
import * as Haptics from 'expo-haptics';
import { Ionicons } from '@expo/vector-icons';
import { useCareer } from '../context/CareerContext';
import { askAI } from '../API/ai';
import { colors, typography, radius, spacing, shared } from '../styles/styles';
import Button from '../components/Button';
import LoadingScreen from '../components/LoadingScreen';
import { confirmAction } from '../utils/confirmAction';

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
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
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
    const run = async () => {
      setLoadingFeedback(true);
      setError(null);
      try {
        const skillsList = stages.flatMap((s) => s.todos).join(', ');

        const parsed = await askAI(
          'You are a resume reviewer. Given a resume, a career goal, and the specific skills required for that career path, assess how well the resume matches. Return ONLY valid JSON in this shape: {"matchScore": number (0-100, whole number), "feedback": string[]}',
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

    // Regenerating discards any existing feedback, so confirm if there's something to lose
    if (resumeFeedback) {
      confirmAction({
        title: 'Regenerate feedback?',
        message: 'This will replace your current AI feedback and score.',
        confirmLabel: 'Regenerate',
        onConfirm: run,
      });
    } else {
      run();
    }
  };

  const handleRemoveResume = () => {
    confirmAction({
      title: 'Remove resume?',
      message: 'This will delete your uploaded resume and any AI feedback on it.',
      confirmLabel: 'Remove',
      onConfirm: removeResume,
    });
  };

  const previewUri = resumeFile?.uri || cachedLocalUri;
  const displayName = resumeFile?.name || (resumeSignedUrl ? 'resume.pdf' : null);
  const busy = extracting || uploading;

  if (loadingResume) {
    return <LoadingScreen label="Loading your resume" />;
  }

  return (
    <SafeAreaView style={shared.screen} edges={['top']}>
      <ScrollView contentContainerStyle={styles.content}>

        {error && <Text style={styles.errorText} accessibilityRole="alert">{error}</Text>}

        {!previewUri && !downloadingPreview && (
          <TouchableOpacity
            style={[styles.uploadBox, styles.gapBelow]}
            onPress={pickResume}
            disabled={busy}
            activeOpacity={0.7}
            accessibilityRole="button"
            accessibilityLabel="Upload your resume as a PDF"
            accessibilityState={{ disabled: busy, busy }}
          >
            {busy ? (
              <>
                <ActivityIndicator color={colors.placeholder} />
                <Text style={styles.uploadCaption}>
                  {extracting ? 'Extracting text...' : 'Saving resume...'}
                </Text>
              </>
            ) : (
              <>
                <Ionicons name="cloud-upload-outline" size={40} color={colors.placeholder} />
                <Text style={styles.uploadCaption}>upload your resume in .pdf format</Text>
              </>
            )}
          </TouchableOpacity>
        )}

        {!previewUri && downloadingPreview && (
          <View style={[styles.uploadBox, styles.gapBelow]} accessible accessibilityLabel="Loading preview">
            <ActivityIndicator color={colors.placeholder} />
            <Text style={styles.uploadCaption}>Loading preview...</Text>
          </View>
        )}

        {previewUri && (
          <View style={[shared.card, styles.previewCard, styles.gapBelow]}>
            <View style={styles.previewHeaderRow}>
              <View style={styles.previewNameRow}>
                <Ionicons name="document-text-outline" size={14} color={colors.placeholder} />
                <Text style={[typography.caption, styles.previewName]}>{displayName}</Text>
              </View>
              <TouchableOpacity
                onPress={pickResume}
                disabled={busy}
                accessibilityRole="button"
                accessibilityLabel="Replace resume"
                accessibilityState={{ disabled: busy, busy }}
              >
                <Text style={styles.replaceLink}>
                  {busy ? (extracting ? 'Extracting...' : 'Saving...') : 'Replace'}
                </Text>
              </TouchableOpacity>
            </View>
            <View style={styles.pdfWrap}>
              <Pdf
                source={{ uri: previewUri, cache: false }}
                style={styles.pdf}
                onError={(err) => console.log('PDF load error:', err)}
              />
              <Text style={styles.previewLabel}>preview</Text>
            </View>
          </View>
        )}

        <View style={styles.gapBelow}>
          <Button
            label="generate AI feedbacks"
            onPress={generateAIFeedback}
            loading={loadingFeedback}
            disabled={!resumeText || stages.length === 0}
          />
        </View>

        {stages.length === 0 && (
          <Text style={[typography.caption, styles.gapSmall]}>
            Generate a career roadmap first on the Path tab.
          </Text>
        )}

        {resumeFeedback && (
          <View style={[shared.card, styles.gapBelow]}>
            <Text style={typography.section}>AI Response</Text>

            <View style={styles.scoreRow}>
              <Text style={typography.normal}>Match Score</Text>
              <Text style={[typography.heading, styles.scoreValue]}>
                {resumeFeedback.matchScore}
                <Text style={typography.caption}>/100</Text>
              </Text>
            </View>

            <Text style={[typography.normal, styles.feedbackHeading]}>AI Feedback</Text>
            {resumeFeedback.feedback.map((point, i) => (
              <View key={i} style={styles.feedbackRow}>
                <Text style={styles.feedbackBullet}>•</Text>
                <Text style={[typography.normal, styles.feedbackText]}>{point}</Text>
              </View>
            ))}
          </View>
        )}

        {(resumeFile || resumeSignedUrl) && (
          <View style={styles.gapBelow}>
            <Button label="remove resume" variant="danger" onPress={handleRemoveResume} />
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  content: { padding: spacing.md, paddingBottom: spacing.xl },
  title: { fontSize: 24, fontWeight: '700', color: colors.text, textAlign: 'center' },
  gapBelow: { marginTop: spacing.lg },
  gapSmall: { marginTop: spacing.xs },
  errorText: { color: '#DC2626', marginTop: spacing.sm },

  uploadBox: {
    height: 220,
    borderWidth: 1,
    borderColor: '#9CA3AF',
    borderRadius: radius,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.lg,
  },
  uploadCaption: { fontSize: 13, color: colors.placeholder, marginTop: spacing.sm, textAlign: 'center' },

  previewCard: { padding: spacing.sm },
  previewHeaderRow: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    marginBottom: spacing.sm, marginHorizontal: 4,
  },
  previewNameRow: { flexDirection: 'row', alignItems: 'center', flex: 1, gap: spacing.xs },
  previewName: {},
  replaceLink: { color: colors.primary, fontWeight: '600', fontSize: 13 },
  pdfWrap: { height: 400, borderRadius: radius, overflow: 'hidden' },
  pdf: { flex: 1 },
  previewLabel: {
    position: 'absolute', bottom: spacing.sm, right: spacing.sm,
    fontSize: 11, color: colors.placeholder,
  },

  scoreRow: {
    flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between',
    marginTop: spacing.sm,
  },
  scoreValue: { color: colors.primary },
  feedbackHeading: { fontWeight: '600', marginTop: spacing.md },
  feedbackRow: { flexDirection: 'row', marginTop: 6 },
  feedbackBullet: { color: colors.primary, marginRight: spacing.sm, fontSize: 16 },
  feedbackText: { flex: 1 },
});