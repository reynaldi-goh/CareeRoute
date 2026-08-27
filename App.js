import { NavigationContainer } from '@react-navigation/native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { CareerProvider } from './src/context/CareerContext';
import TabNavigator from './src/navigation/TabNavigator';

export default function App() {
  return (
    <CareerProvider>
      <SafeAreaProvider>
        <NavigationContainer>
          <TabNavigator />
        </NavigationContainer>
      </SafeAreaProvider>
    </CareerProvider>
  );
}