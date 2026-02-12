import React from 'react';
import { Stack } from 'expo-router';
import { AuthProvider } from '../src/contexts/AuthContext';
import { StatusBar } from 'expo-status-bar';

export default function RootLayout() {
  return (
    <AuthProvider>
      <StatusBar style="dark" />
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="index" />
        <Stack.Screen name="(tabs)" />
        <Stack.Screen 
          name="delivery/[id]" 
          options={{ 
            headerShown: true,
            headerTitle: 'Detalhes da Entrega',
            headerTintColor: '#1a365d',
            headerStyle: { backgroundColor: '#f8fafc' },
          }} 
        />
        <Stack.Screen 
          name="delivery/new" 
          options={{ 
            headerShown: true,
            headerTitle: 'Nova Entrega',
            headerTintColor: '#1a365d',
            headerStyle: { backgroundColor: '#f8fafc' },
          }} 
        />
        <Stack.Screen 
          name="admin/users" 
          options={{ 
            headerShown: true,
            headerTitle: 'Gerir Utilizadores',
            headerTintColor: '#1a365d',
            headerStyle: { backgroundColor: '#f8fafc' },
          }} 
        />
        <Stack.Screen 
          name="admin/user-stats" 
          options={{ 
            headerShown: true,
            headerTitle: 'Estatísticas do Entregador',
            headerTintColor: '#1a365d',
            headerStyle: { backgroundColor: '#f8fafc' },
          }} 
        />
      </Stack>
    </AuthProvider>
  );
}
