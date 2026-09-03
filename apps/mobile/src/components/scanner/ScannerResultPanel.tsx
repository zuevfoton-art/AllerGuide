import { Image, Pressable, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Button } from '@/src/components/Button';
import { ScannerDishVisionCard } from '@/src/components/ScannerDishVisionCard';
import { useTheme } from '@/src/hooks/use-theme';
import { useTranslation } from '@/src/store/locale-store';
import type { ScanResult } from '@allerguide/ai';
import type { ScanResultExtended } from '@/src/services/scanner-service';
import { scanSourceLabelKey } from '@/src/components/scanner/scanner-display';
import { createStyles } from '@/src/components/scanner/scanner-styles';

type Props = {
  result: ScanResultExtended;
  displayResult: ScanResult;
  resultPhotoUri: string | null;
  compositionText: string;
  ingredientsOpen: boolean;
  isHigh: boolean;
  isMedium: boolean;
  isLow: boolean;
  isVisionOnly: boolean;
  hasVisionEvidence: boolean;
  isCurrentInputSaved: boolean;
  activeProfileId: number | null;
  matchIdByLabel: Map<string, string>;
  formatMatchChip: (label: string, allergenId?: string) => string;
  onToggleIngredients: () => void;
  onOpenCamera: () => void;
  onOpenManual: () => void;
  onSaveSafe: () => void;
  onReportAlias: () => void;
  onScanAgain: () => void;
};

