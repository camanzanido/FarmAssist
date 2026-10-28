import { useAuth } from '@/src/auth/AuthContext';
import { brandGradientCss, Colors } from '@/src/constants/colors';
import { helpCopy, onboardingCopy as copy } from '@/src/constants/copy';
import { BUTTON_HEIGHT, CONTENT_MAX_WIDTH } from '@/src/constants/layout';
import { useOnboarding } from '@/src/onboarding/OnboardingContext';
import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useRef, useState } from 'react';
import {
  FlatList,
  Image,
  NativeScrollEvent,
  NativeSyntheticEvent,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  useWindowDimensions,
  View,
} from 'react-native';
import { useReducedMotion } from 'react-native-reanimated';
import { SafeAreaView } from 'react-native-safe-area-context';

type Slide = (typeof copy.slides)[number];

const SLIDES = copy.slides;
const LAST = SLIDES.length - 1;

// Filled glyphs read heavier than outlines, since Ionicons has no stroke weight; the welcome slide shows the logo.
const SLIDE_ICONS: Record<Exclude<Slide['key'], 'welcome'>, keyof typeof Ionicons.glyphMap> = {
  compare: 'git-compare',
  offline: 'cloud-offline',
  sync: 'sync',
};

export default function OnboardingScreen() {
  const router = useRouter();
  const { width } = useWindowDimensions();
  const reduceMotion = useReducedMotion();
  const { complete } = useOnboarding();
  const { user } = useAuth();
  // Opened from Profile: nothing to persist, just close back to where the user was.
  const { replay } = useLocalSearchParams<{ replay?: string }>();
  const isReplay = replay === '1';

  const listRef = useRef<FlatList<Slide>>(null);
  const [index, setIndex] = useState(0);
  const isLast = index === LAST;

  function goTo(i: number) {
    listRef.current?.scrollToIndex({ index: i, animated: !reduceMotion });
    setIndex(i);
  }

  function handleMomentumEnd(e: NativeSyntheticEvent<NativeScrollEvent>) {
    setIndex(Math.round(e.nativeEvent.contentOffset.x / width));
  }

  function finish() {
    if (isReplay) {
      router.back();
      return;
    }
    complete();
    router.replace('/(tabs)');
  }

  function finishAndOpenHelp() {
    if (!isReplay) {
      complete();
      router.replace('/(tabs)');
    }
    router.push('/help');
  }

  function finishAndSignIn() {
    complete();
    router.replace('/(tabs)');
    router.push('/(auth)/login');
  }

  function renderSlide({ item }: { item: Slide }) {
    return (
      <View style={[s.slide, { width }]}>
        <View style={s.slideInner} accessible accessibilityLabel={`${item.title}. ${item.body}`}>
          {item.key === 'welcome' ? (
            <Image
              source={require('@/assets/images/FarmAssist-logo.png')}
              style={s.logo}
              resizeMode="contain"
              accessibilityIgnoresInvertColors
            />
          ) : (
            <View style={s.art}>
              <Ionicons name={SLIDE_ICONS[item.key]} size={104} color={Colors.accent} />
            </View>
          )}
          {item.key === 'welcome' ? (
            // The wordmark stands in for the title; the slide's accessibilityLabel still reads it aloud.
            <Image
              source={require('@/assets/images/FarmAssist.png')}
              style={s.wordmark}
              resizeMode="contain"
              accessibilityIgnoresInvertColors
            />
          ) : (
            <Text style={s.title} accessibilityRole="header">{item.title}</Text>
          )}
          <Text style={s.body}>{item.body}</Text>
        </View>
      </View>
    );
  }

  return (
    <SafeAreaView style={s.safe}>
      <StatusBar barStyle="dark-content" backgroundColor={Colors.bg} />

      <View style={s.topBar}>
        {isReplay ? (
          <TouchableOpacity onPress={finish} style={s.topBtn} accessibilityRole="button" accessibilityLabel={copy.close}>
            <Ionicons name="close" size={24} color={Colors.ink} />
          </TouchableOpacity>
        ) : !isLast ? (
          <TouchableOpacity onPress={finish} style={s.topBtn} accessibilityRole="button">
            <Text style={s.skipText}>{copy.skip}</Text>
          </TouchableOpacity>
        ) : (
          <View style={s.topBtn} />
        )}
      </View>

      <FlatList
        ref={listRef}
        data={SLIDES}
        keyExtractor={item => item.key}
        renderItem={renderSlide}
        horizontal
        pagingEnabled
        bounces={false}
        showsHorizontalScrollIndicator={false}
        onMomentumScrollEnd={handleMomentumEnd}
        getItemLayout={(_, i) => ({ length: width, offset: width * i, index: i })}
        extraData={width}
      />

      <View style={s.footer}>
        <View style={s.dots} accessible accessibilityLabel={copy.pageLabel(index + 1, SLIDES.length)}>
          {SLIDES.map((slide, i) => (
            <View key={slide.key} style={[s.dot, i === index && s.dotActive]} />
          ))}
        </View>

        <TouchableOpacity
          style={[s.primaryBtn, isLast && s.primaryBtnGradient]}
          onPress={isLast ? finish : () => goTo(index + 1)}
          activeOpacity={0.85}
          accessibilityRole="button"
        >
          <Text style={s.primaryBtnText}>
            {!isLast ? copy.next : isReplay ? copy.done : copy.getStarted}
          </Text>
        </TouchableOpacity>

        {/* Keeps the button row a fixed height so the primary button doesn't jump on the last page. */}
        <View style={s.secondaryRow}>
          {isLast && (
            <TouchableOpacity onPress={finishAndOpenHelp} style={s.secondaryBtn} accessibilityRole="link">
              <Text style={s.secondaryLink}>{helpCopy.learnHow}</Text>
            </TouchableOpacity>
          )}
          {isLast && !isReplay && !user && (
            <TouchableOpacity onPress={finishAndSignIn} style={s.secondaryBtn} accessibilityRole="button">
              <Text style={s.secondaryText}>
                {copy.haveAccount} <Text style={s.secondaryLink}>{copy.signIn}</Text>
              </Text>
            </TouchableOpacity>
          )}
        </View>
      </View>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.bg },

  topBar: { flexDirection: 'row', justifyContent: 'flex-end', paddingHorizontal: 12, paddingVertical: 6 },
  topBtn: { minWidth: 44, height: 44, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 8 },
  skipText: { fontSize: 15, fontWeight: '700', color: Colors.inkSoft },

  slide: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 28 },
  slideInner: { width: '100%', maxWidth: CONTENT_MAX_WIDTH, alignItems: 'center' },
  // Both sides are set: Android defaults a local image's height to its file size, which overrides aspectRatio.
  logo: { width: 150, height: 150, marginBottom: 20 },
  wordmark: { width: 313, maxWidth: '100%', height: 81 },
  art: { width: 150, height: 150, alignItems: 'center', justifyContent: 'center', marginBottom: 28 },
  title: { fontSize: 26, fontWeight: '800', color: Colors.ink, textAlign: 'center', letterSpacing: -0.4 },
  body: { fontSize: 16, color: Colors.inkMuted, textAlign: 'center', lineHeight: 24, marginTop: 12, maxWidth: 440 },

  footer: { width: '100%', maxWidth: CONTENT_MAX_WIDTH, alignSelf: 'center', paddingHorizontal: 24, paddingBottom: 16 },
  dots: { flexDirection: 'row', justifyContent: 'center', gap: 8, marginBottom: 24 },
  dot: { width: 8, height: 8, borderRadius: 4, backgroundColor: Colors.barMuted },
  dotActive: { width: 24, backgroundColor: Colors.accent },

  primaryBtn: { backgroundColor: Colors.ink, borderRadius: 12, minHeight: BUTTON_HEIGHT, alignItems: 'center', justifyContent: 'center' },
  primaryBtnGradient: { experimental_backgroundImage: brandGradientCss(90) },
  primaryBtnText: { color: Colors.onDark, fontSize: 16, fontWeight: '800' },

  secondaryRow: { minHeight: 52, justifyContent: 'center' },
  secondaryBtn: { alignItems: 'center', justifyContent: 'center', minHeight: 44 },
  secondaryText: { fontSize: 14.5, color: Colors.inkSoft },
  secondaryLink: { fontWeight: '800', color: Colors.accent },
});
