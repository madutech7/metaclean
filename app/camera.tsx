import React, { useState, useRef } from 'react';
import { View, StyleSheet, TouchableOpacity, Text, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import * as MediaLibrary from 'expo-media-library';
import * as Haptics from 'expo-haptics';
import { StatusBar } from 'expo-status-bar';

export default function SecureCamera() {
  const [permission, requestPermission] = useCameraPermissions();
  const [facing, setFacing] = useState<'back' | 'front'>('back');
  const cameraRef = useRef<CameraView>(null);
  const router = useRouter();

  if (!permission) return <View style={styles.container} />;

  if (!permission.granted) {
    return (
      <View style={styles.permissionContainer}>
        <Ionicons name="camera-outline" size={64} color="#8E8E93" style={{ marginBottom: 20 }} />
        <Text style={styles.permissionText}>La caméra &quot;Zéro Trace&quot; nécessite votre autorisation.</Text>
        <TouchableOpacity style={styles.permissionButton} onPress={requestPermission}>
          <Text style={styles.permissionBtnText}>Autoriser la caméra</Text>
        </TouchableOpacity>
      </View>
    );
  }

  function toggleCameraFacing() {
    setFacing(current => (current === 'back' ? 'front' : 'back'));
    if (Platform.OS !== 'web') Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  }

  const takePicture = async () => {
    if (cameraRef.current) {
      if (Platform.OS !== 'web') Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
      try {
        // Appareil photo sécurisé : EXIF = false, pas de position GPS par défaut.
        const photo = await cameraRef.current.takePictureAsync({
            exif: false, 
            quality: 1
        });
        
        if (photo?.uri) {
           const asset = await MediaLibrary.createAssetAsync(photo.uri);
           const albumName = 'MetaClean';
           const album = await MediaLibrary.getAlbumAsync(albumName);
           if (album) await MediaLibrary.addAssetsToAlbumAsync([asset], album, false);
           else await MediaLibrary.createAlbumAsync(albumName, asset, false);
           
           if (Platform.OS !== 'web') Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
           router.back();
        }
      } catch (e) {
        console.error("Erreur Caméra", e);
      }
    }
  };

  return (
    <View style={styles.container}>
      <StatusBar style="light" hidden />
      <CameraView style={StyleSheet.absoluteFill} facing={facing} ref={cameraRef} />
      
      <SafeAreaView style={styles.overlay}>
        <View style={styles.topBar}>
          <TouchableOpacity style={styles.iconButton} onPress={() => router.back()}>
             <Ionicons name="close" size={28} color="white" />
          </TouchableOpacity>
          
          <View style={styles.secureBadge}>
             <Ionicons name="shield-checkmark" size={14} color="#30D158" style={{ marginRight: 6 }} />
             <Text style={styles.secureText}>Zéro Trace</Text>
          </View>

          <TouchableOpacity style={styles.iconButton} onPress={toggleCameraFacing}>
             <Ionicons name="camera-reverse-outline" size={28} color="white" />
          </TouchableOpacity>
        </View>

        <View style={styles.bottomBar}>
          <TouchableOpacity style={styles.captureButton} onPress={takePicture}>
             <View style={styles.captureInner} />
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: 'black'
  },
  permissionContainer: {
    flex: 1,
    backgroundColor: '#000',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 30,
  },
  permissionText: {
    color: '#FFFFFF',
    fontSize: 18,
    textAlign: 'center',
    marginBottom: 30,
    lineHeight: 26,
  },
  permissionButton: {
    backgroundColor: '#0A84FF',
    paddingVertical: 14,
    paddingHorizontal: 24,
    borderRadius: 12,
  },
  permissionBtnText: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: '600',
  },
  camera: {
    flex: 1,
  },
  overlay: {
    flex: 1,
    justifyContent: 'space-between',
    backgroundColor: 'transparent',
  },
  topBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: Platform.OS === 'android' ? 40 : 10,
  },
  iconButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  secureBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.6)',
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(48, 209, 88, 0.3)',
  },
  secureText: {
    color: '#30D158',
    fontSize: 14,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  bottomBar: {
    alignItems: 'center',
    paddingBottom: 40,
  },
  captureButton: {
      width: 80,
      height: 80,
      borderRadius: 40,
      backgroundColor: 'rgba(255,255,255,0.3)',
      justifyContent: 'center',
      alignItems: 'center',
  },
  captureInner: {
      width: 66,
      height: 66,
      borderRadius: 33,
      backgroundColor: 'white',
  }
});
