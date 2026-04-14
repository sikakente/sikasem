import { useState } from 'react';
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
    try {
      const response = await reportsApi.export(reportType, params, format);
      const blob = response.data as Blob;

      // Convert blob to base64
      const base64 = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => {
          const result = reader.result as string;
          // result is "data:<mime>;base64,<data>" — strip the prefix
          resolve(result.split(',')[1]);
        };
        reader.onerror = reject;
        reader.readAsDataURL(blob);
      });

      const filename = `${reportType}-${Date.now()}.${format}`;
      const uri = `${FileSystem.cacheDirectory}${filename}`;

      await FileSystem.writeAsStringAsync(uri, base64, {
        encoding: FileSystem.EncodingType.Base64,
      });

      const canShare = await Sharing.isAvailableAsync();
      if (canShare) {
        await Sharing.shareAsync(uri, {
          mimeType: MIME_TYPES[format],
          dialogTitle: `Share ${reportType} report`,
        });
      } else {
        Alert.alert('Export saved', `File saved to: ${uri}`);
      }
    } catch {
      Alert.alert('Export failed', 'Could not export the report. Please try again.');
    } finally {
      setIsExporting(false);
    }
  };

  return { exportReport, isExporting };
}
