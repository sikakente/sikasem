import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  StatusBar,
  Platform,
} from 'react-native';
import { usePathname, router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { usePermissions } from '../../hooks/usePermissions';

type TabConfig = {
  name: string;
  label: string;
  route: string;
  icon: React.ComponentProps<typeof Ionicons>['name'];
  activeIcon: React.ComponentProps<typeof Ionicons>['name'];
  module?: 'dashboard' | 'pos' | 'inventory' | 'shipments';
};

const TABS: TabConfig[] = [
  {
    name: 'index',
    label: 'Dashboard',
    route: '/',
    icon: 'grid-outline',
    activeIcon: 'grid',
    module: 'dashboard',
  },
  {
    name: 'pos',
    label: 'POS',
    route: '/pos',
    icon: 'storefront-outline',
    activeIcon: 'storefront',
    module: 'pos',
  },
  {
    name: 'inventory',
    label: 'Inventory',
    route: '/inventory',
    icon: 'layers-outline',
    activeIcon: 'layers',
    module: 'inventory',
  },
  {
    name: 'shipments',
    label: 'Shipments',
    route: '/shipments',
    icon: 'airplane-outline',
    activeIcon: 'airplane',
    module: 'shipments',
  },
  {
    name: 'more',
    label: 'More',
    route: '/more',
    icon: 'menu-outline',
    activeIcon: 'menu',
  },
];

function getActiveSegment(pathname: string): string {
  if (pathname === '/') return 'index';
  const segment = pathname.split('/').filter(Boolean)[0] ?? 'index';
  // Map dashboard sub-routes back to index
  if (segment === 'dashboard') return 'index';
  return segment;
}

export function TopNavBar() {
  const pathname = usePathname();
  const { canAccess } = usePermissions();
  const insets = useSafeAreaInsets();

  const visibleTabs = TABS.filter((tab) =>
    tab.module === undefined ? true : canAccess(tab.module),
  );

  const activeSegment = getActiveSegment(pathname);

  return (
    <View style={[styles.wrapper, { paddingTop: insets.top }]}>
      <StatusBar
        barStyle="light-content"
        backgroundColor="#0C1B33"
        translucent={Platform.OS === 'android'}
      />

      {/* App header */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <View style={styles.logoMark}>
            <Ionicons name="airplane" size={16} color="#FFFFFF" />
          </View>
          <Text style={styles.appName}>ExportBiz</Text>
          <Text style={styles.appTagline}>/ Manager</Text>
        </View>
        <TouchableOpacity
          style={styles.notifBtn}
          onPress={() => router.navigate('/alerts' as never)}
          activeOpacity={0.7}
          accessibilityLabel="Alerts"
          accessibilityRole="button"
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          <Ionicons name="notifications-outline" size={18} color="rgba(255,255,255,0.8)" />
        </TouchableOpacity>
      </View>

      {/* Tab strip */}
      <View style={styles.tabStripOuter}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.tabStrip}
          bounces={false}
        >
          {visibleTabs.map((tab) => {
            const isActive = activeSegment === tab.name;
            return (
              <TouchableOpacity
                key={tab.name}
                onPress={() => router.navigate(tab.route as never)}
                style={[styles.tab, isActive && styles.tabActive]}
                activeOpacity={0.75}
              >
                <Ionicons
                  name={isActive ? tab.activeIcon : tab.icon}
                  size={15}
                  color={isActive ? '#FFFFFF' : '#64748B'}
                  style={styles.tabIcon}
                />
                <Text style={[styles.tabLabel, isActive && styles.tabLabelActive]}>
                  {tab.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
        <View style={styles.tabStripBorder} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    backgroundColor: '#0C1B33',
    // Subtle shadow that bleeds onto the content below
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.18,
    shadowRadius: 8,
    elevation: 8,
    zIndex: 100,
  },

  // ── Header ──────────────────────────────────────────────────────────────────
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 10,
    paddingBottom: 10,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  logoMark: {
    width: 30,
    height: 30,
    borderRadius: 8,
    backgroundColor: '#D97706',
    alignItems: 'center',
    justifyContent: 'center',
  },
  appName: {
    fontSize: 16,
    fontWeight: '800',
    color: '#FFFFFF',
    letterSpacing: -0.4,
  },
  appTagline: {
    fontSize: 16,
    fontWeight: '300',
    color: 'rgba(255,255,255,0.45)',
    letterSpacing: 0.1,
  },
  notifBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: 'rgba(255,255,255,0.1)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.12)',
  },

  // ── Tab strip ───────────────────────────────────────────────────────────────
  tabStripOuter: {
    backgroundColor: '#FFFFFF',
    position: 'relative',
  },
  tabStrip: {
    flexDirection: 'row',
    paddingHorizontal: 12,
    paddingVertical: 8,
    gap: 6,
  },
  tabStripBorder: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: '#E2E8F0',
  },
  tab: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 20,
    backgroundColor: '#F1F5F9',
  },
  tabActive: {
    backgroundColor: '#2563EB',
  },
  tabIcon: {
    marginRight: 5,
  },
  tabLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: '#64748B',
    letterSpacing: -0.1,
  },
  tabLabelActive: {
    color: '#FFFFFF',
  },
});
