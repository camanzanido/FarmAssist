import { useAuth } from '@/src/auth/AuthContext';
import { UserType } from '@/src/auth/types';
import { ResearcherAsyncState } from '@/src/components/researcher/async-state';
import { EmptyState } from '@/src/components/researcher/empty-state';
import { Pager } from '@/src/components/researcher/pager';
import { ListRowsSkeleton, ListScreenSkeleton } from '@/src/components/researcher/skeletons';
import { UserSheet, userInitials } from '@/src/components/researcher/user-sheet';
import { AnimatedFilterBar } from '@/src/components/ui/animated-filter-bar';
import { cardShadow, ResearcherColors as C } from '@/src/constants/colors';
import { wideColumn } from '@/src/constants/layout';
import { fetchUserCounts, fetchUsersPage, type ResearcherUserRow, type UserCounts } from '@/src/database/repositories/researcher';
import { type User } from '@/src/database/repositories/users';
import { useDebouncedValue } from '@/src/hooks/use-debounced-value';
import { useResearcherFetch } from '@/src/hooks/use-researcher-fetch';
import { useResearcherPage } from '@/src/hooks/use-researcher-page';
import { Ionicons } from '@expo/vector-icons';
import React, { useCallback, useMemo, useRef, useState } from 'react';
import { FlatList, Platform, RefreshControl, StatusBar, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

type RoleFilter = 'all' | UserType;

const NO_COUNTS: UserCounts = { all: 0, farmer: 0, researcher: 0 };

function UserRow({ user: u, onPress }: { user: User; onPress: (u: User) => void }) {
  const isPending = u.status === 'pending';
  const isInactive = u.status !== 'active';
  const isResearcher = u.user_type === 'researcher';
  return (
    <TouchableOpacity
      style={[s.userRow, isInactive && s.userRowInactive]}
      onPress={() => onPress(u)}
      activeOpacity={0.8}
      accessibilityRole="button"
      accessibilityHint="Opens role and account options"
    >
      <View style={[s.avatar, isResearcher && s.avatarResearcher]}>
        <Text style={[s.avatarText, isResearcher && s.avatarTextResearcher]}>{userInitials(u.name)}</Text>
      </View>
      <View style={{ flex: 1 }}>
        <Text style={s.userName} numberOfLines={1}>{u.name}</Text>
        <Text style={s.userMeta} numberOfLines={1}>
          @{u.username}{isPending ? ' · awaiting approval' : isInactive ? ' · deactivated' : ''}
        </Text>
      </View>
      <View style={[s.roleTag, isResearcher && s.roleTagResearcher, isPending && s.roleTagPending]}>
        <Text style={[s.roleTagText, isResearcher && s.roleTagTextResearcher, isPending && s.roleTagTextPending]}>
          {isPending ? 'PENDING' : isResearcher ? 'RESEARCHER' : isInactive ? 'OFF' : 'FARMER'}
        </Text>
      </View>
      <Ionicons name="chevron-forward" size={17} color={C.textFaint} />
    </TouchableOpacity>
  );
}

export default function ResearcherUsersScreen() {
  const { user: currentUser } = useAuth();
  const [query, setQuery] = useState('');
  const [roleFilter, setRoleFilter] = useState<RoleFilter>('all');
  const [sheetOpen, setSheetOpen] = useState(false);
  const [sheetUser, setSheetUser] = useState<User | null>(null);
  const listRef = useRef<FlatList<ResearcherUserRow>>(null);

  const debouncedQuery = useDebouncedValue(query.trim());
  const filters = useMemo(
    () => ({ role: roleFilter === 'all' ? null : roleFilter, query: debouncedQuery }),
    [roleFilter, debouncedQuery]
  );
  const {
    rows: users, pageInfo, pageSize, isLoading, isPageLoading, isRefreshing, error,
    setPage, setPageSize, reload: reloadPage, refresh: refreshPage, retry,
  } = useResearcherPage(fetchUsersPage, filters);
  const { data: counts, reload: reloadCounts } = useResearcherFetch(fetchUserCounts, NO_COUNTS);
  const refresh = useCallback(async () => { await Promise.all([refreshPage(), reloadCounts()]); }, [refreshPage, reloadCounts]);
  const isFiltered = roleFilter !== 'all' || debouncedQuery.length > 0;

  const filterOptions = useMemo(() => [
    { value: 'all' as const, label: `All ${counts.all}` },
    { value: 'farmer' as const, label: `Farmers ${counts.farmer}` },
    { value: 'researcher' as const, label: `Researchers ${counts.researcher}` },
  ], [counts]);

  const goToPage = (p: number) => {
    setPage(p);
    listRef.current?.scrollToOffset({ offset: 0, animated: false });
  };

  const openUser = useCallback((u: User) => {
    setSheetUser(u);
    setSheetOpen(true);
  }, []);

  const onUserChanged = (updated: User) => {
    setSheetUser(updated);
    reloadPage();
    reloadCounts();
  };

  const header = (
    <View>
      <Text style={s.title}>Users</Text>
      <Text style={s.subtitle}>
        {isFiltered ? `${pageInfo.total.toLocaleString()} match` : `${pageInfo.total.toLocaleString()} total`}
      </Text>

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

      <View style={s.filterRow}>
        <AnimatedFilterBar options={filterOptions} selected={roleFilter} onSelect={setRoleFilter} />
      </View>
    </View>
  );

  const empty = isPageLoading ? (
    <ListRowsSkeleton rows={Math.min(pageSize, 6)} />
  ) : (
    <EmptyState
      icon={isFiltered ? 'search-outline' : 'people-outline'}
      title={isFiltered ? 'No users match this search.' : 'No users yet.'}
      subtitle={isFiltered ? 'Try a different name, username, or role filter.' : undefined}
    />
  );

  return (
    <SafeAreaView style={s.safe}>
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
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: C.bg },
  content: { ...wideColumn, padding: 20, paddingTop: 12, paddingBottom: 20 },
  footer: { paddingBottom: 20 },

  title: { fontSize: 27, fontWeight: '800', color: C.text, letterSpacing: -0.4 },
  subtitle: { fontSize: 14, color: C.textSoft, marginTop: 3, marginBottom: 16 },

  searchRow: { flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: C.card, borderWidth: 1, borderColor: C.cardBorderStrong, borderRadius: 13, height: 48, paddingHorizontal: 14, marginBottom: 14 },
  searchInput: { flex: 1, fontSize: 15, color: C.text, padding: 0 },

  filterRow: { marginBottom: 18 },

  userRow: { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: C.card, borderRadius: 16, borderWidth: 1, borderColor: C.cardBorder, padding: 14, marginBottom: 11, ...cardShadow },
  userRowInactive: { opacity: 0.55 },
  avatar: { width: 44, height: 44, borderRadius: 14, backgroundColor: C.avatar, alignItems: 'center', justifyContent: 'center' },
  avatarResearcher: { backgroundColor: C.accentStrong },
  avatarText: { fontSize: 15, fontWeight: '800', color: C.text },
  avatarTextResearcher: { color: C.accentDeepText },
  userName: { fontSize: 15.5, fontWeight: '700', color: C.text },
  userMeta: { fontSize: 12.5, color: C.textSoft, marginTop: 2 },
  roleTag: { borderWidth: 1, borderColor: C.cardBorderStrong, borderRadius: 6, paddingHorizontal: 7, paddingVertical: 3 },
  roleTagResearcher: { backgroundColor: C.accentStrong, borderColor: C.accentStrong },
  roleTagText: { fontSize: 10.5, fontWeight: '700', color: C.textSoft },
  roleTagTextResearcher: { color: C.accentDeepText },
  roleTagPending: { backgroundColor: C.amberBg, borderColor: C.amberBorder },
  roleTagTextPending: { color: C.amber },
});
