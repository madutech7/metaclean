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

  const renderInfoRow = (label: string, value: string | undefined, Icon: any, color: string = '#6366F1') => {
    if (!value) return null;
    return (
      <View style={styles.row}>
        <View style={[styles.iconBox, { backgroundColor: `${color}15` }]}>
          <Icon size={18} color={color} strokeWidth={2.5} />
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
              transition={{ type: 'spring', damping: 20, stiffness: 100 }}
              style={styles.modalContent}
            >
              <BlurView intensity={30} tint="dark" style={StyleSheet.absoluteFill} />
              
              <View style={styles.header}>
                <View style={styles.headerHandle} />
                <View style={styles.headerRow}>
                  <View style={styles.headerTitleGroup}>
                    <Info size={24} color="#6366F1" style={{ marginRight: 12 }} />
                    <Text style={styles.modalTitle}>ADN du Fichier</Text>
                  </View>
                  <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
                    <XCircle size={32} color="rgba(255,255,255,0.2)" />
                  </TouchableOpacity>
                </View>
              </View>

              <ScrollView style={styles.scrollArea} showsVerticalScrollIndicator={false}>
                {hasGPS && (
                  <View style={styles.dangerSignal}>
                    <ShieldAlert size={28} color="#FF4B4B" />
                    <View style={styles.dangerContent}>
                      <Text style={styles.dangerTitle}>FUITE DE DONNÉES GPS</Text>
                      <Text style={styles.dangerDesc}>Ce fichier contient votre position géographique exacte. Effacez-la avant de partager.</Text>
                    </View>
                  </View>
                )}

                <View style={styles.section}>
                  <Text style={styles.sectionTitle}>HARDWARE & SYSTÈME</Text>
                  {renderInfoRow('Modèle', asset.exif?.Model, Smartphone, '#6366F1')}
                  {renderInfoRow('Fabricant', asset.exif?.Make, Cpu, '#6366F1')}
                  {renderInfoRow('Software', asset.exif?.Software, Zap, '#6366F1')}
                </View>

                <View style={styles.section}>
                  <Text style={styles.sectionTitle}>CAPTEUR & OPTIQUE</Text>
                  {renderInfoRow('Ouverture', asset.exif?.FNumber ? `f/${asset.exif.FNumber}` : undefined, Aperture, '#FACC15')}
                  {renderInfoRow('ISO', asset.exif?.ISOSpeedRatings?.toString(), Zap, '#FACC15')}
                  {renderInfoRow('Exposition', asset.exif?.ExposureTime ? `1/${Math.round(1/asset.exif.ExposureTime)}s` : undefined, Timer, '#FACC15')}
                </View>

                {hasGPS && (
                  <View style={styles.section}>
                    <Text style={styles.sectionTitle}>COORDONNÉES À PURGER</Text>
                    {renderInfoRow('Latitude', asset.exif?.GPSLatitude?.toString(), MapPin, '#FF4B4B')}
                    {renderInfoRow('Longitude', asset.exif?.GPSLongitude?.toString(), MapPin, '#FF4B4B')}
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

// Quick helper to fix the missing touchable
import { TouchableWithoutFeedback } from 'react-native';

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  modalContent: {
    backgroundColor: 'rgba(15, 23, 42, 0.95)',
    borderTopLeftRadius: 40,
    borderTopRightRadius: 40,
    height: height * 0.85,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  header: {
    paddingTop: 12,
    paddingBottom: 20,
    paddingHorizontal: 28,
  },
  headerHandle: {
    width: 60,
    height: 6,
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderRadius: 3,
    alignSelf: 'center',
    marginBottom: 20,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  headerTitleGroup: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  modalTitle: {
    color: '#F8FAFC',
    fontSize: 24,
    fontWeight: '900',
    letterSpacing: -0.5,
  },
  closeBtn: {
    padding: 4,
  },
  scrollArea: {
    flex: 1,
    paddingHorizontal: 28,
  },
  dangerSignal: {
    flexDirection: 'row',
    backgroundColor: 'rgba(255, 75, 75, 0.1)',
    borderRadius: 24,
    padding: 24,
    marginBottom: 32,
    borderWidth: 1.5,
    borderColor: 'rgba(255, 75, 75, 0.2)',
    alignItems: 'center',
  },
  dangerContent: {
    flex: 1,
    marginLeft: 16,
  },
  dangerTitle: {
    color: '#FF4B4B',
    fontSize: 16,
    fontWeight: '900',
    letterSpacing: 1,
    marginBottom: 4,
  },
  dangerDesc: {
    color: 'rgba(255, 75, 75, 0.6)',
    fontSize: 13,
    lineHeight: 18,
    fontWeight: '700',
  },
  section: {
    marginBottom: 32,
  },
  sectionTitle: {
    color: 'rgba(248, 250, 252, 0.3)',
    fontSize: 11,
    fontWeight: '900',
    letterSpacing: 2,
    marginBottom: 20,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.03)',
    borderRadius: 20,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.02)',
  },
  iconBox: {
    width: 44,
    height: 44,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 16,
  },
  rowText: {
    flex: 1,
  },
  rowLabel: {
    color: 'rgba(248, 250, 252, 0.4)',
    fontSize: 12,
    fontWeight: '700',
    marginBottom: 2,
  },
  rowValue: {
    color: '#F8FAFC',
    fontSize: 16,
    fontWeight: '800',
  },
});
