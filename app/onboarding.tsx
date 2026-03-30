import React, { useState, useRef } from 'react';
import { 
  StyleSheet, 
  Text, 
  View, 
  Dimensions, 
  TouchableOpacity, 
  Animated,
  Platform
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { LinearGradient } from 'expo-linear-gradient';
import { MotiView, MotiText, AnimatePresence } from 'moti';
import { 
  ShieldCheck, 
  Lock, 
  Zap, 
  ChevronRight,
  EyeOff
} from 'lucide-react-native';

const { width, height } = Dimensions.get('window');

const SLIDES = [
  {
    id: 1,
    icon: ShieldCheck,
    title: 'PROTECTION ABSOLUE',
    subtitle: "NETTOYEZ CHAQUE TRACE NUMÉRIQUE DE VOS MÉDIAS EN UN INSTANT.",
    color: '#10B981', // Emerald
  },
  {
    id: 2,
    icon: EyeOff,
    title: 'ZÉRO TRACE',
    subtitle: "VOS DONNÉES GPS ET IDENTIFIANTS D'APPAREILS DISPARAISSENT.",
    color: '#22D3EE', // Cyan
  },
  {
    id: 3,
    icon: Lock,
    title: '100% LOCAL',
    subtitle: 'AUCUN SERVEUR. AUCUN CLOUD. TOUT RESTE SUR VOTRE APPAREIL.',
    color: '#818CF8', // Indigo
  }
];

export default function Onboarding() {
  const [currentStep, setCurrentStep] = useState(0);
  const router = useRouter();
  const progressAnim = useRef(new Animated.Value(0)).current;

  const nextStep = () => {
    if (currentStep < SLIDES.length - 1) {
      setCurrentStep(currentStep + 1);
    } else {
      router.replace('/');
    }
  };

  const skip = () => {
    router.replace('/');
  };

  const slide = SLIDES[currentStep];
  const Icon = slide.icon;

  return (
    <View style={styles.container}>
      <StatusBar style="light" />
      <LinearGradient 
        colors={['#050505', '#0A0A0A', '#111111']} 
        style={StyleSheet.absoluteFill}
      />

      {/* BACKGROUND DECORATION */}
      <View style={[styles.glow, { top: -100, right: -100, backgroundColor: slide.color, opacity: 0.08 }]} />
      <View style={[styles.glow, { bottom: -100, left: -100, backgroundColor: slide.color, opacity: 0.05 }]} />

      <SafeAreaView style={styles.safeArea}>
        <View style={styles.header}>
            <MotiText style={styles.brandName}>METACLEAN PRO</MotiText>
            <TouchableOpacity onPress={skip}>
                <Text style={styles.skipBtn}>PASSER</Text>
            </TouchableOpacity>
        </View>

        <View style={styles.content}>
           <AnimatePresence exitBeforeEnter>
              <MotiView 
                key={`icon-${currentStep}`}
                from={{ opacity: 0, scale: 0.5, translateY: 30 }}
                animate={{ opacity: 1, scale: 1, translateY: 0 }}
                exit={{ opacity: 0, scale: 1.2 }}
                transition={{ type: 'spring', damping: 15 }}
                style={styles.iconContainer}
              >
                 <Icon size={120} color={slide.color} strokeWidth={1} />
                 <View style={[styles.iconRing, { borderColor: `${slide.color}20` }]} />
              </MotiView>
           </AnimatePresence>

           <View style={styles.textStack}>
              <AnimatePresence exitBeforeEnter>
                <MotiView
                   key={`text-${currentStep}`}
                   from={{ opacity: 0, translateY: 20 }}
                   animate={{ opacity: 1, translateY: 0 }}
                   exit={{ opacity: 0, translateY: -20 }}
                   transition={{ type: 'timing', duration: 400 }}
                >
                    <Text style={styles.title}>{slide.title}</Text>
                    <Text style={styles.subtitle}>{slide.subtitle}</Text>
                </MotiView>
              </AnimatePresence>
           </View>
        </View>

        <View style={styles.footer}>
           {/* PROGRESS INDICATOR */}
           <View style={styles.pagination}>
              {SLIDES.map((_, i) => (
                <View 
                    key={i} 
                    style={[
                        styles.dot, 
                        { backgroundColor: i === currentStep ? slide.color : 'rgba(255,255,255,0.1)' },
                        i === currentStep && { width: 24 }
                    ]} 
                />
              ))}
           </View>

           <TouchableOpacity onPress={nextStep} style={styles.nextBtn}>
              <LinearGradient
                colors={[slide.color, `${slide.color}99`]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={styles.btnGradient}
              >
                  <Text style={styles.btnText}>
                      {currentStep === SLIDES.length - 1 ? 'COMMENCER' : 'SUIVANT'}
                  </Text>
                  <ChevronRight size={20} color="#FFF" style={{ marginLeft: 8 }} />
              </LinearGradient>
           </TouchableOpacity>
        </View>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#050505',
  },
  safeArea: {
    flex: 1,
  },
  glow: {
    position: 'absolute',
    width: 400,
    height: 400,
    borderRadius: 200,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 30,
    height: 60,
  },
  brandName: {
    color: '#FFF',
    fontSize: 12,
    fontWeight: '900',
    letterSpacing: 3,
  },
  skipBtn: {
    color: 'rgba(255,255,255,0.4)',
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 1,
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40,
  },
  iconContainer: {
    width: 240,
    height: 240,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 60,
  },
  iconRing: {
    position: 'absolute',
    width: 240,
    height: 240,
    borderRadius: 120,
    borderWidth: 1,
    borderStyle: 'dashed',
  },
  textStack: {
    alignItems: 'center',
    justifyContent: 'center',
    height: 140,
  },
  title: {
    color: '#FFF',
    fontSize: 32,
    fontWeight: '900',
    textAlign: 'center',
    letterSpacing: -1,
    marginBottom: 20,
  },
  subtitle: {
    color: 'rgba(255,255,255,0.4)',
    fontSize: 14,
    lineHeight: 22,
    textAlign: 'center',
    fontWeight: '700',
    letterSpacing: 1,
  },
  footer: {
    paddingHorizontal: 30,
    paddingBottom: 40,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  pagination: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    marginRight: 8,
  },
  nextBtn: {
    width: 180,
  },
  btnGradient: {
    height: 60,
    borderRadius: 30,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingLeft: 20,
  },
  btnText: {
    color: '#FFF',
    fontSize: 14,
    fontWeight: '900',
    letterSpacing: 2,
  }
});
