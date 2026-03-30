import { View, Text, StyleSheet, Dimensions } from 'react-native';
import { Shield, MapPin, Zap } from 'lucide-react-native';
import React from 'react';
import { LinearGradient } from 'expo-linear-gradient';
import { MotiView } from 'moti';

const { width } = Dimensions.get('window');

interface StatCardProps {
  title: string;
  value: string | number;
  icon: 'shield' | 'map-pin' | 'zap';
  color: string;
  delay?: number;
}

export function StatCard({ title, value, icon, color, delay = 0 }: StatCardProps) {
  const Icon = icon === 'shield' ? Shield : icon === 'map-pin' ? MapPin : Zap;

  return (
    <MotiView 
      from={{ opacity: 0, scale: 0.9, translateY: 20 }}
      animate={{ opacity: 1, scale: 1, translateY: 0 }}
      transition={{ type: 'spring', delay }}
      style={styles.container}
    >
      <View style={styles.card}>
        <View style={styles.content}>
          <View style={[styles.iconWrapper, { backgroundColor: `${color}15` }]}>
            <Icon size={20} color={color} strokeWidth={2.5} />
          </View>
          <View style={styles.textContainer}>
            <Text style={styles.valueText}>{value}</Text>
            <Text style={styles.titleText}>{title}</Text>
          </View>
        </View>
        <LinearGradient
          colors={['transparent', `${color}10`]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={StyleSheet.absoluteFill}
          pointerEvents="none"
        />
      </View>
    </MotiView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 4,
  },
  card: {
    backgroundColor: '#0A0A0A',
    borderRadius: 14,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.03)',
    height: 90,
    justifyContent: 'center',
    padding: 14,
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
    zIndex: 1,
  },
  iconWrapper: {
    width: 40,
    height: 40,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
  },
  textContainer: {
    flex: 1,
  },
  valueText: {
    color: '#FFF',
    fontSize: 20,
    fontWeight: '900',
    letterSpacing: -1,
  },
  titleText: {
    color: 'rgba(255, 255, 255, 0.2)',
    fontSize: 8,
    fontWeight: '900',
    textTransform: 'uppercase',
    letterSpacing: 2,
    marginTop: 2,
  },
});
