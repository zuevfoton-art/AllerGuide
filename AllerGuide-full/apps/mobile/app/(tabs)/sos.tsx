import { Text, StyleSheet, Linking, Pressable } from 'react-native';
import { colors } from '@/src/constants/theme';
import { Screen } from '@/src/components/Screen';
import { ProfileSwitcher } from '@/src/components/ProfileSwitcher';

export default function SosScreen() {
  return (
    <Screen>
      <Text style={styles.title}>SOS</Text>
      <ProfileSwitcher />
      <Text style={styles.card}>На этом экране отображаются имя профиля, возраст, аллергические риски, экстренные контакты и заметки, внесённые пользователем.</Text>
      <Pressable style={styles.button} onPress={() => Linking.openURL('tel:103')}><Text style={styles.buttonText}>Позвонить 103</Text></Pressable>
      <Text style={styles.disclaimer}>Информация на экране SOS внесена пользователем и не является медицинским назначением.</Text>
    </Screen>
  );
}
const styles = StyleSheet.create({ title:{fontSize:26,fontWeight:'700',color:colors.forest}, card:{backgroundColor:'#fff',padding:16,borderRadius:16}, button:{backgroundColor:colors.danger,padding:16,borderRadius:16,alignItems:'center'}, buttonText:{color:'#fff',fontWeight:'700'}, disclaimer:{fontSize:12,color:'#5f6d61'} });
