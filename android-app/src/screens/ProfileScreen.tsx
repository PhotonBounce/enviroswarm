import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuthContext } from '../context/AuthContext';

export default function ProfileScreen() {
  const { user, logout } = useAuthContext();

  const tiers = {
    free: { label: 'Free', limit: '1 station, 100 readings/day' },
    pro: { label: 'Pro', limit: '10 stations, 10K readings/day' },
    enterprise: { label: 'Enterprise', limit: 'Unlimited' },
  };

  const tierInfo = user ? tiers[user.tier] || tiers.free : tiers.free;

  const handleLogout = () => {
    Alert.alert(
      'Log Out',
      'Are you sure you want to log out?',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Log Out', style: 'destructive', onPress: logout },
      ]
    );
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScrollView contentContainerStyle={{ padding: 16 }}>
        <Text style={styles.title}>Profile</Text>

        <View style={styles.card}>
          <Text style={styles.label}>Email</Text>
          <Text style={styles.value}>{user?.email || '—'}</Text>

          <Text style={styles.label}>Tier</Text>
          <Text style={styles.value}>{tierInfo.label}</Text>

          <Text style={styles.label}>Limits</Text>
          <Text style={styles.value}>{tierInfo.limit}</Text>

          <Text style={styles.label}>Member Since</Text>
          <Text style={styles.value}>
            {(() => {
              const d = user?.created_at ? new Date(user.created_at) : null;
              return d && !isNaN(d.getTime()) ? d.toLocaleDateString() : '—';
            })()}
          </Text>
        </View>

        <TouchableOpacity style={styles.logoutBtn} onPress={handleLogout}>
          <Text style={styles.logoutBtnText}>Log Out</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0f172a',
  },
  title: {
    color: '#10b981',
    fontSize: 24,
    fontWeight: '800',
    marginBottom: 16,
  },
  card: {
    backgroundColor: '#1e293b',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
  },
  label: {
    color: '#94a3b8',
    fontSize: 12,
    fontWeight: '600',
    marginTop: 12,
    textTransform: 'uppercase',
  },
  value: {
    color: '#f1f5f9',
    fontSize: 16,
    fontWeight: '600',
    marginTop: 2,
  },
  logoutBtn: {
    backgroundColor: '#ef4444',
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
  },
  logoutBtnText: {
    color: '#f1f5f9',
    fontSize: 16,
    fontWeight: '700',
  },
});
