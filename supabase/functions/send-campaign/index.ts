// ============================================================
// Supabase Edge Function: send-campaign
// One-click bulk mailer - sends the AISE 360 branded template
// (promo/advertising mode or renewal mode) to many recipients.
// Body: {
//   subject, headline?, message?, cta_text?, services?,
//   mode: 'promo' | 'renewal', items? (renewal mode),
//   recipients: [{ name, email, company? }],
//   dry_run?: boolean
// }
// ============================================================

import { buildPromoEmail, buildRenewalEmail, type RenewalItem } from '../_shared/aise-template.ts'

const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY')!
const FROM = 'AISE 360 <notifications@aise360.com>'
const REPLY_TO = 'contact@aise360.com'
const MAX_RECIPIENTS = 500
const CONCURRENCY = 5

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/

function fillVars(template: string, r: { name: string; company?: string }): string {
  return template
    .replace(/\{\{\s*name\s*\}\}/gi, r.name || 'there')
    .replace(/\{\{\s*company\s*\}\}/gi, r.company || '')
}

function htmlToText(html: string): string {
  return html
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/(p|div|tr|h1|h2|h3|h4|li|table)>/gi, '\n')
    .replace(/<[^>]+>/g, '')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/\n{3,}/g, '\n\n')
    .trim()
}

async function sendOne(to: string, subject: string, html: string, text: string) {
  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${RESEND_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ from: FROM, to: [to], reply_to: REPLY_TO, subject, html, text }),
  })
  const data = await res.json()
  if (!res.ok) throw new Error(data?.message ?? JSON.stringify(data))
  return data.id as string
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors })

  try {
    const body = await req.json()
    const {
      subject, headline, message, cta_text, services,
      mode = 'promo', items = [], recipients = [], dry_run = false,
      custom_html, text: custom_text,
    } = body as {
      subject: string
      headline?: string
      message?: string
      cta_text?: string
      services?: { title: string; desc: string }[]
      mode?: 'promo' | 'renewal'
      items?: RenewalItem[]
      recipients: { name: string; email: string; company?: string }[]
      dry_run?: boolean
      custom_html?: string
      text?: string
    }

    if (!subject?.trim()) {
      return new Response(JSON.stringify({ error: 'subject is required' }), { status: 400, headers: { 'Content-Type': 'application/json', ...cors } })
    }
    const useCustom = !!custom_html?.trim()
    if (!useCustom && mode === 'promo' && !message?.trim()) {
      return new Response(JSON.stringify({ error: 'message is required for promo mode' }), { status: 400, headers: { 'Content-Type': 'application/json', ...cors } })
    }
    if (!useCustom && mode === 'renewal' && (!items || items.length === 0)) {
      return new Response(JSON.stringify({ error: 'items are required for renewal mode' }), { status: 400, headers: { 'Content-Type': 'application/json', ...cors } })
    }
    if (!Array.isArray(recipients) || recipients.length === 0) {
      return new Response(JSON.stringify({ error: 'recipients[] is required' }), { status: 400, headers: { 'Content-Type': 'application/json', ...cors } })
    }
    if (recipients.length > MAX_RECIPIENTS) {
      return new Response(JSON.stringify({ error: `Too many recipients (max ${MAX_RECIPIENTS})` }), { status: 400, headers: { 'Content-Type': 'application/json', ...cors } })
    }

    // Dedupe by email + validate
    const seen = new Set<string>()
    const valid: { name: string; email: string; company?: string }[] = []
    const invalid: { email: string; error: string }[] = []
    for (const r of recipients) {
      const email = (r.email || '').trim().toLowerCase()
      if (!EMAIL_RE.test(email)) { invalid.push({ email: r.email || '(empty)', error: 'Invalid email' }); continue }
      if (seen.has(email)) continue
      seen.add(email)
      valid.push({ name: (r.name || '').trim() || 'there', email, company: (r.company || '').trim() })
    }

    if (dry_run) {
      return new Response(JSON.stringify({ dry_run: true, valid: valid.length, invalid }), {
        headers: { 'Content-Type': 'application/json', ...cors },
      })
    }

    const results: { name: string; email: string; ok: boolean; id?: string; error?: string }[] =
      invalid.map((i) => ({ name: '', email: i.email, ok: false, error: i.error }))

    // Send in concurrent batches to stay fast without hammering Resend
    for (let i = 0; i < valid.length; i += CONCURRENCY) {
      const batch = valid.slice(i, i + CONCURRENCY)
      const settled = await Promise.allSettled(batch.map(async (r) => {
        const personalSubject = fillVars(subject, r)
        let html: string
        let text: string
        if (useCustom) {
          html = fillVars(custom_html!, r)
          text = custom_text?.trim() ? fillVars(custom_text, r) : htmlToText(html)
        } else {
          const built = mode === 'renewal'
            ? buildRenewalEmail({ name: r.name, items })
            : buildPromoEmail({
                name: r.name,
                company: r.company,
                headline: fillVars(headline || 'Your Digital Partner - Always On.', r),
                message: fillVars(message || '', r),
                services,
                ctaText: cta_text,
              })
          html = built.html
          text = built.text
        }
        const id = await sendOne(r.email, personalSubject, html, text)
        return { r, id }
      }))
      settled.forEach((s, j) => {
        const r = batch[j]
        if (s.status === 'fulfilled') results.push({ name: r.name, email: r.email, ok: true, id: s.value.id })
        else results.push({ name: r.name, email: r.email, ok: false, error: String(s.reason?.message ?? s.reason) })
      })
    }

    const sent = results.filter((r) => r.ok).length
    return new Response(JSON.stringify({ sent, failed: results.length - sent, total: results.length, results }), {
      headers: { 'Content-Type': 'application/json', ...cors },
    })
  } catch (err) {
    console.error(err)
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 500, headers: { 'Content-Type': 'application/json', ...cors },
    })
  }
})
