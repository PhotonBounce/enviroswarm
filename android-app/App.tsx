import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Text, StyleSheet, View, ActivityIndicator, StatusBar } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { AuthProvider, useAuthContext } from './src/context/AuthContext';
import LoginScreen from './src/screens/LoginScreen';
import RegisterScreen from './src/screens/RegisterScreen';
import HomeScreen from './src/screens/HomeScreen';
import PollutionDashboardScreen from './src/screens/PollutionDashboardScreen';
import ExposureTrackerScreen from './src/screens/ExposureTrackerScreen';
import CommunityMapScreen from './src/screens/CommunityMapScreen';
import NoiseMeterScreen from './src/screens/NoiseMeterScreen';
import LightMeterScreen from './src/screens/LightMeterScreen';
import StationsScreen from './src/screens/StationsScreen';
import SubmitReadingScreen from './src/screens/SubmitReadingScreen';
import ProfileScreen from './src/screens/ProfileScreen';
import DataViewScreen from './src/screens/DataViewScreen';

const Stack = createNativeStackNavigator();
const Tab = createBottomTabNavigator();

function TabLabel({ label, focused }: { label: string; focused: boolean }) {
  return (
    <Text style={[styles.tabLabel, focused && styles.tabLabelFocused]}>
      {label}
    </Text>
  );
}

function MainTabs() {
  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarStyle: styles.tabBar,
        tabBarActiveTintColor: '#10b981',
        tabBarInactiveTintColor: '#64748b',
      }}
    >
      <Tab.Screen
        name="Dashboard"
        component={PollutionDashboardScreen}
        options={{
          tabBarLabel: ({ focused }) => <TabLabel label="Dashboard" focused={focused} />,
        }}
      />
      <Tab.Screen
        name="Home"
        component={HomeScreen}
        options={{
          tabBarLabel: ({ focused }) => <TabLabel label="Map" focused={focused} />,
        }}
      />
      <Tab.Screen
        name="Stations"
        component={StationsScreen}
        options={{
          tabBarLabel: ({ focused }) => <TabLabel label="Stations" focused={focused} />,
        }}
      />
      <Tab.Screen
        name="Submit"
        component={SubmitReadingScreen}
        options={{
          tabBarLabel: ({ focused }) => <TabLabel label="Submit" focused={focused} />,
        }}
      />
      <Tab.Screen
        name="Profile"
        component={ProfileScreen}
        options={{
          tabBarLabel: ({ focused }) => <TabLabel label="Profile" focused={focused} />,
        }}
      />
    </Tab.Navigator>
  );
}

function RootNavigator() {
  const { user, loading } = useAuthContext();

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#10b981" />
        <Text style={styles.loadingText}>Loading...</Text>
      </View>
    );
  }

  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      {user ? (
        <>
          <Stack.Screen name="Main" component={MainTabs} />
          <Stack.Screen
            name="DataView"
            component={DataViewScreen}
            options={{
              headerShown: true,
              headerStyle: { backgroundColor: '#0f172a' },
              headerTintColor: '#10b981',
              headerTitleStyle: { color: '#f1f5f9' },
              title: 'Station Data',
            }}
          />
          <Stack.Screen
            name="ExposureTracker"
            component={ExposureTrackerScreen}
            options={{
              headerShown: true,
              headerStyle: { backgroundColor: '#0f172a' },
              headerTintColor: '#10b981',
              headerTitleStyle: { color: '#f1f5f9' },
              title: 'Exposure Tracker',
            }}
          />
          <Stack.Screen
            name="CommunityMap"
            component={CommunityMapScreen}
            options={{
              headerShown: true,
              headerStyle: { backgroundColor: '#0f172a' },
              headerTintColor: '#10b981',
              headerTitleStyle: { color: '#f1f5f9' },
              title: 'Community Map',
            }}
          />
          <Stack.Screen
            name="NoiseMeter"
            component={NoiseMeterScreen}
            options={{
              headerShown: true,
              headerStyle: { backgroundColor: '#0f172a' },
              headerTintColor: '#10b981',
              headerTitleStyle: { color: '#f1f5f9' },
              title: 'Noise Meter',
            }}
          />
          <Stack.Screen
            name="LightMeter"
            component={LightMeterScreen}
            options={{
              headerShown: true,
              headerStyle: { backgroundColor: '#0f172a' },
              headerTintColor: '#10b981',
              headerTitleStyle: { color: '#f1f5f9' },
              title: 'Light Meter',
            }}
          />
        </>
      ) : (
        <>
          <Stack.Screen name="Login" component={LoginScreen} />
          <Stack.Screen name="Register" component={RegisterScreen} />
        </>
      )}
    </Stack.Navigator>
  );
}

export default function App() {
  return (
    <SafeAreaProvider>
      <StatusBar barStyle="light-content" backgroundColor="#0f172a" />
      <AuthProvider>
        <NavigationContainer>
          <RootNavigator />
        </NavigationContainer>
      </AuthProvider>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  tabBar: {
    backgroundColor: '#0f172a',
    borderTopColor: '#1e293b',
    borderTopWidth: 1,
    paddingBottom: 4,
  },
  tabLabel: {
    fontSize: 11,
    color: '#64748b',
  },
  tabLabelFocused: {
    color: '#10b981',
    fontWeight: '700',
  },
  loadingContainer: {
    flex: 1,
    backgroundColor: '#0f172a',
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    color: '#94a3b8',
    marginTop: 12,
    fontSize: 14,
  },
});
