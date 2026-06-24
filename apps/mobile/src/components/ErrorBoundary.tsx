import { Component, type ErrorInfo, type ReactNode } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
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
}

export class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false };

  static getDerivedStateFromError(): State {
    return { hasError: true };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    captureError(error, { componentStack: info.componentStack ?? '' });
  }

  private reset = () => {
    this.setState({ hasError: false });
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
