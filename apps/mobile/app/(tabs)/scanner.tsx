import { ActivityIndicator, Pressable, Text, View } from 'react-native';
import { useMemo } from 'react';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Screen } from '@/src/components/Screen';
import { GlassCard } from '@/src/components/GlassCard';
import { Button } from '@/src/components/Button';
import { ErrorState } from '@/src/components/ErrorState';
import { UndoBanner } from '@/src/components/UndoBanner';
import { Disclaimer } from '@/src/components/Disclaimer';
import { ImageCropEditor } from '@/src/components/ImageCropEditor';
import { DishNameField } from '@/src/components/DishNameField';
import { ProfileHeaderButton } from '@/src/components/ProfileHeaderButton';
import { ScannerCameraModal } from '@/src/components/scanner/ScannerCameraModal';
import { ScannerLists } from '@/src/components/scanner/ScannerLists';
import { ScannerResultPanel } from '@/src/components/scanner/ScannerResultPanel';
import { createStyles } from '@/src/components/scanner/scanner-styles';
import { useUiStyles } from '@/src/hooks/use-glass-styles';
import { useTheme } from '@/src/hooks/use-theme';
import { useZoneColors } from '@/src/hooks/use-zone-colors';
import { useScannerController } from '@/src/hooks/use-scanner-controller';
import { useTranslation } from '@/src/store/locale-store';
import { isManualBarcodeInput, shouldShowScannerPageTrustLine } from '@/src/constants/scanner-mode';

