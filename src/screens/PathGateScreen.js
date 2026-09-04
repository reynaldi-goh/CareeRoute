import { useEffect } from 'react';
import { ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useCareer } from '../context/CareerContext';
import { colors, shared } from '../styles/styles';
import { StyleSheet } from 'react-native';

export default function PathGateScreen({ navigation }) {
  const { loadingRoadmap, stages } = useCareer();

  useEffect(() => {
    if (loadingRoadmap) return;
    navigation.replace(stages.length > 0 ? 'PathDiagram' : 'PathPrompt');
  }, [loadingRoadmap, stages]);

  return (
    <SafeAreaView edges={['top']} style={[shared.screen, styles.centered]}>
      <ActivityIndicator color={colors.primary} />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  centered: { alignItems: 'center', justifyContent: 'center' },
});