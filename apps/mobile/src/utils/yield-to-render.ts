/**
 * Let React paint pending state before a long synchronous task.
 *
 * Password hashing is CPU-bound pure JS: without this yield the JS thread
 * blocks inside the same tick as the `setLoading(true)` that precedes it, so
 * the auth screens never show their loading label.
 */
export function yieldToRender(): Promise<void> {
  return new Promise((resolve) => {
    setTimeout(resolve, 0);
  });
}
