import { useEffect, useMemo, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { useAuthStore } from '@/store/authStore'
import { BNI_CONTACTS_SEED } from '@/data/bniContacts'
import { AISE_SERVICES } from '../../supabase/functions/_shared/aise-template'
import {
  Megaphone, Send, FlaskConical, Users, Eye, X, Loader2,
  CheckCircle2, XCircle, ChevronDown, Download,
} from 'lucide-react'

interface AudienceMember {
  key: string
  name: string
  email: string
  company: string
  source: 'Clients' | 'Networking' | 'Leads'
}

interface CampaignRow {
  id: string
  name: string
  subject: string
  audience_count: number
  sent_count: number
  failed_count: number
  created_at: string
}

interface RecipientRow {
  email: string
  name: string
  status: string
  error?: string | null
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/

function esc(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
}

// Client-side preview mirroring the server template (promo mode)
function previewHtml(opts: { name: string; headline: string; message: string; cta: string; services: typeof AISE_SERVICES }): string {
  const rows = opts.services.map((s) => `
    <tr><td style="padding:12px 18px;border-bottom:1px solid #eef2f7;">
      <div style="font-weight:700;color:#111827;font-size:14px;">${esc(s.title)}</div>
      <div style="color:#6b7280;font-size:12px;">${esc(s.desc)}</div></td></tr>`).join('')
  return `<!DOCTYPE html><html><body style="margin:0;background:#111623;font-family:Arial,sans-serif;">
  <div style="max-width:600px;margin:0 auto;background:#fff;">
    <div style="background:#0b1020;padding:28px;color:#fff;">
      <table cellpadding="0" cellspacing="0" style="border-collapse:collapse;"><tr>
        <td style="vertical-align:middle;">
          <img src="https://i.ibb.co/ym62dJW4/aissms-logo.png" alt="AISE 360" height="44" style="display:block;height:44px;width:auto;border:0;">
        </td>
        <td style="vertical-align:middle;padding-left:12px;">
          <div style="font-size:22px;font-weight:800;">AISE 360</div>
          <div style="color:#93a4c4;font-size:12px;">Digital Agency & Web Solutions</div>
        </td>
      </tr></table>
      <div style="text-align:right;margin-top:18px;font-size:22px;font-weight:800;">Your Digital<br>Partner Always On.</div>
    </div>
    <div style="padding:28px;">
      <div style="color:#2563eb;font-size:11px;font-weight:700;letter-spacing:3px;">FROM TEAM AISE 360</div>
      <div style="font-size:24px;font-weight:800;color:#0b1020;margin:8px 0;">Hi ${esc(opts.name)},</div>
      <div style="font-size:19px;font-weight:800;color:#0b1020;margin-bottom:12px;">${esc(opts.headline)}</div>
      <p style="color:#4b5563;font-size:14px;line-height:1.7;">${esc(opts.message).replace(/\n/g, '<br>')}</p>
      <div style="background:#f1f5fb;border:1px solid #e2e8f5;border-radius:12px;overflow:hidden;margin:18px 0;">
        <div style="padding:12px 18px;font-weight:800;color:#0b1020;">🚀 What AISE 360 Does For You</div>
        <table width="100%" cellpadding="0" cellspacing="0"><tbody>${rows}</tbody></table>
      </div>
      <div style="text-align:center;margin:18px 0;">
        <span style="display:inline-block;background:#1d4ed8;color:#fff;padding:14px 36px;border-radius:10px;font-weight:700;">${esc(opts.cta)} →</span>
      </div>
      <div style="border-top:1px solid #e5e7eb;padding-top:14px;font-size:13px;color:#111827;">
        <strong>Need any help?</strong><br>
        <span style="color:#6b7280;">Zaid Shaikh 📞 +91 82371 43559<br>Farooque Shaikh 📞 +91 70834 71542</span>
      </div>
    </div>
    <div style="background:#0b1020;padding:20px 28px;color:#fff;font-size:12px;">
      <strong>AISE 360</strong> · contact@aise360.com · aise360.com<br>
      <span style="color:#8b93a7;">Turning Ideas Into Digital Reality.</span>
    </div>
  </div></body></html>`
}

const DEFAULT_SUBJECT = 'AISE 360 — Built for the Next Generation | Great connecting at BNI'
const DEFAULT_HEADLINE = 'Is your brand ready for the new generation?'
const DEFAULT_MESSAGE = `Gen-Z expects more than just a website. They want experiences that are fast, modern, relatable, and worth remembering.

We understand what today's audience looks for — and we turn that understanding into digital experiences that connect. From web & mobile development to cybersecurity, cloud, marketing, SEO and AI automation — everything your brand needs, all in one place.

Great connecting at the BNI meet! If you ever need a digital partner for your next project, just reply to this mail and we'll take it from there.`

export default function CampaignsPage() {
  const { user } = useAuthStore()
  const [audience, setAudience] = useState<AudienceMember[]>([])
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [search, setSearch] = useState('')
  const [sourceTab, setSourceTab] = useState<'all' | 'Clients' | 'Networking' | 'Leads'>('all')
  const [showSelectedOnly, setShowSelectedOnly] = useState(false)
  const [loading, setLoading] = useState(true)

  const [subject, setSubject] = useState(DEFAULT_SUBJECT)
  const [headline, setHeadline] = useState(DEFAULT_HEADLINE)
  const [message, setMessage] = useState(DEFAULT_MESSAGE)
  const [cta, setCta] = useState('Get a Free Quote')
  const [servicesOn, setServicesOn] = useState<Set<string>>(new Set(AISE_SERVICES.map((s) => s.title)))
  const [showPreview, setShowPreview] = useState(true)

  const [sending, setSending] = useState(false)
  const [testing, setTesting] = useState(false)
  const [result, setResult] = useState<{ sent: number; failed: number; failures: RecipientRow[] } | null>(null)
  const [toast, setToast] = useState<string | null>(null)

  const [history, setHistory] = useState<CampaignRow[]>([])
  const [expanded, setExpanded] = useState<string | null>(null)
  const [expandRows, setExpandRows] = useState<RecipientRow[]>([])
  const [expandLoading, setExpandLoading] = useState(false)

  useEffect(() => {
    const load = async () => {
      const [{ data: clients }, { data: leads }] = await Promise.all([
        supabase.from('clients').select('company_name, contact_person, email'),
        supabase.from('leads').select('company_name, contact_person, email'),
      ])
      const list: AudienceMember[] = []
      const push = (m: AudienceMember) => {
        const em = m.email.trim().toLowerCase()
        if (!EMAIL_RE.test(em)) return
        // same email may appear in multiple sources (shown per-source); server dedupes at send
        list.push({ ...m, key: `${m.source}|${em}`, email: em })
      }
      ;(clients ?? []).forEach((c: any) => push({
        key: '', name: c.contact_person || c.company_name, email: c.email || '',
        company: c.company_name, source: 'Clients',
      }))
      BNI_CONTACTS_SEED.forEach((c) => push({
        key: '', name: c.name, email: c.email || '',
        company: `${c.company} (Power Team ${c.team})`, source: 'Networking',
      }))
      ;(leads ?? []).forEach((l: any) => push({
        key: '', name: l.contact_person || l.company_name, email: l.email || '',
        company: l.company_name, source: 'Leads',
      }))
      setAudience(list)
      setSelected(new Set(list.map((m) => m.key)))
      setLoading(false)
      try {
        const { data } = await supabase.from('campaigns').select('*').order('created_at', { ascending: false }).limit(20)
        setHistory((data as any) ?? [])
      } catch { /* table may not exist yet */ }
    }
    load()
  }, [])

  const showToast = (msg: string) => {
    setToast(msg)
    setTimeout(() => setToast(null), 3000)
  }

  const filtered = useMemo(() => {
    const q = search.toLowerCase().trim()
    return audience.filter((m) => {
      if (sourceTab !== 'all' && m.source !== sourceTab) return false
      if (showSelectedOnly && !selected.has(m.key)) return false
      if (!q) return true
      return m.name.toLowerCase().includes(q) || m.company.toLowerCase().includes(q) || m.email.includes(q)
    })
  }, [audience, search, sourceTab, showSelectedOnly, selected])

  const uniqueSelected = useMemo(() => {
    const emails = new Set<string>()
    audience.forEach((m) => { if (selected.has(m.key)) emails.add(m.email) })
    return emails.size
  }, [audience, selected])

  const toggle = (key: string) => {
    setSelected((prev) => {
      const next = new Set(prev)
      if (next.has(key)) next.delete(key)
      else next.add(key)
      return next
    })
  }

  const selectGroup = (group: 'all' | AudienceMember['source'], on: boolean) => {
    setSelected((prev) => {
      const next = new Set(prev)
      audience.forEach((m) => {
        if (group === 'all' || m.source === group) {
          if (on) next.add(m.key)
          else next.delete(m.key)
        }
      })
      return next
    })
  }

  const toggleService = (title: string) => {
    setServicesOn((prev) => {
      const next = new Set(prev)
      if (next.has(title)) next.delete(title)
      else next.add(title)
      return next
    })
  }

  const selectedServices = useMemo(() => AISE_SERVICES.filter((s) => servicesOn.has(s.title)), [servicesOn])

  const callFunction = async (payload: any) => {
    const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL
    const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY
    const res = await fetch(`${SUPABASE_URL}/functions/v1/send-campaign`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${SUPABASE_ANON_KEY}` },
      body: JSON.stringify(payload),
    })
    if (res.status === 404) {
      throw new Error('NOT_DEPLOYED')
    }
    const data = await res.json()
    if (!res.ok) throw new Error(data.error ?? 'Send failed')
    return data
  }

  const buildRecipients = () =>
    audience.filter((m) => selected.has(m.key)).map((m) => ({ name: m.name, email: m.email, company: m.company }))

  const handleTest = async () => {
    if (!user?.email) { alert('Your login email is unknown — cannot send test.'); return }
    setTesting(true)
    try {
      const data = await callFunction({
        subject: `[TEST] ${subject}`,
        headline, message, cta_text: cta,
        services: selectedServices,
        mode: 'promo',
        recipients: [{ name: user.full_name || 'there', email: user.email, company: 'AISE 360 (test)' }],
      })
      showToast(data.sent === 1 ? 'Test mail sent to your inbox ✓' : `Test finished: ${data.sent} sent, ${data.failed} failed`)
    } catch (e: any) {
      alert(e.message === 'NOT_DEPLOYED'
        ? 'Edge function not deployed yet.\nRun in terminal:\n  supabase functions deploy send-campaign'
        : `Test failed: ${e.message ?? e}`)
    }
    setTesting(false)
  }

  const handleSendAll = async () => {
    const recipients = buildRecipients()
    if (recipients.length === 0) { alert('Select at least one recipient.'); return }
    if (!subject.trim() || !message.trim()) { alert('Subject and message are required.'); return }
    if (!confirm(`Send this mail to ${uniqueSelected} unique email${uniqueSelected === 1 ? '' : 's'}?\n\nSubject: ${subject}`)) return
    setSending(true)
    setResult(null)
    try {
      const data = await callFunction({
        subject, headline, message, cta_text: cta,
        services: selectedServices,
        mode: 'promo',
        recipients,
      })
      const failures: RecipientRow[] = (data.results ?? [])
        .filter((r: any) => !r.ok)
        .map((r: any) => ({ email: r.email, name: r.name, status: 'failed', error: r.error }))
      setResult({ sent: data.sent, failed: data.failed, failures })
      // Log campaign + recipients (best-effort; tables optional)
      try {
        const { data: camp } = await supabase.from('campaigns').insert({
          name: `Promo — ${new Date().toLocaleDateString('en-IN', { day: '2-digit', month: 'short' })}`,
          subject, headline, message, cta_text: cta,
          audience_count: data.total, sent_count: data.sent, failed_count: data.failed,
          created_by: user?.id ?? null,
        }).select('id').single()
        if (camp?.id) {
          await supabase.from('campaign_recipients').insert(
            (data.results ?? []).map((r: any) => ({
              campaign_id: camp.id, name: r.name, email: r.email,
              status: r.ok ? 'sent' : 'failed', error: r.error ?? null,
            })),
          )
        }
        const { data: hist } = await supabase.from('campaigns').select('*').order('created_at', { ascending: false }).limit(20)
        setHistory((hist as any) ?? [])
      } catch { /* logging tables optional */ }
      showToast(`${data.sent} mails sent ✓${data.failed ? `, ${data.failed} failed` : ''}`)
    } catch (e: any) {
      alert(e.message === 'NOT_DEPLOYED'
        ? 'Edge function not deployed yet.\nRun in terminal:\n  supabase functions deploy send-campaign\n  supabase functions deploy send-client-notice'
        : `Send failed: ${e.message ?? e}`)
    }
    setSending(false)
  }

  const openHistory = async (id: string) => {
    if (expanded === id) { setExpanded(null); return }
    setExpanded(id)
    setExpandLoading(true)
    try {
      const { data } = await supabase.from('campaign_recipients').select('email, name, status, error').eq('campaign_id', id).limit(500)
      setExpandRows((data as any) ?? [])
    } catch {
      setExpandRows([])
    }
    setExpandLoading(false)
  }

  const exportFailures = () => {
    if (!result || result.failures.length === 0) return
    const csv = ['email,name,error', ...result.failures.map((f) => `${f.email},"${f.name}","${(f.error ?? '').replace(/"/g, "'")}"`)].join('\n')
    const a = document.createElement('a')
    a.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv' }))
    a.download = 'campaign-failures.csv'
    a.click()
  }

  if (loading) return <div className="flex items-center justify-center h-64"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-brand-600" /></div>

  const counts = {
    Clients: audience.filter((m) => m.source === 'Clients').length,
    Networking: audience.filter((m) => m.source === 'Networking').length,
    Leads: audience.filter((m) => m.source === 'Leads').length,
  }

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-brand-600 text-white flex items-center justify-center">
            <Megaphone className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900 tracking-tight">Email Campaigns</h1>
            <p className="text-xs text-gray-500">One-click AISE 360 branded mails to everyone — clients, networking contacts & leads</p>
          </div>
        </div>
        <div className="flex gap-2">
          <button onClick={handleTest} disabled={testing} className="btn-secondary text-xs flex items-center gap-1.5">
            {testing ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <FlaskConical className="w-3.5 h-3.5" />}
            {testing ? 'Sending test...' : 'Send Test to Me'}
          </button>
          <button onClick={handleSendAll} disabled={sending || uniqueSelected === 0} className="btn-primary text-xs flex items-center gap-1.5 !px-5 !py-2.5 !text-sm">
            {sending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
            {sending ? 'Sending...' : `Send to All (${uniqueSelected})`}
          </button>
        </div>
      </div>

      {/* Audience stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { label: 'Clients', value: counts.Clients },
          { label: 'Networking', value: counts.Networking },
          { label: 'CRM Leads', value: counts.Leads },
          { label: 'Selected (unique emails)', value: uniqueSelected },
        ].map((s) => (
          <div key={s.label} className="card p-3 text-center">
            <p className="text-[11px] text-gray-500 uppercase tracking-wide">{s.label}</p>
            <p className="text-xl font-bold text-gray-900">{s.value}</p>
          </div>
        ))}
      </div>

      {/* Result banner */}
      {result && (
        <div className={`card p-4 flex items-center gap-3 flex-wrap ${result.failed === 0 ? 'border-green-200 bg-green-50/60' : 'border-amber-200 bg-amber-50/60'}`}>
          {result.failed === 0
            ? <CheckCircle2 className="w-5 h-5 text-green-600" />
            : <XCircle className="w-5 h-5 text-amber-600" />}
          <p className="text-sm font-semibold text-gray-900">
            {result.sent} sent{result.failed > 0 && `, ${result.failed} failed`}
          </p>
          {result.failures.length > 0 && (
            <button onClick={exportFailures} className="ml-auto btn-secondary text-xs flex items-center gap-1.5">
              <Download className="w-3.5 h-3.5" /> Failed CSV
            </button>
          )}
        </div>
      )}

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-5 items-start">
        {/* LEFT: compose + audience */}
        <div className="space-y-5">
          <div className="card p-5 space-y-4">
            <h2 className="font-semibold text-gray-900 text-sm">✉️ Compose Mail</h2>
            <div>
              <label className="label">Subject * <span className="text-gray-400 font-normal">(supports {'{{name}}'} {'{{company}}'})</span></label>
              <input className="input" value={subject} onChange={(e) => setSubject(e.target.value)} />
            </div>
            <div>
              <label className="label">Headline *</label>
              <input className="input" value={headline} onChange={(e) => setHeadline(e.target.value)} />
            </div>
            <div>
              <label className="label">Message *</label>
              <textarea className="input" rows={6} value={message} onChange={(e) => setMessage(e.target.value)} />
            </div>
            <div>
              <label className="label">Button Text</label>
              <input className="input" value={cta} onChange={(e) => setCta(e.target.value)} />
            </div>
            <div>
              <label className="label">What AISE Provides (included sections)</label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
                {AISE_SERVICES.map((s) => (
                  <label key={s.title} className={`flex items-start gap-2 text-xs p-2 rounded-lg border cursor-pointer transition-colors ${servicesOn.has(s.title) ? 'border-brand-300 bg-brand-50/50' : 'border-gray-200 opacity-60'}`}>
                    <input type="checkbox" checked={servicesOn.has(s.title)} onChange={() => toggleService(s.title)} className="mt-0.5 accent-brand-600" />
                    <span><strong>{s.title}</strong><br /><span className="text-gray-500">{s.desc}</span></span>
                  </label>
                ))}
              </div>
            </div>
          </div>

          <div className="card p-5 space-y-3">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <h2 className="font-semibold text-gray-900 text-sm flex items-center gap-1.5">
                <Users className="w-4 h-4 text-brand-600" /> Audience ({uniqueSelected} selected)
              </h2>
              <label className="flex items-center gap-1.5 text-[11px] text-gray-500 cursor-pointer">
                <input type="checkbox" checked={showSelectedOnly} onChange={(e) => setShowSelectedOnly(e.target.checked)} className="accent-brand-600" />
                Show selected only
              </label>
            </div>
            {/* One-click select bar */}
            <div className="flex gap-2">
              <button onClick={() => selectGroup('all', true)} className="flex-1 btn-primary !py-2.5 text-sm flex items-center justify-center gap-2">
                <CheckCircle2 className="w-4 h-4" /> Select All ({audience.length})
              </button>
              <button onClick={() => selectGroup('all', false)} className="btn-secondary !py-2.5 text-sm">
                Clear
              </button>
            </div>
            <div className="flex gap-1.5 flex-wrap">
              {(['all', 'Clients', 'Networking', 'Leads'] as const).map((t) => (
                <button key={t} onClick={() => setSourceTab(t)} className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-colors ${sourceTab === t ? 'bg-brand-600 text-white border-brand-600' : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50'}`}>
                  {t === 'all' ? `All (${audience.length})` : `${t} (${counts[t as keyof typeof counts]})`}
                </button>
              ))}
              <input className="input !w-auto flex-1 min-w-[140px] text-xs ml-auto" placeholder="Filter by name, company, email..." value={search} onChange={(e) => setSearch(e.target.value)} />
            </div>
            {(sourceTab === 'all' ? (['Clients', 'Networking', 'Leads'] as const) : [sourceTab]).map((group) => {
              const rows = filtered.filter((m) => m.source === group)
              if (rows.length === 0) return null
              const groupTotal = audience.filter((m) => m.source === group).length
              const groupOn = audience.filter((m) => m.source === group).every((m) => selected.has(m.key))
              return (
                <div key={group}>
                  <div className="flex items-center justify-between mt-1 mb-1.5">
                    <p className="text-[11px] font-bold text-gray-400 uppercase tracking-wide">
                      {group} ({rows.length}{rows.length !== groupTotal ? ` of ${groupTotal}` : ''})
                    </p>
                    <button onClick={() => selectGroup(group, !groupOn)} className="text-[11px] text-brand-600 hover:underline font-medium">
                      {groupOn ? 'Deselect group' : `Select all ${group}`}
                    </button>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-72 overflow-y-auto pr-0.5">
                    {rows.map((m) => {
                      const on = selected.has(m.key)
                      const initials = m.name.split(' ').map((w) => w[0]).slice(0, 2).join('').toUpperCase()
                      return (
                        <button
                          key={m.key}
                          onClick={() => toggle(m.key)}
                          className={`flex items-center gap-2.5 p-2.5 rounded-xl border-2 text-left transition-all ${on ? 'border-brand-500 bg-brand-50/60 shadow-sm' : 'border-gray-200 bg-white hover:border-gray-300'}`}
                        >
                          <div className={`w-9 h-9 rounded-full flex items-center justify-center font-bold text-[11px] shrink-0 ${on ? 'bg-brand-600 text-white' : 'bg-gray-100 text-gray-500'}`}>
                            {initials}
                          </div>
                          <div className="min-w-0 flex-1">
                            <p className="text-xs font-semibold text-gray-900 truncate">{m.name}</p>
                            <p className="text-[11px] text-gray-500 truncate">{m.company}</p>
                            <p className="text-[11px] text-gray-400 truncate">{m.email}</p>
                          </div>
                          {on
                            ? <CheckCircle2 className="w-5 h-5 text-brand-600 shrink-0" />
                            : <div className="w-5 h-5 rounded-full border-2 border-gray-300 shrink-0" />}
                        </button>
                      )
                    })}
                  </div>
                </div>
              )
            })}
            {filtered.length === 0 && <p className="text-xs text-gray-400 text-center py-6">No audience found. Add clients, networking contacts or leads first.</p>}
          </div>
        </div>

        {/* RIGHT: live preview */}
        <div className="space-y-3 xl:sticky xl:top-4">
          <button onClick={() => setShowPreview(!showPreview)} className="flex items-center gap-1.5 text-xs font-semibold text-gray-700">
            <Eye className="w-4 h-4 text-brand-600" /> Live Template Preview
            <ChevronDown className={`w-3.5 h-3.5 transition-transform ${showPreview ? '' : '-rotate-90'}`} />
          </button>
          {showPreview && (
            <div className="rounded-xl overflow-hidden border border-gray-200 shadow-sm bg-[#111623]">
              <iframe
                title="Campaign preview"
                className="w-full bg-white"
                style={{ height: 640 }}
                srcDoc={previewHtml({ name: 'Rahul', headline, message, cta, services: selectedServices })}
              />
            </div>
          )}
          <p className="text-[11px] text-gray-400 leading-relaxed">
            Preview shows the exact Resend template design — dark AISE 360 header, services grid, help contacts & footer.
            {'{{name}}'} and {'{{company}}'} in subject/message auto-fill per recipient when sending.
          </p>
        </div>
      </div>

      {/* History */}
      {history.length > 0 && (
        <div className="card overflow-hidden">
          <div className="px-5 py-4 border-b border-gray-200">
            <h2 className="font-semibold text-gray-900 text-sm">Past Campaigns ({history.length})</h2>
          </div>
          <div className="divide-y divide-gray-100">
            {history.map((c) => (
              <div key={c.id}>
                <button onClick={() => openHistory(c.id)} className="w-full flex items-center gap-3 px-5 py-3 hover:bg-gray-50 text-left">
                  <Megaphone className="w-4 h-4 text-brand-600 shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900 truncate">{c.subject}</p>
                    <p className="text-[11px] text-gray-400">{new Date(c.created_at).toLocaleString('en-IN', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })} · {c.audience_count} mails</p>
                  </div>
                  <span className="text-xs font-semibold text-green-600">{c.sent_count} sent</span>
                  {c.failed_count > 0 && <span className="text-xs font-semibold text-red-500">{c.failed_count} failed</span>}
                  <X className={`w-4 h-4 text-gray-300 transition-transform ${expanded === c.id ? '' : 'rotate-45'}`} />
                </button>
                {expanded === c.id && (
                  <div className="px-5 pb-4 pl-12">
                    {expandLoading ? (
                      <p className="text-xs text-gray-400 flex items-center gap-2"><Loader2 className="w-3.5 h-3.5 animate-spin" /> Loading...</p>
                    ) : expandRows.length === 0 ? (
                      <p className="text-xs text-gray-400">No per-recipient log saved for this campaign.</p>
                    ) : (
                      <div className="border border-gray-200 rounded-lg divide-y divide-gray-100 max-h-48 overflow-y-auto">
                        {expandRows.map((r, i) => (
                          <div key={i} className="flex items-center gap-2 px-3 py-1.5 text-xs">
                            {r.status === 'sent'
                              ? <CheckCircle2 className="w-3.5 h-3.5 text-green-500 shrink-0" />
                              : <XCircle className="w-3.5 h-3.5 text-red-500 shrink-0" />}
                            <span className="font-medium text-gray-800 truncate">{r.email}</span>
                            {r.error && <span className="text-red-400 truncate">· {r.error}</span>}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {toast && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-[60] bg-gray-900 text-white text-sm font-medium px-4 py-2.5 rounded-full shadow-lg">
          {toast}
        </div>
      )}
    </div>
  )
}
