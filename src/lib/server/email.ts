import { env } from '$env/dynamic/private';
import nodemailer, { type Transporter } from 'nodemailer';

// Sent by direct SMTP to Stalwart on mail.zaur.app (szkolyjogi.pl is a Stalwart
// domain, SPF-aligned). SMTP_* env come from the deploy; when unset (e.g. local)
// sending throws and callers treat email as best-effort.
const FROM = 'noreply@szkolyjogi.pl';
const FROM_NAME = 'szkolyjogi.pl';
const ADMIN_EMAIL = 'kontakt@szkolyjogi.pl';

let _tx: Transporter | null = null;
function transport(): Transporter {
  if (!env.SMTP_HOST || !env.SMTP_USER || !env.SMTP_PASS) {
    throw new Error('SMTP_HOST / SMTP_USER / SMTP_PASS not set');
  }
  if (!_tx) {
    const port = Number(env.SMTP_PORT ?? 465);
    _tx = nodemailer.createTransport({
      host: env.SMTP_HOST,
      port,
      secure: port === 465, // 465 = implicit TLS (STARTTLS/587 is broken on this Stalwart)
      auth: { user: env.SMTP_USER, pass: env.SMTP_PASS },
    });
  }
  return _tx;
}

async function send(opts: { to: string; subject: string; html: string; replyTo?: string }): Promise<void> {
  const info = await transport().sendMail({
    from: `"${FROM_NAME}" <${FROM}>`,
    to: opts.to,
    replyTo: opts.replyTo,
    subject: opts.subject,
    html: opts.html,
  });
  console.log(`[claim] email sent id=${info.messageId} → ${opts.to}`);
}

export type ClaimNotificationData = {
  schoolName: string;
  schoolId: string;
  listingUrl: string;
  claimantName: string;
  claimantEmail: string;
  claimantPhone: string | null;
  claimantRole: string;
  message: string | null;
  consentedAt: string | null;  // RODO/GDPR consent timestamp (ISO) or null
};

function claimNotificationHtml(data: ClaimNotificationData): string {
  const esc = (value: string): string =>
    value
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');

  const roleLabels: Record<string, string> = {
    owner: 'Właściciel/ka',
    manager: 'Manager/ka',
    instructor: 'Instruktor/ka',
  };

  return `<!DOCTYPE html>
<html lang="pl">
<head><meta charset="utf-8"></head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; max-width: 560px; margin: 0 auto; padding: 24px; color: #1a2332;">
  <div style="border-bottom: 2px solid #3d7ce0; padding-bottom: 16px; margin-bottom: 24px;">
    <h1 style="font-size: 18px; font-weight: 600; margin: 0;">Nowe zgłoszenie przejęcia profilu</h1>
  </div>

  <table style="width: 100%; border-collapse: collapse; margin-bottom: 24px;">
    <tr>
      <td style="padding: 8px 0; color: #6b7a8f; font-size: 13px; width: 120px;">Studio</td>
      <td style="padding: 8px 0; font-weight: 500;">${esc(data.schoolName)}</td>
    </tr>
    <tr>
      <td style="padding: 8px 0; color: #6b7a8f; font-size: 13px;">Imię i nazwisko</td>
      <td style="padding: 8px 0;">${esc(data.claimantName)}</td>
    </tr>
    <tr>
      <td style="padding: 8px 0; color: #6b7a8f; font-size: 13px;">E-mail</td>
      <td style="padding: 8px 0;"><a href="mailto:${esc(data.claimantEmail)}" style="color: #3d7ce0;">${esc(data.claimantEmail)}</a></td>
    </tr>
    ${data.claimantPhone ? `<tr>
      <td style="padding: 8px 0; color: #6b7a8f; font-size: 13px;">Telefon</td>
      <td style="padding: 8px 0;">${esc(data.claimantPhone)}</td>
    </tr>` : ''}
    <tr>
      <td style="padding: 8px 0; color: #6b7a8f; font-size: 13px;">Rola</td>
      <td style="padding: 8px 0;">${roleLabels[data.claimantRole] ?? esc(data.claimantRole)}</td>
    </tr>
    ${data.message ? `<tr>
      <td style="padding: 8px 0; color: #6b7a8f; font-size: 13px; vertical-align: top;">Wiadomość</td>
      <td style="padding: 8px 0;">${esc(data.message)}</td>
    </tr>` : ''}
    <tr>
      <td style="padding: 8px 0; color: #6b7a8f; font-size: 13px;">Zgoda RODO</td>
      <td style="padding: 8px 0;">${data.consentedAt ? `tak (${data.consentedAt})` : 'nie'}</td>
    </tr>
  </table>

  <a href="${data.listingUrl}"
     style="display: inline-block; padding: 10px 20px; background: #3d7ce0; color: #fff; text-decoration: none; border-radius: 6px; font-size: 13px; font-weight: 600;">
    Zobacz profil studia
  </a>

  <p style="margin-top: 32px; font-size: 12px; color: #6b7a8f;">
    Ta wiadomość została wysłana automatycznie przez szkolyjogi.pl
  </p>
</body>
</html>`;
}

export type ClaimApprovedData = {
  schoolName: string;
  claimantEmail: string;
  listingUrl: string; // public profile
  panelUrl: string; // owner self-service panel
};

function claimApprovedHtml(data: ClaimApprovedData): string {
  const esc = (v: string) =>
    v.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  return `<!DOCTYPE html>
<html lang="pl">
<head><meta charset="utf-8"></head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; max-width: 560px; margin: 0 auto; padding: 24px; color: #1a2332;">
  <div style="border-bottom: 2px solid #1a7f4b; padding-bottom: 16px; margin-bottom: 24px;">
    <h1 style="font-size: 18px; font-weight: 600; margin: 0;">Profil zweryfikowany ✓</h1>
  </div>
  <p style="font-size: 15px; line-height: 1.7;">Dzień dobry,</p>
  <p style="font-size: 15px; line-height: 1.7;">
    weryfikacja zakończona — profil <strong>${esc(data.schoolName)}</strong> jest od teraz
    oznaczony jako zweryfikowany przez właściciela. Możesz samodzielnie i bezpłatnie zarządzać
    wizytówką: opis, dane kontaktowe, grafik zajęć, cennik i linki.
  </p>
  <a href="${esc(data.panelUrl)}"
     style="display: inline-block; margin: 8px 0 24px; padding: 11px 22px; background: #1a7f4b; color: #fff; text-decoration: none; border-radius: 6px; font-size: 14px; font-weight: 600;">
    Zarządzaj profilem
  </a>
  <p style="font-size: 13px; line-height: 1.7; color: #6b7a8f;">
    Logowanie odbywa się przez link wysyłany na ten adres e-mail — bez hasła.<br>
    Profil publiczny: <a href="${esc(data.listingUrl)}" style="color: #3d7ce0;">${esc(data.listingUrl)}</a>
  </p>
  <p style="font-size: 15px; line-height: 1.7;">Pozdrawiam serdecznie,<br>Bartek<br>szkolyjogi.pl</p>
</body>
</html>`;
}

export async function sendClaimApproved(data: ClaimApprovedData): Promise<void> {
  await send({
    to: data.claimantEmail,
    replyTo: ADMIN_EMAIL, // owner replies reach Bartek
    subject: `Profil ${data.schoolName} — zweryfikowany`,
    html: claimApprovedHtml(data),
  });
}

export async function sendClaimNotification(data: ClaimNotificationData): Promise<void> {
  await send({
    to: ADMIN_EMAIL,
    subject: `Przejęcie profilu: ${data.schoolName}`,
    html: claimNotificationHtml(data),
  });
}
