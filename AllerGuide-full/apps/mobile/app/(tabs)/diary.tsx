import { Text, TextInput, Pressable, StyleSheet, View } from 'react-native';
import { useEffect, useState } from 'react';
import { addDiaryEntry, getDiaryEntries, generateDoctorPdf } from '@/src/services/diary-service';
import { useAppStore } from '@/src/store/app-store';
import { colors } from '@/src/constants/theme';
import { Screen } from '@/src/components/Screen';
import { ProfileSwitcher } from '@/src/components/ProfileSwitcher';

export default function DiaryScreen() {
  const activeProfileId = useAppStore((s) => s.activeProfileId);
  const [type, setType] = useState('Симптомы');
  const [details, setDetails] = useState('');
  const [list, setList] = useState<any[]>([]);

  const load = async () => {
    if (!activeProfileId) return;
    setList(await getDiaryEntries(activeProfileId));
  };

  useEffect(() => { load(); }, [activeProfileId]);

  const save = async () => {
    if (!activeProfileId) return;
    await addDiaryEntry({ profileId: activeProfileId, type, details, createdAt: new Date().toISOString() });
    setDetails('');
    await load();
  };

  return (
    <Screen>
      <Text style={styles.title}>Дневник</Text>
      <ProfileSwitcher />
      <View style={styles.row}>{['Симптомы','Лекарство','Питание','Триггер','Кожа','Заметка'].map((item)=><Pressable key={item} style={[styles.chip, type===item&&styles.activeChip]} onPress={()=>setType(item)}><Text>{item}</Text></Pressable>)}</View>
      <TextInput value={details} onChangeText={setDetails} placeholder="Опишите запись" multiline style={styles.input} />
      <Pressable style={styles.button} onPress={save}><Text style={styles.buttonText}>Сохранить запись</Text></Pressable>
      <Pressable style={styles.secondary} onPress={load}><Text>Обновить список</Text></Pressable>
      <Pressable style={styles.secondary} onPress={() => activeProfileId && generateDoctorPdf(activeProfileId)}><Text>Сформировать PDF-отчёт</Text></Pressable>
      {list.map((item) => (
        <View key={item.id} style={styles.card}><Text style={styles.cardTitle}>{item.type}</Text><Text>{item.details}</Text><Text style={styles.meta}>{item.createdAt}</Text></View>
      ))}
      <Text style={styles.disclaimer}>Дневник отражает только наблюдения пользователя и не заменяет медицинскую документацию.</Text>
    </Screen>
  );
}
const styles = StyleSheet.create({ title:{fontSize:26,fontWeight:'700',color:colors.forest}, row:{flexDirection:'row',flexWrap:'wrap',gap:8}, chip:{paddingHorizontal:12,paddingVertical:10,borderRadius:14,backgroundColor:'#fff'}, activeChip:{backgroundColor:colors.mint}, input:{minHeight:120,backgroundColor:'#fff',borderRadius:16,padding:14,textAlignVertical:'top'}, button:{backgroundColor:colors.forest,padding:16,borderRadius:16,alignItems:'center'}, buttonText:{color:'#fff',fontWeight:'700'}, secondary:{backgroundColor:'#fff',padding:14,borderRadius:14,alignItems:'center'}, card:{backgroundColor:'#fff',padding:14,borderRadius:16,gap:6}, cardTitle:{fontWeight:'700'}, meta:{fontSize:12,color:'#6a766d'}, disclaimer:{fontSize:12,color:'#5f6d61'} });
