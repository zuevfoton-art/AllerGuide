import { Text, View, StyleSheet } from 'react-native';
import { colors } from '@/src/constants/theme';
import { Screen } from '@/src/components/Screen';
import { ProfileSwitcher } from '@/src/components/ProfileSwitcher';

const places = [
  { title: 'Green Bowl Cafe', level: 'Высокий', note: 'Есть аллергенная разметка и фильтры по меню' },
  { title: 'Simple Family Kitchen', level: 'Средний', note: 'Нужно уточнять состав блюд у персонала' },
];

export default function MapScreen() {
  return (
    <Screen>
      <Text style={styles.title}>Карта и места</Text>
      <ProfileSwitcher />
      {places.map((p) => <View key={p.title} style={styles.card}><Text style={styles.name}>{p.title}</Text><Text>{p.level}</Text><Text>{p.note}</Text></View>)}
      <Text style={styles.disclaimer}>Информация о местах и аллергенах носит ориентировочный характер, состав нужно уточнять в заведении.</Text>
    </Screen>
  );
}
const styles = StyleSheet.create({ title:{fontSize:26,fontWeight:'700',color:colors.forest}, card:{backgroundColor:'#fff',padding:16,borderRadius:16,gap:6}, name:{fontWeight:'700'}, disclaimer:{fontSize:12,color:'#5f6d61'} });
