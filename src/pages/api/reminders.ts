import type { APIRoute } from 'astro';
import { createClient } from '@supabase/supabase-js';
import { Resend } from 'resend';

export const prerender = false;

export const GET: APIRoute = async ({ request }) => {
  const secret = import.meta.env.CRON_SECRET;
  if (!secret || request.headers.get('authorization') !== `Bearer ${secret}`) {
    return new Response('Unauthorized', { status: 401 });
  }
  const url = import.meta.env.PUBLIC_SUPABASE_URL;
  const serviceKey = import.meta.env.SUPABASE_SERVICE_ROLE_KEY;
  const resendKey = import.meta.env.RESEND_API_KEY;
  const from = import.meta.env.EMAIL_FROM;
  if (!url || !serviceKey || !resendKey || !from) {
    return new Response('Missing environment variables', { status: 500 });
  }

  const supabase = createClient(url, serviceKey, { auth: { persistSession: false } });
  const resend = new Resend(resendKey);
  const now = new Date();
  const due = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() + 3));
  const targetDate = `${due.getUTCFullYear()}-${String(due.getUTCMonth()+1).padStart(2,'0')}-${String(due.getUTCDate()).padStart(2,'0')}`;

  const { data: tasks, error } = await supabase.from('tasks')
    .select('id, user_id, subject, title, due_date, notes, reminder_sent_at, completed')
    .eq('due_date', targetDate).eq('completed', false).is('reminder_sent_at', null);
  if (error) return new Response(`Database error: ${error.message}`, { status: 500 });

  let sent = 0;
  const errors: string[] = [];
  for (const task of tasks ?? []) {
    const { data: userData, error: userError } = await supabase.auth.admin.getUserById(task.user_id);
    if (userError || !userData.user?.email) { errors.push(`${task.id}: no user email`); continue; }
    const email = userData.user.email;
    const subject = `Recordatorio de entrega: ${task.subject} — ${task.title}`;
    const text = `Hola,\n\nTe recordamos que faltan 3 días para la entrega.\n\nAsignatura: ${task.subject}\nTarea: ${task.title}\nFecha límite: ${task.due_date}${task.notes ? `\nNotas: ${task.notes}` : ''}\n\n¡Ánimo!`;
    const { error: sendError } = await resend.emails.send({ from, to: [email], subject, text });
    if (sendError) { errors.push(`${task.id}: ${sendError.message}`); continue; }
    const { error: updateError } = await supabase.from('tasks').update({ reminder_sent_at: new Date().toISOString() }).eq('id', task.id).is('reminder_sent_at', null);
    if (updateError) errors.push(`${task.id}: email sent but flag update failed`); else sent++;
  }
  return Response.json({ ok: errors.length === 0, targetDate, sent, errors });
};
