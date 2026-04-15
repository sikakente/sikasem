import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { BottomTabBarProps } from '@react-navigation/bottom-tabs';
import { Ionicons } from '@expo/vector-icons';
import { usePermissions } from '../../hooks/usePermissions';

type TabConfig = {
  name: string;
  label: string;
  icon: React.ComponentProps<typeof Ionicons>['name'];
  activeIcon: React.ComponentProps<typeof Ionicons>['name'];
  module?: 'dashboard' | 'pos' | 'inventory' | 'shipments';
};

const TABS: TabConfig[] = [
  {
    name: 'index',
    label: 'Dashboard',
    icon: 'grid-outline',
    activeIcon: 'grid',
    module: 'dashboard',
  },
  {
    name: 'pos',
    label: 'POS',
    icon: 'storefront-outline',
    activeIcon: 'storefront',
    module: 'pos',
  },
  {
    name: 'inventory',
    label: 'Inventory',
    icon: 'layers-outline',
    activeIcon: 'layers',
    module: 'inventory',
  },
  {
    name: 'shipments',
    label: 'Shipments',
    icon: 'airplane-outline',
    activeIcon: 'airplane',
    module: 'shipments',
  },
  {
    name: 'more',
    label: 'More',
    icon: 'menu-outline',
    activeIcon: 'menu',
    module: undefined,
  },
];

export function TabBar({ state, descriptors, navigation }: BottomTabBarProps) {
  const { canAccess } = usePermissions();

  const visibleTabs = TABS.filter((tab) =>
    tab.module === undefined ? true : canAccess(tab.module),
  );

  return (
    <View style={styles.container}>
      {visibleTabs.map((tab) => {
        const routeIndex = state.routes.findIndex((r) => r.name === tab.name);
        const isFocused = routeIndex !== -1 && state.index === routeIndex;
        const color = isFocused ? '#007AFF' : '#8E8E93';

        const onPress = () => {
          if (routeIndex === -1) return;
          const route = state.routes[routeIndex];
          const event = navigation.emit({
            type: 'tabPress',
            target: route.key,
            canPreventDefault: true,
          });

          if (!isFocused && !event.defaultPrevented) {
            navigation.navigate(tab.name);
          }
        };

        const onLongPress = () => {
          if (routeIndex === -1) return;
          navigation.emit({
            type: 'tabLongPress',
            target: state.routes[routeIndex].key,
          });
        };

        const descriptor =
          routeIndex !== -1 ? descriptors[state.routes[routeIndex].key] : undefined;
        const label = descriptor?.options?.title ?? tab.label;

        return (
          <TouchableOpacity
            key={tab.name}
            accessibilityRole="button"
            accessibilityState={isFocused ? { selected: true } : {}}
            accessibilityLabel={label}
            onPress={onPress}
            onLongPress={onLongPress}
            style={styles.tab}
          >
            <Ionicons name={isFocused ? tab.activeIcon : tab.icon} size={24} color={color} />
            <Text style={[styles.label, { color }]}>{tab.label}</Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: '#C6C6C8',
    paddingBottom: 8,
  },
  tab: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 44,
    paddingTop: 8,
  },
  label: {
    fontSize: 10,
    marginTop: 2,
    fontWeight: '500',
  },
});
