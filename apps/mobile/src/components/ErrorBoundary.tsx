import { Component, type ErrorInfo, type ReactNode } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
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
    backgroundColor: '#F4FAF7',
  },
  title: { fontSize: 22, fontWeight: '800', color: '#123527' },
  message: { fontSize: 15, lineHeight: 22, color: '#456356', textAlign: 'center' },
  button: {
    marginTop: 8,
    backgroundColor: '#1F7A5A',
    borderRadius: 12,
    paddingHorizontal: 18,
    paddingVertical: 12,
  },
  buttonText: { color: '#FFFFFF', fontWeight: '700' },
});
