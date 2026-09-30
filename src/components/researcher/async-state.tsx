import { Colors } from '@/src/constants/colors';
import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import { ActivityIndicator, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

export function ResearcherAsyncState({
  isLoading,
  error,
  onRetry,
  errorMessage,
  skeleton,
  children,
}: {
  isLoading: boolean;
  error: boolean;
  onRetry: () => void;
  errorMessage: string;
  skeleton?: React.ReactNode;
  children: React.ReactNode;
}) {
  if (isLoading) {
    if (skeleton) return <>{skeleton}</>;
    return (
      <View style={s.centerWrap}>
        <ActivityIndicator size="large" color={Colors.ink} />
      </View>
    );
  }

  if (error) {
    return (
      <View style={s.centerWrap}>
        <Ionicons name="cloud-offline-outline" size={32} color={Colors.inkFaint} />
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
  centerWrap: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 32 },
  errorText: { fontSize: 14, fontWeight: '600', color: Colors.ink, textAlign: 'center', marginTop: 10, marginBottom: 16 },
  retryBtn: { backgroundColor: Colors.ink, borderRadius: 10, paddingHorizontal: 20, paddingVertical: 10 },
  retryBtnText: { fontSize: 13, fontWeight: '700', color: Colors.onDark },
});
