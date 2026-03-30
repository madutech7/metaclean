import React from 'react';
import { 
  StyleSheet, 
  Text, 
  View, 
  Modal, 
  ScrollView, 
  TouchableOpacity, 
  Dimensions,
  Platform
} from 'react-native';
import { BlurView } from 'expo-blur';
import { MotiView, AnimatePresence } from 'moti';
import { 
  XCircle, 
  Info, 
  AlertTriangle, 
  Smartphone, 
  Cpu, 
  Aperture, 
  Zap, 
  Timer, 
  MapPin, 
  ShieldAlert 
} from 'lucide-react-native';

const { height } = Dimensions.get('window');

interface ExifInspectorModalProps {
  visible: boolean;
  asset: any;
  onClose: () => void;
}

export function ExifInspectorModal({ visible, asset, onClose }: ExifInspectorModalProps) {
  if (!asset) return null;

  const renderInfoRow = (label: string, value: string | undefined, Icon: any, color: string = '#00E5FF') => {
    if (!value) return null;
    return (
      <View style={styles.row}>
        <View style={[styles.iconBox, { borderColor: `${color}20`, backgroundColor: `${color}05` }]}>
          <Icon size={16} color={color} strokeWidth={1.5} />
        </View>
        <View style={styles.rowText}>
          <Text style={styles.rowLabel}>{label}</Text>
          <Text style={styles.rowValue}>{value}</Text>
        </View>
      </View>
    );
  };

  const hasGPS = !!asset.exif?.GPSLatitude;

  return (
    <Modal
      animationType="none"
      transparent={true}
      visible={visible}
      onRequestClose={onClose}
    >
      <View style={styles.modalOverlay}>
        <TouchableWithoutFeedback onPress={onClose}>
          <View style={StyleSheet.absoluteFill} />
        </TouchableWithoutFeedback>

        <AnimatePresence>
          {visible && (
            <MotiView 
              from={{ translateY: height }}
              animate={{ translateY: 0 }}
              exit={{ translateY: height }}
              transition={{ type: 'spring', damping: 25, stiffness: 120 }}
              style={styles.modalContent}
            >
              <View style={styles.header}>
                <View style={styles.headerHandle} />
                <View style={styles.headerRow}>
                  <View style={styles.headerTitleGroup}>
                    <Text style={styles.modalSubtitle}>SCANNING ASSET</Text>
                    <Text style={styles.modalTitle}>FILE SIGNATURE</Text>
                  </View>
                  <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
                     <XCircle size={28} color="rgba(255,255,255,0.2)" />
                  </TouchableOpacity>
                </View>
              </View>

              <ScrollView style={styles.scrollArea} showsVerticalScrollIndicator={false}>
                {hasGPS && (
                  <View style={styles.dangerSignal}>
                    <ShieldAlert size={24} color="#FF5252" />
                    <View style={styles.dangerContent}>
                      <Text style={styles.dangerTitle}>GPS EXPOSURE DETECTED</Text>
                      <Text style={styles.dangerDesc}>EXACT GEOLOCATION DATA EMBEDDED. PURGE RECOMMENDED BEFORE DISSEMINATION.</Text>
                    </View>
                  </View>
                )}

                <View style={styles.section}>
                  <Text style={styles.sectionTitle}>HARDWARE & SYSTEM</Text>
                  {renderInfoRow('MODEL', asset.exif?.Model, Smartphone)}
                  {renderInfoRow('VENDOR', asset.exif?.Make, Cpu)}
                  {renderInfoRow('FIRMWARE', asset.exif?.Software, Zap)}
                </View>

                <View style={styles.section}>
                  <Text style={styles.sectionTitle}>OPTICS & SENSOR</Text>
                  {renderInfoRow('APERTURE', asset.exif?.FNumber ? `f/${asset.exif.FNumber}` : undefined, Aperture, '#FFD740')}
                  {renderInfoRow('ISO', asset.exif?.ISOSpeedRatings?.toString(), Zap, '#FFD740')}
                  {renderInfoRow('EXPOSURE', asset.exif?.ExposureTime ? `1/${Math.round(1/asset.exif.ExposureTime)}s` : undefined, Timer, '#FFD740')}
                </View>

                {hasGPS && (
                  <View style={styles.section}>
                    <Text style={styles.sectionTitle}>GEOLOCATION PAYLOAD</Text>
                    {renderInfoRow('LATITUDE', asset.exif?.GPSLatitude?.toString(), MapPin, '#FF5252')}
                    {renderInfoRow('LONGITUDE', asset.exif?.GPSLongitude?.toString(), MapPin, '#FF5252')}
                  </View>
                )}
                
                <View style={{ height: 100 }} />
              </ScrollView>
            </MotiView>
          )}
        </AnimatePresence>
      </View>
    </Modal>
  );
}

import { TouchableWithoutFeedback } from 'react-native';

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(0,0,0,0.8)',
  },
  modalContent: {
    backgroundColor: '#050505',
    borderTopLeftRadius: 32,
    borderTopRightRadius: 32,
    height: height * 0.85,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.05)',
  },
  header: {
    paddingTop: 12,
    paddingBottom: 24,
    paddingHorizontal: 30,
  },
  headerHandle: {
    width: 40,
    height: 4,
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderRadius: 2,
    alignSelf: 'center',
    marginBottom: 24,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  headerTitleGroup: {
    flex: 1,
  },
  modalSubtitle: {
    color: '#00E5FF',
    fontSize: 9,
    fontWeight: '900',
    letterSpacing: 3,
    marginBottom: 4,
  },
  modalTitle: {
    color: '#FFF',
    fontSize: 22,
    fontWeight: '900',
    letterSpacing: -0.5,
  },
  closeBtn: {
    padding: 4,
  },
  scrollArea: {
    flex: 1,
    paddingHorizontal: 30,
  },
  dangerSignal: {
    flexDirection: 'row',
    backgroundColor: 'rgba(255, 82, 82, 0.05)',
    borderRadius: 16,
    padding: 20,
    marginBottom: 32,
    borderWidth: 1,
    borderColor: 'rgba(255, 82, 82, 0.2)',
    alignItems: 'center',
  },
  dangerContent: {
    flex: 1,
    marginLeft: 16,
  },
  dangerTitle: {
    color: '#FF5252',
    fontSize: 12,
    fontWeight: '900',
    letterSpacing: 1.5,
    marginBottom: 4,
  },
  dangerDesc: {
    color: 'rgba(255, 82, 82, 0.5)',
    fontSize: 10,
    lineHeight: 14,
    fontWeight: '800',
  },
  section: {
    marginBottom: 32,
  },
  sectionTitle: {
    color: 'rgba(255, 255, 255, 0.2)',
    fontSize: 9,
    fontWeight: '900',
    letterSpacing: 3,
    marginBottom: 16,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.01)',
    borderRadius: 12,
    padding: 14,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.02)',
  },
  iconBox: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 14,
    borderWidth: 1,
  },
  rowText: {
    flex: 1,
  },
  rowLabel: {
    color: 'rgba(255, 255, 255, 0.3)',
    fontSize: 10,
    fontWeight: '800',
    marginBottom: 2,
  },
  rowValue: {
    color: '#FFF',
    fontSize: 15,
    fontWeight: '900',
    letterSpacing: -0.5,
  },
});
