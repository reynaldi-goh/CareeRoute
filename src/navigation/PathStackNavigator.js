import { createNativeStackNavigator } from '@react-navigation/native-stack';
import PathGateScreen from '../screens/PathGateScreen';
import PathPromptScreen from '../screens/PathPromptScreen';
import PathDiagramScreen from '../screens/PathDiagramScreen';
import StepDetailScreen from '../screens/StepDetailScreen';

const Stack = createNativeStackNavigator();

// stack nested inside the Path tab, gate decides whether to show the prompt or the diagram
export default function PathStackNavigator() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="PathGate" component={PathGateScreen} />
      <Stack.Screen name="PathPrompt" component={PathPromptScreen} />
      <Stack.Screen name="PathDiagram" component={PathDiagramScreen} />
      <Stack.Screen name="StepDetail" component={StepDetailScreen} />
    </Stack.Navigator>
  );
}