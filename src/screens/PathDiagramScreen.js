import { useEffect, useRef } from 'react';
import { View, Text, TouchableOpacity, ScrollView, Animated, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useCareer } from '../context/CareerContext';
import { colors, typography, spacing, shared } from '../styles/styles';

export default function PathDiagramScreen({ navigation }) {
  const { goal, stages, getStageStatus, removeRoadmap } = useCareer();

  const fadeAnims = useRef([]).current;
  const arrowAnims = useRef([]).current;

  useEffect(() => {
    if (stages.length === 0) {
      navigation.replace('PathPrompt');
      return;
    }

    fadeAnims.length = 0;
    arrowAnims.length = 0;
    stages.forEach(() => {
      fadeAnims.push(new Animated.Value(0));
      arrowAnims.push(new Animated.Value(0));
    });

    const sequence = [];
    stages.forEach((_, i) => {
      sequence.push(Animated.timing(fadeAnims[i], { toValue: 1, duration: 350, useNativeDriver: true }));
      if (i < stages.length - 1) {
        sequence.push(Animated.timing(arrowAnims[i], { toValue: 1, duration: 200, useNativeDriver: true }));
      }
    });

    Animated.stagger(80, sequence).start();
  }, [stages]);

  if (stages.length === 0) return null; // brief flash while the effect above redirects

  return (
    <SafeAreaView edges={['top']} style={shared.screen}>
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.headerRow}>
          <View>
            <Text style={typography.caption}>Career Goal</Text>
            <Text style={typography.heading}>{goal}</Text>
          </View>
          <TouchableOpacity style={styles.editButton} onPress={() => navigation.navigate('PathPrompt')}>
            <Text style={styles.editButtonText}>Edit</Text>
          </TouchableOpacity>
        </View>

        {stages.map((s, i) => (
          <View key={i}>
            <Animated.View style={{ opacity: fadeAnims[i] || 1 }}>
              <TouchableOpacity
                style={[shared.card, styles.stageCard]}
                onPress={() => navigation.navigate('StepDetail', { stageIndex: i })}
              >
                <View style={[styles.statusDot, statusDotStyle(getStageStatus(i))]} />
                <View style={styles.stageTextWrap}>
                  <Text style={typography.section}>{s.title}</Text>
                  <Text style={typography.caption}>{statusLabel(getStageStatus(i))}</Text>
                </View>
              </TouchableOpacity>
            </Animated.View>

            {i < stages.length - 1 && (
              <Animated.View style={[styles.arrowWrap, { opacity: arrowAnims[i] || 1 }]}>
                <Text style={styles.arrow}>↓</Text>
              </Animated.View>
            )}
          </View>
        ))}

        <TouchableOpacity style={styles.removeLink} onPress={removeRoadmap}>
          <Text style={styles.removeLinkText}>Remove roadmap</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

function statusDotStyle(status) {
  if (status === 'done') return { backgroundColor: colors.primary };
  if (status === 'current') return { backgroundColor: colors.primary, borderWidth: 2, borderColor: colors.text };
  return { backgroundColor: colors.placeholder };
}

function statusLabel(status) {
  if (status === 'done') return 'Completed';
  if (status === 'current') return 'In progress';
  return 'Upcoming';
}

const styles = StyleSheet.create({
  content: { padding: spacing.md, paddingBottom: spacing.xl },
  headerRow: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    marginBottom: spacing.md,
  },
  editButton: {
    backgroundColor: colors.cardBackground, borderRadius: 16,
    paddingHorizontal: spacing.md, paddingVertical: spacing.sm,
  },
  editButtonText: { color: colors.primary, fontWeight: '600' },
  stageCard: { flexDirection: 'row', alignItems: 'center', marginTop: spacing.md },
  statusDot: { width: 12, height: 12, borderRadius: 6, marginRight: spacing.md },
  stageTextWrap: { flex: 1 },
  arrowWrap: { alignItems: 'center', paddingVertical: 2 },
  arrow: { fontSize: 20, color: colors.placeholder },
  removeLink: { alignSelf: 'center', marginTop: spacing.lg },
  removeLinkText: { color: colors.placeholder, fontSize: 13 },
});