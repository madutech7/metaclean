import React, { useState, useRef, useEffect } from 'react';
import { 
  StyleSheet, 
  Text, 
  View, 
  Image, 
  Alert,
  Dimensions,
  Platform,
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
import { documentDirectory, cacheDirectory } from 'expo-file-system/legacy';
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
    <BlurView intensity={15} tint="light" style={[styles.toggleBlur, isActive && styles.toggleBlurActive]}>
      <Icon size={16} color={isActive ? "#6366F1" : "rgba(255,255,255,0.4)"} />
      <Text style={[styles.toggleLabel, isActive && styles.toggleLabelActive]}>{label}</Text>
    </BlurView>
  </TouchableScale>
);

const ImageCard = ({ item, index, onRemove, onInspect, isProcessing }: any) => {
  const hasGPS = !!item.exif?.GPSLatitude;

  return (
    <MotiView
      from={{ opacity: 0, scale: 0.8, translateY: 30 }}
      animate={{ opacity: 1, scale: 1, translateY: 0 }}
      transition={{ type: 'spring', delay: index * 50 }}
      style={styles.imageCardWrapper}
    >
      <TouchableScale style={styles.imageCardContainer} onPress={() => onInspect(item)}>
        <View style={[styles.imageCard, isProcessing && styles.imageCardProcessing]}>
          <Image source={{ uri: item.uri }} style={styles.image} />
          
          <LinearGradient
            colors={['rgba(0,0,0,0.6)', 'transparent', 'rgba(0,0,0,0.4)']}
            style={StyleSheet.absoluteFill}
          />

          {!isProcessing && (
            <TouchableScale 
              style={styles.removeBtn} 
              onPress={(e: any) => {
                if (Platform.OS !== 'web') Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                onRemove(item.uri);
              }}
            >
              <BlurView intensity={30} tint="dark" style={styles.removeBtnBlur}>
                <Trash2 size={16} color="#FF4B4B" />
              </BlurView>
            </TouchableScale>
          )}

          {hasGPS && (
            <View style={styles.dangerBadge}>
              <ShieldAlert size={12} color="#FFF" />
              <Text style={styles.dangerText}>GPS</Text>
            </View>
          )}

          <View style={styles.cardInfoLayer}>
            <View style={styles.cardInfoRow}>
              <Info size={14} color="rgba(255,255,255,0.7)" />
              <Text style={styles.cardInfoLabel}>Détails</Text>
            </View>
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
  const [stripAll, setStripAll] = useState(true);

  const progressAnim = useRef(new Animated.Value(0)).current;

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
      
      <LinearGradient 
        colors={['#020617', '#0F172A', '#1E293B']} 
        style={StyleSheet.absoluteFill}
      />

      {/* AMBIENT GLOWS */}
      <View style={[styles.glow, { top: -100, right: -100, backgroundColor: 'rgba(99, 102, 241, 0.15)' }]} />
      <View style={[styles.glow, { bottom: -100, left: -200, backgroundColor: 'rgba(236, 72, 153, 0.1)' }]} />

      <SafeAreaView style={styles.safeArea} edges={['top']}>
        {/* TOP BAR / NAVIGATION */}
        <View style={styles.topNav}>
          <View>
            <MotiText 
              from={{ opacity: 0, translateX: -20 }}
              animate={{ opacity: 1, translateX: 0 }}
              style={styles.navSubtitle}
            >
              MODE PROFESSIONNEL
            </MotiText>
            <MotiText 
              from={{ opacity: 0, translateX: -20 }}
              animate={{ opacity: 1, translateX: 0 }}
              transition={{ delay: 100 }}
              style={styles.navTitle}
            >
              MetaClean
            </MotiText>
          </View>
          
          <View style={styles.topActions}>
            <TouchableScale onPress={() => router.push('/extractor')} style={styles.navActionBtn}>
              <BlurView intensity={20} tint="light" style={styles.navActionBlur}>
                <Zap size={22} color="#FACC15" fill="#FACC15" />
              </BlurView>
            </TouchableScale>
            <TouchableScale onPress={() => router.push('/camera')} style={[styles.navActionBtn, { marginLeft: 12 }]}>
              <BlurView intensity={20} tint="light" style={styles.navActionBlur}>
                <Camera size={22} color="#FFF" />
              </BlurView>
            </TouchableScale>
          </View>
        </View>

        <ScrollView 
          contentContainerStyle={styles.scrollContainer} 
          showsVerticalScrollIndicator={false}
          stickyHeaderIndices={[1]}
        >
          {/* ENHANCED STATS DASHBOARD */}
          <MotiView 
            from={{ opacity: 0, translateY: 20 }}
            animate={{ opacity: 1, translateY: 0 }}
            transition={{ delay: 200 }}
            style={styles.statsSection}
          >
            <StatCard title="Fichiers" value={stats.filesCleaned} icon="shield" color="#6366F1" delay={300} />
            <StatCard title="GPS Bloqués" value={stats.gpsTracesRemoved} icon="map-pin" color="#FB7185" delay={400} />
            <StatCard title="Poids Protégé" value={`${Math.round(stats.totalSizeCleanedMB)} MB`} icon="zap" color="#FACC15" delay={500} />
          </MotiView>

          {/* METADATA CONTROLS */}
          <View style={styles.controlHeader}>
            <Text style={styles.gridHeaderText}>PARAMÈTRES DE PURIFICATION</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.toggleRow}>
              <MetadataToggle label="GPS" icon={MapPin} isActive={stripGPS} onToggle={() => setStripGPS(!stripGPS)} />
              <MetadataToggle label="Appareil" icon={Info} isActive={stripDevice} onToggle={() => setStripDevice(!stripDevice)} />
              <MetadataToggle label="Audio" icon={Music} isActive={stripAudio} onToggle={() => setStripAudio(!stripAudio)} />
              <MetadataToggle label="Compresser" icon={Zap} isActive={compressVideo} onToggle={() => setCompressVideo(!compressVideo)} />
              <MetadataToggle label="Anonymiser" icon={ShieldCheck} isActive={scrambleName} onToggle={() => setScrambleName(!scrambleName)} />
              <MetadataToggle label="Tout Effacer" icon={ShieldAlert} isActive={stripAll} onToggle={() => setStripAll(!stripAll)} />
            </ScrollView>
          </View>

          {/* MAIN GRID HEADER */}
          <View style={styles.gridHeader}>
            <Text style={styles.gridHeaderText}>MA SÉLECTION</Text>
            {images.length > 0 && (
               <TouchableScale onPress={() => setImages([])}>
                 <Text style={styles.clearText}>TOUT EFFACER</Text>
               </TouchableScale>
            )}
          </View>

          {images.length === 0 ? (
            <MotiView 
              from={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 500 }}
              style={styles.emptyContainer}
            >
              <View style={styles.emptyIllustrationCard}>
                <LinearGradient
                  colors={['rgba(99, 102, 241, 0.2)', 'rgba(99, 102, 241, 0.05)']}
                  style={styles.emptyIconGradient}
                >
                  <Sparkles size={48} color="#818CF8" strokeWidth={1.5} />
                </LinearGradient>
                <Text style={styles.emptyTextTitle}>Aucune photo</Text>
                <Text style={styles.emptyTextSub}>Sélectionnez des fichiers pour retirer leurs méta-données avant de les partager.</Text>
                
                <TouchableScale onPress={pickImages} style={styles.mainPickBtn}>
                  <LinearGradient
                    colors={['#6366F1', '#4338CA']}
                    style={styles.mainPickGradient}
                  >
                    <Plus size={24} color="#FFF" style={{ marginRight: 12 }} />
                    <Text style={styles.mainPickText}>Importer des fichiers</Text>
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
                    <Plus size={32} color="rgba(255,255,255,0.2)" />
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
              from={{ opacity: 0, translateY: 100 }}
              animate={{ opacity: 1, translateY: 0 }}
              exit={{ opacity: 0, translateY: 100 }}
              style={styles.floatingFooter}
            >
              <BlurView intensity={40} tint="dark" style={styles.footerBlur}>
                <View style={styles.footerInfo}>
                  <View style={styles.selectionCount}>
                    <Text style={styles.countNumber}>{images.length}</Text>
                    <Text style={styles.countLabel}>{images.length > 1 ? 'Fichiers' : 'Fichier'}</Text>
                  </View>
                  
                  {isProcessing ? (
                    <View style={styles.progressLabel}>
                      <ActivityIndicator size="small" color="#6366F1" style={{ marginRight: 8 }} />
                      <Text style={styles.progressText}>{Math.round((progress / images.length) * 100)}%</Text>
                    </View>
                  ) : (
                    <View style={styles.readyBadge}>
                      <Zap size={14} color="#FACC15" fill="#FACC15" style={{ marginRight: 6 }} />
                      <Text style={styles.readyText}>PRÊT</Text>
                    </View>
                  )}
                </View>

                <TouchableScale 
                  onPress={cleanMetadataAndSave} 
                  disabled={isProcessing} 
                  style={styles.mainActionBtn}
                >
                  <LinearGradient
                    colors={isProcessing ? ['#1E293B', '#334155'] : ['#818CF8', '#6366F1']}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 0 }}
                    style={styles.actionGradient}
                  >
                    {isProcessing ? (
                      <Text style={styles.actionText}>Purification {progress}/{images.length}</Text>
                    ) : (
                      <>
                        <ShieldCheck size={22} color="#FFF" style={{ marginRight: 10 }} />
                        <Text style={styles.actionText}>Purifier & Sauvegarder</Text>
                      </>
                    )}
                  </LinearGradient>
                </TouchableScale>

                {isProcessing && (
                  <View style={styles.footerProgressBarContainer}>
                    <Animated.View style={[styles.footerProgressBarFill, { width: progressBarWidth }]} />
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
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  mainContainer: {
    flex: 1,
    backgroundColor: '#020617',
  },
  safeArea: {
    flex: 1,
  },
  glow: {
    position: 'absolute',
    width: 400,
    height: 400,
    borderRadius: 200,
    opacity: 0.6,
  },
  topNav: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 24,
    paddingVertical: 16,
  },
  navSubtitle: {
    color: '#6366F1',
    fontSize: 10,
    fontWeight: '900',
    letterSpacing: 2.5,
  },
  navTitle: {
    color: '#F8FAFC',
    fontSize: 28,
    fontWeight: '900',
    letterSpacing: -1,
    marginTop: 2,
  },
  topActions: {
    flexDirection: 'row',
  },
  navActionBtn: {
    width: 48,
    height: 48,
    borderRadius: 16,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  navActionBlur: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  scrollContainer: {
    paddingBottom: 100,
  },
  statsSection: {
    flexDirection: 'row',
    paddingHorizontal: 18,
    paddingTop: 10,
    marginBottom: 10,
  },
  gridHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 24,
    paddingVertical: 20,
    backgroundColor: '#020617', // Match bg for sticky effect
  },
  gridHeaderText: {
    color: 'rgba(248, 250, 252, 0.4)',
    fontSize: 12,
    fontWeight: '900',
    letterSpacing: 2,
  },
  clearText: {
    color: '#F43F5E',
    fontSize: 11,
    fontWeight: '900',
    letterSpacing: 1,
  },
  emptyContainer: {
    paddingHorizontal: 24,
    marginTop: 20,
  },
  emptyIllustrationCard: {
    backgroundColor: 'rgba(15, 23, 42, 0.6)',
    borderRadius: 32,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.05)',
    padding: 32,
    alignItems: 'center',
    textAlign: 'center',
  },
  emptyIconGradient: {
    width: 100,
    height: 100,
    borderRadius: 36,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 24,
  },
  emptyTextTitle: {
    color: '#F8FAFC',
    fontSize: 22,
    fontWeight: '900',
    marginBottom: 8,
  },
  emptyTextSub: {
    color: 'rgba(248, 250, 252, 0.4)',
    fontSize: 15,
    lineHeight: 22,
    textAlign: 'center',
    marginBottom: 32,
  },
  mainPickBtn: {
    width: '100%',
  },
  mainPickGradient: {
    height: 64,
    borderRadius: 20,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  mainPickText: {
    color: '#FFF',
    fontSize: 18,
    fontWeight: '800',
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: SPACING,
  },
  imageCardWrapper: {
    width: IMAGE_SIZE,
    height: IMAGE_SIZE * 1.3,
    marginBottom: SPACING,
    marginRight: SPACING,
  },
  imageCardContainer: {
    flex: 1,
  },
  imageCard: {
    flex: 1,
    borderRadius: 24,
    overflow: 'hidden',
    backgroundColor: '#0F172A',
    borderWidth: 1.5,
    borderColor: 'rgba(255,255,255,0.05)',
  },
  imageCardProcessing: {
    opacity: 0.5,
  },
  image: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  removeBtn: {
    position: 'absolute',
    top: 12,
    right: 12,
    zIndex: 10,
  },
  removeBtnBlur: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  dangerBadge: {
    position: 'absolute',
    top: 12,
    left: 12,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#EF4444',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    zIndex: 10,
  },
  dangerText: {
    color: '#FFF',
    fontSize: 10,
    fontWeight: '900',
    marginLeft: 4,
  },
  cardInfoLayer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    padding: 12,
  },
  cardInfoRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  cardInfoLabel: {
    color: 'rgba(255,255,255,0.7)',
    fontSize: 11,
    fontWeight: '700',
    marginLeft: 6,
  },
  addMoreWrapper: {
    width: IMAGE_SIZE,
    height: IMAGE_SIZE * 1.3,
    marginBottom: SPACING,
  },
  addMoreInner: {
    flex: 1,
    borderRadius: 24,
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.05)',
    borderStyle: 'dashed',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.02)',
  },
  floatingFooter: {
    position: 'absolute',
    bottom: 30,
    left: 20,
    right: 20,
    zIndex: 100,
  },
  footerBlur: {
    borderRadius: 32,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
    padding: 24,
    backgroundColor: 'rgba(15, 23, 42, 0.4)',
  },
  footerInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  selectionCount: {
    flexDirection: 'row',
    alignItems: 'baseline',
  },
  countNumber: {
    color: '#FFF',
    fontSize: 32,
    fontWeight: '900',
    marginRight: 6,
  },
  countLabel: {
    color: 'rgba(248, 250, 252, 0.5)',
    fontSize: 14,
    fontWeight: '700',
  },
  progressLabel: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  progressText: {
    color: '#6366F1',
    fontSize: 16,
    fontWeight: '900',
  },
  readyBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(250, 204, 21, 0.1)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(250, 204, 21, 0.2)',
  },
  readyText: {
    color: '#FACC15',
    fontSize: 12,
    fontWeight: '900',
    letterSpacing: 1,
  },
  mainActionBtn: {
    width: '100%',
  },
  actionGradient: {
    height: 64,
    borderRadius: 20,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#6366F1',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.3,
    shadowRadius: 20,
  },
  actionText: {
    color: '#FFF',
    fontSize: 18,
    fontWeight: '800',
  },
  footerProgressBarContainer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 4,
    backgroundColor: 'rgba(255,255,255,0.05)',
  },
  footerProgressBarFill: {
    height: '100%',
    backgroundColor: '#6366F1',
  },
  controlHeader: {
    paddingHorizontal: 24,
    paddingVertical: 10,
  },
  toggleRow: {
    flexDirection: 'row',
    marginTop: 12,
  },
  toggleBtn: {
    marginRight: 12,
  },
  toggleBlur: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 14,
    backgroundColor: 'rgba(255,255,255,0.03)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.05)',
  },
  toggleBlurActive: {
    backgroundColor: 'rgba(99, 102, 241, 0.1)',
    borderColor: 'rgba(99, 102, 241, 0.2)',
  },
  toggleLabel: {
    color: 'rgba(255,255,255,0.4)',
    fontSize: 13,
    fontWeight: '700',
    marginLeft: 8,
  },
  toggleLabelActive: {
    color: '#F8FAFC',
  },
});
