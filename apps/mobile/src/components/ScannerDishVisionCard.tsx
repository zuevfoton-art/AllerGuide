import { useMemo } from 'react';
import { Image, StyleSheet, Text, View } from 'react-native';
import { useTheme, type AppTheme } from '@/src/hooks/use-theme';
import { formatDishVisionIngredientList } from '@/src/services/scanner-dish-vision-display';

type Props = {
  photoUri?: string | null;
  dishName: string;
  ingredients: string[];
  dishLabel: string;
  ingredientsLabel: string;
  photoLabel: string;
};

/**
 * Recognition block for a plate photo: snapshot, estimated dish, likely ingredients.
 * Rendered under the allergy-risk bubble.
 */
export function ScannerDishVisionCard({
  photoUri,
  dishName,
  ingredients,
  dishLabel,
  ingredientsLabel,
  photoLabel,
}: Props) {
  const theme = useTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const ingredientLine = formatDishVisionIngredientList(ingredients);

  return (
    <View testID="scanner-dish-vision-card" style={styles.card}>
      {photoUri ? (
        <Image
          source={{ uri: photoUri }}
          style={styles.photo}
          resizeMode="cover"
          accessibilityLabel={photoLabel}
        />
      ) : null}
      <Text style={styles.kicker}>{dishLabel}</Text>
      <Text style={styles.dishName}>{dishName}</Text>
      {ingredientLine ? (
        <>
          <Text style={styles.kicker}>{ingredientsLabel}</Text>
          <Text style={styles.ingredients}>{ingredientLine}</Text>
        </>
      ) : null}
    </View>
  );
}

function createStyles({ colors, fonts }: AppTheme) {
  return StyleSheet.create({
    card: {
      gap: 8,
      padding: 12,
      borderRadius: 10,
      borderWidth: 1,
      borderColor: colors.border,
      backgroundColor: colors.surfaceMuted,
    },
    photo: {
      width: '100%',
      height: 220,
      borderRadius: 8,
      backgroundColor: colors.card,
    },
    kicker: {
      fontFamily: fonts.sans,
      fontSize: 12,
      color: colors.textMuted,
    },
    dishName: {
      fontFamily: fonts.sansSemiBold,
      fontSize: 18,
      fontWeight: '600',
      color: colors.text,
    },
    ingredients: {
      fontFamily: fonts.sans,
      fontSize: 15,
      lineHeight: 22,
      color: colors.text,
    },
  });
}
