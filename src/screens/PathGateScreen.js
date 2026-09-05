import { useEffect } from 'react';
import { useCareer } from '../context/CareerContext';
import LoadingScreen from '../components/LoadingScreen';

export default function PathGateScreen({ navigation }) {
  const { loadingRoadmap, stages } = useCareer();

  useEffect(() => {
    if (loadingRoadmap) return;
    navigation.replace(stages.length > 0 ? 'PathDiagram' : 'PathPrompt');
  }, [loadingRoadmap, stages]);

  return <LoadingScreen label="Loading your path" />;
}