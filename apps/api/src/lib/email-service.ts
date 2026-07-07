/**
 * Transactional email for password reset (Resend API when configured).
 */

function passwordResetAppUrl(): string {
  return (
    process.env.PASSWORD_RESET_APP_URL?.trim() ||
    process.env.APP_URL?.trim() ||
    'https://aclearo.com/reset-password'
  );
}

export function buildPasswordResetUrl(token: string): string {
  const base = passwordResetAppUrl().replace(/\/$/, '');
  const separator = base.includes('?') ? '&' : '?';
  return `${base}${separator}token=${encodeURIComponent(token)}`;
}

export async function sendPasswordResetEmail(to: string, token: string): Promise<boolean> {
  const apiKey = process.env.RESEND_API_KEY?.trim();
  const from = process.env.EMAIL_FROM?.trim() || 'Aclearo <noreply@aclearo.com>';

  if (!apiKey) {
    return false;
  }

  const resetUrl = buildPasswordResetUrl(token);
  const subject = 'A-Claro — восстановление пароля';
  const html = [
    '<p>Вы запросили сброс пароля A-Claro (Aclearo).</p>',
    `<p><a href="${resetUrl}">Сбросить пароль</a></p>`,
    '<p>Ссылка действует 1 час. Если вы не запрашивали сброс, проигнорируйте это письмо.</p>',
  ].join('');

  try {
    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ from, to, subject, html }),
    });
    return response.ok;
  } catch {
    return false;
  }
}
