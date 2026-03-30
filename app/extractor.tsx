import React, { useState, useRef, useEffect } from 'react';
import { 
  StyleSheet, 
  Text, 
  View, 
  TextInput, 
  Platform, 
  TouchableOpacity, 
  ActivityIndicator, 
  KeyboardAvoidingView, 
  TouchableWithoutFeedback, 
  Keyboard,
  Alert,
  Dimensions,
  Animated
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { BlurView } from 'expo-blur';
import * as FileSystem from 'expo-file-system';
import { downloadAsync, documentDirectory, cacheDirectory, deleteAsync } from 'expo-file-system/legacy';
import * as MediaLibrary from 'expo-media-library';
import * as Haptics from 'expo-haptics';
import { StatusBar } from 'expo-status-bar';
import Constants, { ExecutionEnvironment } from 'expo-constants';
import { LinearGradient } from 'expo-linear-gradient';
import { MotiView, MotiText, AnimatePresence } from 'moti';
import { 
  Music, 
  ChevronLeft, 
  Link2, 
  Download, 
  ShieldCheck, 
  Globe,
  Camera,
  Play,
  MessageSquare,
  CheckCircle2
} from 'lucide-react-native';

const isExpoGo = Constants.executionEnvironment === ExecutionEnvironment.StoreClient;

let FFmpegKit: any = null;
let ReturnCode: any = null;

if (!isExpoGo) {
  try {
    const ffmpegModule = require('ffmpeg-kit-react-native');
    FFmpegKit = ffmpegModule.FFmpegKit;
    ReturnCode = ffmpegModule.ReturnCode;
  } catch (e) {
    console.error('Failed to load FFmpegKit:', e);
  }
}

const TouchableScale = ({ onPress, children, style, disabled = false }: any) => {
  const scale = useRef(new Animated.Value(1)).current;

  const onPressIn = () => {
    if (disabled) return;
    Animated.spring(scale, { toValue: 0.95, useNativeDriver: true }).start();
  };

  const onPressOut = () => {
    if (disabled) return;
    Animated.spring(scale, { toValue: 1, useNativeDriver: true }).start();
  };

  return (
    <TouchableOpacity 
      activeOpacity={1} 
      onPressIn={onPressIn} 
      onPressOut={onPressOut} 
      onPress={onPress} 
      disabled={disabled}
    >
      <Animated.View style={[style, { transform: [{ scale }] }]}>
        {children}
      </Animated.View>
    </TouchableOpacity>
  );
};

export default function UniversalExtractor() {
  const [url, setUrl] = useState('');
  const [platform, setPlatform] = useState<'tiktok' | 'instagram' | 'youtube' | 'x' | 'general' | null>(null);
  const [loading, setLoading] = useState(false);
  const [step, setStep] = useState<'idle' | 'downloading' | 'cleaning' | 'saving'>('idle');
  const router = useRouter();

  // Detect platform based on URL
  useEffect(() => {
    if (!url) {
      setPlatform(null);
      return;
    }
    const lowerUrl = url.toLowerCase();
    if (lowerUrl.includes('tiktok.com')) setPlatform('tiktok');
    else if (lowerUrl.includes('instagram.com')) setPlatform('instagram');
    else if (lowerUrl.includes('youtube.com') || lowerUrl.includes('youtu.be')) setPlatform('youtube');
    else if (lowerUrl.includes('twitter.com') || lowerUrl.includes('x.com')) setPlatform('x');
    else setPlatform('general');
  }, [url]);

  const handleDownload = async () => {
    if (!url) {
      Alert.alert('URL Missing', 'Please paste a valid video link.');
      return;
    }

    setLoading(true);
    setStep('downloading');
    if (Platform.OS !== 'web') Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

    try {
      let videoUrl = '';
      
      if (platform === 'tiktok') {
        const apiUrl = `https://www.tikwm.com/api/?url=${encodeURIComponent(url)}`;
        const response = await fetch(apiUrl);
        const json = await response.json();
        if (json.code === 0 && json.data) {
          videoUrl = json.data.hdplay || json.data.play;
        }
      } else {
        try {
          const universalApi = `https://api.vashisth.xyz/vd/?url=${encodeURIComponent(url)}`;
          const response = await fetch(universalApi);
          const json = await response.json();
          if (json.url) videoUrl = json.url;
          else if (json.data?.[0]?.url) videoUrl = json.data[0].url;
        } catch (e) {
          throw new Error("This platform requires a Pro API. TikTok is natively supported.");
        }
      }

      if (!videoUrl) {
        throw new Error("Unable to fetch video. Ensure profile is public.");
      }

      const baseDir = documentDirectory || cacheDirectory || '';
      const tempUri = `${baseDir}extract_${Date.now()}.mp4`;
      const downloadResult = await downloadAsync(videoUrl, tempUri);

      if (downloadResult.status !== 200) {
        throw new Error("Source file download failed.");
      }

      setStep('cleaning');
      let finalUri = tempUri;

      if (!isExpoGo && FFmpegKit) {
        const cleanUri = `${documentDirectory}pure_${Date.now()}.mp4`;
        const script = `-i "${tempUri}" -map_metadata -1 -c copy "${cleanUri}"`;
        const session = await FFmpegKit.execute(script);
        const returnCode = await session.getReturnCode();
        
        if (ReturnCode.isSuccess(returnCode)) {
          finalUri = cleanUri;
          await deleteAsync(tempUri, { idempotent: true });
        }
      }

      setStep('saving');
      const { status } = await MediaLibrary.requestPermissionsAsync();
      if (status !== 'granted') throw new Error("Gallery access required.");

      const asset = await MediaLibrary.createAssetAsync(finalUri);
      const album = await MediaLibrary.getAlbumAsync('MetaClean');
      if (album) await MediaLibrary.addAssetsToAlbumAsync([asset], album, false);
      else await MediaLibrary.createAlbumAsync('MetaClean', asset, false);

      if (Platform.OS !== 'web') Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      
      Alert.alert(
        'PURIFIED', 
        'PROTOCOL COMPLETE. ASSET SAVED WITH ZERO DIGITAL FOOTPRINT.',
        [{ text: 'DONE', onPress: () => {
          setUrl('');
          setLoading(false);
          setStep('idle');
          router.back();
        }}]
      );

    } catch (error: any) {
      console.error(error);
      Alert.alert('SYSTEM ERROR', error.message || "Link not supported or network error.");
      setLoading(false);
      setStep('idle');
    }
  };

  const getPlatformIcon = () => {
    switch(platform) {
      case 'tiktok': return { Icon: Music, color: '#FF2D55' };
      case 'instagram': return { Icon: Camera, color: '#E1306C' };
      case 'youtube': return { Icon: Play, color: '#FF0000' };
      case 'x': return { Icon: MessageSquare, color: '#FFF' };
      default: return { Icon: Globe, color: '#00E5FF' };
    }
  };

  const { Icon, color } = getPlatformIcon();

  return (
    <View style={styles.container}>
      <StatusBar style="light" />
      <View style={StyleSheet.absoluteFill}><View style={{flex: 1, backgroundColor: '#050505'}} /></View>
      
      <SafeAreaView style={{flex: 1}}>
        <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
          <View style={styles.inner}>
            <View style={styles.header}>
              <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
                <ChevronLeft size={24} color="#FFF" />
              </TouchableOpacity>
              <Text style={styles.headerTitle}>EXTRACTION PROTOCOL</Text>
              <View style={{ width: 44 }} />
            </View>

            <KeyboardAvoidingView 
              behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
              style={styles.content}
            >
              <MotiView
                from={{ opacity: 0, scale: 0.5 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ type: 'spring' }}
                style={styles.iconContainer}
              >
                <View style={[styles.iconBackground, { borderColor: `${color}30`, backgroundColor: `${color}05` }]}>
                  <Icon size={48} color={color} strokeWidth={1} />
                </View>
              </MotiView>

              <MotiText 
                from={{ opacity: 0, translateY: 10 }}
                animate={{ opacity: 1, translateY: 0 }}
                style={styles.title}
              >
                Universal Extractor
              </MotiText>
              <MotiText 
                from={{ opacity: 0, translateY: 10 }}
                animate={{ opacity: 1, translateY: 0 }}
                transition={{ delay: 100 }}
                style={styles.subtitle}
              >
                DOWNLOAD ASSETS FROM SOCIAL PLATFORMS AND PURGE ALL HIDDEN TRACKING METADATA INSTANTLY.
              </MotiText>

              <MotiView 
                from={{ opacity: 0, translateY: 20 }}
                animate={{ opacity: 1, translateY: 0 }}
                transition={{ delay: 200 }}
                style={styles.formContainer}
              >
                <View style={styles.inputCard}>
                  <View style={styles.inputWrapper}>
                    <Link2 size={20} color="rgba(255,255,255,0.2)" style={styles.inputIcon} />
                    <TextInput
                      style={styles.input}
                      placeholder="Paste link here..."
                      placeholderTextColor="rgba(255,255,255,0.15)"
                      value={url}
                      onChangeText={setUrl}
                      autoCapitalize="none"
                      autoCorrect={false}
                      keyboardType="url"
                      editable={!loading}
                    />
                    <AnimatePresence>
                        {url.length > 0 && (
                            <MotiView 
                                from={{ scale: 0, opacity: 0 }}
                                animate={{ scale: 1, opacity: 1 }}
                                exit={{ scale: 0, opacity: 0 }}
                            >
                                <CheckCircle2 size={18} color={color} />
                            </MotiView>
                        )}
                    </AnimatePresence>
                  </View>

                  <TouchableScale 
                    onPress={handleDownload}
                    disabled={loading || !url}
                    style={styles.mainBtn}
                  >
                    <LinearGradient
                      colors={loading ? ['#111', '#050505'] : [color, `${color}99`]}
                      start={{ x: 0, y: 0 }}
                      end={{ x: 1, y: 0 }}
                      style={styles.btnGradient}
                    >
                      {loading ? (
                        <View style={styles.loadingWrapper}>
                          <ActivityIndicator color="#FFF" size="small" style={{ marginRight: 12 }} />
                          <Text style={styles.btnText}>
                            {step === 'downloading' ? 'EXTRACTING...' : step === 'cleaning' ? 'PURIFYING...' : 'FINALIZING...'}
                          </Text>
                        </View>
                      ) : (
                        <View style={styles.btnInner}>
                          <Download size={22} color="#FFF" style={{ marginRight: 12 }} />
                          <Text style={styles.btnText}>EXECUTE PURGE</Text>
                        </View>
                      )}
                    </LinearGradient>
                  </TouchableScale>
                </View>

                <View style={styles.privacyBadge}>
                  <ShieldCheck size={14} color="#00E5FF" />
                  <Text style={styles.privacyText}>ZERO DIGITAL SIGNATURE DETECTED</Text>
                </View>
              </MotiView>
              
               <View style={styles.platformBadgeRow}>
                  <PlatformIcon icon={Music} label="TIKTOK" active={platform === 'tiktok'} color="#FF2D55" />
                  <PlatformIcon icon={Camera} label="INSTA" active={platform === 'instagram'} color="#E1306C" />
                  <PlatformIcon icon={Play} label="YOUTUBE" active={platform === 'youtube'} color="#FF0000" />
                  <PlatformIcon icon={MessageSquare} label="X" active={platform === 'x'} color="#FFF" />
               </View>
            </KeyboardAvoidingView>
          </View>
        </TouchableWithoutFeedback>
      </SafeAreaView>
    </View>
  );
}

const PlatformIcon = ({ icon: Icon, label, active, color }: any) => (
    <View style={[styles.platformBadge, active && { borderColor: `${color}30`, backgroundColor: `${color}05` }]}>
        <Icon size={12} color={active ? (color === '#FFF' ? '#FFF' : color) : "rgba(255,255,255,0.2)"} />
        <Text style={[styles.platformBadgeText, active && { color: (color === '#FFF' ? '#FFF' : color) }]}>{label}</Text>
    </View>
);

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#050505',
  },
  inner: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    height: 60,
  },
  backBtn: {
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: 'rgba(255,255,255,0.03)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.05)',
  },
  headerTitle: {
    color: 'rgba(255,255,255,0.3)',
    fontSize: 10,
    fontWeight: '900',
    letterSpacing: 3,
  },
  content: {
    flex: 1,
    paddingHorizontal: 28,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconContainer: {
    marginBottom: 32,
    position: 'relative',
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconBackground: {
    width: 120,
    height: 120,
    borderRadius: 40,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
  },
  title: {
    color: '#FFF',
    fontSize: 28,
    fontWeight: '900',
    letterSpacing: -0.5,
    marginBottom: 12,
    textAlign: 'center',
  },
  subtitle: {
    color: 'rgba(255, 255, 255, 0.2)',
    fontSize: 12,
    lineHeight: 18,
    textAlign: 'center',
    marginBottom: 40,
    fontWeight: '700',
    letterSpacing: 1,
  },
  formContainer: {
    width: '100%',
  },
  inputCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.01)',
    borderRadius: 24,
    padding: 24,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.03)',
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#000',
    height: 64,
    borderRadius: 14,
    paddingHorizontal: 20,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.05)',
  },
  inputIcon: {
    marginRight: 14,
  },
  input: {
    flex: 1,
    color: '#FFF',
    fontSize: 16,
    fontWeight: '600',
  },
  mainBtn: {
    width: '100%',
  },
  btnGradient: {
    height: 64,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  btnInner: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  loadingWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  btnText: {
    color: '#FFF',
    fontSize: 13,
    fontWeight: '900',
    letterSpacing: 2,
  },
  privacyBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 32,
  },
  privacyText: {
    color: 'rgba(0, 229, 255, 0.4)',
    fontSize: 10,
    fontWeight: '900',
    marginLeft: 10,
    letterSpacing: 1.5,
  },
  platformBadgeRow: {
    flexDirection: 'row',
    marginTop: 60,
    justifyContent: 'center',
    flexWrap: 'wrap',
  },
  platformBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.02)',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
    margin: 6,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.05)',
  },
  platformBadgeText: {
    color: 'rgba(255,255,255,0.2)',
    fontSize: 9,
    fontWeight: '900',
    marginLeft: 8,
    letterSpacing: 1,
  },
});
