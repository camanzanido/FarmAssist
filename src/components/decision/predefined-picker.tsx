import { Colors } from '@/src/constants/colors';
import { predefinedCopy as copy } from '@/src/constants/copy';
import { getLocationsByUser } from '@/src/database/repositories/locations';
import { fetchPredefinedOptions } from '@/src/database/repositories/predefined';
import { formatCurrency } from '@/src/utils/formatters';
import { normalizeProvince, PredefinedOption, predefinedForProvince } from '@/src/utils/predefinedOptions';
import { Ionicons } from '@expo/vector-icons';
import React, { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Modal, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

type State =
  | { status: 'loading' }
  | { status: 'error' }
  | { status: 'ready'; options: PredefinedOption[]; province: string | null };

export function PredefinedPicker({
  visible, decisionType, userId, onPick, onClose,
}: {
  visible: boolean;
  decisionType: string;
  userId: string;
  onPick: (option: PredefinedOption) => void;
  onClose: () => void;
}) {
  const [state, setState] = useState<State>({ status: 'loading' });

  const load = useCallback(async () => {
    setState({ status: 'loading' });
    try {
      const [options, locations] = await Promise.all([fetchPredefinedOptions(decisionType), getLocationsByUser(userId)]);
      const province = locations[0]?.province ?? null;
      setState({ status: 'ready', options: predefinedForProvince(options, province), province });
    } catch (err) {
      console.error('Failed to load predefined options:', err);
      setState({ status: 'error' });
    }
  }, [decisionType, userId]);

  useEffect(() => {
    if (visible) load();
  }, [visible, load]);

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={s.backdrop}>
        <TouchableOpacity style={StyleSheet.absoluteFill} activeOpacity={1} onPress={onClose} />
        <View style={s.sheet}>
          <View style={s.grabber} />
          <Text style={s.title}>{copy.pickerTitle}</Text>
          <Text style={s.subtitle}>{copy.pickerSubtitle}</Text>

          {state.status === 'loading' && (
            <View style={s.center}><ActivityIndicator color={Colors.ink} /></View>
          )}
          {state.status === 'error' && (
            <View style={s.center}>
              <Ionicons name="cloud-offline-outline" size={26} color={Colors.danger} />
              <Text style={s.message}>{copy.loadError}</Text>
              <TouchableOpacity style={s.retryBtn} onPress={load}><Text style={s.retryText}>{copy.retry}</Text></TouchableOpacity>
            </View>
          )}
          {state.status === 'ready' && state.options.length === 0 && (
            <View style={s.center}>
              <Ionicons name="file-tray-outline" size={26} color={Colors.placeholder} />
              <Text style={s.message}>{copy.empty}</Text>
            </View>
          )}
          {state.status === 'ready' && state.options.length > 0 && (
            <ScrollView style={s.list} showsVerticalScrollIndicator={false}>
              {state.options.map((o) => {
                const local = !!normalizeProvince(o.province);
                return (
                  <TouchableOpacity key={o.id} style={s.row} onPress={() => onPick(o)} activeOpacity={0.75}>
                    <View style={{ flex: 1 }}>
                      <Text style={s.rowName} numberOfLines={1}>{o.option_name}</Text>
                      <View style={s.rowMetaRow}>
                        <View style={[s.tag, local && s.tagLocal]}>
                          <Text style={[s.tagText, local && s.tagTextLocal]}>{local ? o.province!.trim() : copy.allProvinces}</Text>
                        </View>
                        <Text style={s.rowPrice}>{formatCurrency(o.price)}/kg</Text>
                      </View>
                    </View>
                    <Ionicons name="download-outline" size={20} color={Colors.accent} />
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          )}

          <TouchableOpacity style={s.closeBtn} onPress={onClose}>
            <Text style={s.closeText}>{copy.close}</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

const s = StyleSheet.create({
  backdrop: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.4)' },
  sheet: {
    backgroundColor: Colors.bg, borderTopLeftRadius: 24, borderTopRightRadius: 24,
    padding: 20, paddingBottom: 30, maxHeight: '80%',
    width: '100%', maxWidth: 640, alignSelf: 'center',
  },
  grabber: { width: 38, height: 4, borderRadius: 2, backgroundColor: Colors.borderStrong, alignSelf: 'center', marginBottom: 16 },
  title: { fontSize: 20, fontWeight: '800', color: Colors.ink },
  subtitle: { fontSize: 13.5, color: Colors.inkSoft, marginTop: 4, marginBottom: 14, lineHeight: 19 },

  center: { alignItems: 'center', justifyContent: 'center', paddingVertical: 28, gap: 10 },
  message: { fontSize: 14, color: Colors.inkSoft, textAlign: 'center' },
  retryBtn: { backgroundColor: Colors.ink, borderRadius: 10, paddingVertical: 10, paddingHorizontal: 20 },
  retryText: { color: Colors.onDark, fontWeight: '700', fontSize: 13 },

  list: { flexGrow: 0 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: Colors.surface, borderRadius: 14, padding: 14, marginBottom: 8 },
  rowName: { fontSize: 16, fontWeight: '800', color: Colors.ink },
  rowMetaRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 6 },
  tag: { borderRadius: 6, paddingHorizontal: 7, paddingVertical: 2, backgroundColor: Colors.divider },
  tagLocal: { backgroundColor: Colors.accentTint },
  tagText: { fontSize: 11.5, fontWeight: '600', color: Colors.inkSoft },
  tagTextLocal: { color: Colors.accent, fontWeight: '700' },
  rowPrice: { fontSize: 13, fontWeight: '700', color: Colors.inkSoft },

  closeBtn: { marginTop: 10, height: 50, borderRadius: 14, borderWidth: 1.5, borderColor: Colors.borderStrong, alignItems: 'center', justifyContent: 'center' },
  closeText: { fontSize: 15, fontWeight: '700', color: Colors.ink },
});
