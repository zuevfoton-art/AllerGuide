import { Text, TextInput, Pressable, StyleSheet, View } from 'react-native';
import { useState } from 'react';
import { runMockScan } from '@/src/services/mock-ai-service';
import { useAppStore } from '@/src/store/app-store';
import { colors } from '@/src/constants/theme';
import { Screen } from '@/src/components/Screen';
import { ProfileSwitcher } from '@/src/components/ProfileSwitcher';

export default function ScannerScreen() {
  const profile = useAppStore((s) => s.activeProfile);
  const [input, setInput] = useState('молоко, арахис, сахар');
  const [mode, setMode] = useState<'product'|'menu'|'medicine'>('product');
  const [result, setResult] = useState<any>(null);

  return (
    <Screen>
      <Text style={styles.title}>Умный сканер</Text>
      <ProfileSwitcher />
      <View style={styles.row}>{['product','menu','medicine'].map((m)=><Pressable key={m} style={[styles.chip, mode===m&&styles.activeChip]} onPress={()=>setMode(m as any)}><Text>{m}</Text></Pressable>)}</View>
      <TextInput value={input} onChangeText={setInput} placeholder="Введите состав, блюдо или название лекарства" multiline style={styles.input} />
      <Pressable style={styles.button} onPress={() => setResult(runMockScan({ mode, text: input, profile }))}><Text style={styles.buttonText}>Проверить</Text></Pressable>
      {result && <View style={styles.card}><Text style={styles.verdict}>{result.verdict}</Text><Text>{result.reason}</Text><Text style={styles.meta}>Совпадения: {result.matches.join(', ') || 'нет'}</Text></View>}
      <Text style={styles.disclaimer}>Результат проверки носит предварительный и рекомендательный характер и не исключает индивидуальной реакции.</Text>
    </Screen>
  );
}
const styles = StyleSheet.create({ title:{fontSize:26,fontWeight:'700',color:colors.forest}, row:{flexDirection:'row',gap:8}, chip:{paddingHorizontal:12,paddingVertical:10,borderRadius:14,backgroundColor:'#fff'}, activeChip:{backgroundColor:colors.mint}, input:{minHeight:140,backgroundColor:'#fff',borderRadius:16,padding:14,textAlignVertical:'top'}, button:{backgroundColor:colors.forest,padding:16,borderRadius:16,alignItems:'center'}, buttonText:{color:'#fff',fontWeight:'700'}, card:{backgroundColor:'#fff',padding:16,borderRadius:16,gap:6}, verdict:{fontSize:20,fontWeight:'700'}, meta:{fontSize:12,color:'#6a766d'}, disclaimer:{fontSize:12,color:'#5f6d61'} });
