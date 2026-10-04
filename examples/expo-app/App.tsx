import { useState } from 'react';
import { FlatList, Pressable, StyleSheet, Text, View } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { TryOnButton } from '@tryonit/react-native';
import { CustomTryOn } from './CustomTryOn';
import { PRODUCTS } from './products';

const THEME = { colors: { primary: '#0f766e' }, radius: 12 };

export default function App() {
  const [tab, setTab] = useState<'shop' | 'custom'>('shop');
  return (
    <View style={styles.app}>
      <StatusBar style="auto" />
      <View style={styles.tabs}>
        {(['shop', 'custom'] as const).map((t) => (
          <Pressable
            key={t}
            onPress={() => setTab(t)}
            style={[styles.tab, tab === t && styles.tabActive]}
          >
            <Text style={[styles.tabText, tab === t && styles.tabTextActive]}>
              {t === 'shop' ? 'Shop' : 'Custom UI'}
            </Text>
          </Pressable>
        ))}
      </View>
      {tab === 'shop' ? (
        <FlatList
          data={PRODUCTS}
          keyExtractor={(p) => p.title}
          contentContainerStyle={styles.list}
          renderItem={({ item }) => (
            <View style={styles.card}>
              <Text style={styles.title}>{item.title}</Text>
              <Text style={styles.subtitle}>{item.subtitle}</Text>
              <TryOnButton
                asset={item.asset}
                title={item.title}
                theme={THEME}
                onCapture={(photo) => console.log('captured', photo.width, photo.height)}
                onError={(error) => console.warn('try-on error', error.code, error.message)}
              />
            </View>
          )}
        />
      ) : (
        <CustomTryOn />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  app: { flex: 1, paddingTop: 56, backgroundColor: '#f8fafc' },
  tabs: {
    flexDirection: 'row',
    marginHorizontal: 16,
    marginBottom: 8,
    backgroundColor: '#e2e8f0',
    borderRadius: 12,
    padding: 4,
  },
  tab: { flex: 1, paddingVertical: 8, borderRadius: 8, alignItems: 'center' },
  tabActive: { backgroundColor: '#fff' },
  tabText: { color: '#475569', fontWeight: '600' },
  tabTextActive: { color: '#0f172a' },
  list: { padding: 16, gap: 12 },
  card: {
    backgroundColor: '#fff',
    borderRadius: 14,
    padding: 16,
    gap: 6,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  title: { fontSize: 17, fontWeight: '700', color: '#0f172a' },
  subtitle: { color: '#64748b', marginBottom: 8 },
});
