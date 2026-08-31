import { UserType } from '@/src/auth/types';
import { ResearcherColors as C } from '@/src/constants/colors';
import { getAllUsers, updateUser, type User } from '@/src/database/repositories/users';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import React, { useCallback, useMemo, useState } from 'react';
import { ActivityIndicator, Alert, ScrollView, StatusBar, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

type RoleFilter = 'all' | UserType;

function initials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return '?';
  return (parts[0][0] + (parts[1]?.[0] ?? '')).toUpperCase();
}

export default function ResearcherUsersScreen() {
  const [users, setUsers] = useState<User[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [query, setQuery] = useState('');
  const [roleFilter, setRoleFilter] = useState<RoleFilter>('all');
  const [selected, setSelected] = useState<User | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  const load = useCallback(async () => {
    setIsLoading(true);
    try {
      const rows = await getAllUsers();
      setUsers(rows);
    } catch (err) {
      console.error('Failed to load users:', err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  const counts = useMemo(() => ({
    all: users.length,
    farmer: users.filter(u => u.user_type === 'farmer').length,
    researcher: users.filter(u => u.user_type === 'researcher').length,
  }), [users]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return users.filter(u => {
      if (roleFilter !== 'all' && u.user_type !== roleFilter) return false;
      if (!q) return true;
      return u.name.toLowerCase().includes(q) || u.username.toLowerCase().includes(q);
    });
  }, [users, query, roleFilter]);

  const setRole = async (role: UserType) => {
    if (!selected) return;
    setIsSaving(true);
    try {
      await updateUser(selected.id, { user_type: role });
      setSelected({ ...selected, user_type: role });
      setUsers(prev => prev.map(u => u.id === selected.id ? { ...u, user_type: role } : u));
    } catch (err) {
      console.error('Failed to change role:', err);
      Alert.alert('Could not update role', 'Please try again.');
    } finally {
      setIsSaving(false);
    }
  };

  const toggleActive = async () => {
    if (!selected) return;
    const nextStatus = selected.status === 'active' ? 'inactive' : 'active';
    setIsSaving(true);
    try {
      await updateUser(selected.id, { status: nextStatus });
      setSelected({ ...selected, status: nextStatus });
      setUsers(prev => prev.map(u => u.id === selected.id ? { ...u, status: nextStatus } : u));
    } catch (err) {
      console.error('Failed to change status:', err);
      Alert.alert('Could not update status', 'Please try again.');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <SafeAreaView style={s.safe}>
      <StatusBar barStyle="light-content" backgroundColor={C.bg} />
      {isLoading ? (
        <View style={s.centerWrap}><ActivityIndicator size="large" color={C.accent} /></View>
      ) : (
        <ScrollView contentContainerStyle={s.content} showsVerticalScrollIndicator={false}>
          <Text style={s.title}>Users</Text>

          <View style={s.searchRow}>
            <Ionicons name="search-outline" size={19} color={C.textFaint} />
            <TextInput
              style={s.searchInput}
              placeholder="Name or username"
              placeholderTextColor={C.textFaint}
              value={query}
              onChangeText={setQuery}
            />
          </View>

          <View style={s.filterRow}>
            <TouchableOpacity style={[s.filterChip, roleFilter === 'all' && s.filterChipActive]} onPress={() => setRoleFilter('all')}>
              <Text style={[s.filterChipText, roleFilter === 'all' && s.filterChipTextActive]}>All {counts.all}</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[s.filterChip, roleFilter === 'farmer' && s.filterChipActive]} onPress={() => setRoleFilter('farmer')}>
              <Text style={[s.filterChipText, roleFilter === 'farmer' && s.filterChipTextActive]}>Farmers {counts.farmer}</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[s.filterChip, roleFilter === 'researcher' && s.filterChipActive]} onPress={() => setRoleFilter('researcher')}>
              <Text style={[s.filterChipText, roleFilter === 'researcher' && s.filterChipTextActive]}>Researchers {counts.researcher}</Text>
            </TouchableOpacity>
          </View>

          {filtered.map(u => {
            const isInactive = u.status !== 'active';
            const isSelected = selected?.id === u.id;
            return (
              <TouchableOpacity
                key={u.id}
                style={[s.userRow, isInactive && s.userRowInactive, isSelected && s.userRowSelected]}
                onPress={() => setSelected(isSelected ? null : u)}
                activeOpacity={0.8}
              >
                <View style={[s.avatar, u.user_type === 'researcher' && s.avatarResearcher]}>
                  <Text style={[s.avatarText, u.user_type === 'researcher' && s.avatarTextResearcher]}>{initials(u.name)}</Text>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={s.userName}>{u.name}</Text>
                  <Text style={s.userMeta}>
                    @{u.username}{isInactive ? ` · deactivated` : ''}
                  </Text>
                </View>
                <View style={[s.roleTag, u.user_type === 'researcher' && s.roleTagResearcher]}>
                  <Text style={[s.roleTagText, u.user_type === 'researcher' && s.roleTagTextResearcher]}>
                    {u.user_type === 'researcher' ? 'RESEARCHER' : isInactive ? 'OFF' : 'FARMER'}
                  </Text>
                </View>
              </TouchableOpacity>
            );
          })}

          {filtered.length === 0 && (
            <Text style={s.emptyText}>No users match this search.</Text>
          )}

          {selected && (
            <View style={s.detailCard}>
              <View style={s.detailHeader}>
                <View style={s.detailAvatar}>
                  <Text style={s.detailAvatarText}>{initials(selected.name)}</Text>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={s.detailName}>{selected.name}</Text>
                  <Text style={s.detailMeta}>@{selected.username}</Text>
                </View>
              </View>

              <Text style={s.sectionLabel}>ROLE</Text>
              <View style={s.roleBtnRow}>
                <TouchableOpacity
                  style={[s.roleBtn, selected.user_type === 'farmer' && s.roleBtnActive]}
                  onPress={() => setRole('farmer')}
                  disabled={isSaving}
                >
                  <Text style={[s.roleBtnText, selected.user_type === 'farmer' && s.roleBtnTextActive]}>Farmer</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[s.roleBtn, selected.user_type === 'researcher' && s.roleBtnActive]}
                  onPress={() => setRole('researcher')}
                  disabled={isSaving}
                >
                  <Text style={[s.roleBtnText, selected.user_type === 'researcher' && s.roleBtnTextActive]}>Researcher</Text>
                </TouchableOpacity>
              </View>

              <TouchableOpacity style={s.deactivateBtn} onPress={toggleActive} disabled={isSaving}>
                <Ionicons
                  name={selected.status === 'active' ? 'person-remove-outline' : 'person-add-outline'}
                  size={17}
                  color={C.danger}
                />
                <Text style={s.deactivateText}>
                  {selected.status === 'active' ? 'Deactivate account' : 'Reactivate account'}
                </Text>
              </TouchableOpacity>
            </View>
          )}

          <View style={{ height: 20 }} />
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: C.bg },
  centerWrap: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  content: { padding: 20, paddingTop: 12, paddingBottom: 20 },

  title: { fontSize: 25, fontWeight: '800', color: C.text, letterSpacing: -0.4, marginBottom: 16 },

  searchRow: { flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: C.card, borderWidth: 1, borderColor: C.cardBorder, borderRadius: 13, height: 48, paddingHorizontal: 14, marginBottom: 14 },
  searchInput: { flex: 1, fontSize: 15, color: C.text },

  filterRow: { flexDirection: 'row', gap: 7, marginBottom: 18, flexWrap: 'wrap' },
  filterChip: { backgroundColor: C.card, borderRadius: 999, paddingHorizontal: 13, paddingVertical: 7 },
  filterChipActive: { backgroundColor: C.accentStrong },
  filterChipText: { fontSize: 12.5, fontWeight: '600', color: C.textSoft },
  filterChipTextActive: { color: C.accentDeepText, fontWeight: '700' },

  userRow: { flexDirection: 'row', alignItems: 'center', gap: 13, backgroundColor: C.card, borderRadius: 14, padding: 14, marginBottom: 9 },
  userRowInactive: { opacity: 0.55 },
  userRowSelected: { borderWidth: 1.5, borderColor: C.accentStrong },
  avatar: { width: 44, height: 44, borderRadius: 14, backgroundColor: '#2F6B52', alignItems: 'center', justifyContent: 'center' },
  avatarResearcher: { backgroundColor: C.accent },
  avatarText: { fontSize: 15, fontWeight: '800', color: C.accentStrong },
  avatarTextResearcher: { color: C.accentDeepText },
  userName: { fontSize: 15.5, fontWeight: '700', color: C.text },
  userMeta: { fontSize: 12.5, color: C.textSoft, marginTop: 2 },
  roleTag: { borderWidth: 1, borderColor: 'rgba(255,255,255,0.18)', borderRadius: 6, paddingHorizontal: 7, paddingVertical: 3 },
  roleTagResearcher: { backgroundColor: C.accentStrong, borderColor: C.accentStrong },
  roleTagText: { fontSize: 10.5, fontWeight: '700', color: C.textSoft },
  roleTagTextResearcher: { color: C.accentDeepText },

  emptyText: { textAlign: 'center', fontSize: 13, color: C.textFaint, marginTop: 20 },

  detailCard: { backgroundColor: C.card, borderRadius: 18, padding: 18, marginTop: 12 },
  detailHeader: { flexDirection: 'row', alignItems: 'center', gap: 13, marginBottom: 18 },
  detailAvatar: { width: 50, height: 50, borderRadius: 15, backgroundColor: '#2F6B52', alignItems: 'center', justifyContent: 'center' },
  detailAvatarText: { fontSize: 17, fontWeight: '800', color: C.accentStrong },
  detailName: { fontSize: 17, fontWeight: '800', color: C.text },
  detailMeta: { fontSize: 12.5, color: C.textSoft, marginTop: 2 },

  sectionLabel: { fontSize: 12, fontWeight: '700', letterSpacing: 0.8, color: C.textFaint, marginBottom: 10 },
  roleBtnRow: { flexDirection: 'row', gap: 8, marginBottom: 16 },
  roleBtn: { flex: 1, height: 44, borderRadius: 11, borderWidth: 1, borderColor: 'rgba(255,255,255,0.2)', alignItems: 'center', justifyContent: 'center' },
  roleBtnActive: { backgroundColor: C.accentStrong, borderColor: C.accentStrong },
  roleBtnText: { fontSize: 14, fontWeight: '700', color: C.textSoft },
  roleBtnTextActive: { color: C.accentDeepText },

  deactivateBtn: { flexDirection: 'row', gap: 8, height: 46, borderRadius: 11, borderWidth: 1, borderColor: 'rgba(224,133,133,0.4)', alignItems: 'center', justifyContent: 'center' },
  deactivateText: { fontSize: 14, fontWeight: '700', color: C.danger },
});
