import { Text, View, StyleSheet } from 'react-native';
import { colors } from '@/src/constants/theme';
import { Screen } from '@/src/components/Screen';
import { ProfileSwitcher } from '@/src/components/ProfileSwitcher';

const items = [
  { title: 'Очиститель воздуха', why: 'Может быть полезен при бытовой аллергии и поллинозе' },
  { title: 'Гипоаллергенный крем', why: 'Подходит для сценариев с кожными проявлениями' },
  { title: 'Чехлы для постельного белья', why: 'Актуально при реакции на пыль и клещей' },
];

export default function MarketScreen() {
  return (
    <Screen>
      <Text style={styles.title}>Маркет</Text>
      <ProfileSwitcher />
      {items.map((item) => <View key={item.title} style={styles.card}><Text style={styles.name}>{item.title}</Text><Text>{item.why}</Text></View>)}
      <Text style={styles.disclaimer}>Рекомендации основаны на общих характеристиках товара и не заменяют назначения врача.</Text>
    </Screen>
  );
}
const styles = StyleSheet.create({ title:{fontSize:26,fontWeight:'700',color:colors.forest}, card:{backgroundColor:'#fff',padding:16,borderRadius:16,gap:6}, name:{fontWeight:'700'}, disclaimer:{fontSize:12,color:'#5f6d61'} });
