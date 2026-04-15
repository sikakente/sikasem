import { Tabs } from 'expo-router';
import { TabBar } from '../../components/navigation/TabBar';

export default function AppLayout() {
  return (
    <Tabs tabBar={(props) => <TabBar {...props} />} screenOptions={{ headerShown: false }}>
      <Tabs.Screen name="index" options={{ title: 'Dashboard', href: null }} />
      <Tabs.Screen name="pos" options={{ title: 'POS', href: null }} />
      <Tabs.Screen name="inventory" options={{ title: 'Inventory', href: null }} />
      <Tabs.Screen name="shipments" options={{ title: 'Shipments', href: null }} />
      <Tabs.Screen name="more" options={{ title: 'More', href: null }} />
      <Tabs.Screen name="suppliers" options={{ title: 'Suppliers', href: null }} />
      <Tabs.Screen name="products" options={{ title: 'Products', href: null }} />
      <Tabs.Screen name="purchasing" options={{ title: 'Purchasing', href: null }} />
      <Tabs.Screen name="receiving" options={{ title: 'Receiving', href: null }} />
      <Tabs.Screen name="sales" options={{ title: 'Sales', href: null }} />
      <Tabs.Screen name="customers" options={{ title: 'Customers', href: null }} />
      <Tabs.Screen name="fx" options={{ title: 'FX', href: null }} />
      <Tabs.Screen name="invoices" options={{ title: 'Invoices', href: null }} />
      <Tabs.Screen name="reports" options={{ title: 'Reports', href: null }} />
      <Tabs.Screen name="alerts" options={{ title: 'Alerts', href: null }} />
      <Tabs.Screen name="ai" options={{ title: 'AI', href: null }} />
      <Tabs.Screen name="receipts" options={{ title: 'Receipts', href: null }} />
      <Tabs.Screen name="settings" options={{ title: 'Settings', href: null }} />
    </Tabs>
  );
}
