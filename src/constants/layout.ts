import { useWindowDimensions } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

// Farmer screens read as one column; on a tablet it is centred instead of stretched.
export const CONTENT_MAX_WIDTH = 720;
// Researcher screens hold tables and stats, so they get more room.
export const WIDE_MAX_WIDTH = 960;
// At or above this width, layouts may place cards side by side.
export const WIDE_BREAKPOINT = 700;

export const contentColumn = { width: '100%', maxWidth: CONTENT_MAX_WIDTH, alignSelf: 'center' } as const;
export const wideColumn = { width: '100%', maxWidth: WIDE_MAX_WIDTH, alignSelf: 'center' } as const;

export function useIsWide(): boolean {
  return useWindowDimensions().width >= WIDE_BREAKPOINT;
}

const TAB_BAR_PADDING_TOP = 9;
const TAB_BAR_CONTENT_HEIGHT = 52;

export function useTabBarFrame() {
  const { bottom } = useSafeAreaInsets();
  return {
    height: TAB_BAR_PADDING_TOP + TAB_BAR_CONTENT_HEIGHT + bottom,
    paddingTop: TAB_BAR_PADDING_TOP,
    paddingBottom: bottom,
  };
}