export default function ScannerScreen() {
  const theme = useTheme();
  const ui = useUiStyles();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const { t } = useTranslation();
  const scan = useScannerController();
  const verdictColors = useZoneColors(scan.verdictZone);

  if (scan.pendingPhoto) {
    return (
      <ImageCropEditor
        photo={scan.pendingPhoto}
        title={t('scanner.cropTitle')}
        hint={t('scanner.cropHint')}
        confirmLabel={t('scanner.cropConfirm')}
        cancelLabel={t('common.cancel')}
        retakeLabel={t('scanner.cropRetake')}
        errorLabel={t('scanner.cropFailed')}
        onCancel={() => scan.setPendingPhoto(null)}
        onRetake={scan.handleCropRetake}
        onConfirm={(cropped) => void scan.handleCropConfirm(cropped)}
      />
    );
  }

  if (scan.cameraOpen) {
    return (
      <ScannerCameraModal
        entryMode={scan.entryMode}
        torchOn={scan.torchOn}
        capturing={scan.capturing}
        onTorchToggle={() => scan.setTorchOn((value) => !value)}
        onClose={scan.closeCamera}
        onBarcode={scan.handleBarcode}
        onPickGallery={() => void scan.pickMenuImage()}
        onPhotoCaptured={(photo) => void scan.beginCrop(photo)}
        onCapturingChange={scan.setCapturing}
      />
    );
  }

  if (!scan.activeProfileId) {
    return (
      <Screen>
        <Text style={ui.docTitle}>{t('scanner.titleShort')}</Text>
        <GlassCard>
          <Text style={ui.cardTitle}>{t('scanner.noProfileTitle')}</Text>
          <Text style={styles.emptyBody}>{t('scanner.noProfileText')}</Text>
          <Button
            label={t('scanner.noProfileCta')}
            variant="primary"
            block
            onPress={() => router.push('/profile-setup')}
          />
        </GlassCard>
        <Disclaimer>{t('scanner.disclaimer')}</Disclaimer>
      </Screen>
    );
  }

  return (
    <Screen
      onRefresh={() => scan.refresh()}
      refreshing={scan.refreshing}
      brandHeaderRight={<ProfileHeaderButton />}
      pinnedTop={
        scan.displayResult ? (
          <GlassCard
            testID="scanner-verdict-pinned"
            zone={scan.verdictZone}
            padded={false}
            style={styles.verdictPinned}>
            <Text
              style={[
                styles.verdictHeroTitle,
                verdictColors ? { color: verdictColors.fg } : null,
              ]}>
              {scan.isHigh
                ? t('scanner.verdictStop')
                : scan.isMedium
                  ? t('scanner.verdictCaution')
                  : t('scanner.verdictClear')}
            </Text>
          </GlassCard>
        ) : undefined
      }>
      <View style={styles.header}>
        <View style={styles.headerText}>
          <Text style={ui.docTitle} testID="scanner-title">
            {t('scanner.titleShort')}
          </Text>
        </View>
      </View>

      <Button
        testID="scanner-primary-camera"
        label={t('scanner.smartScan')}
        variant="primary"
        block
        disabled={scan.loading}
        onPress={() => void scan.openCamera('scanner')}
      />

      <View style={styles.secondaryRow}>
        <Pressable
          style={styles.barcodeBtn}
          onPress={() => void scan.openCamera('barcode')}
          testID="scanner-barcode"
          accessibilityRole="button">
          <Ionicons name="barcode-outline" size={18} color={theme.colors.accent} />
          <Text style={styles.secondaryBtnText}>{t('scanner.modeBarcode')}</Text>
        </Pressable>
        <Pressable
          style={styles.manualToggleBtn}
          onPress={() => scan.setManualOpen((value) => !value)}
          testID="scanner-toggle-manual"
          accessibilityRole="button"
          accessibilityState={{ expanded: scan.manualOpen }}>
          <Ionicons name="create-outline" size={18} color={theme.colors.accent} />
          <Text style={styles.secondaryBtnText}>
            {scan.manualOpen ? t('scanner.hideManual') : t('scanner.enterManually')}
          </Text>
        </Pressable>
      </View>

      {!scan.displayResult && !scan.loading ? (
        <Text style={styles.emptyHint}>{t('scanner.emptyHint')}</Text>
      ) : null}
      {shouldShowScannerPageTrustLine(Boolean(scan.displayResult)) ? (
        <Text style={styles.trustLine}>
          {scan.isDishVisionResult ? t('scanner.trustLineDishVision') : t('scanner.trustLine')}
        </Text>
      ) : null}

      {scan.manualOpen ? (
        <View style={styles.manualBlock}>
          <DishNameField
            inputTestID="scanner-input"
            value={scan.input}
            placeholder={t('scanner.manualPlaceholder')}
            label={t('scanner.manualPlaceholder')}
            suggestions={scan.dishSuggestions}
            loading={scan.dishSearching}
            multiline
            onChange={scan.setInput}
            onSelect={(suggestion) => {
              scan.setInput(suggestion.name);
              void scan.runCheck(suggestion.name, isManualBarcodeInput(suggestion.name));
            }}
          />
          <Button
            testID="scanner-check"
            label={t('scanner.check')}
            variant="primary"
            block
            disabled={scan.loading || !scan.input.trim()}
            onPress={() => {
              void scan.runCheck(scan.input.trim(), isManualBarcodeInput(scan.input));
            }}
          />
        </View>
      ) : null}

      {scan.loading ? (
        <ActivityIndicator color={theme.colors.accent} style={{ marginTop: -8 }} />
      ) : null}
      {scan.ocrHint ? <Text style={styles.ocrHint}>{scan.ocrHint}</Text> : null}

      {scan.scanError && !scan.loading ? (
        <ErrorState
          message={t(
            scan.scanErrorIsCloudAuth
              ? 'scanner.cloudAuthRequired'
              : scan.scanErrorIsDishVision
                ? 'scanner.dishVisionFailed'
                : 'scanner.checkFailed',
          )}
          onRetry={scan.retryLastScan}
        />
      ) : null}

      {scan.repeatUnsafe ? (
        <Text style={[styles.repeatWarning, scan.isMedium && styles.repeatWarningCaution]}>
          {t('scanner.repeatUnsafeWarning')}
        </Text>
      ) : null}

      {scan.displayResult && scan.result ? (
        <ScannerResultPanel
          result={scan.result}
          displayResult={scan.displayResult}
          resultPhotoUri={scan.resultPhotoUri}
          compositionText={scan.compositionText}
          ingredientsOpen={scan.ingredientsOpen}
          isHigh={scan.isHigh}
          isMedium={scan.isMedium}
          isLow={scan.isLow}
          isVisionOnly={scan.isVisionOnly}
          hasVisionEvidence={scan.hasVisionEvidence}
          isCurrentInputSaved={scan.isCurrentInputSaved}
          activeProfileId={scan.activeProfileId}
          matchIdByLabel={scan.matchIdByLabel}
          formatMatchChip={scan.formatMatchChip}
          onToggleIngredients={() => scan.setIngredientsOpen((value) => !value)}
          onOpenCamera={() => void scan.openCamera('scanner')}
          onOpenManual={() => scan.setManualOpen(true)}
          onSaveSafe={scan.confirmSaveSafe}
          onReportAlias={scan.reportAlias}
          onScanAgain={scan.scanAgain}
        />
      ) : null}

      <ScannerLists
        listTab={scan.listTab}
        onListTabChange={scan.setListTab}
        scanTrends={scan.scanTrends}
        trendsOpen={scan.trendsOpen}
        onToggleTrends={() => scan.setTrendsOpen((value) => !value)}
        history={scan.history}
        recentHistory={scan.recentHistory}
        safeList={scan.safeList}
        onOpenHistoryItem={scan.openHistoryItem}
        onRemoveSafe={scan.confirmRemoveSafe}
      />

      {scan.undoItem ? (
        <UndoBanner
          message={t('scanner.removedFromSafe')}
          actionLabel={t('common.undo')}
          onUndo={scan.handleUndoRemove}
          onDismiss={scan.clearUndo}
        />
      ) : null}

      <Disclaimer>
        {scan.isDishVisionResult ? t('scanner.dishVisionDisclaimer') : t('scanner.disclaimer')}
      </Disclaimer>
    </Screen>
  );
}
