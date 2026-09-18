// ============================================================
// Shared AISE 360 email template (Resend)
// Two modes:
//   renewal - service renewal notice w/ services table + note
//   promo   - advertising mailer w/ "what AISE provides" grid
// Email-client-safe: table layout, inline styles, system fonts.
// ============================================================

export interface RenewalItem {
  title: string
  due_date: string
  description?: string
}

export interface PromoService {
  title: string
  desc: string
}

export const AISE_SERVICES: PromoService[] = [
  { title: 'Web Development', desc: 'Fast, modern websites & web apps your customers love.' },
  { title: 'Mobile Development', desc: 'Android & iOS apps built for performance and scale.' },
  { title: 'Cybersecurity', desc: 'Audits, protection & monitoring that keep you safe online.' },
  { title: 'Digital Marketing', desc: 'Campaigns that get you seen, clicked and remembered.' },
  { title: 'Cloud Solutions', desc: 'Hosting, deployment & infrastructure that never sleeps.' },
  { title: 'IT Consulting', desc: 'The right tech guidance for your business decisions.' },
  { title: 'SEO Optimization', desc: 'Rank higher on Google and get found first.' },
  { title: 'AI Automation', desc: 'Smart automation & AI tools that save hours daily.' },
]

export const AISE_LOGO_URL = 'https://aise360crm.netlify.app/whitelogo.png'

