import { env } from '$env/dynamic/private';

// Sent through the Temps transactional-email API (relays via the Zaur Mail
// SMTP provider / Stalwart on mail.zaur.app). TEMPS_API_URL and
// TEMPS_API_TOKEN are injected into every Temps deployment; locally they're
// unset and sending throws (callers treat email as best-effort).
const FROM = 'noreply@szkolyjogi.pl';
const FROM_NAME = 'szkolyjogi.pl';
const ADMIN_EMAIL = 'kontakt@szkolyjogi.pl';

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

export async function sendClaimNotification(data: ClaimNotificationData): Promise<void> {
  if (!env.TEMPS_API_URL || !env.TEMPS_API_TOKEN) {
    throw new Error('TEMPS_API_URL / TEMPS_API_TOKEN not set');
  }
  const res = await fetch(`${env.TEMPS_API_URL}/emails`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${env.TEMPS_API_TOKEN}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from: FROM,
      from_name: FROM_NAME,
      to: [ADMIN_EMAIL],
      subject: `Przejęcie profilu: ${data.schoolName}`,
      html: claimNotificationHtml(data),
    }),
  });
  if (!res.ok) {
    throw new Error(`Temps email API ${res.status}: ${await res.text()}`);
  }
  const sent = (await res.json()) as { id: string; status: string };
  console.log(`[claim] notification email ${sent.status} via Temps, id=${sent.id}`);
}
