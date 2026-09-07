import { useEffect } from 'react';
import { useCareer } from '../context/CareerContext';
import LoadingScreen from '../components/LoadingScreen';

export default function PathGateScreen({ navigation }) {
  const { loadingRoadmap, stages } = useCareer();

  // redirect once loaded (replace this gate screen with PathDiagram or PathPrompt,
  // depending on whether a roadmap already exists, replace, not navigate, so this
  // screen leaves the stack entirely and can't be returned to)
  useEffect(() => {
    if (loadingRoadmap) return;
    navigation.replace(stages.length > 0 ? 'PathDiagram' : 'PathPrompt');
  }, [loadingRoadmap, stages]);

  return <LoadingScreen label="Loading your path" />;
}