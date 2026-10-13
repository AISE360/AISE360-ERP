// ============================================================
// Supabase Edge Function: send-followup
// Sends renewal reminder mail for selected follow-ups:
//  - each client (client_email) gets their own renewal mail
//  - contact@aise360.com (NOTIFY_EMAIL) gets a full records copy
// Body: { followup_ids: string[], skip_admin_copy?: boolean }
// ============================================================

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { buildRenewalEmail } from '../_shared/aise-template.ts'

const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY')!
const NOTIFY_EMAIL = Deno.env.get('NOTIFY_EMAIL') ?? 'contact@aise360.com'
const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

async function sendMail(to: string[], subject: string, html: string) {
  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${RESEND_API_KEY}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      from: 'AISE 360 <notifications@aise360.com>',
      to, reply_to: 'contact@aise360.com', subject, html,
      headers: { 'List-Unsubscribe': '<mailto:contact@aise360.com?subject=Unsubscribe>' },
    }),
  })
  const data = await res.json()
  if (!res.ok) throw new Error(data?.message ?? JSON.stringify(data))
  return data.id as string
}

function fmt(d: string): string {
  try {
    return new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })
  } catch { return d }
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors })
  try {
    const { followup_ids = [], skip_admin_copy = false } = await req.json() as {
      followup_ids: string[]; skip_admin_copy?: boolean
    }
    if (!Array.isArray(followup_ids) || followup_ids.length === 0) {
      return new Response(JSON.stringify({ error: 'followup_ids[] is required' }), { status: 400, headers: { 'Content-Type': 'application/json', ...cors } })
    }
    if (followup_ids.length > 200) {
      return new Response(JSON.stringify({ error: 'Too many (max 200 per send)' }), { status: 400, headers: { 'Content-Type': 'application/json', ...cors } })
    }

    const { data: rows, error } = await supabase
      .from('follow_ups')
      .select('id, title, description, due_date, expiry_date, client_email, client_name, type, project:projects(title)')
      .in('id', followup_ids)
      .eq('is_done', false)
    if (error) throw error

    // group by client email
    const byClient = new Map<string, { name: string; items: { title: string; due_date: string; description?: string }[] }>()
    const skipped: { title: string; reason: string }[] = []
    for (const r of (rows ?? [])) {
      const em = (r.client_email ?? '').trim().toLowerCase()
      if (!EMAIL_RE.test(em)) { skipped.push({ title: r.title, reason: 'no valid client email' }); continue }
      const expiry = r.expiry_date ?? r.due_date
      const g = byClient.get(em) ?? { name: r.client_name || 'there', items: [] }
      g.items.push({ title: r.title, due_date: expiry, description: r.description ?? '' })
      byClient.set(em, g)
    }

    const results: { email: string; ok: boolean; id?: string; error?: string; items: number }[] = []
    for (const [email, g] of byClient) {
      try {
        const built = buildRenewalEmail({ name: g.name, items: g.items })
        const id = await sendMail([email], built.subject, built.html)
        results.push({ email, ok: true, id, items: g.items.length })
      } catch (e) {
        results.push({ email, ok: false, error: String((e as Error)?.message ?? e), items: g.items.length })
      }
    }

    const sent = results.filter((r) => r.ok).length
    const failed = results.length - sent

    // stamp sent rows
    const mailedIds = (rows ?? []).filter((r) => {
      const em = (r.client_email ?? '').trim().toLowerCase()
      return byClient.has(em) && results.find((x) => x.email === em)?.ok
    }).map((r) => r.id)
    if (mailedIds.length > 0) {
      const { data: cur } = await supabase.from('follow_ups').select('id, remind_count').in('id', mailedIds)
      for (const c of (cur ?? [])) {
        await supabase.from('follow_ups').update({
          last_reminded_at: new Date().toISOString(),
          remind_count: (c.remind_count ?? 0) + 1,
        }).eq('id', c.id)
      }
    }

    // admin records copy -> contact@aise360.com
    let adminId: string | undefined
    if (!skip_admin_copy) {
      const okRows = results.filter((r) => r.ok).map((r) =>
        `<tr><td style="padding:8px 12px;border-bottom:1px solid #eee;font-size:13px;">${r.email}</td><td style="padding:8px 12px;border-bottom:1px solid #eee;font-size:13px;text-align:center;">${r.items}</td><td style="padding:8px 12px;border-bottom:1px solid #eee;font-size:13px;color:#16a34a;font-weight:700;">sent</td></tr>`
      ).join('')
      const failRows = results.filter((r) => !r.ok).map((r) =>
        `<tr><td style="padding:8px 12px;border-bottom:1px solid #eee;font-size:13px;">${r.email}</td><td style="padding:8px 12px;border-bottom:1px solid #eee;font-size:13px;text-align:center;">${r.items}</td><td style="padding:8px 12px;border-bottom:1px solid #eee;font-size:13px;color:#dc2626;font-weight:700;">${r.error ?? 'failed'}</td></tr>`
      ).join('')
      const skipRows = skipped.map((s) =>
        `<tr><td style="padding:8px 12px;border-bottom:1px solid #eee;font-size:13px;" colspan="3">${s.title} — <span style="color:#b45309;">${s.reason}</span></td></tr>`
      ).join('')
      const detailRows = (rows ?? []).map((r) =>
        `<tr><td style="padding:8px 12px;border-bottom:1px solid #eee;font-size:12px;">${r.title}</td><td style="padding:8px 12px;border-bottom:1px solid #eee;font-size:12px;">${r.client_email ?? '—'}</td><td style="padding:8px 12px;border-bottom:1px solid #eee;font-size:12px;">expires ${fmt(r.expiry_date ?? r.due_date)}</td></tr>`
      ).join('')
      const html = `<!DOCTYPE html><html><body style="font-family:Arial,sans-serif;background:#f8fafc;margin:0;padding:24px;">
        <div style="max-width:640px;margin:0 auto;background:#fff;border-radius:12px;overflow:hidden;">
        <div style="background:#0b1020;color:#fff;padding:20px 24px;"><strong>AISE 360 — Follow-up mailer record</strong><div style="color:#93a4c4;font-size:12px;">${new Date().toLocaleString('en-IN')}</div></div>
        <div style="padding:20px 24px;">
        <p style="font-size:14px;">Bulk/manual send finished: <strong>${sent} client(s) mailed</strong>, ${failed} failed, ${skipped.length} skipped.</p>
        <table width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse;margin-bottom:16px;"><tbody>${okRows}${failRows}${skipRows}</tbody></table>
        <h3 style="font-size:13px;">Full follow-up records in this send</h3>
        <table width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse;"><tbody>${detailRows}</tbody></table>
        </div></div></body></html>`
      try {
        adminId = await sendMail([NOTIFY_EMAIL], `Follow-up mails sent: ${sent} clients (${new Date().toLocaleDateString('en-IN', { day: '2-digit', month: 'short' })})`, html)
      } catch { /* admin copy best-effort */ }
    }

    return new Response(JSON.stringify({ sent, failed, skipped: skipped.length, results, skipped, admin_copy: adminId ?? null, admin_to: NOTIFY_EMAIL }), {
      headers: { 'Content-Type': 'application/json', ...cors },
    })
  } catch (err) {
    console.error(err)
    return new Response(JSON.stringify({ error: String(err) }), { status: 500, headers: { 'Content-Type': 'application/json', ...cors } })
  }
})
