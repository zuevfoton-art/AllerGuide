import { Component, type ErrorInfo, type ReactNode } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { BrandMark } from '@/src/components/brand/BrandMark';
import { radii } from '@/src/constants/layout';
import { lightColors } from '@/src/constants/theme';
import { fonts } from '@/src/constants/typography';
import { captureError } from '@/src/services/error-reporting';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  detail: string;
}

export class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false, detail: '' };

  static getDerivedStateFromError(error: unknown): State {
    const message = error instanceof Error ? `${error.name}: ${error.message}` : String(error);
    return { hasError: true, detail: message };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    captureError(error, { componentStack: info.componentStack ?? '' });
  }

  private reset = () => {
    this.setState({ hasError: false, detail: '' });
  };

  render() {
    if (!this.state.hasError) return this.props.children;

    return (
      <View style={styles.container} accessibilityRole="alert">
        <BrandMark size={56} accent={lightColors.accent} color={lightColors.onAccent} />
        <Text style={styles.title}>Что-то пошло не так</Text>
        <Text style={styles.message}>
          Приложение столкнулось с неожиданной ошибкой. Попробуйте снова или перезапустите AllerGuide.
        </Text>
        {this.state.detail ? (
          <ScrollView style={styles.detailBox} contentContainerStyle={styles.detailContent}>
            {/* Shown so testers can report the exact cause from a preview build. */}
            <Text style={styles.detailText} selectable>
              {this.state.detail}
            </Text>
          </ScrollView>
        ) : null}
        <Pressable style={styles.button} onPress={this.reset} accessibilityRole="button">
          <Text style={styles.buttonText}>Попробовать снова</Text>
        </Pressable>
      </View>
    );
  }
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
    gap: 12,
    backgroundColor: lightColors.bg,
  },
  title: {
    fontFamily: fonts.serifBold,
    fontSize: 22,
    fontWeight: '700',
    color: lightColors.head,
  },
  message: {
    fontFamily: fonts.sans,
    fontSize: 15,
    lineHeight: 22,
    color: lightColors.textSecondary,
    textAlign: 'center',
  },
  detailBox: {
    maxHeight: 160,
    alignSelf: 'stretch',
    backgroundColor: lightColors.card,
    borderRadius: radii.md,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  detailContent: {
    paddingVertical: 4,
  },
  detailText: {
    fontFamily: fonts.sans,
    fontSize: 12,
    lineHeight: 18,
    color: lightColors.danger,
  },
  button: {
    marginTop: 8,
    backgroundColor: lightColors.accent,
    borderRadius: radii.md,
    paddingHorizontal: 18,
    paddingVertical: 12,
    minHeight: 44,
    justifyContent: 'center',
  },
  buttonText: {
    fontFamily: fonts.sansSemiBold,
    color: lightColors.onAccent,
    fontWeight: '600',
  },
});
