import { useFeedback } from '@/src/components/feedback/FeedbackProvider';
import { ResearcherColors as C } from '@/src/constants/colors';
import type { Decision } from '@/src/database/repositories/decisions';
import type { Location } from '@/src/database/repositories/locations';
import type { User } from '@/src/database/repositories/users';
import { getActionErrorMessage } from '@/src/utils/errors';
import { Ionicons } from '@expo/vector-icons';
import React, { useState } from 'react';
import { Modal, Share, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

type Format = 'excel' | 'pdf';

function csvEscape(value: string | number): string {
  const str = String(value);
  return /[",\n]/.test(str) ? `"${str.replace(/"/g, '""')}"` : str;
}

function buildCsv(
  decisions: Decision[],
  opts: { includeFarmerLocation: boolean; includeClimate: boolean },
  usersById: Map<string, User>,
  locationsById: Map<string, Location>
): string {
  const headers = ['id', 'decision_type', 'datetime', 'result', 'profit_increase'];
  if (opts.includeFarmerLocation) headers.push('farmer', 'city', 'province');
  if (opts.includeClimate) headers.push('climate_driest', 'climate_mid', 'climate_wettest');

  const rows = decisions.map(d => {
    const row = [d.id, d.decision_type, d.datetime, d.result, d.profit_increase];
    if (opts.includeFarmerLocation) {
      const farmer = usersById.get(d.user_id)?.name ?? '';
      const loc = locationsById.get(d.location_id);
      row.push(farmer, loc?.city ?? '', loc?.province ?? '');
    }
    if (opts.includeClimate) {
      row.push(d.climate_driest, d.climate_mid, d.climate_wettest);
    }
    return row.map(csvEscape).join(',');
  });

  return [headers.join(','), ...rows].join('\n');
}

export function ExportSheet({
  visible, onClose, decisions, users, locations,
}: {
  visible: boolean;
  onClose: () => void;
  decisions: Decision[];
  users: User[];
  locations: Location[];
}) {
  const [format, setFormat] = useState<Format>('excel');
  const [includeFarmerLocation, setIncludeFarmerLocation] = useState(true);
  const [includeClimate, setIncludeClimate] = useState(false);
  const { notify } = useFeedback();

  const handleExport = async () => {
    const usersById = new Map(users.map(u => [u.id, u]));
    const locationsById = new Map(locations.map(l => [l.id, l]));
    const csv = buildCsv(decisions, { includeFarmerLocation, includeClimate }, usersById, locationsById);
    try {
      await Share.share({ message: csv, title: 'FarmAssist decisions export' });
      onClose();
    } catch (err) {
      console.error('Export share failed:', err);
      // Close first: on iOS a toast would render behind this sheet's Modal.
      // The sheet stays mounted, so the chosen options survive reopening it.
      onClose();
      notify.error('Export failed', getActionErrorMessage(err, "Couldn't share the export. Please try again."));
    }
  };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={s.backdrop}>
        <TouchableOpacity style={StyleSheet.absoluteFill} activeOpacity={1} onPress={onClose} />
        <View style={s.sheet}>
          <View style={s.grabber} />
          <Text style={s.title}>Export decisions</Text>
          <Text style={s.subtitle}>{decisions.length} records match your current filters.</Text>

          <Text style={s.sectionLabel}>FORMAT</Text>
          <View style={s.formatRow}>
            <TouchableOpacity
              style={[s.formatCard, format === 'excel' && s.formatCardSelected]}
              onPress={() => setFormat('excel')}
            >
              <Ionicons name="grid-outline" size={24} color={format === 'excel' ? C.accentStrong : C.textSoft} />
              <Text style={s.formatLabel}>Excel (CSV)</Text>
              <Text style={s.formatHint}>Raw rows</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[s.formatCard, format === 'pdf' && s.formatCardSelected]}
              onPress={() => setFormat('pdf')}
            >
              <Ionicons name="document-text-outline" size={24} color={format === 'pdf' ? C.accentStrong : C.textSoft} />
              <Text style={s.formatLabel}>PDF</Text>
              <Text style={s.formatHint}>Not available yet</Text>
            </TouchableOpacity>
          </View>

          <Text style={s.sectionLabel}>INCLUDE</Text>
          <View style={s.includeCard}>
            <View style={[s.includeRow, s.includeRowBorder]}>
              <View style={[s.checkbox, s.checkboxChecked]}>
                <Ionicons name="checkmark" size={15} color={C.accentDeepText} />
              </View>
              <Text style={s.includeLabel}>Decision inputs & results</Text>
            </View>
            <TouchableOpacity
              style={[s.includeRow, s.includeRowBorder]}
              onPress={() => setIncludeFarmerLocation(v => !v)}
            >
              <View style={[s.checkbox, includeFarmerLocation && s.checkboxChecked]}>
                {includeFarmerLocation && <Ionicons name="checkmark" size={15} color={C.accentDeepText} />}
              </View>
              <Text style={s.includeLabel}>Farmer & location</Text>
            </TouchableOpacity>
            <TouchableOpacity style={s.includeRow} onPress={() => setIncludeClimate(v => !v)}>
              <View style={[s.checkbox, includeClimate && s.checkboxChecked]}>
                {includeClimate && <Ionicons name="checkmark" size={15} color={C.accentDeepText} />}
              </View>
              <Text style={s.includeLabel}>Climate probabilities</Text>
            </TouchableOpacity>
          </View>


          <TouchableOpacity
            style={[s.exportBtn, format === 'pdf' && s.exportBtnDisabled]}
            onPress={handleExport}
            disabled={format === 'pdf' || decisions.length === 0}
            activeOpacity={0.85}
          >
            <Ionicons name="download-outline" size={19} color={C.accentDeepText} />
            <Text style={s.exportBtnText}>Export {decisions.length} record{decisions.length === 1 ? '' : 's'}</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

const s = StyleSheet.create({
  backdrop: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.45)' },
  sheet: { backgroundColor: '#0B2E20', borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 20, paddingBottom: 34 },
  grabber: { width: 38, height: 4, borderRadius: 2, backgroundColor: 'rgba(255,255,255,0.24)', alignSelf: 'center', marginBottom: 18 },
  title: { fontSize: 21, fontWeight: '800', color: C.text, marginBottom: 4 },
  subtitle: { fontSize: 13.5, color: C.textSoft, marginBottom: 20 },

  sectionLabel: { fontSize: 12, fontWeight: '700', letterSpacing: 0.8, color: C.textFaint, marginBottom: 10 },
  formatRow: { flexDirection: 'row', gap: 9, marginBottom: 20 },
  formatCard: { flex: 1, borderWidth: 1, borderColor: C.cardBorder, borderRadius: 14, padding: 15, alignItems: 'center' },
  formatCardSelected: { borderWidth: 2, borderColor: C.accentStrong, backgroundColor: 'rgba(168,212,180,0.1)' },
  formatLabel: { fontSize: 14, fontWeight: '800', color: C.text, marginTop: 7 },
  formatHint: { fontSize: 11.5, color: C.textSoft, marginTop: 2 },

  includeCard: { backgroundColor: C.card, borderRadius: 14, overflow: 'hidden', marginBottom: 18 },
  includeRow: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 15, paddingVertical: 14 },
  includeRowBorder: { borderBottomWidth: 1, borderBottomColor: C.divider },
  checkbox: { width: 22, height: 22, borderRadius: 7, borderWidth: 1.5, borderColor: 'rgba(255,255,255,0.25)', alignItems: 'center', justifyContent: 'center' },
  checkboxChecked: { backgroundColor: C.accentStrong, borderColor: C.accentStrong },
  includeLabel: { flex: 1, fontSize: 14.5, color: C.text },


  exportBtn: { height: 58, borderRadius: 15, backgroundColor: C.accentStrong, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 9 },
  exportBtnDisabled: { opacity: 0.4 },
  exportBtnText: { fontSize: 16, fontWeight: '800', color: C.accentDeepText },
});
