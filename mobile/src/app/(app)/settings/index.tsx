import { View, Text, TouchableOpacity, ScrollView, StyleSheet, Alert } from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useAuthStore } from '../../../store/auth.store';
import { usePermissions } from '../../../hooks/usePermissions';

type SettingsItem = {
  id: string;
  label: string;
  subtitle?: string;
  route?: string;
  onPress?: () => void;
  danger?: boolean;
};

type SettingsSection = {
  title: string;
  items: SettingsItem[];
};

export default function SettingsScreen() {
  const { clearTokens } = useAuthStore();
  const { canAccess } = usePermissions();

  const handleLogout = () => {
    Alert.alert('Log out', 'Are you sure you want to log out?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Log out',
        style: 'destructive',
        onPress: async () => {
          await clearTokens();
          router.replace('/(auth)/login');
        },
      },
    ]);
  };

  const handleLogoutAll = () => {
    Alert.alert('Log out all devices', 'This will log you out from all devices.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Log out all',
        style: 'destructive',
        onPress: async () => {
          await clearTokens();
          router.replace('/(auth)/login');
        },
      },
    ]);
  };

  const sections: SettingsSection[] = [
    {
      title: 'Business',
      items: [
        {
          id: 'business-profile',
          label: 'Business Profile',
          subtitle: 'Name, address, contact info',
          route: '/(app)/settings/business',
        },
        {
          id: 'business-logo',
          label: 'Logo',
          subtitle: 'Upload and manage your logo',
          route: '/(app)/settings/business',
        },
      ],
    },
    {
      title: 'Finance',
      items: [
        {
          id: 'currency',
          label: 'Currency Settings',
          subtitle: 'Default currency and display',
          route: '/(app)/settings/business',
        },
        {
          id: 'tax',
          label: 'Tax Settings',
          subtitle: 'Tax rates and configuration',
          route: '/(app)/settings/business',
        },
      ],
    },
    {
      title: 'Notifications',
      items: [
        {
          id: 'alert-settings',
          label: 'Alert Settings',
          subtitle: 'Configure stock and shipment alerts',
          route: '/(app)/settings/notifications',
        },
        {
          id: 'email-recipients',
          label: 'Email Recipients',
          subtitle: 'Manage notification emails',
          route: '/(app)/settings/notifications',
        },
      ],
    },
    {
      title: 'Operations',
      items: [
        {
          id: 'barcode',
          label: 'Barcode Settings',
          subtitle: 'Scanner configuration',
          route: '/(app)/settings/business',
        },
        {
          id: 'locations',
          label: 'Locations',
          subtitle: 'Warehouse and location management',
          route: '/(app)/settings/locations',
        },
      ],
    },
    ...(canAccess('users')
      ? [
          {
            title: 'Account',
            items: [
              {
                id: 'user-management',
                label: 'User Management',
                subtitle: 'Add, edit, and deactivate users',
                route: '/(app)/settings/users',
              },
              {
                id: 'roles',
                label: 'Roles & Permissions',
                subtitle: 'Manage role access levels',
                route: '/(app)/settings/roles',
              },
              {
                id: 'audit-log',
                label: 'Audit Log',
                subtitle: 'View system activity history',
                route: '/(app)/settings/audit',
              },
            ],
          },
        ]
      : []),
    {
      title: 'Session',
      items: [
        {
          id: 'logout',
          label: 'Log out',
          onPress: handleLogout,
          danger: true,
        },
        {
          id: 'logout-all',
          label: 'Log out all devices',
          onPress: handleLogoutAll,
          danger: true,
        },
      ],
    },
  ];

  const handleItemPress = (item: SettingsItem) => {
    if (item.onPress) {
      item.onPress();
    } else if (item.route) {
      router.push(item.route as never);
    }
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {sections.map((section) => (
        <View key={section.title} style={styles.section}>
          <Text style={styles.sectionHeader}>{section.title}</Text>
          <View style={styles.sectionBody}>
            {section.items.map((item, index) => (
              <TouchableOpacity
                key={item.id}
                style={[styles.row, index < section.items.length - 1 && styles.rowBorder]}
                onPress={() => handleItemPress(item)}
                activeOpacity={0.7}
              >
                <View style={styles.rowContent}>
                  <Text style={[styles.rowLabel, item.danger && styles.rowLabelDanger]}>
                    {item.label}
                  </Text>
                  {item.subtitle ? <Text style={styles.rowSubtitle}>{item.subtitle}</Text> : null}
                </View>
                {!item.danger && <Ionicons name="chevron-forward" size={18} color="#9ca3af" />}
              </TouchableOpacity>
            ))}
          </View>
        </View>
      ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f9fafb',
  },
  content: {
    paddingBottom: 40,
  },
  section: {
    marginTop: 24,
    paddingHorizontal: 16,
  },
  sectionHeader: {
    fontSize: 13,
    fontWeight: '600',
    color: '#6b7280',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    marginBottom: 8,
    paddingHorizontal: 4,
  },
  sectionBody: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
    elevation: 2,
    overflow: 'hidden',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 16,
  },
  rowBorder: {
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#e5e7eb',
  },
  rowContent: {
    flex: 1,
    marginRight: 8,
  },
  rowLabel: {
    fontSize: 15,
    fontWeight: '500',
    color: '#111827',
  },
  rowLabelDanger: {
    color: '#dc2626',
    fontWeight: '500',
  },
  rowSubtitle: {
    fontSize: 13,
    color: '#6b7280',
    marginTop: 2,
  },
});
