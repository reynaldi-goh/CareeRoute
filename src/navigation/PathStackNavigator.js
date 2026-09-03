import { createNativeStackNavigator } from '@react-navigation/native-stack';
import PathScreen from '../screens/PathScreen';
import StepDetailScreen from '../screens/StepDetailScreen';

const Stack = createNativeStackNavigator();

export default function PathStack() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="PathHome" component={PathScreen} options={{ title: 'Career Path' }} />
      <Stack.Screen name="StepDetail" component={StepDetailScreen} options={{ title: 'Step Detail' }} />
    </Stack.Navigator>
  );
}