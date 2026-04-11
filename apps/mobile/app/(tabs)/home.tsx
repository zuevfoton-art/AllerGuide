import { Text, Pressable, StyleSheet } from 'react-native';
import { router } from 'expo-router';
import { colors } from '@/src/constants/theme';
import { Screen } from '@/src/components/Screen';
import { ProfileSwitcher } from '@/src/components/ProfileSwitcher';

export default function HomeScreen() {
  return (
    <Screen>
      <Text style={styles.title}>AllerGuide</Text>
      <ProfileSwitcher />
      <Text style={styles.subtitle}>Быстрые действия</Text>
      <Pressable style={styles.card} onPress={() => router.push('/(tabs)/diary')}><Text>Записать самочувствие</Text></Pressable>
      <Pressable style={styles.card} onPress={() => router.push('/(tabs)/scanner')}><Text>Сканировать продукт</Text></Pressable>
      <Pressable style={styles.card} onPress={() => router.push('/(tabs)/market')}><Text>Открыть маркет</Text></Pressable>
      <Pressable style={styles.card} onPress={() => router.push('/(tabs)/map')}><Text>Открыть карту мест</Text></Pressable>
      <Text style={styles.disclaimer}>Информация в приложении носит рекомендательный характер.</Text>
    </Screen>
  );
}
const styles = StyleSheet.create({ title:{fontSize:28,fontWeight:'700',color:colors.forest}, subtitle:{fontSize:16,color:colors.green}, card:{backgroundColor:'#fff',padding:16,borderRadius:16}, disclaimer:{marginTop:8,fontSize:12,color:'#5f6d61'} });
