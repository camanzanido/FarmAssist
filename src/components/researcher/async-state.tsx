import { ResearcherColors as C } from '@/src/constants/colors';
import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import { ActivityIndicator, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

export function ResearcherAsyncState({
  isLoading,
  error,
  onRetry,
  errorMessage,
  children,
}: {
  isLoading: boolean;
  error: boolean;
  onRetry: () => void;
  errorMessage: string;
  children: React.ReactNode;
}) {
  if (isLoading) {
    return (
      <View style={s.centerWrap}>
        <ActivityIndicator size="large" color={C.accent} />
      </View>
    );
  }

  if (error) {
    return (
      <View style={s.centerWrap}>
        <Ionicons name="cloud-offline-outline" size={28} color={C.textFaint} />
        <Text style={s.errorText}>{errorMessage}</Text>
        <TouchableOpacity style={s.retryBtn} onPress={onRetry} activeOpacity={0.8}>
          <Text style={s.retryBtnText}>Retry</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return <>{children}</>;
}

const s = StyleSheet.create({
  centerWrap: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  errorText: { fontSize: 13.5, color: C.textSoft, textAlign: 'center', marginTop: 10, marginBottom: 16, paddingHorizontal: 30 },
  retryBtn: { backgroundColor: C.card, borderRadius: 11, paddingHorizontal: 20, paddingVertical: 11 },
  retryBtnText: { fontSize: 13.5, fontWeight: '700', color: C.text },
});
