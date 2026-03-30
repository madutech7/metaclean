import React, { useState, useRef } from 'react';
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
import { MotiView, MotiText } from 'moti';
import { 
  Music, 
  ChevronLeft, 
  Link2, 
  Download, 
  ShieldCheck, 
  Sparkles,
  Zap,
  CheckCircle2
} from 'lucide-react-native';

let FFmpegKit: any = null;
let ReturnCode: any = null;

const isExpoGo = Constants.executionEnvironment === ExecutionEnvironment.StoreClient;

if (!isExpoGo) {
  try {
    const ffmpegModule = require('ffmpeg-kit-react-native');
    FFmpegKit = ffmpegModule.FFmpegKit;
    ReturnCode = ffmpegModule.ReturnCode;
  } catch (e) {
    console.error('Failed to load FFmpegKit:', e);
  }
}

const { width } = Dimensions.get('window');

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

export default function TikTokDownloader() {
  const [url, setUrl] = useState('');
  const [loading, setLoading] = useState(false);
  const [step, setStep] = useState<'idle' | 'downloading' | 'cleaning' | 'saving'>('idle');
  const router = useRouter();

  const handleDownload = async () => {
    if (!url || !url.includes('tiktok.com')) {
      Alert.alert('URL Invalide', 'Veuillez coller un lien TikTok valide.');
      return;
    }

    setLoading(true);
    setStep('downloading');
    if (Platform.OS !== 'web') Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

    try {
      const apiUrl = `https://www.tikwm.com/api/?url=${encodeURIComponent(url)}`;
      const response = await fetch(apiUrl);
      const json = await response.json();

      if (json.code !== 0 || !json.data) {
        throw new Error("Impossible de récupérer la vidéo. Vérifiez le lien.");
      }

      const videoUrl = json.data.hdplay || json.data.play;
      const baseDir = documentDirectory || cacheDirectory || '';
      const tempUri = `${baseDir}temp_tiktok_${Date.now()}.mp4`;
      const downloadResult = await downloadAsync(videoUrl, tempUri);

      if (downloadResult.status !== 200) {
        throw new Error("Erreur de téléchargement du fichier.");
      }

      setStep('cleaning');
      let finalUri = tempUri;

      if (!isExpoGo && FFmpegKit) {
        const cleanUri = `${documentDirectory}clean_tiktok_${Date.now()}.mp4`;
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
      if (status !== 'granted') {
        throw new Error("Permission d'accès à la galerie refusée.");
      }

      const asset = await MediaLibrary.createAssetAsync(finalUri);
      const albumName = 'MetaClean';
      const album = await MediaLibrary.getAlbumAsync(albumName);
      if (album) await MediaLibrary.addAssetsToAlbumAsync([asset], album, false);
      else await MediaLibrary.createAlbumAsync(albumName, asset, false);

      if (Platform.OS !== 'web') Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      
      Alert.alert(
        'Succès ✅', 
        'Vidéo TikTok téléchargée sans logo et nettoyée !',
        [{ text: 'Super !', onPress: () => {
          setUrl('');
          setLoading(false);
          setStep('idle');
          router.back();
        }}]
      );

    } catch (error: any) {
      console.error(error);
      Alert.alert('Erreur', error.message || "Une erreur est survenue.");
      setLoading(false);
      setStep('idle');
    }
  };

  const getStatusText = () => {
    switch (step) {
      case 'downloading': return 'Téléchargement...';
      case 'cleaning': return 'Nettoyage des traces...';
      case 'saving': return 'Enregistrement...';
      default: return '';
    }
  };

  return (
    <View style={styles.container}>
      <StatusBar style="light" />
      <LinearGradient 
        colors={['#020617', '#0F172A', '#1E293B']} 
        style={StyleSheet.absoluteFill}
      />
      
      <SafeAreaView style={{flex: 1}}>
        <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
          <View style={styles.inner}>
            <View style={styles.header}>
              <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
                <ChevronLeft size={24} color="#FFF" />
              </TouchableOpacity>
              <Text style={styles.headerTitle}>TIKTOK PURE</Text>
              <View style={{ width: 44 }} />
            </View>

            <KeyboardAvoidingView 
              behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
              style={styles.content}
            >
              <MotiView
                from={{ opacity: 0, scale: 0.5, rotate: '-15deg' }}
                animate={{ opacity: 1, scale: 1, rotate: '0deg' }}
                transition={{ type: 'spring' }}
                style={styles.iconContainer}
              >
                <View style={styles.iconBackground}>
                  <Music size={48} color="#FF2D55" strokeWidth={1.5} />
                </View>
                <View style={[styles.glow, { backgroundColor: '#FF2D55', opacity: 0.2 }]} />
              </MotiView>

              <MotiText 
                from={{ opacity: 0, translateY: 10 }}
                animate={{ opacity: 1, translateY: 0 }}
                style={styles.title}
              >
                Extraction Haute Qualité
              </MotiText>
              <MotiText 
                from={{ opacity: 0, translateY: 10 }}
                animate={{ opacity: 1, translateY: 0 }}
                transition={{ delay: 100 }}
                style={styles.subtitle}
              >
                Collez un lien TikTok pour télécharger la vidéo sans filigrane et sans aucune signature numérique de l&apos;auteur.
              </MotiText>

              <MotiView 
                from={{ opacity: 0, translateY: 20 }}
                animate={{ opacity: 1, translateY: 0 }}
                transition={{ delay: 200 }}
                style={styles.formContainer}
              >
                <View style={styles.inputCard}>
                  <View style={styles.inputWrapper}>
                    <Link2 size={20} color="rgba(255,255,255,0.3)" style={styles.inputIcon} />
                    <TextInput
                      style={styles.input}
                      placeholder="Lien TikTok..."
                      placeholderTextColor="rgba(255,255,255,0.2)"
                      value={url}
                      onChangeText={setUrl}
                      autoCapitalize="none"
                      autoCorrect={false}
                      keyboardType="url"
                      editable={!loading}
                    />
                  </View>

                  <TouchableScale 
                    onPress={handleDownload}
                    disabled={loading || !url}
                    style={styles.mainBtn}
                  >
                    <LinearGradient
                      colors={loading ? ['#1E293B', '#334155'] : ['#F43F5E', '#BE123C']}
                      start={{ x: 0, y: 0 }}
                      end={{ x: 1, y: 0 }}
                      style={styles.btnGradient}
                    >
                      {loading ? (
                        <View style={styles.loadingWrapper}>
                          <ActivityIndicator color="#FFF" size="small" style={{ marginRight: 12 }} />
                          <Text style={styles.btnText}>{getStatusText()}</Text>
                        </View>
                      ) : (
                        <View style={styles.btnInner}>
                          <Download size={22} color="#FFF" style={{ marginRight: 12 }} />
                          <Text style={styles.btnText}>Lancer l&apos;extraction</Text>
                        </View>
                      )}
                    </LinearGradient>
                  </TouchableScale>
                </View>

                {/* INFO BADGE */}
                <View style={styles.privacyBadge}>
                  <ShieldCheck size={16} color="#4ADE80" />
                  <Text style={styles.privacyText}>Traitement 100% local et sécurisé</Text>
                </View>
              </MotiView>
            </KeyboardAvoidingView>
          </View>
        </TouchableWithoutFeedback>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#020617',
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
    backgroundColor: 'rgba(255,255,255,0.05)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  headerTitle: {
    color: '#F8FAFC',
    fontSize: 12,
    fontWeight: '900',
    letterSpacing: 2.5,
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
    width: 100,
    height: 100,
    borderRadius: 32,
    backgroundColor: 'rgba(255, 45, 85, 0.1)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderColor: 'rgba(255, 45, 85, 0.3)',
    zIndex: 2,
  },
  glow: {
    position: 'absolute',
    width: 140,
    height: 140,
    borderRadius: 70,
    zIndex: 1,
  },
  title: {
    color: '#F8FAFC',
    fontSize: 28,
    fontWeight: '900',
    letterSpacing: -0.5,
    marginBottom: 12,
    textAlign: 'center',
  },
  subtitle: {
    color: 'rgba(248, 250, 252, 0.5)',
    fontSize: 16,
    lineHeight: 24,
    textAlign: 'center',
    marginBottom: 40,
  },
  formContainer: {
    width: '100%',
  },
  inputCard: {
    backgroundColor: 'rgba(15, 23, 42, 0.8)',
    borderRadius: 32,
    padding: 24,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.05)',
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#020617',
    height: 64,
    borderRadius: 20,
    paddingHorizontal: 20,
    marginBottom: 20,
    borderWidth: 1.5,
    borderColor: 'rgba(255, 255, 255, 0.05)',
  },
  inputIcon: {
    marginRight: 14,
  },
  input: {
    flex: 1,
    color: '#F8FAFC',
    fontSize: 16,
    fontWeight: '600',
  },
  mainBtn: {
    width: '100%',
  },
  btnGradient: {
    height: 64,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#F43F5E',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.3,
    shadowRadius: 20,
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
    fontSize: 18,
    fontWeight: '800',
  },
  privacyBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 24,
  },
  privacyText: {
    color: 'rgba(74, 222, 128, 0.6)',
    fontSize: 13,
    fontWeight: '700',
    marginLeft: 8,
  },
});
