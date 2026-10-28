import { useAuth } from '@/src/auth/AuthContext';
import { ResearcherAsyncState } from '@/src/components/researcher/async-state';
import { EmptyState } from '@/src/components/researcher/empty-state';
import { Pager } from '@/src/components/researcher/pager';
import { ListRowsSkeleton, ListScreenSkeleton } from '@/src/components/researcher/skeletons';
import { CreateUserSheet } from '@/src/components/researcher/create-user-sheet';
import { UserSheet, userInitials } from '@/src/components/researcher/user-sheet';
import { cardShadow, inputSurface, inputTextStyle, ResearcherColors as C } from '@/src/constants/colors';
import { ROLE_TAG } from '@/src/constants/labels';
import { TAB_SCREEN_EDGES, wideColumn } from '@/src/constants/layout';
import { fetchUsersPage, type ResearcherUserRow } from '@/src/database/repositories/researcher';
import { useDebouncedValue } from '@/src/hooks/use-debounced-value';
import { useResearcherPage } from '@/src/hooks/use-researcher-page';
import { isDormant } from '@/src/utils/userActivity';
import { PressableScale } from '@/src/components/ui/pressable-scale';
import { Ionicons } from '@expo/vector-icons';
import React, { useCallback, useMemo, useRef, useState } from 'react';
import { FlatList, Platform, RefreshControl, StatusBar, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

function UserRow({ user: u, onPress }: { user: ResearcherUserRow; onPress: (u: ResearcherUserRow) => void }) {
  const isPending = u.status === 'pending';
  const isInactive = u.status !== 'active';
  const dormant = isDormant(u);
  return (
    <PressableScale
      style={[s.userRow, isInactive && s.userRowInactive]}
      onPress={() => onPress(u)}
      accessibilityRole="button"
      accessibilityLabel={`${u.name}, @${u.username}${dormant ? ', no activity in over a year' : ''}`}
      accessibilityHint="Opens account options"
    >
      <View style={s.avatar}>
        <Text style={s.avatarText}>{userInitials(u.name)}</Text>
      </View>
      <View style={{ flex: 1 }}>
        <Text style={s.userName} numberOfLines={1}>{u.name}</Text>
        <Text style={s.userMeta} numberOfLines={1}>
          @{u.username}{isPending ? ' · awaiting approval' : isInactive ? ' · deactivated' : ''}
        </Text>
        {dormant && (
          <View style={s.dormantRow}>
            <Ionicons name="time-outline" size={12} color={C.amber} />
            <Text style={s.dormantText}>No activity in 1+ yr</Text>
          </View>
        )}
      </View>
      <View style={[s.roleTag, isPending && s.roleTagPending]}>
        <Text style={[s.roleTagText, isPending && s.roleTagTextPending]}>
          {isPending ? 'PENDING' : isInactive ? 'OFF' : ROLE_TAG.farmer}
        </Text>
      </View>
      <Ionicons name="chevron-forward" size={17} color={C.textFaint} />
    </PressableScale>
  );
}

export default function ResearcherUsersScreen() {
  const { user: currentUser } = useAuth();
  const [query, setQuery] = useState('');
  const [sheetOpen, setSheetOpen] = useState(false);
  const [sheetUser, setSheetUser] = useState<ResearcherUserRow | null>(null);
  const [createOpen, setCreateOpen] = useState(false);
  const listRef = useRef<FlatList<ResearcherUserRow>>(null);

  const debouncedQuery = useDebouncedValue(query.trim());
  const filters = useMemo(() => ({ query: debouncedQuery }), [debouncedQuery]);
  const {
    rows: users, pageInfo, pageSize, isLoading, isPageLoading, isRefreshing, error,
    setPage, setPageSize, reload: reloadPage, refresh, retry,
  } = useResearcherPage(fetchUsersPage, filters);
  const isFiltered = debouncedQuery.length > 0;

  const goToPage = (p: number) => {
    setPage(p);
    listRef.current?.scrollToOffset({ offset: 0, animated: false });
  };

  const openUser = useCallback((u: ResearcherUserRow) => {
    setSheetUser(u);
    setSheetOpen(true);
  }, []);

  const onUserChanged = (updated: ResearcherUserRow) => {
    setSheetUser(updated);
    reloadPage();
  };

  // The sheet stays open on its "Account created" view; just refresh the list behind it.
  const onUserCreated = () => reloadPage();

  const header = (
    <View>
      <View style={s.titleRow}>
        <Text style={s.title}>Field Users</Text>
        <TouchableOpacity style={s.addBtn} onPress={() => setCreateOpen(true)} activeOpacity={0.8} accessibilityRole="button">
          <Ionicons name="person-add-outline" size={17} color={C.accentDeepText} />
          <Text style={s.addBtnText}>Add user</Text>
        </TouchableOpacity>
      </View>

      <View style={s.searchRow}>
        <Ionicons name="search-outline" size={19} color={C.textFaint} />
        <TextInput
          style={s.searchInput}
          placeholder="Name or username"
          placeholderTextColor={C.textMuted}
          value={query}
          onChangeText={setQuery}
          autoCorrect={false}
          autoCapitalize="none"
          returnKeyType="search"
        />
        {query.length > 0 && (
          <TouchableOpacity onPress={() => setQuery('')} hitSlop={8} accessibilityLabel="Clear search">
            <Ionicons name="close-circle" size={18} color={C.textFaint} />
          </TouchableOpacity>
        )}
      </View>

      <Text style={s.scopeNote}>Admin accounts are managed by the system owner.</Text>
    </View>
  );

  const empty = isPageLoading ? (
    <ListRowsSkeleton rows={Math.min(pageSize, 6)} />
  ) : (
    <EmptyState
      icon={isFiltered ? 'search-outline' : 'people-outline'}
      title={isFiltered ? 'No field users match this search.' : 'No field users yet.'}
      subtitle={isFiltered ? 'Try a different name or username.' : undefined}
    />
  );

  return (
    <SafeAreaView style={s.safe} edges={TAB_SCREEN_EDGES}>
      <StatusBar barStyle="dark-content" backgroundColor={C.bg} />
      <ResearcherAsyncState
        isLoading={isLoading}
        error={error}
        onRetry={retry}
        errorMessage="Couldn't load users. Check your connection."
        skeleton={<ListScreenSkeleton />}
      >
        <FlatList
          ref={listRef}
          data={isPageLoading ? [] : users}
          keyExtractor={u => u.id}
          renderItem={({ item }) => <UserRow user={item} onPress={openUser} />}
          ListHeaderComponent={header}
          ListEmptyComponent={empty}
          ListFooterComponent={
            <View style={s.footer}>
              <Pager info={pageInfo} pageSize={pageSize} disabled={isPageLoading} onPage={goToPage} onPageSize={setPageSize} />
            </View>
          }
          contentContainerStyle={s.content}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          initialNumToRender={8}
          windowSize={7}
          removeClippedSubviews={Platform.OS === 'android'}
          refreshControl={<RefreshControl refreshing={isRefreshing} onRefresh={refresh} tintColor={C.text} colors={[C.accent]} />}
        />
      </ResearcherAsyncState>

      <UserSheet
        visible={sheetOpen}
        user={sheetUser}
        isSelf={!!sheetUser && sheetUser.id === currentUser?.id}
        onClose={() => setSheetOpen(false)}
        onChanged={onUserChanged}
      />
      <CreateUserSheet visible={createOpen} onClose={() => setCreateOpen(false)} onCreated={onUserCreated} />
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: C.bg },
  content: { ...wideColumn, padding: 20, paddingTop: 12, paddingBottom: 0 },
  footer: { paddingBottom: 16 },

  titleRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12, marginBottom: 16 },
  addBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: C.accentStrong, borderRadius: 12, paddingHorizontal: 14, height: 40 },
  addBtnText: { fontSize: 14, fontWeight: '800', color: C.accentDeepText },
  title: { fontSize: 27, fontWeight: '800', color: C.text, letterSpacing: -0.4 },

  searchRow: { flexDirection: 'row', alignItems: 'center', gap: 10, ...inputSurface, borderWidth: 1, borderRadius: 13, height: 48, paddingHorizontal: 14, marginBottom: 14 },
  searchInput: { flex: 1, fontSize: 15, ...inputTextStyle, padding: 0 },

  scopeNote: { fontSize: 12.5, color: C.textSoft, marginTop: -4, marginBottom: 18 },

  userRow: { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: C.card, borderRadius: 16, borderWidth: 1, borderColor: C.cardBorder, padding: 14, marginBottom: 11, ...cardShadow },
  userRowInactive: { opacity: 0.55 },
  avatar: { width: 44, height: 44, borderRadius: 22, backgroundColor: C.avatar, alignItems: 'center', justifyContent: 'center' },
  avatarText: { fontSize: 15, fontWeight: '800', color: C.text },
  userName: { fontSize: 15.5, fontWeight: '700', color: C.text },
  userMeta: { fontSize: 12.5, color: C.textSoft, marginTop: 2 },
  dormantRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 4 },
  dormantText: { fontSize: 11.5, fontWeight: '600', color: C.amber },
  roleTag: { borderWidth: 1, borderColor: C.cardBorderStrong, borderRadius: 6, paddingHorizontal: 7, paddingVertical: 3 },
  roleTagText: { fontSize: 10.5, fontWeight: '700', color: C.textSoft },
  roleTagPending: { backgroundColor: C.amberBg, borderColor: C.amberBorder },
  roleTagTextPending: { color: C.amber },
});
