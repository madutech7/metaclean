import { View, Text, StyleSheet, Dimensions } from 'react-native';
import { Shield, MapPin } from 'lucide-react-native';
import React from 'react';
import { LinearGradient } from 'expo-linear-gradient';
import { MotiView } from 'moti';

const { width } = Dimensions.get('window');

interface StatCardProps {
  title: string;
  value: string | number;
  icon: 'shield' | 'map-pin';
  color: string;
  delay?: number;
}

export function StatCard({ title, value, icon, color, delay = 0 }: StatCardProps) {
  const Icon = icon === 'shield' ? Shield : MapPin;

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
    padding: 6,
  },
  card: {
    backgroundColor: '#0F172A',
    borderRadius: 24,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.05)',
    height: 100,
    justifyContent: 'center',
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.3,
    shadowRadius: 20,
    elevation: 8,
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
    zIndex: 1,
  },
  iconWrapper: {
    width: 44,
    height: 44,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  textContainer: {
    flex: 1,
  },
  valueText: {
    color: '#F8FAFC',
    fontSize: 22,
    fontWeight: '900',
    letterSpacing: -0.5,
  },
  titleText: {
    color: 'rgba(248, 250, 252, 0.5)',
    fontSize: 10,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginTop: 2,
  },
});
