import { Colors } from '@/src/constants/colors';
import { PAGE_SIZES, type PageSize, type PageWindow } from '@/src/utils/pagination';
import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';

type Props = {
  info: PageWindow;
  pageSize: PageSize;
  disabled?: boolean;
  onPage: (page: number) => void;
  onPageSize: (size: PageSize) => void;
};

export function Pager({ info, pageSize, disabled, onPage, onPageSize }: Props) {
  if (info.total === 0) return null;
  const atFirst = info.page <= 1;
  const atLast = info.page >= info.pageCount;

  return (
    <View style={s.wrap}>
      {info.pageCount > 1 && (
        <View style={s.pager}>
          <TouchableOpacity
            style={[s.btn, (atFirst || disabled) && s.btnDisabled]}
            onPress={() => onPage(info.page - 1)}
            disabled={atFirst || disabled}
            accessibilityLabel="Previous page"
          >
            <Ionicons name="chevron-back" size={18} color={Colors.ink} />
            <Text style={s.btnText}>Prev</Text>
          </TouchableOpacity>
          <View style={s.info}>
            <Text style={s.range}>{info.start}–{info.end} of {info.total}</Text>
            <Text style={s.pageText}>Page {info.page} of {info.pageCount}</Text>
          </View>
          <TouchableOpacity
            style={[s.btn, (atLast || disabled) && s.btnDisabled]}
            onPress={() => onPage(info.page + 1)}
            disabled={atLast || disabled}
            accessibilityLabel="Next page"
          >
            <Text style={s.btnText}>Next</Text>
            <Ionicons name="chevron-forward" size={18} color={Colors.ink} />
          </TouchableOpacity>
        </View>
      )}

      <View style={s.sizeRow}>
        <Text style={s.sizeLabel}>Per page</Text>
        {PAGE_SIZES.map(size => {
          const active = size === pageSize;
          return (
            <TouchableOpacity
              key={size}
              style={[s.sizeChip, active && s.sizeChipActive]}
              onPress={() => onPageSize(size)}
              disabled={disabled}
              accessibilityRole="button"
              accessibilityState={{ selected: active }}
              accessibilityLabel={`${size} per page`}
            >
              <Text style={[s.sizeText, active && s.sizeTextActive]}>{size}</Text>
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  wrap: { marginTop: 8, gap: 14 },
  pager: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 10 },
  btn: { flexDirection: 'row', alignItems: 'center', gap: 4, height: 42, paddingHorizontal: 14, borderRadius: 11, borderWidth: 1, borderColor: Colors.borderStrong, backgroundColor: Colors.surface },
  btnDisabled: { opacity: 0.35 },
  btnText: { fontSize: 13.5, fontWeight: '700', color: Colors.ink },
  info: { alignItems: 'center' },
  range: { fontSize: 13.5, fontWeight: '700', color: Colors.ink },
  pageText: { fontSize: 11.5, color: Colors.inkFaint, marginTop: 2 },

  sizeRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 7 },
  sizeLabel: { fontSize: 12.5, color: Colors.inkFaint, marginRight: 4 },
  sizeChip: { minWidth: 40, alignItems: 'center', borderRadius: 999, borderWidth: 1, borderColor: Colors.borderStrong, paddingHorizontal: 11, paddingVertical: 6 },
  sizeChipActive: { backgroundColor: Colors.ink, borderColor: Colors.ink },
  sizeText: { fontSize: 12.5, fontWeight: '600', color: Colors.inkMuted },
  sizeTextActive: { color: Colors.onDark, fontWeight: '700' },
});
