import { useState, useEffect } from 'react';
import {
  View, Text, TouchableOpacity, ActivityIndicator, ScrollView, StyleSheet
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
        'You are a resume reviewer. Given a resume, a career goal, and the specific skills required for that career path, assess how well the resume matches. Return ONLY valid JSON in this shape: {"matchScore": number (0-10, whole number), "feedback": string[]}',
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
  const busy = extracting || uploading;

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

        {error && <Text style={styles.errorText}>{error}</Text>}

        {/* -------------------------
            No resume yet — big tappable upload box
        ------------------------- */}
        {!previewUri && !downloadingPreview && (
          <TouchableOpacity
            style={[styles.uploadBox, styles.gapBelow]}
            onPress={pickResume}
            disabled={busy}
            activeOpacity={0.7}
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
                <Text style={styles.uploadArrow}>↑</Text>
                <Text style={styles.uploadCaption}>upload your resume in .pdf format</Text>
              </>
            )}
          </TouchableOpacity>
        )}

        {/* -------------------------
            Fetching a previously-saved resume for preview
        ------------------------- */}
        {!previewUri && downloadingPreview && (
          <View style={[styles.uploadBox, styles.gapBelow]}>
            <ActivityIndicator color={colors.placeholder} />
            <Text style={styles.uploadCaption}>Loading preview...</Text>
          </View>
        )}

        {/* -------------------------
            Resume uploaded — preview card
        ------------------------- */}
        {previewUri && (
          <View style={[shared.card, styles.previewCard, styles.gapBelow]}>
            <View style={styles.previewHeaderRow}>
              <Text style={[typography.caption, styles.previewName]}>{displayName}</Text>
              <TouchableOpacity onPress={pickResume} disabled={busy}>
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

        <TouchableOpacity
          style={[shared.primaryButton, styles.gapBelow, (!resumeText || stages.length === 0) && styles.disabledButton]}
          onPress={generateAIFeedback}
          disabled={!resumeText || stages.length === 0 || loadingFeedback}
        >
          {loadingFeedback ? (
            <ActivityIndicator color={colors.white} />
          ) : (
            <Text style={shared.primaryButtonText}>generate AI feedbacks</Text>
          )}
        </TouchableOpacity>

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
          <TouchableOpacity style={[shared.dangerButton, styles.gapBelow]} onPress={removeResume}>
            <Text style={shared.dangerButtonText}>remove resume</Text>
          </TouchableOpacity>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  content: { padding: spacing.md, paddingBottom: spacing.xl },
  centered: { alignItems: 'center', justifyContent: 'center' },
  title: { fontSize: 24, fontWeight: '700', color: colors.text, textAlign: 'center' },
  gapBelow: { marginTop: spacing.lg },
  gapSmall: { marginTop: spacing.xs },
  errorText: { color: '#DC2626', marginTop: spacing.sm },
  disabledButton: { backgroundColor: colors.placeholder },

  uploadBox: {
    height: 220,
    borderWidth: 1,
    borderColor: '#9CA3AF',
    borderRadius: radius,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.lg,
  },
  uploadArrow: { fontSize: 40, color: colors.placeholder, marginBottom: spacing.sm },
  uploadCaption: { fontSize: 13, color: colors.placeholder, marginTop: spacing.sm, textAlign: 'center' },

  previewCard: { padding: spacing.sm },
  previewHeaderRow: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    marginBottom: spacing.sm, marginHorizontal: 4,
  },
  previewName: { flex: 1 },
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