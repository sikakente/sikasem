import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
} from 'react-native';
import { useRouter } from 'expo-router';
import { fxApi } from '../../../../lib/api/fx.api';

export default function NewConversionScreen() {
  const router = useRouter();
  const [conversionDate, setConversionDate] = useState(new Date().toISOString().split('T')[0]);
  const [sourceAmountGhs, setSourceAmountGhs] = useState('');
  const [exchangeRate, setExchangeRate] = useState('');
  const [destinationAmountGbp, setDestinationAmountGbp] = useState('');
  const [feesGbp, setFeesGbp] = useState('');
  const [notes, setNotes] = useState('');
  const [saving, setSaving] = useState(false);
  const [loadingRate, setLoadingRate] = useState(true);

  // Pre-populate rate from latest sale
  useEffect(() => {
    fxApi
      .getLatestRate()
      .then((res) => {
        const rate = (res.data as any).data?.exchangeRate;
        if (rate != null) setExchangeRate(String(rate));
      })
      .catch(() => {})
      .finally(() => setLoadingRate(false));
  }, []);

  const autoCalcGbp = (rateStr: string, ghsStr: string) => {
    const rate = parseFloat(rateStr);
    const ghs = parseFloat(ghsStr);
    if (!isNaN(rate) && !isNaN(ghs)) {
      setDestinationAmountGbp((ghs * rate).toFixed(2));
    }
  };

  const handleRateChange = (val: string) => {
    setExchangeRate(val);
    autoCalcGbp(val, sourceAmountGhs);
  };

  const handleGhsChange = (val: string) => {
    setSourceAmountGhs(val);
    autoCalcGbp(exchangeRate, val);
  };

  const handleSave = async () => {
    if (!conversionDate || !sourceAmountGhs || !exchangeRate || !destinationAmountGbp) {
      Alert.alert('Validation', 'Please fill in date, GHS amount, rate, and GBP received.');
      return;
    }
    try {
      setSaving(true);
      await fxApi.createConversion({
        conversionDate,
        sourceAmountGhs: parseFloat(sourceAmountGhs),
        exchangeRate: parseFloat(exchangeRate),
        destinationAmountGbp: parseFloat(destinationAmountGbp),
        feesGbp: feesGbp ? parseFloat(feesGbp) : undefined,
        notes: notes || undefined,
      });
      router.back();
    } catch {
      Alert.alert('Error', 'Failed to record conversion. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView contentContainerStyle={styles.container}>
        <Text style={styles.title}>Record Cash Conversion</Text>

        <Label text="Conversion Date" />
        <TextInput
          style={styles.input}
          value={conversionDate}
          onChangeText={setConversionDate}
          placeholder="YYYY-MM-DD"
        />

        <Label text="GHS Amount" />
        <TextInput
          style={styles.input}
          value={sourceAmountGhs}
          onChangeText={handleGhsChange}
          keyboardType="decimal-pad"
          placeholder="0.00"
        />

        <Label text={`Exchange Rate (GBP per GHS)${loadingRate ? ' — loading…' : ''}`} />
        <TextInput
          style={styles.input}
          value={exchangeRate}
          onChangeText={handleRateChange}
          keyboardType="decimal-pad"
          placeholder="0.000000"
        />

        <Label text="GBP Received (auto-calculated, editable)" />
        <TextInput
          style={styles.input}
          value={destinationAmountGbp}
          onChangeText={setDestinationAmountGbp}
          keyboardType="decimal-pad"
          placeholder="0.00"
        />

        <Label text="Bank Fees (GBP, optional)" />
        <TextInput
          style={styles.input}
          value={feesGbp}
          onChangeText={setFeesGbp}
          keyboardType="decimal-pad"
          placeholder="0.00"
        />

        <Label text="Notes (optional)" />
        <TextInput
          style={[styles.input, styles.textarea]}
          value={notes}
          onChangeText={setNotes}
          multiline
          numberOfLines={3}
          placeholder="Add notes…"
        />

        <TouchableOpacity
          style={[styles.saveBtn, saving && styles.saveBtnDisabled]}
          onPress={handleSave}
          disabled={saving}
        >
          {saving ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.saveBtnText}>Save Conversion</Text>
          )}
        </TouchableOpacity>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

function Label({ text }: { text: string }) {
  return <Text style={styles.label}>{text}</Text>;
}

const styles = StyleSheet.create({
  container: { padding: 20, paddingBottom: 40 },
  title: { fontSize: 20, fontWeight: '800', color: '#111827', marginBottom: 20 },
  label: { fontSize: 13, color: '#374151', fontWeight: '600', marginBottom: 4, marginTop: 12 },
  input: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    color: '#111827',
  },
  textarea: { height: 80, textAlignVertical: 'top' },
  saveBtn: {
    marginTop: 28,
    backgroundColor: '#2563eb',
    borderRadius: 10,
    paddingVertical: 14,
    alignItems: 'center',
  },
  saveBtnDisabled: { opacity: 0.6 },
  saveBtnText: { color: '#fff', fontWeight: '700', fontSize: 15 },
});
