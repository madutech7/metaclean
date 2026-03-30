import React, { useState, useRef, useEffect } from 'react';
import { 
  StyleSheet, 
  Text, 
  View, 
  Image, 
  Alert,
  Dimensions,
  Platform,
  Modal,
  Switch,
  TouchableOpacity,
  Animated,
  Pressable,
  ActivityIndicator,
  ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as ImagePicker from 'expo-image-picker';
import * as ImageManipulator from 'expo-image-manipulator';
import * as MediaLibrary from 'expo-media-library';
import * as FileSystem from 'expo-file-system';
import { documentDirectory, cacheDirectory, deleteAsync } from 'expo-file-system/legacy';
import { StatusBar } from 'expo-status-bar';
import { BlurView } from 'expo-blur';
import * as Haptics from 'expo-haptics';
import Constants, { ExecutionEnvironment } from 'expo-constants';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { MotiView, MotiText, AnimatePresence } from 'moti';
import { 
  ShieldCheck, 
  Camera, 
  Music, 
  Plus, 
  Trash2, 
  Info, 
  MapPin, 
  Sparkles,
  ChevronRight,
  ShieldAlert,
  Zap
} from 'lucide-react-native';

// NEW COMPONENTS
import { ExifInspectorModal } from '../components/ExifInspectorModal';
import { StatCard } from '../components/StatCard';
import { getPrivacyStats, updatePrivacyStats, PrivacyStats } from '../utils/privacyStats';

import { FFmpegKit, ReturnCode, FFmpegKitConfig } from 'ffmpeg-kit-react-native';

const isExpoGo = Constants.executionEnvironment === ExecutionEnvironment.StoreClient;

const { width } = Dimensions.get('window');
const SPACING = 20;
const COLUMN_COUNT = 2;
const IMAGE_SIZE = (width - SPACING * 3) / COLUMN_COUNT;

// --- UTILS ---
const TouchableScale = ({ onPress, children, style, disabled = false }: any) => {
  const scale = useRef(new Animated.Value(1)).current;

  const onPressIn = () => {
    if (disabled) return;
    Animated.spring(scale, { toValue: 0.92, useNativeDriver: true }).start();
  };

  const onPressOut = () => {
    if (disabled) return;
    Animated.spring(scale, { toValue: 1, useNativeDriver: true }).start();
  };

  return (
    <Pressable onPressIn={onPressIn} onPressOut={onPressOut} onPress={onPress} disabled={disabled}>
      <Animated.View style={[style, { transform: [{ scale }] }]}>
        {children}
      </Animated.View>
    </Pressable>
  );
};

// --- COMPONENTS ---
const MetadataToggle = ({ label, icon: Icon, isActive, onToggle }: any) => (
  <TouchableScale onPress={onToggle} style={styles.toggleBtn}>
    <BlurView intensity={10} tint="light" style={[styles.toggleBlur, isActive && styles.toggleBlurActive]}>
      <Icon size={14} color={isActive ? "#00E5FF" : "rgba(255,255,255,0.2)"} strokeWidth={2.5} />
      <Text style={[styles.toggleLabel, isActive && styles.toggleLabelActive]}>{label}</Text>
    </BlurView>
  </TouchableScale>
);

const ImageCard = ({ item, index, onRemove, onInspect, isProcessing }: any) => {
  const hasGPS = !!item.exif?.GPSLatitude;

  return (
    <MotiView
      from={{ opacity: 0, scale: 0.9, translateY: 20 }}
      animate={{ opacity: 1, scale: 1, translateY: 0 }}
      transition={{ type: 'spring', delay: index * 40 }}
      style={styles.imageCardWrapper}
    >
      <TouchableScale style={styles.imageCardContainer} onPress={() => onInspect(item)}>
        <View style={[styles.imageCard, isProcessing && styles.imageCardProcessing]}>
          <Image source={{ uri: item.uri }} style={styles.image} />
          
          <LinearGradient
            colors={['rgba(0,0,0,0.5)', 'transparent', 'rgba(0,0,0,0.6)']}
            style={StyleSheet.absoluteFill}
          />

          {!isProcessing && (
            <TouchableScale 
              style={styles.removeBtn} 
              onPress={() => {
                if (Platform.OS !== 'web') Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                onRemove(item.uri);
              }}
            >
              <BlurView intensity={20} tint="dark" style={styles.removeBtnBlur}>
                <Trash2 size={14} color="#FF5252" />
              </BlurView>
            </TouchableScale>
          )}

          {hasGPS && (
            <View style={styles.dangerBadge}>
              <ShieldAlert size={10} color="#FFF" />
              <Text style={styles.dangerText}>GPS DETECTED</Text>
            </View>
          )}

          <View style={styles.cardInfoLayer}>
             <Info size={12} color="rgba(255,255,255,0.4)" />
          </View>
        </View>
      </TouchableScale>
    </MotiView>
  );
};

export default function Index() {
  const router = useRouter();
  const [images, setImages] = useState<ImagePicker.ImagePickerAsset[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [progress, setProgress] = useState(0);
  const [stats, setStats] = useState<PrivacyStats>({ 
    filesCleaned: 0, 
    gpsTracesRemoved: 0, 
    deviceTracesRemoved: 0,
    totalSizeCleanedMB: 0,
    lastCleanedDate: null 
  });
  const [inspectorAsset, setInspectorAsset] = useState<ImagePicker.ImagePickerAsset | null>(null);

  // Metadata Settings
  const [stripGPS, setStripGPS] = useState(true);
  const [stripDevice, setStripDevice] = useState(true);
  const [stripAudio, setStripAudio] = useState(false);
  const [compressVideo, setCompressVideo] = useState(false);
  const [scrambleName, setScrambleName] = useState(true);
  const [autoDelete, setAutoDelete] = useState(false);
  const [stripAll, setStripAll] = useState(true);

  const progressAnim = useRef(new Animated.Value(0)).current;

  const getPrivacyRisk = () => {
    if (images.length === 0) return { label: 'CLEAN', color: '#00E5FF', score: 100 };
    const hasGPS = images.some(img => img.exif?.GPSLatitude);
    const hasDevice = images.some(img => img.exif?.Model);
    
    if (hasGPS) return { label: 'CRITICAL RISK', color: '#FF5252', score: 30 };
    if (hasDevice) return { label: 'MODERATE RISK', color: '#FFD740', score: 65 };
    return { label: 'LOW RISK', color: '#00E5FF', score: 90 };
  };

  const risk = getPrivacyRisk();

  useEffect(() => {
    loadStats();
  }, []);

  const loadStats = async () => {
    const currentStats = await getPrivacyStats();
    setStats(currentStats);
  };

  useEffect(() => {
    Animated.timing(progressAnim, {
      toValue: images.length > 0 ? (progress / images.length) : 0,
      duration: 300,
      useNativeDriver: false
    }).start();
  }, [progress, images.length]);

  const progressBarWidth = progressAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['0%', '100%']
  });

  const pickImages = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Accès refusé', 'L\'application nécessite l\'accès aux photos.');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images', 'videos'],
      allowsMultipleSelection: true,
      quality: 1, 
      exif: true,
    });

    if (!result.canceled) {
      if (Platform.OS !== 'web') Haptics.selectionAsync();
      const existingUris = new Set(images.map(img => img.uri));
      const newAssets = result.assets.filter(asset => !existingUris.has(asset.uri));
      setImages([...images, ...newAssets]);
      setProgress(0);
      progressAnim.setValue(0);
    }
  };

  const cleanMetadataAndSave = async () => {
    if (images.length === 0) return;

    if (Platform.OS !== 'web') Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
    setIsProcessing(true);
    setProgress(0);

    let successCount = 0;
    let removedGPSCount = 0;
    let removedDeviceCount = 0;
    let totalSizeMB = 0;
    const originalAssetIds: string[] = [];

    for (let i = 0; i < images.length; i++) {
        const file = images[i];
        try {
            let finalUri = file.uri;
            if (file.exif?.GPSLatitude) removedGPSCount++;
            if (file.exif?.Model || file.exif?.Make) removedDeviceCount++;
            if (file.assetId) originalAssetIds.push(file.assetId);

            // Estimate size
            if (file.fileSize) totalSizeMB += file.fileSize / (1024 * 1024);
            
            if (file.type === 'video') {
                if (isExpoGo || !FFmpegKit) {
                   Alert.alert('Non supporté', 'Le nettoyage vidéo nécessite une application compilée.');
                   setIsProcessing(false);
                   return;
                }
                const baseDir = documentDirectory || cacheDirectory || '';
                const fileName = scrambleName ? `clean_${Math.random().toString(36).substring(7)}` : `clean_${Date.now()}`;
                const outputUri = `${baseDir}${fileName}_${i}.mp4`;
                
                // Smart Script
                let script = `-i "${file.uri}" `;
                
                // Metadata handling
                if (stripAll) script += `-map_metadata -1 `;
                else {
                  if (stripGPS) script += `-metadata:s:v:0 location= -metadata location= `;
                  if (stripDevice) script += `-metadata title= -metadata model= `;
                }

                // Audio handling
                if (stripAudio) script += `-an `;
                else script += `-c:a copy `;

                // Compression handling
                if (compressVideo) {
                    // Use H.265 (HEVC) for maximum quality/size ratio if available, fallback to H.264
                    script += `-c:v libx265 -crf 28 -preset fast `;
                } else {
                    script += `-c:v copy `;
                }
                
                script += `"${outputUri}"`;
                
                try {
                  const session = await FFmpegKit.execute(script);
                  const returnCode = await session.getReturnCode();
                  if (ReturnCode.isSuccess(returnCode)) finalUri = outputUri;
                  else throw new Error("FFmpeg Error");
                } catch (e) {
                   console.error('Video Error', e);
                   continue;
                }
            } else {
                const manipulatedImage = await ImageManipulator.manipulateAsync(
                    file.uri, [], { compress: 0.95, format: ImageManipulator.SaveFormat.JPEG }
                );
                finalUri = manipulatedImage.uri;
            }

            const asset = await MediaLibrary.createAssetAsync(finalUri);
            const albumName = 'MetaClean';
            const album = await MediaLibrary.getAlbumAsync(albumName);
            if (album) await MediaLibrary.addAssetsToAlbumAsync([asset], album, false);
            else await MediaLibrary.createAlbumAsync(albumName, asset, false);
            
            successCount++;
        } catch (error) {
            console.error(error);
        }
        
        if (Platform.OS !== 'web') Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        setProgress(i + 1);
    }

    setIsProcessing(false);
    const updatedStats = await updatePrivacyStats({
      filesCleaned: successCount,
      gpsTracesRemoved: removedGPSCount,
      deviceTracesRemoved: removedDeviceCount,
      totalSizeCleanedMB: totalSizeMB
    });
    if (updatedStats) setStats(updatedStats);
    
    if (Platform.OS !== 'web') Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    
    if (originalAssetIds.length > 0) {
      Alert.alert(
        'Mission Pro Accomplie 🛡️', 
        `Tes ${successCount} fichiers sont maintenant propres.\n\nSupprimer les originaux (traces GPS incluses) ?`,
        [
          { text: 'Non, garder', style: 'cancel', onPress: () => { setImages([]); } },
          { text: 'Oui, détruire', style: 'destructive', onPress: async () => {
             try {
                await MediaLibrary.deleteAssetsAsync(originalAssetIds);
             } catch (e) {}
             setImages([]);
          }}
        ]
      );
    } else {
      setImages([]);
    }
  };

  return (
    <View style={styles.mainContainer}>
      <StatusBar style="light" />
      <View style={StyleSheet.absoluteFill}><View style={{flex: 1, backgroundColor: '#050505'}} /></View>

      <SafeAreaView style={styles.safeArea} edges={['top']}>
        <View style={styles.topNav}>
          <View>
            <MotiText 
              from={{ opacity: 0, letterSpacing: 10 } as any}
              animate={{ opacity: 1, letterSpacing: 3 } as any}
              style={styles.navSubtitle}
            >
              PROTOCOL: ZERO TRACE
            </MotiText>
            <MotiText style={styles.navTitle}>METACLEAN PRO</MotiText>
          </View>
          
          <View style={styles.topActions}>
            <TouchableScale onPress={() => router.push('/extractor' as any)} style={styles.navActionBtn}>
              <BlurView intensity={20} tint="light" style={styles.navActionBlur}>
                <Zap size={22} color="#00E5FF" fill="#00E5FF" />
              </BlurView>
            </TouchableScale>
            <TouchableScale onPress={() => setShowSettings(true)} style={[styles.navActionBtn, { marginLeft: 12 }]}>
              <BlurView intensity={20} tint="light" style={styles.navActionBlur}>
                <ShieldCheck size={22} color="#FFF" />
              </BlurView>
            </TouchableScale>
          </View>
        </View>

        <ScrollView 
          contentContainerStyle={styles.scrollContainer} 
          showsVerticalScrollIndicator={false}
          stickyHeaderIndices={[1]}
        >
          {/* PRIVACY RISK INDICATOR */}
          <MotiView 
            animate={{ borderColor: `${risk.color}30`, backgroundColor: `${risk.color}05` }}
            style={styles.riskIndicator}
          >
             <View style={[styles.riskDot, { backgroundColor: risk.color }]} />
             <Text style={[styles.riskLabel, { color: risk.color }]}>{risk.label}</Text>
             <Text style={styles.riskSub}>SCANNING METADATA STREAMS...</Text>
          </MotiView>

          {/* ENHANCED STATS DASHBOARD */}
          <MotiView 
            from={{ opacity: 0, translateY: 10 }}
            animate={{ opacity: 1, translateY: 0 }}
            style={styles.statsSection}
          >
            <StatCard title="FILES PROTECTED" value={stats.filesCleaned} icon="shield" color="#00E5FF" delay={100} />
            <StatCard title="GPS BLOCKED" value={stats.gpsTracesRemoved} icon="map-pin" color="#FF5252" delay={200} />
            <StatCard title="SIZE PURGED" value={`${Math.round(stats.totalSizeCleanedMB)} MB`} icon="zap" color="#FFD740" delay={300} />
          </MotiView>

          {/* METADATA CONTROLS */}
          <View style={styles.controlHeader}>
            <Text style={styles.gridHeaderText}>SECURITY PROTOCOLS</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.toggleRow}>
              <MetadataToggle label="GPS" icon={MapPin} isActive={stripGPS} onToggle={() => setStripGPS(!stripGPS)} />
              <MetadataToggle label="HARDWARE" icon={Info} isActive={stripDevice} onToggle={() => setStripDevice(!stripDevice)} />
              <MetadataToggle label="AUDIO" icon={Music} isActive={stripAudio} onToggle={() => setStripAudio(!stripAudio)} />
              <MetadataToggle label="HEVC" icon={Zap} isActive={compressVideo} onToggle={() => setCompressVideo(!compressVideo)} />
              <MetadataToggle label="ANONYM" icon={ShieldCheck} isActive={scrambleName} onToggle={() => setScrambleName(!scrambleName)} />
              <MetadataToggle label="FULL SCRUB" icon={ShieldAlert} isActive={stripAll} onToggle={() => setStripAll(!stripAll)} />
            </ScrollView>
          </View>

          <View style={styles.gridHeader}>
            <Text style={styles.gridHeaderText}>MEDIA BUFFER</Text>
            {images.length > 0 && (
               <TouchableScale onPress={() => setImages([])}>
                 <Text style={styles.clearText}>PURGE BUFFER</Text>
               </TouchableScale>
            )}
          </View>

          {images.length === 0 ? (
            <MotiView 
              from={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              style={styles.emptyContainer}
            >
              <View style={styles.emptyIllustrationCard}>
                <View style={styles.emptyIconGradient}>
                   <ShieldCheck size={40} color="#333" strokeWidth={1} />
                </View>
                <Text style={styles.emptyTextTitle}>SECURE VAULT EMPTY</Text>
                <Text style={styles.emptyTextSub}>SELECT UP TO 50 ASSETS TO INITIATE PROTOCOL.</Text>
                
                <TouchableScale onPress={pickImages} style={styles.mainPickBtn}>
                  <LinearGradient
                    colors={['#111', '#000']}
                    style={styles.mainPickGradient}
                  >
                    <Plus size={20} color="#00E5FF" style={{ marginRight: 12 }} />
                    <Text style={styles.mainPickText}>IMPORT SESSION</Text>
                  </LinearGradient>
                </TouchableScale>
              </View>
            </MotiView>
          ) : (
            <View style={styles.grid}>
              {images.map((img, idx) => (
                <ImageCard 
                  key={img.uri} 
                  item={img} 
                  index={idx} 
                  onRemove={(uri: string) => setImages(prev => prev.filter(i => i.uri !== uri))}
                  onInspect={setInspectorAsset}
                  isProcessing={isProcessing}
                />
              ))}
              
              {!isProcessing && (
                <TouchableScale onPress={pickImages} style={styles.addMoreWrapper}>
                  <View style={styles.addMoreInner}>
                    <Plus size={24} color="rgba(255,255,255,0.1)" />
                  </View>
                </TouchableScale>
              )}
            </View>
          )}

          <View style={{ height: 160 }} />
        </ScrollView>

        {/* FLOATING ACTION BAR */}
        <AnimatePresence>
          {images.length > 0 && (
            <MotiView 
              from={{ opacity: 0, translateY: 50 }}
              animate={{ opacity: 1, translateY: 0 }}
              exit={{ opacity: 0, translateY: 50 }}
              style={styles.floatingFooter}
            >
              <BlurView intensity={80} tint="dark" style={styles.footerBlur}>
                <View style={styles.footerInfo}>
                  <View style={styles.selectionCount}>
                    <Text style={styles.countNumber}>{images.length}</Text>
                    <Text style={styles.countLabel}>ASSETS</Text>
                  </View>
                  
                  {isProcessing ? (
                    <View style={styles.progressLabel}>
                      <ActivityIndicator size="small" color="#00E5FF" style={{ marginRight: 8 }} />
                      <Text style={styles.progressText}>{Math.round((progress / images.length) * 100)}%</Text>
                    </View>
                  ) : (
                    <View style={styles.readyBadge}>
                      <Text style={styles.readyText}>READY</Text>
                    </View>
                  )}
                </View>

                <TouchableScale 
                  onPress={cleanMetadataAndSave} 
                  disabled={isProcessing} 
                  style={styles.mainActionBtn}
                >
                  <LinearGradient
                    colors={isProcessing ? ['#111', '#050505'] : ['#00E5FF', '#0097A7']}
                    style={styles.actionGradient}
                  >
                    {isProcessing ? (
                      <Text style={styles.actionText}>SCRUBBING {progress}/{images.length}</Text>
                    ) : (
                      <Text style={styles.actionText}>INITIATE SCRUB</Text>
                    )}
                  </LinearGradient>
                </TouchableScale>

                {isProcessing && (
                  <View style={styles.footerProgressBarContainer}>
                    <Animated.View style={[styles.footerProgressBarFill, { width: progressBarWidth, backgroundColor: '#00E5FF' }]} />
                  </View>
                )}
              </BlurView>
            </MotiView>
          )}
        </AnimatePresence>

        <ExifInspectorModal 
          visible={!!inspectorAsset} 
          asset={inspectorAsset} 
          onClose={() => setInspectorAsset(null)} 
        />

        {/* SETTINGS MODAL */}
        <Modal visible={showSettings} transparent animationType="fade">
           <BlurView intensity={100} tint="dark" style={styles.modalOverlay}>
              <MotiView 
                from={{ scale: 0.95, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                style={styles.settingsCard}
              >
                 <Text style={styles.settingsTitle}>SYSTEM SETTINGS</Text>
                 
                 <View style={styles.settingItem}>
                    <Text style={styles.settingText}>AUTO-DESTRUCT ORIGINALS</Text>
                    <Switch 
                        value={autoDelete} 
                        onValueChange={setAutoDelete}
                        thumbColor="#00E5FF"
                        trackColor={{ false: '#111', true: '#004D40' }}
                    />
                 </View>

                 <TouchableScale 
                    onPress={async () => {
                        await deleteAsync(cacheDirectory || '', { idempotent: true });
                        if (Platform.OS !== 'web') Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
                    }}
                    style={styles.cacheBtn}
                 >
                    <Text style={styles.cacheBtnText}>PURGE CACHE STREAMS</Text>
                 </TouchableScale>

                 <TouchableScale onPress={() => router.push('/camera' as any)} style={styles.cameraBtn}>
                    <Text style={styles.cameraBtnText}>ACCESS SECURE CAMERA</Text>
                 </TouchableScale>

                 <TouchableOpacity onPress={() => setShowSettings(false)} style={styles.closeSettings}>
                    <Text style={styles.closeSettingsText}>DISMISS</Text>
                 </TouchableOpacity>
              </MotiView>
           </BlurView>
        </Modal>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  mainContainer: {
    flex: 1,
    backgroundColor: '#050505',
  },
  safeArea: {
    flex: 1,
  },
  topNav: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 24,
    height: 70,
  },
  navTitle: {
    color: '#FFF',
    fontSize: 20,
    fontWeight: '900',
    letterSpacing: -0.5,
  },
  navSubtitle: {
    color: '#00E5FF',
    fontSize: 10,
    fontWeight: '900',
    letterSpacing: 3,
    marginBottom: 2,
  },
  topActions: {
    flexDirection: 'row',
  },
  navActionBtn: {
    width: 46,
    height: 46,
    borderRadius: 14,
    overflow: 'hidden',
  },
  navActionBlur: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.05)',
  },
  scrollContainer: {
    paddingBottom: 40,
  },
  riskIndicator: {
    marginHorizontal: 24,
    marginTop: 20,
    padding: 16,
    borderRadius: 12,
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
  },
  riskDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    marginRight: 10,
  },
  riskLabel: {
    fontSize: 12,
    fontWeight: '900',
    letterSpacing: 1,
    marginRight: 12,
  },
  riskSub: {
    color: 'rgba(255,255,255,0.2)',
    fontSize: 10,
    fontWeight: '700',
  },
  statsSection: {
    flexDirection: 'row',
    paddingHorizontal: 18,
    marginTop: 20,
  },
  controlHeader: {
    paddingHorizontal: 24,
    marginTop: 30,
  },
  toggleRow: {
    flexDirection: 'row',
    marginTop: 14,
  },
  toggleBtn: {
    marginRight: 12,
  },
  toggleBlur: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.02)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.05)',
  },
  toggleBlurActive: {
    backgroundColor: 'rgba(0, 229, 255, 0.1)',
    borderColor: 'rgba(0, 229, 255, 0.2)',
  },
  toggleLabel: {
    color: 'rgba(255,255,255,0.3)',
    fontSize: 11,
    fontWeight: '900',
    marginLeft: 10,
    letterSpacing: 1,
  },
  toggleLabelActive: {
    color: '#F8FAFC',
  },
  gridHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 24,
    marginTop: 40,
    marginBottom: 20,
  },
  gridHeaderText: {
    color: 'rgba(255,255,255,0.3)',
    fontSize: 10,
    fontWeight: '900',
    letterSpacing: 2,
  },
  clearText: {
    color: '#FF5252',
    fontSize: 10,
    fontWeight: '900',
    letterSpacing: 1,
  },
  emptyContainer: {
    paddingHorizontal: 24,
    alignItems: 'center',
  },
  emptyIllustrationCard: {
    width: '100%',
    backgroundColor: 'rgba(255,255,255,0.01)',
    borderRadius: 24,
    padding: 40,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.03)',
  },
  emptyIconGradient: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: 'rgba(255,255,255,0.03)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 24,
  },
  emptyTextTitle: {
    color: '#FFF',
    fontSize: 18,
    fontWeight: '900',
    letterSpacing: 1,
    marginBottom: 8,
  },
  emptyTextSub: {
    color: 'rgba(255,255,255,0.2)',
    fontSize: 11,
    textAlign: 'center',
    fontWeight: '700',
    marginBottom: 32,
    letterSpacing: 0.5,
  },
  mainPickBtn: {
    width: '100%',
  },
  mainPickGradient: {
    height: 60,
    borderRadius: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.05)',
  },
  mainPickText: {
    color: '#FFF',
    fontSize: 13,
    fontWeight: '900',
    letterSpacing: 2,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: 12,
  },
  imageCardWrapper: {
    width: '33.33%',
    padding: 6,
  },
  imageCardContainer: {
    aspectRatio: 1,
  },
  imageCard: {
    flex: 1,
    borderRadius: 12,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.05)',
  },
  imageCardProcessing: {
    opacity: 0.5,
  },
  image: {
    flex: 1,
  },
  removeBtn: {
    position: 'absolute',
    top: 8,
    right: 8,
    zIndex: 10,
  },
  removeBtnBlur: {
    width: 28,
    height: 28,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  dangerBadge: {
    position: 'absolute',
    top: 8,
    left: 8,
    backgroundColor: '#FF5252',
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 6,
    paddingVertical: 3,
    borderRadius: 4,
  },
  dangerText: {
    color: 'white',
    fontSize: 7,
    fontWeight: '900',
    marginLeft: 4,
  },
  cardInfoLayer: {
    position: 'absolute',
    bottom: 8,
    right: 8,
  },
  addMoreWrapper: {
    width: '33.33%',
    padding: 6,
  },
  addMoreInner: {
    aspectRatio: 1,
    borderRadius: 12,
    borderWidth: 1,
    borderStyle: 'dashed',
    borderColor: 'rgba(255,255,255,0.05)',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.01)',
  },
  floatingFooter: {
    position: 'absolute',
    bottom: 30,
    left: 20,
    right: 20,
    zIndex: 100,
  },
  footerBlur: {
    padding: 20,
    borderRadius: 24,
    flexDirection: 'row',
    alignItems: 'center',
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
  },
  footerInfo: {
    flex: 1,
  },
  selectionCount: {
    flexDirection: 'row',
    alignItems: 'baseline',
  },
  countNumber: {
    color: '#FFF',
    fontSize: 24,
    fontWeight: '900',
  },
  countLabel: {
    color: 'rgba(255,255,255,0.3)',
    fontSize: 10,
    fontWeight: '900',
    marginLeft: 6,
    letterSpacing: 1,
  },
  readyBadge: {
    marginTop: 4,
  },
  readyText: {
    color: '#00E5FF',
    fontSize: 9,
    fontWeight: '900',
    letterSpacing: 2,
  },
  progressLabel: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
  },
  progressText: {
    color: '#FFF',
    fontSize: 12,
    fontWeight: '800',
  },
  mainActionBtn: {
    width: 160,
  },
  actionGradient: {
    height: 54,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionText: {
    color: '#FFF',
    fontSize: 12,
    fontWeight: '900',
    letterSpacing: 1.5,
  },
  footerProgressBarContainer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 2,
    backgroundColor: 'rgba(255,255,255,0.05)',
  },
  footerProgressBarFill: {
    height: '100%',
  },
  modalOverlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  settingsCard: {
    width: '100%',
    backgroundColor: '#050505',
    borderRadius: 32,
    padding: 40,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.05)',
  },
  settingsTitle: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: '900',
    letterSpacing: 3,
    marginBottom: 40,
    textAlign: 'center',
  },
  settingItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 32,
  },
  settingText: {
    color: 'rgba(255,255,255,0.5)',
    fontSize: 12,
    fontWeight: '900',
    letterSpacing: 1,
  },
  cacheBtn: {
    borderWidth: 1,
    borderColor: 'rgba(255,82,82,0.2)',
    padding: 16,
    borderRadius: 16,
    alignItems: 'center',
    marginTop: 10,
  },
  cacheBtnText: {
    color: '#FF5252',
    fontWeight: '900',
    fontSize: 11,
    letterSpacing: 1,
  },
  cameraBtn: {
    backgroundColor: 'rgba(255,255,255,0.02)',
    padding: 16,
    borderRadius: 16,
    alignItems: 'center',
    marginTop: 12,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.05)',
  },
  cameraBtnText: {
    color: '#00E5FF',
    fontWeight: '900',
    fontSize: 11,
    letterSpacing: 1,
  },
  closeSettings: {
    marginTop: 40,
    alignItems: 'center',
  },
  closeSettingsText: {
    color: 'rgba(255,255,255,0.2)',
    fontSize: 10,
    fontWeight: '900',
    letterSpacing: 2,
  }
});