export function escapeHtml(s: string): string {
  return (s ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

export function nl2br(s: string): string {
  return escapeHtml(s).replace(/\r?\n/g, '<br>')
}

function formatDate(dateStr: string): string {
  try {
    return new Date(dateStr).toLocaleDateString('en-IN', {
      day: '2-digit', month: 'long', year: 'numeric',
    })
  } catch {
    return dateStr
  }
}

function statusPill(days: number): string {
  if (days < 0) {
    return `<span style="display:inline-block;background:#fee2e2;color:#b91c1c;font-size:12px;font-weight:700;padding:5px 14px;border-radius:20px;">🔴 Expired</span>`
  }
  if (days <= 30) {
    return `<span style="display:inline-block;background:#ffedd5;color:#c2410c;font-size:12px;font-weight:700;padding:5px 14px;border-radius:20px;">🟠 Expiring Soon</span>`
  }
  return `<span style="display:inline-block;background:#fef3c7;color:#b45309;font-size:12px;font-weight:700;padding:5px 14px;border-radius:20px;">🟡 Upcoming</span>`
}

function daysUntil(dateStr: string): number {
  const today = new Date(); today.setHours(0, 0, 0, 0)
  const target = new Date(dateStr); target.setHours(0, 0, 0, 0)
  return Math.round((target.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))
}

const EMAIL_CSS = `<style>
@media only screen and (max-width:480px){
  .hdr-wrap{padding:24px 20px 22px !important;}
  .hdr-stack{display:block !important;width:100% !important;text-align:center !important;}
  .hdr-eye{padding-top:14px !important;text-align:center !important;}
  .hdr-inner{margin:0 auto !important;}
  .hlogo,.hname{display:block !important;text-align:center !important;padding-left:0 !important;}
  .hname{padding-top:10px !important;}
  .hdr-hero{font-size:23px !important;text-align:center !important;}
  .hdr-sub{text-align:center !important;}
  .body-pad{padding:24px 20px 6px !important;}
  .cta-btn{display:block !important;margin:0 10px !important;padding:14px 20px !important;font-size:14px !important;}
}
</style>`;

function header(sentDate: string): string {
  return `
  <div class="hdr-wrap" style="background:#0b1020;padding:32px 36px 28px;">
    <table width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse;"><tr>
      <td class="hdr-stack" style="vertical-align:middle;">
        <table cellpadding="0" cellspacing="0" style="border-collapse:collapse;" class="hdr-inner"><tr>
          <td class="hlogo" style="vertical-align:middle;">
            <img src="${AISE_LOGO_URL}" alt="AISE 360" height="44" style="display:block;height:44px;width:auto;border:0;max-width:140px;margin:0 auto;">
          </td>
          <td class="hname" style="vertical-align:middle;padding-left:14px;white-space:nowrap;">
            <div style="color:#ffffff;font-size:22px;font-weight:800;letter-spacing:-0.5px;white-space:nowrap;">AISE 360</div>
            <div style="color:#93a4c4;font-size:12px;margin-top:2px;white-space:nowrap;">Digital Agency &amp; Web Solutions</div>
          </td>
        </tr></table>
      </td>
      <td class="hdr-stack hdr-eye" align="right" style="vertical-align:middle;color:#8b93a7;font-size:10px;letter-spacing:2px;line-height:1.8;white-space:nowrap;">
        IDEAS &nbsp;|&nbsp; WEBSITES &nbsp;|&nbsp; GROWTH<br>ALL IN ONE PLACE
      </td>
    </tr></table>
    <div class="hdr-hero" style="margin-top:24px;text-align:right;color:#ffffff;font-size:26px;font-weight:800;line-height:1.25;">Your Digital<br>Partner <span style="color:#9fb3d9;">Always On.</span></div>
    <div class="hdr-sub" style="color:#8b93a7;font-size:10px;letter-spacing:3px;margin-top:10px;text-align:right;">BUILD &nbsp;|&nbsp; SECURE &nbsp;|&nbsp; SCALE</div>
  </div>`
}

function footer(): string {
  return `
  <div style="background:#0b1020;padding:26px 36px;">
    <table width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse;"><tr>
      <td class="hdr-stack">
        <div style="color:#ffffff;font-weight:800;font-size:15px;">AISE 360</div>
        <div style="color:#8b93a7;font-size:12px;margin-top:2px;">Digital Agency &amp; Web Solutions</div>
        <div style="margin-top:8px;font-size:12px;">
          <a href="mailto:contact@aise360.com" style="color:#7ea4f2;text-decoration:none;">contact@aise360.com</a>
          <span style="color:#4b5563;">&nbsp;|&nbsp;</span>
          <a href="https://aise360.com" style="color:#7ea4f2;text-decoration:none;">aise360.com</a>
        </div>
      </td>
      <td class="hdr-stack" align="right" style="color:#ffffff;font-size:13px;font-weight:700;line-height:1.5;">
        Turning Ideas<br>Into Digital Reality.
      </td>
    </tr></table>
  </div>`
}

function helpBox(): string {
  return `
  <table width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse;margin:0 0 22px;">
    <tr>
      <td style="border-top:1px solid #e5e7eb;padding-top:18px;">
        <div style="color:#111827;font-size:14px;font-weight:700;margin-bottom:4px;">Need any help?</div>
        <div style="color:#6b7280;font-size:13px;line-height:1.6;margin-bottom:10px;">If you have any questions, feel free to contact:</div>
        <div style="color:#111827;font-size:13px;line-height:2;">
          <strong>Zaid Shaikh</strong> &nbsp; 📞 <a href="tel:+918237143559" style="color:#1d4ed8;text-decoration:none;">+91 82371 43559</a><br>
          <strong>Farooque Shaikh</strong> &nbsp; 📞 <a href="tel:+917083471542" style="color:#1d4ed8;text-decoration:none;">+91 70834 71542</a>
        </div>
      </td>
    </tr>
  </table>`
}

// ── RENEWAL MODE ─────────────────────────────────────────────
export function buildRenewalEmail(opts: {
  name: string
  items: RenewalItem[]
  sentDate?: string
}): { html: string; text: string; subject: string } {
  const name = opts.name || 'there'
  const sentDate = opts.sentDate ||
    new Date().toLocaleDateString('en-IN', { day: '2-digit', month: 'long', year: 'numeric' })

  const rows = opts.items.map((item) => {
    const days = daysUntil(item.due_date)
    const clean = item.title.replace(/^[^–\-]+[–\-]\s*/, '')
    return `
    <tr>
      <td style="padding:14px 20px;border-bottom:1px solid #eef2f7;">
        <div style="font-weight:700;color:#111827;font-size:14px;">${escapeHtml(clean)}</div>
        ${item.description ? `<div style="color:#6b7280;font-size:12px;margin-top:3px;line-height:1.5;">${escapeHtml(item.description)}</div>` : ''}
        <div style="color:#9ca3af;font-size:11px;margin-top:3px;">Expires ${escapeHtml(formatDate(item.due_date))}. Renew before expiry.</div>
      </td>
      <td style="padding:14px 20px;border-bottom:1px solid #eef2f7;white-space:nowrap;font-size:13px;color:#374151;font-weight:600;">${escapeHtml(formatDate(item.due_date))}</td>
      <td style="padding:14px 20px;border-bottom:1px solid #eef2f7;white-space:nowrap;text-align:right;">${statusPill(days)}</td>
    </tr>`
  }).join('')

  const html = `<!DOCTYPE html>
<html><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1">${EMAIL_CSS}</head>
<body style="margin:0;padding:0;background:#111623;font-family:Arial,Helvetica,sans-serif;">
<div style="max-width:640px;margin:0 auto;background:#ffffff;">
${header(sentDate)}
<div class="body-pad" style="padding:34px 36px 10px;">
  <div style="color:#2563eb;font-size:11px;font-weight:700;letter-spacing:3px;margin-bottom:10px;">SERVICE RENEWAL NOTICE</div>
  <div style="color:#0b1020;font-size:30px;font-weight:800;line-height:1.2;margin-bottom:14px;">Hi ${escapeHtml(name)},<br>Your services are coming up for <span style="color:#2563eb;">renewal.</span></div>
  <p style="color:#4b5563;font-size:14px;line-height:1.7;margin:0 0 24px;">
    This is a courtesy reminder from <strong>AISE 360</strong> regarding the upcoming renewal dates
    for the digital services we manage on your behalf. Please review the details below and
    let us know if you'd like to proceed with the renewal.
  </p>
  <div style="background:#f1f5fb;border:1px solid #e2e8f5;border-radius:12px;overflow:hidden;margin-bottom:24px;">
    <div style="padding:14px 20px;color:#0b1020;font-size:15px;font-weight:800;">🗂️ Your Services &amp; Renewal Dates</div>
    <table width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse;">
      <thead><tr style="background:#e6edf9;">
        <th align="left" style="padding:10px 20px;font-size:11px;color:#475569;font-weight:700;">SERVICE</th>
        <th align="left" style="padding:10px 20px;font-size:11px;color:#475569;font-weight:700;">EXPIRY DATE</th>
        <th align="right" style="padding:10px 20px;font-size:11px;color:#475569;font-weight:700;">STATUS</th>
      </tr></thead>
      <tbody>${rows}</tbody>
    </table>
  </div>
  <div style="background:#fef3c7;border-left:4px solid #f59e0b;border-radius:0 8px 8px 0;padding:14px 18px;margin-bottom:26px;">
    <div style="color:#92400e;font-size:13px;font-weight:800;margin-bottom:4px;">⚠️ Important Note</div>
    <div style="color:#78350f;font-size:13px;line-height:1.6;">
      Auto-renewal is currently <strong>disabled</strong> for all services.
      Please contact us before the expiry date to avoid any service interruption.
      We recommend renewing at least <strong>7-10 days in advance</strong>.
    </div>
  </div>
  <div style="text-align:center;margin-bottom:24px;">
    <a href="mailto:contact@aise360.com?subject=${encodeURIComponent('Renewal Request - ' + name)}"
       class="cta-btn" style="display:inline-block;background:#1d4ed8;color:#ffffff;text-decoration:none;padding:15px 40px;border-radius:10px;font-weight:700;font-size:15px;">Contact Us to Renew &nbsp;→</a>
  </div>
  <p style="color:#6b7280;font-size:13px;line-height:1.6;margin:0 0 22px;text-align:center;">If you have any questions, we're happy to help!</p>
  ${helpBox()}
  <p style="color:#4b5563;font-size:13px;margin:0 0 24px;">We're happy to help!<br>- Team <strong style="color:#1d4ed8;">AISE 360</strong></p>
</div>
${footer()}
</div>
</body></html>`

  const text = `Service Renewal Notice - AISE 360

Hi ${name},
Your services are coming up for renewal.

This is a courtesy reminder from AISE 360 regarding the upcoming renewal dates for the digital services we manage on your behalf.

Your Services & Renewal Dates:
${opts.items.map((i) => `- ${i.title.replace(/^[^–\-]+[–\-]\s*/, '')}: expires ${formatDate(i.due_date)}${i.description ? ` (${i.description})` : ''}`).join('\n')}

IMPORTANT: Auto-renewal is currently disabled for all services. Please contact us before the expiry date - we recommend renewing at least 7-10 days in advance.

Contact us to renew: contact@aise360.com
Need help? Zaid Shaikh +91 82371 43559 | Farooque Shaikh +91 70834 71542

AISE 360 | Digital Agency & Web Solutions
contact@aise360.com | https://aise360.com`

  return { html, text, subject: `Service Renewal Reminder - ${name} | AISE 360` }
}

// ── PROMO / ADVERTISING MODE ─────────────────────────────────
export function buildPromoEmail(opts: {
  name: string
  company?: string
  headline: string
  message: string
  services?: PromoService[]
  ctaText?: string
  sentDate?: string
}): { html: string; text: string } {
  const name = opts.name || 'there'
  const services = opts.services?.length ? opts.services : AISE_SERVICES
  const ctaText = opts.ctaText || 'Get a Free Quote'
  const sentDate = opts.sentDate ||
    new Date().toLocaleDateString('en-IN', { day: '2-digit', month: 'long', year: 'numeric' })

  const grid = services.map((s) => `
    <tr>
      <td style="padding:13px 20px;border-bottom:1px solid #eef2f7;">
        <div style="font-weight:700;color:#111827;font-size:14px;">${escapeHtml(s.title)}</div>
        <div style="color:#6b7280;font-size:12px;margin-top:2px;line-height:1.5;">${escapeHtml(s.desc)}</div>
      </td>
    </tr>`).join('')

  const html = `<!DOCTYPE html>
<html><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1">${EMAIL_CSS}</head>
<body style="margin:0;padding:0;background:#111623;font-family:Arial,Helvetica,sans-serif;">
<div style="max-width:640px;margin:0 auto;background:#ffffff;">
${header(sentDate)}
<div class="body-pad" style="padding:34px 36px 10px;">
  <div style="color:#2563eb;font-size:11px;font-weight:700;letter-spacing:3px;margin-bottom:10px;">FROM TEAM AISE 360</div>
  <div style="color:#0b1020;font-size:28px;font-weight:800;line-height:1.25;margin-bottom:6px;">Hi ${escapeHtml(name)},</div>
  <div style="color:#0b1020;font-size:22px;font-weight:800;line-height:1.3;margin-bottom:14px;">${escapeHtml(opts.headline)}</div>
  <p style="color:#4b5563;font-size:14px;line-height:1.7;margin:0 0 24px;">${nl2br(opts.message)}</p>
  <div style="background:#f1f5fb;border:1px solid #e2e8f5;border-radius:12px;overflow:hidden;margin-bottom:24px;">
    <div style="padding:14px 20px;color:#0b1020;font-size:15px;font-weight:800;">🚀 What AISE 360 Does For You</div>
    <table width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse;"><tbody>${grid}</tbody></table>
  </div>
  <div style="background:#eaf1fe;border-left:4px solid #2563eb;border-radius:0 8px 8px 0;padding:14px 18px;margin-bottom:26px;">
    <div style="color:#1e3a8a;font-size:13px;line-height:1.6;">
      <strong>AISE 360 - built for the next generation.</strong><br>
      Websites, apps, security, marketing &amp; growth - build, secure &amp; scale, all in one place.
      Reply to this mail or call us, and we'll take it from there.
    </div>
  </div>
  <div style="text-align:center;margin-bottom:24px;">
    <a href="mailto:contact@aise360.com?subject=${encodeURIComponent('New Enquiry via AISE 360 Mailer')}"
       class="cta-btn" style="display:inline-block;background:#1d4ed8;color:#ffffff;text-decoration:none;padding:15px 40px;border-radius:10px;font-weight:700;font-size:15px;">${escapeHtml(ctaText)} &nbsp;→</a>
  </div>
  ${helpBox()}
  <p style="color:#4b5563;font-size:13px;margin:0 0 24px;">We're happy to help!<br>- Team <strong style="color:#1d4ed8;">AISE 360</strong></p>
</div>
${footer()}
</div>
</body></html>`

  const text = `${opts.headline} - AISE 360

Hi ${name},

${opts.message}

What AISE 360 does for you:
${services.map((s) => `- ${s.title}: ${s.desc}`).join('\n')}

One team for ideas, websites & growth - AISE 360, built for the next generation.
${ctaText}: contact@aise360.com
Need help? Zaid Shaikh +91 82371 43559 | Farooque Shaikh +91 70834 71542

AISE 360 | Digital Agency & Web Solutions
contact@aise360.com | https://aise360.com`

  return { html, text }
}
