import React, { useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  Platform,
  ActivityIndicator,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { ChevronLeft, Scan, CheckCircle, XCircle } from 'lucide-react-native';
import { router } from 'expo-router';
import { BG_GRADIENT, GOLD_PRIMARY, GOLD_SOFT_FILL, GOLD_MEDIUM_FILL, GOLD_MEDIUM_BORDER } from '@/lib/theme';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { useTranslation } from '@/hooks/useTranslation';

function parseMaybeQrPayload(payload: string) {
  // QR форматтары әртүрлі болуы мүмкін. Біздің мақсат: сканнан кейін экранда payload көрсету.
  // Қажет болса кейін төлем сілтемесі/ID сияқты нақты форматқа келтіреміз.
  return payload.trim();
}

export default function QrScanScreen() {
  const { t } = useTranslation();
  const [permission, requestPermission] = useCameraPermissions();
  const [scanned, setScanned] = useState(false);
  const [payload, setPayload] = useState<string>('');
  const [loading, setLoading] = useState(false);

  const cameraRef = useRef<CameraView | null>(null);

  useEffect(() => {
    if (!permission) return;
    if (!permission.granted) {
      requestPermission?.();
    }
  }, [permission, requestPermission]);

  const handleBack = () => {
    // Егер скан болып жатқан болса, тыныш жабамыз
    router.back();
  };

  const onBarcodeScanned = async (result: { data?: string }) => {
    if (scanned) return;
    const data = result?.data;
    if (!data) return;

    setScanned(true);
    setLoading(true);

    try {
      const parsed = parseMaybeQrPayload(data);
      setPayload(parsed);

      // Демо: келесі қадамға өтетін жер.
      // Мысалы, parsed ішінен paymentId табып, backend-ке жіберу.
      Alert.alert(t('menuQrScan.alertScannedTitle'), parsed.length > 120 ? `${parsed.slice(0, 120)}...` : parsed);
    } catch {
      Alert.alert(t('menuQrScan.alertErrorTitle'), t('menuQrScan.alertErrorMessage'));
    } finally {
      setLoading(false);
    }
  };

  const canShowCamera = permission?.granted;

  return (
    <View style={styles.container}>
      <LinearGradient colors={BG_GRADIENT} style={styles.bg} />

      <View style={styles.header}>
        <TouchableOpacity onPress={handleBack} activeOpacity={0.7}>
          <ChevronLeft size={28} color="#FFFFFF" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{t('menuQrScan.headerTitle')}</Text>
        <View style={{ width: 28 }} />
      </View>

      <View style={styles.content}>
        {!canShowCamera && (
          <View style={styles.permissionBox}>
            <Text style={styles.permissionTitle}>{t('menuQrScan.permissionTitle')}</Text>
            <Text style={styles.permissionSubtitle}>
              {t('menuQrScan.permissionSubtitle')}
            </Text>

            <TouchableOpacity
              style={styles.permissionButton}
              activeOpacity={0.85}
              onPress={() => requestPermission?.()}
            >
              <Text style={styles.permissionButtonText}>{t('menuQrScan.permissionButtonText')}</Text>
            </TouchableOpacity>
          </View>
        )}

        {canShowCamera && (
          <>
            <View style={styles.cameraFrame}>
              <CameraView
                ref={(r) => {
                  cameraRef.current = r;
                }}
                style={StyleSheet.absoluteFill}
                // expo-camera CameraView accepts these props across versions
                facing="back"
                barcodeScannerSettings={{
                  // QR/Barcode скан үшін
                  barcodeTypes: ['qr'],
                }}
                onBarcodeScanned={scanned ? undefined : onBarcodeScanned}
                // iOS/Android үшін ыңғайлы
                ratio="16:9"
              />

              <View pointerEvents="none" style={styles.overlay}>
                <View style={styles.scanFrame} />
                <View style={styles.scanHint}>
                  <Scan size={22} color="rgba(255,255,255,0.9)" />
                  <Text style={styles.scanHintText}>{t('menuQrScan.scanHintText')}</Text>
                </View>
              </View>
            </View>

            <View style={styles.resultBox}>
              {loading ? (
                <View style={styles.resultRow}>
                  <ActivityIndicator color={GOLD_PRIMARY} />
                  <Text style={styles.resultText}>{t('menuQrScan.resultProcessing')}</Text>
                </View>
              ) : scanned ? (
                <View>
                  <View style={styles.resultIconRow}>
                    <CheckCircle size={20} color="#22C55E" />
                    <Text style={styles.resultTitle}>{t('menuQrScan.resultSuccessTitle')}</Text>
                  </View>
                  <Text style={styles.resultPayload} numberOfLines={6}>
                    {payload || '—'}
                  </Text>

                  <TouchableOpacity
                    style={styles.primaryButton}
                    activeOpacity={0.85}
                    onPress={() => {
                      setScanned(false);
                      setPayload('');
                    }}
                  >
                    <Text style={styles.primaryButtonText}>{t('menuQrScan.primaryButtonText')}</Text>
                  </TouchableOpacity>
                </View>
              ) : (
                <View style={styles.resultRow}>
                  <XCircle size={20} color="rgba(255,255,255,0.35)" />
                  <Text style={styles.resultText}>{t('menuQrScan.resultEmptyText')}</Text>
                </View>
              )}
            </View>
          </>
        )}

        {Platform.OS === 'android' && (
          <Text style={styles.footerNote}>{t('menuQrScan.footerNote')}</Text>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  bg: { ...StyleSheet.absoluteFill },
  header: {
    paddingTop: 60,
    paddingHorizontal: 24,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  headerTitle: {
    fontSize: 20,
    fontFamily: 'Inter-SemiBold',
    color: '#FFFFFF',
  },
  content: {
    flex: 1,
    paddingHorizontal: 24,
    paddingBottom: 20,
  },
  permissionBox: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 16,
  },
  permissionTitle: {
    fontSize: 18,
    fontFamily: 'Inter-SemiBold',
    color: '#FFFFFF',
    marginBottom: 8,
    textAlign: 'center',
  },
  permissionSubtitle: {
    fontSize: 14,
    fontFamily: 'Inter-Regular',
    color: 'rgba(255,255,255,0.5)',
    textAlign: 'center',
    marginBottom: 16,
  },
  permissionButton: {
    backgroundColor: GOLD_SOFT_FILL,
    borderWidth: 1,
    borderColor: GOLD_MEDIUM_BORDER,
    borderRadius: 14,
    paddingVertical: 12,
    paddingHorizontal: 18,
  },
  permissionButtonText: {
    color: '#FFFFFF',
    fontFamily: 'Inter-SemiBold',
    fontSize: 16,
  },
  cameraFrame: {
    width: '100%',
    height: 360,
    borderRadius: 22,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.12)',
    backgroundColor: 'rgba(255,255,255,0.03)',
  },
  overlay: {
    ...StyleSheet.absoluteFill,
    justifyContent: 'center',
    alignItems: 'center',
  },
  scanFrame: {
    width: 240,
    height: 240,
    borderRadius: 18,
    borderWidth: 2,
    borderColor: GOLD_PRIMARY,
    backgroundColor: GOLD_SOFT_FILL,
  },
  scanHint: {
    position: 'absolute',
    bottom: 18,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 14,
    backgroundColor: 'rgba(0,0,0,0.25)',
  },
  scanHintText: {
    color: 'rgba(255,255,255,0.9)',
    fontFamily: 'Inter-SemiBold',
    fontSize: 14,
  },
  resultBox: {
    marginTop: 16,
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderRadius: 20,
    padding: 16,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  resultRow: {
    flexDirection: 'row',
    gap: 10,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
  },
  resultText: {
    color: 'rgba(255,255,255,0.7)',
    fontFamily: 'Inter-SemiBold',
    fontSize: 14,
  },
  resultIconRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
  },
  resultTitle: {
    color: '#FFFFFF',
    fontFamily: 'Inter-SemiBold',
    fontSize: 16,
  },
  resultPayload: {
    color: 'rgba(255,255,255,0.75)',
    fontFamily: 'Inter-Regular',
    fontSize: 13,
    lineHeight: 18,
    marginBottom: 14,
  },
  primaryButton: {
    height: 52,
    borderRadius: 16,
    overflow: 'hidden',
    backgroundColor: GOLD_MEDIUM_FILL,
    borderWidth: 1,
    borderColor: GOLD_MEDIUM_BORDER,
    justifyContent: 'center',
    alignItems: 'center',
  },
  primaryButtonText: {
    color: '#FFFFFF',
    fontFamily: 'Inter-SemiBold',
    fontSize: 16,
  },
  footerNote: {
    marginTop: 12,
    color: 'rgba(255,255,255,0.35)',
    fontFamily: 'Inter-Regular',
    fontSize: 12,
    textAlign: 'center',
  },
});

