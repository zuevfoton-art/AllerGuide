import { Alert, Pressable, StyleSheet, Text, View } from 'react-native';
import { router, useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import { parseAllergies } from '@allerguide/core';
import { logoutUser } from '@/src/services/auth-service';
import { deleteProfile, listProfiles } from '@/src/services/profile-service';
import { colors, shadows } from '@/src/constants/theme';
import { Screen } from '@/src/components/Screen';
import { Ionicons } from '@expo/vector-icons';

export default function ProfilesScreen() {
  const [profiles, setProfiles] = useState(listProfiles());

  const refresh = useCallback(() => {
    setProfiles(listProfiles());
  }, []);

  useFocusEffect(
    useCallback(() => {
      refresh();
    }, [refresh]),
  );

  const confirmDelete = (id: number, name: string) => {
    Alert.alert('Удалить профиль?', `Профиль «${name}» и все записи дневника будут удалены.`, [
      { text: 'Отмена', style: 'cancel' },
      {
        text: 'Удалить',
        style: 'destructive',
        onPress: async () => {
          await deleteProfile(id);
          refresh();
        },
      },
    ]);
  };

  return (
    <Screen>
      <View style={styles.header}>
        <Pressable style={styles.backBtn} onPress={() => router.back()}>
          <Ionicons name="chevron-back" size={22} color={colors.text} />
        </Pressable>
        <View>
          <Text style={styles.title}>Мои профили</Text>
          <Text style={styles.subtitle}>Редактирование и удаление</Text>
        </View>
      </View>

      {profiles.map((profile) => {
        const allergies = parseAllergies(profile.allergies);
        return (
          <View key={profile.id} style={styles.card}>
            <View style={styles.cardTop}>
              <View style={styles.avatar}>
                <Text style={styles.avatarText}>{profile.name?.[0]?.toUpperCase() ?? '?'}</Text>
              </View>
              <View style={styles.cardInfo}>
                <Text style={styles.name}>{profile.name}</Text>
                <Text style={styles.meta}>
                  {profile.type === 'self' ? 'Я' : 'Ребёнок'} · {profile.birthYear}
                </Text>
                <Text style={styles.allergies} numberOfLines={2}>
                  {allergies.join(', ') || 'Аллергены не указаны'}
                </Text>
              </View>
            </View>
            <View style={styles.actions}>
              <Pressable
                style={styles.editBtn}
                onPress={() => router.push({ pathname: '/profile-edit', params: { id: String(profile.id) } })}>
                <Ionicons name="create-outline" size={16} color={colors.accent} />
                <Text style={styles.editText}>Изменить</Text>
              </Pressable>
              <Pressable style={styles.deleteBtn} onPress={() => confirmDelete(profile.id, profile.name)}>
                <Ionicons name="trash-outline" size={16} color={colors.danger} />
                <Text style={styles.deleteText}>Удалить</Text>
              </Pressable>
            </View>
          </View>
        );
      })}

      <Pressable style={styles.addBtn} onPress={() => router.push('/profile-setup')}>
        <Ionicons name="add-circle" size={20} color={colors.accent} />
        <Text style={styles.addText}>Добавить профиль</Text>
      </Pressable>

      <Pressable
        style={styles.logoutBtn}
        onPress={() => {
          logoutUser();
          router.replace('/login');
        }}>
        <Ionicons name="log-out-outline" size={18} color={colors.danger} />
        <Text style={styles.logoutText}>Выйти из аккаунта</Text>
      </Pressable>
    </Screen>
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: colors.card,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: colors.border,
  },
  title: { fontSize: 28, fontWeight: '800', color: colors.text, letterSpacing: -0.5 },
  subtitle: { fontSize: 14, color: colors.textSecondary },
  card: {
    backgroundColor: colors.card,
    borderRadius: 18,
    padding: 16,
    gap: 14,
    ...(shadows.sm as object),
  },
  cardTop: { flexDirection: 'row', gap: 12 },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 14,
    backgroundColor: colors.accentLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: { fontSize: 18, fontWeight: '800', color: colors.accent },
  cardInfo: { flex: 1, gap: 4 },
  name: { fontSize: 17, fontWeight: '700', color: colors.text },
  meta: { fontSize: 13, color: colors.textSecondary },
  allergies: { fontSize: 13, color: colors.textMuted, lineHeight: 18 },
  actions: { flexDirection: 'row', gap: 10 },
  editBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    padding: 12,
    borderRadius: 12,
    backgroundColor: colors.accentLight,
  },
  editText: { color: colors.accent, fontWeight: '700' },
  deleteBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    padding: 12,
    borderRadius: 12,
    backgroundColor: colors.dangerLight,
  },
  deleteText: { color: colors.danger, fontWeight: '700' },
  addBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    padding: 16,
    borderRadius: 16,
    borderWidth: 1.5,
    borderColor: colors.accentMid,
    backgroundColor: colors.accentLight,
  },
  addText: { color: colors.accent, fontWeight: '700', fontSize: 15 },
  logoutBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    padding: 14,
    borderRadius: 14,
    backgroundColor: colors.dangerLight,
    borderWidth: 1,
    borderColor: '#FFB3AE',
  },
  logoutText: { color: colors.danger, fontWeight: '700', fontSize: 15 },
});
