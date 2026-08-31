import React from 'react';
import { ActivityIndicator, Modal, StyleSheet, Text, View } from 'react-native';

export interface LoadingModalProps {
  visible: boolean;
  message?: string;
  color?: string;
}

export function LoadingModal({
  visible,
  message,
  color = '#0A3B28',
}: LoadingModalProps) {
  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      statusBarTranslucent
      onRequestClose={() => {}}
    >
      <View style={styles.overlay}>
        <View style={styles.card}>
          <ActivityIndicator size="large" color={color} />
          {message ? <Text style={styles.message}>{message}</Text> : null}
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.35)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  card: {
    minWidth: 140,
    paddingVertical: 24,
    paddingHorizontal: 28,
    borderRadius: 16,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.2,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
    elevation: 6,
  },
  message: {
    marginTop: 12,
    fontSize: 14,
    fontWeight: '600',
    color: '#0A3B28',
    textAlign: 'center',
  },
});
