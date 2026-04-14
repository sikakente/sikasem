import { useState } from 'react';
import { Buffer } from 'buffer';
import * as FileSystem from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import { Alert } from 'react-native';
import { reportsApi, ReportParams } from '../lib/api/reports.api';

const MIME_TYPES: Record<string, string> = {
  csv: 'text/csv',
  xlsx: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  pdf: 'application/pdf',
};

export function useReportExport() {
  const [isExporting, setIsExporting] = useState(false);

  const exportReport = async (
    reportType: string,
    params: ReportParams,
    format: 'csv' | 'xlsx' | 'pdf',
  ) => {
    setIsExporting(true);
    let uri: string | null = null;
    try {
      const response = await reportsApi.export(reportType, params, format);
      const base64 = Buffer.from(response.data as ArrayBuffer).toString('base64');

      const filename = `${reportType}-${Date.now()}.${format}`;
      uri = `${FileSystem.cacheDirectory}${filename}`;

      await FileSystem.writeAsStringAsync(uri, base64, {
        encoding: FileSystem.EncodingType.Base64,
      });

      const canShare = await Sharing.isAvailableAsync();
      if (canShare) {
        await Sharing.shareAsync(uri, {
          mimeType: MIME_TYPES[format],
          dialogTitle: `Share ${reportType} report`,
        });
        await FileSystem.deleteAsync(uri, { idempotent: true });
      } else {
        Alert.alert('Export saved', `File saved to: ${uri}`);
      }
    } catch {
      if (uri) {
        await FileSystem.deleteAsync(uri, { idempotent: true }).catch(() => undefined);
      }
      Alert.alert('Export failed', 'Could not export the report. Please try again.');
    } finally {
      setIsExporting(false);
    }
  };

  return { exportReport, isExporting };
}
