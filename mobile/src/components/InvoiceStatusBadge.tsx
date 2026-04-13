import { StyleSheet, Text, View } from 'react-native';

interface Props {
  status: string;
}

const STATUS_CONFIG: Record<string, { bg: string; text: string; label: string }> = {
  draft: { bg: '#f3f4f6', text: '#6b7280', label: 'Draft' },
  sent: { bg: '#dbeafe', text: '#1e40af', label: 'Sent' },
  paid: { bg: '#d1fae5', text: '#065f46', label: 'Paid' },
  overdue: { bg: '#fee2e2', text: '#dc2626', label: 'Overdue' },
  cancelled: { bg: '#e5e7eb', text: '#374151', label: 'Cancelled' },
};

export function InvoiceStatusBadge({ status }: Props) {
  const config = STATUS_CONFIG[status] ?? { bg: '#f3f4f6', text: '#6b7280', label: status };

  return (
    <View style={[styles.badge, { backgroundColor: config.bg }]}>
      <Text style={[styles.text, { color: config.text }]}>{config.label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 12,
    alignSelf: 'flex-start',
  },
  text: {
    fontSize: 11,
    fontWeight: '600',
  },
});
