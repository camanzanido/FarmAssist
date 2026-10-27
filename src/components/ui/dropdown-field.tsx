import { Colors } from '@/src/constants/colors';
import { Ionicons } from '@expo/vector-icons';
import { useMemo, useState } from 'react';
import {
  FlatList,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

export interface DropdownFieldProps {
  label: string;
  value: string;
  options: readonly string[];
  onSelect: (value: string) => void;
  error?: string;
  touched?: boolean;
  placeholder?: string;
  disabled?: boolean;
  disabledHint?: string;
}

export function DropdownField({
  label,
  value,
  options,
  onSelect,
  error,
  touched,
  placeholder = 'Select…',
  disabled,
  disabledHint,
}: DropdownFieldProps) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');
  const showError = !!touched && !!error;

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return options;
    return options.filter((o) => o.toLowerCase().includes(q));
  }, [options, search]);

  function openModal() {
    if (disabled) return;
    setSearch('');
    setOpen(true);
  }

  function handleSelect(option: string) {
    onSelect(option);
    setOpen(false);
  }

  return (
    <View style={s.field}>
      <Text style={s.label}>{label}</Text>
      <TouchableOpacity
        style={[s.input, showError && s.inputError, disabled && s.inputDisabled]}
        onPress={openModal}
        activeOpacity={disabled ? 1 : 0.7}
      >
        <Text style={[s.valueText, !value && s.placeholderText]} numberOfLines={1}>
          {value || placeholder}
        </Text>
        <Ionicons name="chevron-down" size={18} color={disabled ? Colors.placeholder : Colors.inkFaint} />
      </TouchableOpacity>
      {showError && <Text style={s.errorText}>{error}</Text>}
      {disabled && disabledHint && !showError && <Text style={s.hintText}>{disabledHint}</Text>}

      <Modal visible={open} animationType="slide" transparent onRequestClose={() => setOpen(false)}>
        <Pressable style={s.overlay} onPress={() => setOpen(false)}>
          <Pressable style={s.sheet} onPress={() => {}}>
            <SafeAreaView edges={['bottom']} style={{ flex: 1 }}>
              <View style={s.sheetHeader}>
                <Text style={s.sheetTitle}>{label}</Text>
                <TouchableOpacity onPress={() => setOpen(false)} style={s.closeBtn}>
                  <Ionicons name="close" size={20} color={Colors.ink} />
                </TouchableOpacity>
              </View>

              <TextInput
                style={s.searchInput}
                value={search}
                onChangeText={setSearch}
                placeholder={`Search ${label.toLowerCase()}…`}
                placeholderTextColor={Colors.placeholder}
                autoCapitalize="words"
                autoFocus
              />

              <FlatList
                data={filtered}
                keyExtractor={(item) => item}
                keyboardShouldPersistTaps="handled"
                ListEmptyComponent={<Text style={s.emptyText}>No matches</Text>}
                renderItem={({ item }) => {
                  const selected = item === value;
                  return (
                    <TouchableOpacity style={s.option} onPress={() => handleSelect(item)}>
                      <Text style={[s.optionText, selected && s.optionTextSelected]}>{item}</Text>
                      {selected && <Ionicons name="checkmark" size={18} color={Colors.accent} />}
                    </TouchableOpacity>
                  );
                }}
              />
            </SafeAreaView>
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  );
}

const s = StyleSheet.create({
  field: { marginBottom: 14 },
  label: { fontSize: 13, fontWeight: '600', color: Colors.inkSoft, marginBottom: 6 },
  input: {
    borderWidth: 1,
    borderColor: Colors.borderStrong,
    backgroundColor: Colors.surface,
    borderRadius: 12,
    padding: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  inputError: { borderColor: Colors.danger },
  inputDisabled: { backgroundColor: Colors.border, opacity: 0.7 },
  valueText: { fontSize: 15, color: Colors.ink, flexShrink: 1 },
  placeholderText: { color: Colors.placeholder },
  errorText: { color: Colors.danger, fontSize: 12, marginTop: 5 },
  hintText: { color: Colors.inkFaint, fontSize: 12, marginTop: 5 },

  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.35)', justifyContent: 'flex-end' },
  sheet: {
    backgroundColor: Colors.surface,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '75%',
    minHeight: '50%',
  },
  sheetHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 18,
    paddingBottom: 10,
  },
  sheetTitle: { fontSize: 17, fontWeight: '700', color: Colors.ink },
  closeBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: Colors.accentTint,
    alignItems: 'center',
    justifyContent: 'center',
  },
  searchInput: {
    marginHorizontal: 20,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: Colors.borderStrong,
    backgroundColor: Colors.surface,
    borderRadius: 12,
    padding: 12,
    fontSize: 15,
    color: Colors.ink,
  },
  option: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: Colors.divider,
  },
  optionText: { fontSize: 15, color: Colors.ink },
  optionTextSelected: { fontWeight: '700', color: Colors.accent },
  emptyText: { textAlign: 'center', color: Colors.inkFaint, marginTop: 24, fontSize: 14 },
});
