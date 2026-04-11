import { Tabs } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

type IconName = React.ComponentProps<typeof Ionicons>['name'];

function TabIcon({ name, color, size }: { name: IconName; color: string; size: number }) {
  return <Ionicons name={name} color={color} size={size} />;
}

export default function AppLayout() {
  return (
    <Tabs screenOptions={{ headerShown: false }}>
      <Tabs.Screen
        name="index"
        options={{
          title: 'Home',
          tabBarIcon: ({ color, size }) => (
            <TabIcon name="home-outline" color={color} size={size} />
          ),
        }}
      />
      <Tabs.Screen
        name="suppliers"
        options={{
          title: 'Suppliers',
          tabBarIcon: ({ color, size }) => (
            <TabIcon name="people-outline" color={color} size={size} />
          ),
        }}
      />
      <Tabs.Screen
        name="products"
        options={{
          title: 'Products',
          tabBarIcon: ({ color, size }) => (
            <TabIcon name="cube-outline" color={color} size={size} />
          ),
        }}
      />
      <Tabs.Screen
        name="inventory"
        options={{
          title: 'Inventory',
          tabBarIcon: ({ color, size }) => (
            <TabIcon name="layers-outline" color={color} size={size} />
          ),
        }}
      />
      <Tabs.Screen
        name="purchasing"
        options={{
          title: 'Purchasing',
          tabBarIcon: ({ color, size }) => (
            <TabIcon name="cart-outline" color={color} size={size} />
          ),
        }}
      />
      <Tabs.Screen
        name="shipments"
        options={{
          title: 'Shipments',
          tabBarIcon: ({ color, size }) => (
            <TabIcon name="airplane-outline" color={color} size={size} />
          ),
        }}
      />
    </Tabs>
  );
}
