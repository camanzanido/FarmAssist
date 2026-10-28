import { useAuth } from '@/src/auth/AuthContext';
import { brandGradientCss, Colors } from '@/src/constants/colors';
import { termsCopy as copy } from '@/src/constants/copy';
import { updateUserRemote } from '@/src/database/repositories/researcher';
import { getUser, updateUser } from '@/src/database/repositories/users';
import { useSubmitOnce } from '@/src/hooks/use-submit-once';
import { getActionErrorMessage } from '@/src/utils/errors';
import { needsTermsConsent, termsAcceptance } from '@/src/utils/terms';
import { PressableScale } from '@/src/components/ui/pressable-scale';
import { Ionicons } from '@expo/vector-icons';
import { usePathname, useRouter } from 'expo-router';
import React, { useState } from 'react';
import { ActivityIndicator, Modal, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

// Asks signed-in accounts that never agreed (researcher-made, older, or after a terms update) once; offline use without an account is never gated.
export function TermsConsentGate() {
  const { user, refreshProfile, signOut } = useAuth();
  const pathname = usePathname();
  const router = useRouter();
  const { isSubmitting, run } = useSubmitOnce();
  const [error, setError] = useState<string | null>(null);

  const visible = !!user && needsTermsConsent(user.terms_version) && pathname !== '/terms';
  if (!user) return null;

  const accept = () => run(async () => {
    setError(null);
    try {
      const fields = termsAcceptance();
      // Field users write locally so it works offline and syncs later; a row that hasn't synced yet goes straight to the server.
      if (user.user_type !== 'researcher' && await getUser(user.id)) await updateUser(user.id, fields);
      else await updateUserRemote(user.id, fields);
      await refreshProfile();
    } catch (err) {
      console.error('Failed to save terms acceptance:', err);
      setError(getActionErrorMessage(err, copy.gateFailed));
    }
  });

  return (
    <Modal visible={visible} transparent animationType="fade" statusBarTranslucent onRequestClose={() => {}}>
      <View style={s.scrim}>
        <View style={s.card} accessibilityViewIsModal>
          <View style={s.icon}>
            <Ionicons name="document-text" size={26} color={Colors.accent} />
          </View>
          <Text style={s.title} accessibilityRole="header">{copy.gateTitle}</Text>
          <Text style={s.body}>{copy.gateBody}</Text>

          <TouchableOpacity onPress={() => { if (pathname !== '/terms') router.push('/terms'); }} style={s.readBtn} disabled={isSubmitting} accessibilityRole="link">
            <Text style={s.readText}>{copy.gateRead}</Text>
            <Ionicons name="chevron-forward" size={16} color={Colors.ink} />
          </TouchableOpacity>

          {error && <Text style={s.error}>{error}</Text>}

          <PressableScale style={[s.acceptBtn, isSubmitting && s.disabled]} onPress={accept} disabled={isSubmitting} accessibilityRole="button" haptic>
            {isSubmitting ? <ActivityIndicator color={Colors.onDark} /> : <Text style={s.acceptText}>{copy.gateAccept}</Text>}
          </PressableScale>
          <TouchableOpacity onPress={() => run(signOut)} style={s.logoutBtn} disabled={isSubmitting} accessibilityRole="button">
            <Text style={s.logoutText}>{copy.gateLogOut}</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

const s = StyleSheet.create({
  scrim: { flex: 1, backgroundColor: Colors.scrim, alignItems: 'center', justifyContent: 'center', padding: 24 },
  card: { width: '100%', maxWidth: 420, backgroundColor: Colors.surface, borderRadius: 20, padding: 22, alignItems: 'center' },
  icon: { width: 52, height: 52, borderRadius: 26, backgroundColor: Colors.accentTint, alignItems: 'center', justifyContent: 'center', marginBottom: 12 },
  title: { fontSize: 19, fontWeight: '800', color: Colors.ink, textAlign: 'center' },
  body: { fontSize: 14.5, color: Colors.inkSoft, textAlign: 'center', lineHeight: 21, marginTop: 8 },
  readBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, minHeight: 44, marginTop: 8 },
  readText: { fontSize: 14.5, fontWeight: '700', color: Colors.ink, textDecorationLine: 'underline' },
  error: { fontSize: 13, color: Colors.danger, textAlign: 'center', marginTop: 6 },
  acceptBtn: { alignSelf: 'stretch', height: 52, borderRadius: 14, experimental_backgroundImage: brandGradientCss(90), alignItems: 'center', justifyContent: 'center', marginTop: 12 },
  acceptText: { fontSize: 15.5, fontWeight: '800', color: Colors.onDark },
  disabled: { opacity: 0.6 },
  logoutBtn: { minHeight: 44, alignItems: 'center', justifyContent: 'center', marginTop: 4 },
  logoutText: { fontSize: 14.5, fontWeight: '700', color: Colors.inkSoft },
});
