import { useEffect, useRef, useState } from 'react';
import {
  Modal,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';

interface BarcodeScannerProps {
  onScanned: (barcode: string) => void;
  onClose: () => void;
  visible: boolean;
  mode?: 'modal' | 'inline';
}

export function BarcodeScanner({ onScanned, onClose, visible, mode = 'modal' }: BarcodeScannerProps) {
  const [permission, requestPermission] = useCameraPermissions();
  const [scanned, setScanned] = useState(false);

  // Reset scan state when opened
  useEffect(() => {
    if (visible) setScanned(false);
  }, [visible]);

  const handleBarcodeScanned = ({ data }: { data: string }) => {
    if (scanned) return;
    setScanned(true);
    onScanned(data);
  };

  const content = !permission ? (
    <View style={styles.center}>
      <Text style={styles.text}>Requesting camera permission...</Text>
    </View>
  ) : !permission.granted ? (
    <View style={styles.center}>
      <Text style={styles.text}>Camera access is required to scan barcodes.</Text>
      <TouchableOpacity style={styles.button} onPress={requestPermission}>
        <Text style={styles.buttonText}>Grant Permission</Text>
      </TouchableOpacity>
    </View>
  ) : (
    <View style={styles.cameraContainer}>
      <CameraView
        style={StyleSheet.absoluteFillObject}
        facing="back"
        onBarcodeScanned={scanned ? undefined : handleBarcodeScanned}
        barcodeScannerSettings={{ barcodeTypes: ['ean13', 'ean8', 'code128', 'qr', 'upc_a'] }}
      />

      {/* Overlay with scan window */}
      <View style={styles.overlay}>
        <View style={styles.topOverlay} />
        <View style={styles.middleRow}>
          <View style={styles.sideOverlay} />
          <View style={styles.scanWindow}>
            <View style={[styles.corner, styles.cornerTL]} />
            <View style={[styles.corner, styles.cornerTR]} />
            <View style={[styles.corner, styles.cornerBL]} />
            <View style={[styles.corner, styles.cornerBR]} />
          </View>
          <View style={styles.sideOverlay} />
        </View>
        <View style={styles.bottomOverlay}>
          <Text style={styles.hint}>
            {scanned ? 'Scanned! Processing...' : 'Align barcode within the frame'}
          </Text>
          <TouchableOpacity style={styles.closeButton} onPress={onClose}>
            <Text style={styles.closeText}>Cancel</Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );

  if (mode === 'inline') {
    return <View style={styles.container}>{content}</View>;
  }

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
      <View style={styles.container}>{content}</View>
    </Modal>
  );
}

const OVERLAY_COLOR = 'rgba(0,0,0,0.6)';
const WINDOW_SIZE = 260;
const CORNER_SIZE = 24;
const CORNER_WIDTH = 3;

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000' },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24 },
  text: { color: '#fff', fontSize: 16, textAlign: 'center', marginBottom: 16 },
  button: { backgroundColor: '#2563eb', paddingHorizontal: 20, paddingVertical: 10, borderRadius: 8 },
  buttonText: { color: '#fff', fontSize: 15, fontWeight: '600' },
  cameraContainer: { flex: 1 },
  overlay: { ...StyleSheet.absoluteFillObject },
  topOverlay: { flex: 1, backgroundColor: OVERLAY_COLOR },
  middleRow: { flexDirection: 'row', height: WINDOW_SIZE },
  sideOverlay: { flex: 1, backgroundColor: OVERLAY_COLOR },
  scanWindow: { width: WINDOW_SIZE, height: WINDOW_SIZE },
  bottomOverlay: {
    flex: 1,
    backgroundColor: OVERLAY_COLOR,
    alignItems: 'center',
    paddingTop: 20,
    gap: 16,
  },
  hint: { color: '#fff', fontSize: 14 },
  closeButton: {
    borderWidth: 1,
    borderColor: '#fff',
    borderRadius: 8,
    paddingHorizontal: 24,
    paddingVertical: 10,
  },
  closeText: { color: '#fff', fontSize: 15 },
  corner: {
    position: 'absolute',
    width: CORNER_SIZE,
    height: CORNER_SIZE,
    borderColor: '#fff',
  },
  cornerTL: { top: 0, left: 0, borderTopWidth: CORNER_WIDTH, borderLeftWidth: CORNER_WIDTH },
  cornerTR: { top: 0, right: 0, borderTopWidth: CORNER_WIDTH, borderRightWidth: CORNER_WIDTH },
  cornerBL: { bottom: 0, left: 0, borderBottomWidth: CORNER_WIDTH, borderLeftWidth: CORNER_WIDTH },
  cornerBR: { bottom: 0, right: 0, borderBottomWidth: CORNER_WIDTH, borderRightWidth: CORNER_WIDTH },
});
