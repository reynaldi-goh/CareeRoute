import { useRef, useCallback, useMemo } from 'react';
import { View, Text, TouchableOpacity, ScrollView, Animated, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import { useCareer } from '../context/CareerContext';
import { colors, typography, spacing, shared, radius } from '../styles/styles';

export default function PathDiagramScreen({ navigation }) {
  const { goal, stages, getStageStatus, removeRoadmap } = useCareer();

  const fadeAnims = useMemo(() => stages.map(() => new Animated.Value(0)), [stages]);
  const slideAnims = useMemo(() => stages.map(() => new Animated.Value(16)), [stages]);
  const arrowAnims = useMemo(() => stages.map(() => new Animated.Value(0)), [stages]);

  const pulseAnim = useRef(new Animated.Value(1)).current;
  const pulseLoopRef = useRef(null);

  // Set to true right before pushing StepDetail — tells the next focus effect
  // to skip the reveal and just show the settled state, since the user is
  // simply returning to a screen they were already looking at.
  const skipNextRevealRef = useRef(false);

  const startPulseLoop = () => {
    pulseAnim.setValue(1);
    pulseLoopRef.current = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, { toValue: 1.05, duration: 700, useNativeDriver: true }),
        Animated.timing(pulseAnim, { toValue: 1, duration: 700, useNativeDriver: true }),
      ])
    );
    pulseLoopRef.current.start();
  };

  useFocusEffect(
    useCallback(() => {
      if (stages.length === 0) {
        navigation.replace('PathPrompt');
        return;
      }

      if (skipNextRevealRef.current) {
        skipNextRevealRef.current = false;
        // jump straight to end-state, no animation — just returning from StepDetail
        fadeAnims.forEach((v) => v.setValue(1));
        slideAnims.forEach((v) => v.setValue(0));
        arrowAnims.forEach((v) => v.setValue(1));
        startPulseLoop();

        return () => {
          if (pulseLoopRef.current) {
            pulseLoopRef.current.stop();
            pulseLoopRef.current = null;
          }
          pulseAnim.setValue(1);
        };
      }

      // fresh arrival (from another tab, or a newly generated roadmap) — play the full reveal
      fadeAnims.forEach((v) => v.setValue(0));
      slideAnims.forEach((v) => v.setValue(16));
      arrowAnims.forEach((v) => v.setValue(0));
      pulseAnim.setValue(1);

      const sequence = [];
      stages.forEach((_, i) => {
        sequence.push(
          Animated.parallel([
            Animated.timing(fadeAnims[i], { toValue: 1, duration: 350, useNativeDriver: true }),
            Animated.spring(slideAnims[i], { toValue: 0, useNativeDriver: true, friction: 7, tension: 60 }),
          ])
        );
        if (i < stages.length - 1) {
          sequence.push(
            Animated.timing(arrowAnims[i], { toValue: 1, duration: 200, useNativeDriver: true })
          );
        }
      });

      Animated.stagger(80, sequence).start(startPulseLoop);

      return () => {
        if (pulseLoopRef.current) {
          pulseLoopRef.current.stop();
          pulseLoopRef.current = null;
        }
        pulseAnim.setValue(1);
      };
    }, [stages])
  );

  if (stages.length === 0) return null;

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

        {stages.map((s, i) => {
          const status = getStageStatus(i);
          const isGoal = i === stages.length - 1;

          return (
            <View key={i}>
              <Animated.View
                style={{
                  opacity: fadeAnims[i],
                  transform: [
                    { translateY: slideAnims[i] },
                    { scale: status === 'current' ? pulseAnim : 1 },
                  ],
                }}
              >
                <View style={styles.stageRow}>
                  <View style={styles.arrowSlot}>
                    {status === 'current' && <Text style={styles.sideArrow}>→</Text>}
                  </View>

                  <TouchableOpacity
                    style={[
                      styles.stageCard,
                      status === 'done' && styles.stageCardDone,
                      status === 'current' && styles.stageCardCurrent,
                      status === 'upcoming' && styles.stageCardUpcoming,
                    ]}
                    onPress={() => {
                      skipNextRevealRef.current = true;
                      navigation.navigate('StepDetail', { stageIndex: i });
                    }}
                  >
                    <Text
                      style={[
                        styles.stageText,
                        status === 'done' && styles.stageTextDone,
                        isGoal && styles.stageTextGoal,
                      ]}
                    >
                      {s.title}
                    </Text>
                  </TouchableOpacity>

                  <View style={styles.arrowSlot}>
                    {status === 'current' && <Text style={styles.sideArrow}>←</Text>}
                  </View>
                </View>
              </Animated.View>

              {i < stages.length - 1 && (
                <Animated.View
                  style={[
                    styles.arrowWrap,
                    {
                      opacity: arrowAnims[i],
                      transform: [
                        {
                          translateY: arrowAnims[i].interpolate({
                            inputRange: [0, 1],
                            outputRange: [-6, 0],
                          }),
                        },
                      ],
                    },
                  ]}
                >
                  <Text style={styles.arrow}>↓</Text>
                </Animated.View>
              )}
            </View>
          );
        })}

        <TouchableOpacity style={[shared.dangerButton, styles.removeButton]} onPress={removeRoadmap}>
          <Text style={shared.dangerButtonText}>remove roadmap</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
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

  stageRow: { flexDirection: 'row', alignItems: 'center', marginTop: spacing.md },
  arrowSlot: { width: 20, alignItems: 'center' },
  sideArrow: { fontSize: 18, color: colors.placeholder },

  stageCard: {
    flex: 1,
    borderRadius: radius,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.md,
    alignItems: 'center',
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: '#9CA3AF',
  },
  stageCardDone: {
    backgroundColor: '#4B5563',
    borderWidth: 0,
  },
  stageCardCurrent: {
    borderColor: colors.primary,
    borderWidth: 2,
  },
  stageCardUpcoming: {},

  stageText: { fontSize: 14, fontWeight: '500', color: colors.text, textAlign: 'center' },
  stageTextDone: { color: colors.white, fontWeight: '600' },
  stageTextGoal: { fontSize: 16, fontWeight: '700' },

  arrowWrap: { alignItems: 'center', paddingVertical: 2 },
  arrow: { fontSize: 20, color: colors.placeholder },

  removeButton: { width: '100%', marginTop: spacing.xl },
});