export function ScannerResultPanel({
  result,
  displayResult,
  resultPhotoUri,
  compositionText,
  ingredientsOpen,
  isHigh,
  isMedium,
  isLow,
  isVisionOnly,
  hasVisionEvidence,
  isCurrentInputSaved,
  activeProfileId,
  matchIdByLabel,
  formatMatchChip,
  onToggleIngredients,
  onOpenCamera,
  onOpenManual,
  onSaveSafe,
  onReportAlias,
  onScanAgain,
}: Props) {
  const theme = useTheme();
  const styles = createStyles(theme);
  const { t } = useTranslation();

  return (
    <View testID="scanner-result" style={styles.resultStack}>
      <Text style={styles.verdictHeroHint}>
        {isHigh
          ? t('scanner.verdictStopHint')
          : isMedium
            ? t('scanner.verdictCautionHint')
            : t('scanner.verdictClearHint')}
      </Text>
      <Text style={styles.verdictClaro}>
        {t('scanner.claroVerdict', { verdict: displayResult.verdict })}
      </Text>

      {hasVisionEvidence ? (
        <ScannerDishVisionCard
          photoUri={resultPhotoUri}
          dishName={result.dishVision?.dishName || displayResult.productName || ''}
          ingredients={result.dishVision?.ingredients ?? []}
          dishLabel={t('scanner.dishVisionDishLabel')}
          ingredientsLabel={t('scanner.dishVisionIngredientsLabel')}
          photoLabel={t('scanner.dishVisionPhotoLabel')}
        />
      ) : null}

      <Text style={styles.resultTrust}>{t('scanner.resultTrustStrip')}</Text>

      {!isVisionOnly &&
      (result.productBrand ||
        result.productImageUrl ||
        displayResult.productName ||
        result.productCategory) ? (
        <View style={styles.productIdentityRow}>
          {result.productImageUrl ? (
            <Image
              source={{ uri: result.productImageUrl }}
              style={styles.productImage}
              accessibilityLabel={displayResult.productName ?? ''}
              resizeMode="contain"
            />
          ) : null}
          <View style={styles.productIdentityBody}>
            {displayResult.productName ? (
              <Text style={styles.productName}>{displayResult.productName}</Text>
            ) : null}
            {result.productBrand ? (
              <Text style={styles.productBrand}>{result.productBrand}</Text>
            ) : null}
            {result.productCategory ? (
              <Text style={styles.productBrand}>
                {t('scanner.categoryLabel')}: {result.productCategory}
              </Text>
            ) : null}
          </View>
        </View>
      ) : null}

      {result.barcodeScanStatus && result.barcodeScanStatus !== 'found_match' ? (
        <Text style={styles.statusBadge}>
          {result.barcodeScanStatus === 'not_found'
            ? t('scanner.statusNotFound')
            : result.barcodeScanStatus === 'found_insufficient_composition'
              ? t('scanner.statusInsufficientComposition')
              : t('scanner.statusNoAllergens')}
        </Text>
      ) : null}

      {result.menuScanStatus ? (
        <Text style={styles.statusBadge}>
          {result.menuScanStatus === 'text_match'
            ? t('scanner.menuStatusMatch')
            : result.menuScanStatus === 'incomplete_composition'
              ? t('scanner.menuStatusIncomplete')
              : t('scanner.menuStatusNoMatch')}
        </Text>
      ) : null}

      {result.barcodeScanStatus === 'not_found' || result.lookupFailed ? (
        <View style={styles.failForwardRow}>
          <Button
            label={t('scanner.failForwardPhoto')}
            variant="secondary"
            block
            onPress={onOpenCamera}
          />
          <Button
            label={t('scanner.failForwardManual')}
            variant="secondary"
            block
            onPress={onOpenManual}
          />
        </View>
      ) : null}

      {displayResult.reason ? <Text style={styles.reason}>{displayResult.reason}</Text> : null}

      {displayResult.matches?.length > 0 ? (
        <View style={styles.chipWrap}>
          {displayResult.matches.map((label) => (
            <View key={`m-${label}`} style={styles.matchesBadge}>
              <Text style={styles.matchesText}>
                {formatMatchChip(label, matchIdByLabel.get(label))}
              </Text>
            </View>
          ))}
        </View>
      ) : null}
      {(displayResult.crossMatches?.length ?? 0) > 0 ? (
        <View style={styles.chipWrap}>
          <Text style={styles.chipSectionLabel}>{t('scanner.crossMatches')}</Text>
          {displayResult.crossMatches.map((label) => (
            <View key={`c-${label}`} style={styles.crossBadge}>
              <Text style={styles.crossText}>
                {formatMatchChip(label, matchIdByLabel.get(label))}
              </Text>
            </View>
          ))}
        </View>
      ) : null}
      {(displayResult.traceMatches?.length ?? 0) > 0 ? (
        <View style={styles.chipWrap}>
          <Text style={styles.chipSectionLabel}>{t('scanner.traceMatches')}</Text>
          {displayResult.traceMatches!.map((label) => (
            <View key={`t-${label}`} style={styles.traceBadge}>
              <Text style={styles.traceText}>{label}</Text>
            </View>
          ))}
        </View>
      ) : null}

      {!isVisionOnly && compositionText.length > 0 ? (
        <View style={styles.ingredientsBlock}>
          <Pressable
            onPress={onToggleIngredients}
            accessibilityRole="button"
            style={styles.ingredientsToggle}
            hitSlop={8}>
            <Text style={styles.ingredientsToggleText}>
              {ingredientsOpen ? t('scanner.ingredientsHide') : t('scanner.ingredientsShow')}
            </Text>
            <Ionicons
              name={ingredientsOpen ? 'chevron-up' : 'chevron-down'}
              size={16}
              color={theme.colors.accent}
            />
          </Pressable>
          {ingredientsOpen ? (
            <Text style={styles.ingredientsBody} testID="scanner-ingredients">
              {t('scanner.ingredientsLabel')}: {compositionText}
            </Text>
          ) : null}
        </View>
      ) : null}

      {result.irritantMatches && result.irritantMatches.length > 0 ? (
        <Text style={styles.sourceMeta} testID="scanner-irritants">
          {t('scanner.irritantsLabel')}: {result.irritantMatches.join(', ')}
        </Text>
      ) : null}

      {displayResult.source ? (
        <Text style={styles.sourceMeta}>
          {t('scanner.source')} {t(scanSourceLabelKey(displayResult.source))}
        </Text>
      ) : null}

      <Text style={styles.verifyHint}>{t('scanner.verifyPackageHint')}</Text>

      <View style={styles.actionCol}>
        {isLow && activeProfileId ? (
          isCurrentInputSaved ? (
            <Button label={t('scanner.savedToSafe')} variant="secondary" block disabled />
          ) : (
            <Button
              label={t('scanner.saveToSafe')}
              variant="secondary"
              block
              onPress={onSaveSafe}
            />
          )
        ) : null}
        {activeProfileId ? (
          <Pressable
            style={styles.reportBtn}
            hitSlop={8}
            onPress={onReportAlias}
            accessibilityRole="button">
            <Text style={styles.reportBtnText}>{t('scanner.reportIncorrect')}</Text>
          </Pressable>
        ) : null}
        <Button
          label={t('scanner.scanAgain')}
          variant="secondary"
          block
          onPress={onScanAgain}
        />
      </View>
    </View>
  );
}
