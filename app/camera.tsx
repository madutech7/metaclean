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
        <Ionicons name="camera-outline" size={64} color="rgba(255,255,255,0.2)" style={{ marginBottom: 20 }} />
        <Text style={styles.permissionText}>SECURE CAMERA ACCESS REQUIRED FOR ZERO TRACE OPERATION.</Text>
        <TouchableOpacity style={styles.permissionButton} onPress={requestPermission}>
          <Text style={styles.permissionBtnText}>GRANT ACCESS</Text>
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
        console.error("Camera Error", e);
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
             <Ionicons name="close" size={24} color="white" />
          </TouchableOpacity>
          
          <View style={styles.secureBadge}>
             <Ionicons name="shield-checkmark-outline" size={12} color="#00E5FF" style={{ marginRight: 6 }} />
             <Text style={styles.secureText}>PROTOCOL: ZERO TRACE</Text>
          </View>

          <TouchableOpacity style={styles.iconButton} onPress={toggleCameraFacing}>
             <Ionicons name="camera-reverse-outline" size={24} color="white" />
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
    backgroundColor: '#050505'
  },
  permissionContainer: {
    flex: 1,
    backgroundColor: '#050505',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
  },
  permissionText: {
    color: 'rgba(255,255,255,0.4)',
    fontSize: 12,
    textAlign: 'center',
    marginBottom: 40,
    fontWeight: '900',
    letterSpacing: 2,
    lineHeight: 20,
  },
  permissionButton: {
    backgroundColor: 'rgba(255,255,255,0.05)',
    paddingVertical: 18,
    paddingHorizontal: 40,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  permissionBtnText: {
    color: '#00E5FF',
    fontSize: 13,
    fontWeight: '900',
    letterSpacing: 2,
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
    paddingHorizontal: 24,
    paddingTop: Platform.OS === 'android' ? 40 : 10,
  },
  iconButton: {
    width: 48,
    height: 48,
    borderRadius: 16,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  secureBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.6)',
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(0, 229, 255, 0.2)',
  },
  secureText: {
    color: '#00E5FF',
    fontSize: 9,
    fontWeight: '900',
    letterSpacing: 2.5,
  },
  bottomBar: {
    alignItems: 'center',
    paddingBottom: 60,
  },
  captureButton: {
      width: 84,
      height: 84,
      borderRadius: 42,
      backgroundColor: 'rgba(255,255,255,0.15)',
      justifyContent: 'center',
      alignItems: 'center',
      borderWidth: 2,
      borderColor: 'rgba(255,255,255,0.3)',
  },
  captureInner: {
      width: 66,
      height: 66,
      borderRadius: 33,
      backgroundColor: 'white',
  }
});
