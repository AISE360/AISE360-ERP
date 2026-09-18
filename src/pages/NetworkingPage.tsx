import { useEffect, useMemo, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { useAuthStore } from '@/store/authStore'
import { BNI_CONTACTS_SEED, BNI_TEAMS, DEFAULT_MEETS, type BNIContactSeed } from '@/data/bniContacts'
import {
  Users, Search, Plus, Phone, Mail, MessageCircle, Download,
  TrendingUp, UserPlus, CheckCircle, X, Loader2, Network, Filter, CalendarPlus,
} from 'lucide-react'

// Generic networking contact - works for BNI meets AND any future meet/event.
type NetStatus = 'new' | 'contacted' | 'follow-up' | 'in-crm' | 'in-clients' | 'not-interested'

interface NetContact extends BNIContactSeed {
  id: string
  status: NetStatus
  notes: string
}

const STATUS_META: Record<NetStatus, { label: string; cls: string }> = {
  'new': { label: 'New', cls: 'bg-gray-100 text-gray-700' },
  'contacted': { label: 'Contacted', cls: 'bg-blue-100 text-blue-700' },
  'follow-up': { label: 'Follow-Up', cls: 'bg-yellow-100 text-yellow-700' },
  'in-crm': { label: 'In CRM', cls: 'bg-purple-100 text-purple-700' },
  'in-clients': { label: 'In Clients', cls: 'bg-green-100 text-green-700' },
  'not-interested': { label: 'Not Interested', cls: 'bg-red-100 text-red-700' },
}

const LS_KEY = 'networking-contacts-state-v1'
const LEGACY_LS_KEY = 'bni-contacts-state-v1'
const MEETS_KEY = 'networking-meets-v1'

function seedToContacts(): NetContact[] {
  return BNI_CONTACTS_SEED.map((s, i) => ({
    ...s,
    meet: s.meet ?? 'BNI Meet',
    id: `seed-${(s.meet ?? 'BNI Meet').replace(/\s+/g, '-').toLowerCase()}-${s.team}-${i}`,
    status: 'new' as NetStatus,
    notes: '',
  }))
}

function readJSON(key: string, fallback: any): any {
  try {
    const raw = localStorage.getItem(key)
    return raw ? JSON.parse(raw) : fallback
  } catch {
    return fallback
  }
}

function waNumber(phone: string): string {
  const digits = phone.replace(/\D/g, '')
  if (digits.length === 10) return `91${digits}`
  return digits
}

export default function NetworkingPage() {
  const { user } = useAuthStore()
  const [contacts, setContacts] = useState<NetContact[]>(seedToContacts())
  const [meets, setMeets] = useState<string[]>(DEFAULT_MEETS)
  const [search, setSearch] = useState('')
  const [meetFilter, setMeetFilter] = useState<string>('all')
  const [teamFilter, setTeamFilter] = useState<number | 0>(0)
  const [statusFilter, setStatusFilter] = useState<NetStatus | 'all'>('all')
  const [loading, setLoading] = useState(true)
  const [busyId, setBusyId] = useState<string | null>(null)
  const [bulkBusy, setBulkBusy] = useState(false)
  const [showAdd, setShowAdd] = useState(false)
  const [showMeet, setShowMeet] = useState(false)
  const [meetDraft, setMeetDraft] = useState('')
  const [editNote, setEditNote] = useState<NetContact | null>(null)
  const [noteDraft, setNoteDraft] = useState('')
  const [newForm, setNewForm] = useState({ name: '', company: '', email: '', phone: '', team: 1, meet: 'BNI Meet', newMeet: '' })
  const [toast, setToast] = useState<string | null>(null)

  // Load persisted status/notes + custom meets + try supabase table (graceful fallback to seed)
  useEffect(() => {
    const run = async () => {
      const overlay = { ...readJSON(LEGACY_LS_KEY, {}), ...readJSON(LS_KEY, {}) }
      const customMeets: string[] = readJSON(MEETS_KEY, [])
      let base = seedToContacts()
      try {
        const { data, error } = await supabase.from('bni_contacts').select('*')
        if (!error && data && data.length > 0) {
          base = (data as any[]).map((r) => ({
            id: r.id,
            name: r.name,
            company: r.company_name ?? r.company ?? '',
            email: r.email ?? '',
            emails: (r.email ?? '').split(',').map((e: string) => e.trim()).filter(Boolean),
            phone: r.phone ?? '',
            phones: (r.phone ?? '').split(',').map((p: string) => p.trim()).filter(Boolean),
            team: Number(r.power_team ?? r.team ?? 1),
            meet: r.meet_name ?? r.meet ?? 'BNI Meet',
            status: (r.status ?? 'new') as NetStatus,
            notes: r.notes ?? '',
          }))
        }
      } catch {
        // table may not exist yet - fall back to seed data
      }
      const keyOf = (ct: NetContact) => `${ct.meet}|${ct.name}|${ct.company}`
      const merged = base.map((ct) => {
        const ov = overlay[keyOf(ct)] ?? overlay[`${ct.name}|${ct.company}`] ?? overlay[ct.id]
        return ov ? { ...ct, status: ov.status ?? ct.status, notes: ov.notes ?? ct.notes } : ct
      })
      // include manually added contacts stored only in overlay
      const known = new Set(merged.map(keyOf))
      Object.entries(overlay).forEach(([key, v]: any) => {
        if (key.startsWith('custom|') && v && typeof v === 'object') {
          // legacy: custom|Name|Company  |  new: custom|Meet|Name|Company
          const parts = key.split('|')
          let meet = 'BNI Meet', name = '', company = ''
          if (parts.length >= 4) { meet = parts[1]; name = parts[2]; company = parts.slice(3).join('|') }
          else if (parts.length === 3) { name = parts[1]; company = parts[2]; meet = v.meet ?? 'BNI Meet' }
          if (name && company && !known.has(`${meet}|${name}|${company}`)) {
            merged.push({
              id: `custom-${merged.length}`,
              name, company,
              email: v.email ?? '', emails: v.email ? [v.email] : [],
              phone: v.phone ?? '', phones: v.phone ? [v.phone] : [],
              team: v.team ?? 1, meet: v.meet ?? meet,
              status: v.status ?? 'new', notes: v.notes ?? '',
            })
          }
        }
      })
      const allMeets = Array.from(new Set([...DEFAULT_MEETS, ...customMeets, ...merged.map((m) => m.meet)]))
      setMeets(allMeets)
      setContacts(merged)
      setLoading(false)
    }
    run()
  }, [])

  const persist = (list: NetContact[], meetList: string[] = meets) => {
    setContacts(list)
    try {
      const overlay: Record<string, any> = readJSON(LS_KEY, {})
      list.forEach((ct) => {
        if (ct.id.startsWith('custom-') || ct.id.startsWith('seed-')) {
          overlay[`${ct.meet}|${ct.name}|${ct.company}`] = { status: ct.status, notes: ct.notes }
          if (ct.id.startsWith('custom-')) {
            overlay[`custom|${ct.meet}|${ct.name}|${ct.company}`] = {
              status: ct.status, notes: ct.notes, email: ct.email, phone: ct.phone, team: ct.team, meet: ct.meet,
            }
          }
        }
      })
      localStorage.setItem(LS_KEY, JSON.stringify(overlay))
      localStorage.setItem(MEETS_KEY, JSON.stringify(meetList.filter((m) => !DEFAULT_MEETS.includes(m))))
    } catch { /* ignore */ }
  }

  const showToast = (msg: string) => {
    setToast(msg)
    setTimeout(() => setToast(null), 2600)
  }

  const setStatus = async (ct: NetContact, status: NetStatus) => {
    persist(contacts.map((c) => (c.id === ct.id ? { ...c, status } : c)))
    try {
      await supabase.from('bni_contacts').update({ status }).eq('id', ct.id)
    } catch { /* table optional */ }
  }

  const saveNote = () => {
    if (!editNote) return
    persist(contacts.map((c) => (c.id === editNote.id ? { ...c, notes: noteDraft } : c)))
    setEditNote(null)
    showToast('Note saved')
  }

  // ── Automation: push single contact to CRM leads ──
  const pushToCRM = async (ct: NetContact) => {
    if (!user) { alert('Login required'); return }
    setBusyId(ct.id)
    try {
      const { error } = await supabase.from('leads').insert({
        company_name: ct.company,
        contact_person: ct.name,
        phone: ct.phone || null,
        email: ct.email || null,
        status: 'lead',
        notes: `${ct.meet}${ct.team ? ` - Group ${ct.team}` : ''}${ct.notes ? ' - ' + ct.notes : ''}`,
        created_by: user.id,
        updated_at: new Date().toISOString(),
      })
      if (error) throw error
      await setStatus(ct, 'in-crm')
      showToast(`${ct.company} → CRM Leads ✓`)
    } catch (e: any) {
      alert(`Could not add to CRM: ${e.message ?? e}`)
    }
    setBusyId(null)
  }

  // ── Automation: push single contact to Clients ──
  const pushToClients = async (ct: NetContact) => {
    setBusyId(ct.id)
    try {
      const { error } = await supabase.from('clients').insert({
        company_name: ct.company,
        contact_person: ct.name,
        phone: ct.phone || '-',
        email: ct.email || `${(ct.phone || 'nomeet').replace(/\D/g, '')}@networking.local`,
        notes: `${ct.meet}${ct.team ? ` - Group ${ct.team}` : ''}${ct.notes ? ' - ' + ct.notes : ''}`,
      })
      if (error) throw error
      await setStatus(ct, 'in-clients')
      showToast(`${ct.company} → Clients ✓`)
    } catch (e: any) {
      alert(`Could not add to Clients: ${e.message ?? e}`)
    }
    setBusyId(null)
  }

  // ── Automation: import ALL filtered contacts into CRM as leads (skips dupes by company) ──
  const importAllToCRM = async () => {
    if (!user) { alert('Login required'); return }
    const targets = filtered.filter((c) => c.status === 'new' || c.status === 'contacted' || c.status === 'follow-up')
    if (targets.length === 0) { alert('Nothing new to import - all filtered contacts are already processed.'); return }
    if (!confirm(`Add ${targets.length} contacts to CRM Leads?`)) return
    setBulkBusy(true)
    try {
      const { data: existing } = await supabase.from('leads').select('company_name')
      const existingSet = new Set((existing ?? []).map((l: any) => l.company_name.toLowerCase()))
      const fresh = targets.filter((t) => !existingSet.has(t.company.toLowerCase()))
      if (fresh.length === 0) { alert('All these companies already exist in CRM.'); setBulkBusy(false); return }
      const payload = fresh.map((ct) => ({
        company_name: ct.company,
        contact_person: ct.name,
        phone: ct.phone || null,
        email: ct.email || null,
        status: 'lead',
        notes: `${ct.meet} - bulk import`,
        created_by: user.id,
        updated_at: new Date().toISOString(),
      }))
      const { error } = await supabase.from('leads').insert(payload)
      if (error) throw error
      const ids = new Set(fresh.map((f) => f.id))
      persist(contacts.map((c) => (ids.has(c.id) ? { ...c, status: 'in-crm' as NetStatus } : c)))
      showToast(`${fresh.length} contacts imported to CRM ✓`)
    } catch (e: any) {
      alert(`Bulk import failed: ${e.message ?? e}`)
    }
    setBulkBusy(false)
  }

  const exportCSV = () => {
    const rows = [['Meet', 'Name', 'Company', 'Email', 'Phone', 'Group', 'Status', 'Notes']]
    filtered.forEach((ct) => rows.push([
      `"${ct.meet}"`, `"${ct.name}"`, `"${ct.company}"`, ct.emails.join('; '), ct.phones.join('; '),
      `${ct.team}`, STATUS_META[ct.status].label, `"${(ct.notes ?? '').replace(/"/g, "'")}"`,
    ]))
    const blob = new Blob([rows.map((r) => r.join(',')).join('\n')], { type: 'text/csv' })
    const a = document.createElement('a')
    a.href = URL.createObjectURL(blob)
    a.download = `networking-${meetFilter === 'all' ? 'all-meets' : meetFilter.replace(/\s+/g, '-').toLowerCase()}.csv`
    a.click()
    showToast('CSV exported ✓')
  }

  const addMeet = (e: React.FormEvent) => {
    e.preventDefault()
    const name = meetDraft.trim()
    if (!name) return
    if (meets.some((m) => m.toLowerCase() === name.toLowerCase())) {
      setMeetFilter(name)
    } else {
      const next = [...meets, name]
      setMeets(next)
      persist(contacts, next)
      setMeetFilter(name)
    }
    setNewForm((f) => ({ ...f, meet: name }))
    setMeetDraft('')
    setShowMeet(false)
    showToast(`Meet "${name}" ready - now add contacts to it ✓`)
  }

  const addManual = (e: React.FormEvent) => {
    e.preventDefault()
    if (!newForm.name || !newForm.company) return
    const meet = newForm.newMeet.trim() || newForm.meet
    if (!meet) return
    const ct: NetContact = {
      id: `custom-${Date.now()}`,
      name: newForm.name, company: newForm.company,
      email: newForm.email.trim().toLowerCase(), emails: newForm.email ? [newForm.email.trim().toLowerCase()] : [],
      phone: newForm.phone.trim().replace(/\s+/g, ''), phones: newForm.phone ? [newForm.phone.trim().replace(/\s+/g, '')] : [],
      team: newForm.team, meet, status: 'new', notes: '',
    }
    let nextMeets = meets
    if (!meets.includes(meet)) nextMeets = [...meets, meet]
    setMeets(nextMeets)
    persist([ct, ...contacts], nextMeets)
    setNewForm({ name: '', company: '', email: '', phone: '', team: 1, meet, newMeet: '' })
    setShowAdd(false)
    showToast(`Contact added to ${meet} ✓`)
  }

  const filtered = useMemo(() => {
    const q = search.toLowerCase().trim()
    return contacts.filter((ct) => {
      if (meetFilter !== 'all' && ct.meet !== meetFilter) return false
      if (teamFilter !== 0 && ct.team !== teamFilter) return false
      if (statusFilter !== 'all' && ct.status !== statusFilter) return false
      if (!q) return true
      return (
        ct.name.toLowerCase().includes(q) ||
        ct.company.toLowerCase().includes(q) ||
        ct.email.toLowerCase().includes(q) ||
        ct.phone.includes(q)
      )
    })
  }, [contacts, search, meetFilter, teamFilter, statusFilter])

  const stats = useMemo(() => ({
    total: contacts.length,
    meetCount: meets.length,
    fresh: contacts.filter((c) => c.status === 'new').length,
    contacted: contacts.filter((c) => ['contacted', 'follow-up'].includes(c.status)).length,
    inCRM: contacts.filter((c) => c.status === 'in-crm').length,
    inClients: contacts.filter((c) => c.status === 'in-clients').length,
  }), [contacts, meets])

  if (loading) {
    return <div className="flex items-center justify-center h-64"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-brand-600" /></div>
  }

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-2">
          <Network className="w-5 h-5 text-brand-600" />
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Networking</h1>
            <p className="text-xs text-gray-500">{stats.total} contacts across {stats.meetCount} meet{stats.meetCount === 1 ? '' : 's'} • BNI + all future meets</p>
          </div>
        </div>
        <div className="flex gap-2 flex-wrap">
          <button onClick={exportCSV} className="btn-secondary flex items-center gap-2 text-xs">
            <Download className="w-4 h-4" /> Export CSV
          </button>
          <button onClick={importAllToCRM} disabled={bulkBusy} className="btn-secondary flex items-center gap-2 text-xs border-purple-200 bg-purple-50 text-purple-700 hover:bg-purple-100">
            {bulkBusy ? <Loader2 className="w-4 h-4 animate-spin" /> : <TrendingUp className="w-4 h-4" />}
            {bulkBusy ? 'Importing...' : 'Import All → CRM'}
          </button>
          <button onClick={() => setShowMeet(true)} className="btn-secondary flex items-center gap-2 text-xs">
            <CalendarPlus className="w-4 h-4" /> New Meet
          </button>
          <button onClick={() => setShowAdd(true)} className="btn-primary flex items-center gap-2 text-xs">
            <Plus className="w-4 h-4" /> Add Contact
          </button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-6 gap-3">
        {[
          { label: 'Meets', value: stats.meetCount, cls: 'text-brand-600' },
          { label: 'Total Contacts', value: stats.total, cls: 'text-gray-900' },
          { label: 'New', value: stats.fresh, cls: 'text-gray-600' },
          { label: 'Contacted', value: stats.contacted, cls: 'text-blue-600' },
          { label: 'In CRM', value: stats.inCRM, cls: 'text-purple-600' },
          { label: 'In Clients', value: stats.inClients, cls: 'text-green-600' },
        ].map((s) => (
          <div key={s.label} className="card p-3 text-center">
            <p className="text-[11px] text-gray-500 uppercase tracking-wide">{s.label}</p>
            <p className={`text-xl font-bold ${s.cls}`}>{s.value}</p>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="space-y-2">
        <div className="flex gap-1.5 flex-wrap items-center">
          <span className="text-[11px] font-bold text-gray-400 uppercase tracking-wide mr-1">Meet:</span>
          <button onClick={() => setMeetFilter('all')} className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-colors ${meetFilter === 'all' ? 'bg-gray-900 text-white border-gray-900' : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50'}`}>
            All ({contacts.length})
          </button>
          {meets.map((m) => {
            const n = contacts.filter((c) => c.meet === m).length
            return (
              <button key={m} onClick={() => { setMeetFilter(meetFilter === m ? 'all' : m); setTeamFilter(0) }} className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-colors ${meetFilter === m ? 'bg-brand-600 text-white border-brand-600' : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50'}`}>
                {m} ({n})
              </button>
            )
          })}
        </div>
        <div className="flex gap-2 flex-wrap items-center">
          <div className="relative flex-1 min-w-[200px] max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input className="input pl-9" placeholder="Search name, company, email, phone..." value={search} onChange={(e) => setSearch(e.target.value)} />
          </div>
          <div className="flex gap-1.5 flex-wrap">
            <button onClick={() => setTeamFilter(0)} className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-colors ${teamFilter === 0 ? 'bg-brand-600 text-white border-brand-600' : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50'}`}>
              All Groups
            </button>
            {BNI_TEAMS.map((t) => {
              const scope = meetFilter === 'all' ? contacts : contacts.filter((c) => c.meet === meetFilter)
              const n = scope.filter((c) => c.team === t.id).length
              if (n === 0) return null
              return (
                <button key={t.id} onClick={() => setTeamFilter(teamFilter === t.id ? 0 : t.id)} className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-colors ${teamFilter === t.id ? 'bg-brand-600 text-white border-brand-600' : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50'}`}>
                  Group {t.id} ({n})
                </button>
              )
            })}
          </div>
          <div className="flex items-center gap-1.5 ml-auto">
            <Filter className="w-3.5 h-3.5 text-gray-400" />
            <select className="input !w-auto text-xs" value={statusFilter} onChange={(e) => setStatusFilter(e.target.value as any)}>
              <option value="all">All status</option>
              {(Object.keys(STATUS_META) as NetStatus[]).map((s) => (
                <option key={s} value={s}>{STATUS_META[s].label}</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {filtered.map((ct) => {
          const team = BNI_TEAMS.find((t) => t.id === ct.team)
          const busy = busyId === ct.id
          return (
            <div key={ct.id} className="card p-4 flex flex-col">
              <div className="flex items-start justify-between gap-2 mb-2">
                <div className="flex items-center gap-2.5 min-w-0">
                  <div className="w-9 h-9 rounded-full bg-brand-100 text-brand-700 flex items-center justify-center font-bold text-xs shrink-0">
                    {ct.company.slice(0, 2).toUpperCase()}
                  </div>
                  <div className="min-w-0">
                    <p className="font-semibold text-sm text-gray-900 truncate">{ct.company}</p>
                    <p className="text-xs text-gray-500 truncate">{ct.name}</p>
                  </div>
                </div>
                <div className="flex flex-col items-end gap-1 shrink-0">
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-gray-900 text-white truncate max-w-[140px]" title={ct.meet}>{ct.meet}</span>
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${team?.color ?? ''}`}>G{ct.team}</span>
                </div>
              </div>

              <div className="text-xs text-gray-600 space-y-0.5 mb-2">
                <p className="truncate">📞 {ct.phones.join(' / ') || '-'}</p>
                <p className="truncate" title={ct.emails.join(', ')}>✉️ {ct.emails.join(', ') || '-'}</p>
              </div>

              {ct.notes && <p className="text-[11px] text-gray-500 bg-gray-50 rounded-lg p-2 mb-2 line-clamp-2">📝 {ct.notes}</p>}

              {/* quick reach */}
              <div className="flex gap-1.5 mb-2">
                {ct.phone && (
                  <>
                    <a href={`tel:${ct.phone}`} className="flex-1 flex items-center justify-center gap-1 px-2 py-1.5 rounded-lg bg-gray-100 hover:bg-gray-200 text-[11px] font-semibold text-gray-700">
                      <Phone className="w-3 h-3" /> Call
                    </a>
                    <a href={`https://wa.me/${waNumber(ct.phone)}?text=${encodeURIComponent(`Hi ${ct.name}, this is AISE 360 (Pune). Great connecting at ${ct.meet}! Would love to explore how we can work together.`)}`} target="_blank" rel="noreferrer" className="flex-1 flex items-center justify-center gap-1 px-2 py-1.5 rounded-lg bg-green-50 hover:bg-green-100 text-[11px] font-semibold text-green-700 border border-green-200">
                      <MessageCircle className="w-3 h-3" /> WhatsApp
                    </a>
                  </>
                )}
                {ct.email && (
                  <a href={`mailto:${ct.email}?subject=${encodeURIComponent(`Great connecting at ${ct.meet} - AISE 360`)}`} className="flex-1 flex items-center justify-center gap-1 px-2 py-1.5 rounded-lg bg-blue-50 hover:bg-blue-100 text-[11px] font-semibold text-blue-700 border border-blue-200">
                    <Mail className="w-3 h-3" /> Email
                  </a>
                )}
              </div>

              {/* automation */}
              <div className="grid grid-cols-2 gap-1.5 mb-2">
                <button onClick={() => pushToCRM(ct)} disabled={busy || ct.status === 'in-crm'} className="flex items-center justify-center gap-1 px-2 py-1.5 rounded-lg bg-purple-600 hover:bg-purple-700 disabled:opacity-40 text-white text-[11px] font-semibold">
                  {busy ? <Loader2 className="w-3 h-3 animate-spin" /> : <TrendingUp className="w-3 h-3" />}
                  {ct.status === 'in-crm' ? 'In CRM ✓' : 'To CRM'}
                </button>
                <button onClick={() => pushToClients(ct)} disabled={busy || ct.status === 'in-clients'} className="flex items-center justify-center gap-1 px-2 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 disabled:opacity-40 text-white text-[11px] font-semibold">
                  {busy ? <Loader2 className="w-3 h-3 animate-spin" /> : <UserPlus className="w-3 h-3" />}
                  {ct.status === 'in-clients' ? 'In Clients ✓' : 'To Clients'}
                </button>
              </div>

              <div className="flex items-center gap-1.5 mt-auto pt-2 border-t border-gray-100">
                <select
                  value={ct.status}
                  onChange={(e) => setStatus(ct, e.target.value as NetStatus)}
                  className={`text-[11px] font-semibold rounded-full px-2 py-1 border-0 cursor-pointer ${STATUS_META[ct.status].cls}`}
                >
                  {(Object.keys(STATUS_META) as NetStatus[]).map((s) => (
                    <option key={s} value={s}>{STATUS_META[s].label}</option>
                  ))}
                </select>
                <button onClick={() => { setEditNote(ct); setNoteDraft(ct.notes) }} className="ml-auto text-[11px] text-brand-600 hover:underline font-medium">
                  {ct.notes ? 'Edit note' : '+ Note'}
                </button>
              </div>
            </div>
          )
        })}
      </div>
      {filtered.length === 0 && (
        <div className="text-center py-16 text-gray-400">
          <Users className="w-10 h-10 mx-auto mb-2 opacity-30" />
          <p>No contacts match your filters</p>
          {meetFilter !== 'all' && contacts.filter((c) => c.meet === meetFilter).length === 0 && (
            <button onClick={() => setShowAdd(true)} className="mt-3 btn-primary text-xs">+ Add first contact to {meetFilter}</button>
          )}
        </div>
      )}

      {/* New Meet modal */}
      {showMeet && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-sm">
            <div className="flex items-center justify-between p-5 border-b">
              <h2 className="font-semibold flex items-center gap-2"><CalendarPlus className="w-4 h-4 text-brand-600" /> New Meet / Event</h2>
              <button onClick={() => setShowMeet(false)}><X className="w-5 h-5 text-gray-400" /></button>
            </div>
            <form onSubmit={addMeet} className="p-5 space-y-3">
              <div>
                <label className="label">Meet name *</label>
                <input className="input" value={meetDraft} onChange={(e) => setMeetDraft(e.target.value)} required placeholder="e.g. Rotary Meet, Expo 2026, BNI Meet Oct" />
              </div>
              <p className="text-[11px] text-gray-400">Creates a new group to store that meet's contacts. Your BNI contacts stay untouched.</p>
              <div className="flex gap-3 pt-1">
                <button type="button" onClick={() => setShowMeet(false)} className="btn-secondary flex-1">Cancel</button>
                <button type="submit" className="btn-primary flex-1">Create Meet</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Add modal */}
      {showAdd && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-5 border-b sticky top-0 bg-white">
              <h2 className="font-semibold">Add Contact</h2>
              <button onClick={() => setShowAdd(false)}><X className="w-5 h-5 text-gray-400" /></button>
            </div>
            <form onSubmit={addManual} className="p-5 space-y-3">
              <div>
                <label className="label">Meet / Event *</label>
                <select className="input" value={newForm.meet} onChange={(e) => setNewForm({ ...newForm, meet: e.target.value, newMeet: '' })}>
                  {meets.map((m) => <option key={m} value={m}>{m}</option>)}
                  <option value="__new">+ New meet...</option>
                </select>
              </div>
              {newForm.meet === '__new' && (
                <div><label className="label">New meet name *</label><input className="input" value={newForm.newMeet} onChange={(e) => setNewForm({ ...newForm, newMeet: e.target.value })} required placeholder="e.g. Rotary Meet" /></div>
              )}
              <div><label className="label">Name *</label><input className="input" value={newForm.name} onChange={(e) => setNewForm({ ...newForm, name: e.target.value })} required placeholder="Mr. Rahul Patil" /></div>
              <div><label className="label">Company *</label><input className="input" value={newForm.company} onChange={(e) => setNewForm({ ...newForm, company: e.target.value })} required /></div>
              <div className="grid grid-cols-2 gap-3">
                <div><label className="label">Phone</label><input className="input" value={newForm.phone} onChange={(e) => setNewForm({ ...newForm, phone: e.target.value })} /></div>
                <div><label className="label">Email</label><input type="email" className="input" value={newForm.email} onChange={(e) => setNewForm({ ...newForm, email: e.target.value })} /></div>
              </div>
              <div>
                <label className="label">Group (1-6)</label>
                <select className="input" value={newForm.team} onChange={(e) => setNewForm({ ...newForm, team: Number(e.target.value) })}>
                  {[1, 2, 3, 4, 5, 6].map((n) => <option key={n} value={n}>Group {n}</option>)}
                </select>
              </div>
              <div className="flex gap-3 pt-1">
                <button type="button" onClick={() => setShowAdd(false)} className="btn-secondary flex-1">Cancel</button>
                <button type="submit" className="btn-primary flex-1">Add</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Note modal */}
      {editNote && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md">
            <div className="flex items-center justify-between p-5 border-b">
              <h2 className="font-semibold text-sm">Note - {editNote.company}</h2>
              <button onClick={() => setEditNote(null)}><X className="w-5 h-5 text-gray-400" /></button>
            </div>
            <div className="p-5 space-y-3">
              <textarea className="input" rows={4} value={noteDraft} onChange={(e) => setNoteDraft(e.target.value)} placeholder={`Met at ${editNote.meet}, discussed...`} />
              <div className="flex gap-3">
                <button onClick={() => setEditNote(null)} className="btn-secondary flex-1">Cancel</button>
                <button onClick={saveNote} className="btn-primary flex-1 flex items-center justify-center gap-2"><CheckCircle className="w-4 h-4" /> Save</button>
              </div>
            </div>
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
