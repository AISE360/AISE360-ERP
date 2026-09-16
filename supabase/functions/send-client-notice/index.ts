// ============================================================
// Supabase Edge Function: send-client-notice
// Called manually from the app when founder clicks
// "Send Renewal Notice" on a client card.
// Body: { client_name, client_email, items: [{title, due_date, description}] }
// Uses the shared AISE 360 premium template (renewal mode).
// ============================================================

import { buildRenewalEmail } from '../_shared/aise-template.ts'

const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY')!

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
    }})
  }

  try {
    const { client_name, client_email, items } = await req.json() as {
      client_name: string
      client_email: string
      items: { title: string; due_date: string; description?: string }[]
    }

    if (!client_email || !items?.length) {
      return new Response(JSON.stringify({ error: 'client_email and items are required' }), {
        status: 400, headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }
      })
    }

    const { html, text, subject } = buildRenewalEmail({ name: client_name, items })

    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${RESEND_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: 'AISE 360 <notifications@aise360.com>',
        to: [client_email],
        reply_to: 'contact@aise360.com',
        subject,
        html,
        text,
      }),
    })

    const data = await res.json()
    if (!res.ok) throw new Error(`Resend error: ${JSON.stringify(data)}`)

    return new Response(JSON.stringify({ sent: true, email: client_email, id: data.id }), {
      headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }
    })

  } catch (err) {
    console.error(err)
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 500,
      headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }
    })
  }
})
