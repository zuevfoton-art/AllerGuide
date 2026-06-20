import { Text, TextInput, Pressable, StyleSheet, View } from 'react-native';
import { useState } from 'react';
import { runMockScan } from '@/src/services/mock-ai-service';
import { useAppStore } from '@/src/store/app-store';
import { colors, shadows } from '@/src/constants/theme';
import { Screen } from '@/src/components/Screen';
import { ProfileSwitcher } from '@/src/components/ProfileSwitcher';
import { Ionicons } from '@expo/vector-icons';

const MODES = [
  { key: 'product', label: 'Продукт', icon: 'nutrition' },
  { key: 'menu', label: 'Меню', icon: 'restaurant' },
  { key: 'medicine', label: 'Лекарство', icon: 'medkit' },
] as const;

export default function ScannerScreen() {
  const profile = useAppStore((s) => s.activeProfile);
  const [input, setInput] = useState('молоко, арахис, сахар');
  const [mode, setMode] = useState<'product' | 'menu' | 'medicine'>('product');
  const [result, setResult] = useState<any>(null);

  const isSafe = result && result.matches?.length === 0;
  const isDanger = result && result.matches?.length > 0;

  return (
    <Screen>
      <View style={styles.header}>
        <Text style={styles.title}>Умный сканер</Text>
        <Text style={styles.subtitle}>Проверка аллергенов в составе</Text>
      </View>

      <ProfileSwitcher />

      <View style={styles.modeRow}>
        {MODES.map((m) => (
          <Pressable
            key={m.key}
            style={[styles.modeBtn, mode === m.key && styles.modeBtnActive]}
            onPress={() => setMode(m.key)}>
            <Ionicons name={m.icon as any} size={18} color={mode === m.key ? colors.accent : colors.textMuted} />
            <Text style={[styles.modeText, mode === m.key && styles.modeTextActive]}>{m.label}</Text>
          </Pressable>
        ))}
      </View>

      <View style={styles.inputWrap}>
        <Ionicons name="list" size={18} color={colors.textMuted} style={styles.inputIcon} />
        <TextInput
          value={input}
          onChangeText={setInput}
          placeholder="Введите состав, блюдо или название..."
          placeholderTextColor={colors.textMuted}
          multiline
          style={styles.input}
        />
      </View>

      <Pressable style={styles.button} onPress={() => setResult(runMockScan({ mode, text: input, profile }))}>
        <Ionicons name="search" size={18} color="#fff" />
        <Text style={styles.buttonText}>Проверить</Text>
      </Pressable>

      {result && (
        <View style={[styles.resultCard, isDanger ? styles.resultDanger : styles.resultSafe]}>
          <View style={styles.resultHeader}>
            <View style={[styles.resultIcon, isDanger ? styles.resultIconDanger : styles.resultIconSafe]}>
              <Ionicons
                name={isDanger ? 'warning' : 'checkmark-circle'}
                size={24}
                color={isDanger ? colors.danger : colors.success}
              />
            </View>
            <View style={styles.resultText}>
              <Text style={[styles.verdict, isDanger ? styles.verdictDanger : styles.verdictSafe]}>
                {result.verdict}
              </Text>
            </View>
          </View>
          <Text style={styles.reason}>{result.reason}</Text>
          {result.matches?.length > 0 && (
            <View style={styles.matchesBadge}>
              <Ionicons name="alert-circle" size={13} color={colors.danger} />
              <Text style={styles.matchesText}>
                Совпадения: {result.matches.join(', ')}
              </Text>
            </View>
          )}
        </View>
      )}

      <Text style={styles.disclaimer}>
        Результат носит предварительный характер и не исключает индивидуальной реакции.
      </Text>
    </Screen>
  );
}

const styles = StyleSheet.create({
  header: { gap: 3 },
  title: { fontSize: 28, fontWeight: '800', color: colors.text, letterSpacing: -0.5 },
  subtitle: { fontSize: 14, color: colors.textSecondary },
  modeRow: { flexDirection: 'row', gap: 8 },
  modeBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 11,
    borderRadius: 14,
    backgroundColor: colors.card,
    borderWidth: 1.5,
    borderColor: colors.border,
  },
  modeBtnActive: { borderColor: colors.accent, backgroundColor: colors.accentLight },
  modeText: { fontSize: 13, fontWeight: '600', color: colors.textSecondary },
  modeTextActive: { color: colors.accent },
  inputWrap: {
    backgroundColor: colors.card,
    borderRadius: 16,
    borderWidth: 1.5,
    borderColor: colors.border,
    paddingTop: 12,
    paddingHorizontal: 14,
    paddingBottom: 14,
    minHeight: 130,
  },
  inputIcon: { marginBottom: 6 },
  input: { fontSize: 15, color: colors.text, textAlignVertical: 'top', lineHeight: 22 },
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: colors.accent,
    padding: 16,
    borderRadius: 16,
    ...(shadows.accent as object),
  },
  buttonText: { color: '#fff', fontWeight: '700', fontSize: 16 },
  resultCard: {
    borderRadius: 18,
    padding: 16,
    gap: 10,
    borderWidth: 1.5,
  },
  resultSafe: { backgroundColor: colors.successLight, borderColor: '#A8E6BE' },
  resultDanger: { backgroundColor: colors.dangerLight, borderColor: '#FFB3AE' },
  resultHeader: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  resultIcon: {
    width: 44,
    height: 44,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  resultIconSafe: { backgroundColor: '#C8F2D6' },
  resultIconDanger: { backgroundColor: '#FFD6D4' },
  resultText: { flex: 1 },
  verdict: { fontSize: 18, fontWeight: '800', letterSpacing: -0.3 },
  verdictSafe: { color: '#1A7A3C' },
  verdictDanger: { color: colors.danger },
  reason: { fontSize: 14, color: colors.textSecondary, lineHeight: 20 },
  matchesBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: '#FFD6D4',
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 8,
    alignSelf: 'flex-start',
  },
  matchesText: { fontSize: 13, color: colors.danger, fontWeight: '600' },
  disclaimer: { fontSize: 12, color: colors.textMuted, textAlign: 'center', lineHeight: 18 },
});
