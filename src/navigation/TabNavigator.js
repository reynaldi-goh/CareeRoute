import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Ionicons } from '@expo/vector-icons';
import HomeScreen from '../screens/HomeScreen';
import PathStack from '../navigation/PathStackNavigator';
import ResumeScreen from '../screens/ResumeScreen';
import SettingsScreen from '../screens/SettingsScreen';
import { colors } from '../styles/styles';

const Tab = createBottomTabNavigator();

const TAB_ICONS = {
  Home: { active: 'home', inactive: 'home-outline' },
  Path: { active: 'map', inactive: 'map-outline' },
  Resume: { active: 'document-text', inactive: 'document-text-outline' },
  Settings: { active: 'settings', inactive: 'settings-outline' },
};

export default function TabNavigator() {
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.placeholder,
        tabBarIcon: ({ focused, color, size }) => {
          const icon = TAB_ICONS[route.name];
          return <Ionicons name={focused ? icon.active : icon.inactive} size={size} color={color} />;
        },
      })}
    >
      <Tab.Screen name="Home" component={HomeScreen} />
      <Tab.Screen name="Path" component={PathStack} />
      <Tab.Screen name="Resume" component={ResumeScreen} />
      <Tab.Screen name="Settings" component={SettingsScreen} />
    </Tab.Navigator>
  );
}