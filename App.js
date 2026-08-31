import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import TabNavigator from './src/navigation/TabNavigator';
import AuthStack from 'src/navigation/AuthNavigator';
import { CareerProvider } from './src/context/CareerContext';

const RootStack = createNativeStackNavigator();

export default function App() {
  return (
    <CareerProvider>
      <SafeAreaProvider>
        <NavigationContainer>
          <RootStack.Navigator screenOptions={{ headerShown: false }}>
            <RootStack.Screen name="Auth" component={AuthStack} />
            <RootStack.Screen name="MainTabs" component={TabNavigator} />
          </RootStack.Navigator>
        </NavigationContainer>
      </SafeAreaProvider>
    </CareerProvider>
  );
}