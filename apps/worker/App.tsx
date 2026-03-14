import React, { useEffect } from 'react';
import { SafeAreaView, StyleSheet, ActivityIndicator, View } from 'react-native';
import { AuthProvider, useAuth } from './src/lib/authContext';
import LoginScreen from './src/screens/LoginScreen';
import HomeScreen from './src/screens/HomeScreen';

function AppContent() {
  const { isAuthenticated, loading } = useAuth();

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#0ea5e9" />
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      {isAuthenticated ? <HomeScreen /> : <LoginScreen />}
    </SafeAreaView>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f0f9ff',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f0f9ff',
  },
});
