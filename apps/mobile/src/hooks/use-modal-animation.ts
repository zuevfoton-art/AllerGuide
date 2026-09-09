import { useReducedMotion } from '@/src/hooks/use-reduced-motion';
import { resolveModalAnimation } from '@/src/constants/motion';

export function useModalAnimation(type: 'slide' | 'fade'): 'none' | 'slide' | 'fade' {
  const reduced = useReducedMotion();
  return resolveModalAnimation(type, reduced);
}
