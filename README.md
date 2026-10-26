# Entrega — calendario de tareas Astro

Aplicación inicial de calendario mensual para organizar entregas por asignatura. Incluye registro/inicio de sesión con Supabase Auth, tareas privadas por usuario, edición/completado/eliminación y un endpoint programado que envía un recordatorio por email 3 días antes de la fecha límite.

## Stack
- Astro + adaptador de Vercel
- Supabase Auth + PostgreSQL con Row Level Security (RLS)
- Vercel Cron (una comprobación diaria)
- Resend para el correo

## 1. Requisitos
- Node.js 20.3 o superior recomendado.
- Cuenta en Vercel, Supabase y Resend.

## 2. Configurar Supabase
1. Crea un proyecto en https://supabase.com.
2. Abre **SQL Editor** y ejecuta el contenido de `supabase.sql`.
3. En **Authentication > Providers / Email**, configura el registro y la confirmación de correo según prefieras. Para pruebas puedes desactivar la confirmación, aunque en producción es más seguro mantenerla.
4. Copia la URL del proyecto y la clave publicable/anon desde **Project Settings > API**.
5. La clave `service_role` es privada: úsala solo en variables de entorno del servidor, nunca en el frontend.

## 3. Configurar Resend
1. Crea una API key en https://resend.com.
2. Para pruebas, puedes usar el remitente de prueba que permita tu cuenta. Para producción, verifica un dominio y utiliza una dirección de ese dominio como `EMAIL_FROM`.

## 4. Variables de entorno
Copia `.env.example` a `.env` y rellena las variables:

- `PUBLIC_SUPABASE_URL`
- `PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`
- `RESEND_API_KEY`
- `EMAIL_FROM`
- `CRON_SECRET` (cadena aleatoria larga)

En Vercel, configura las mismas variables en **Project > Settings > Environment Variables**. No subas `.env` al repositorio.

## 5. Ejecutar localmente
```bash
npm install
npm run dev
```

El endpoint `/api/reminders` requiere `CRON_SECRET` en el encabezado `Authorization: Bearer <CRON_SECRET>`. Para probarlo manualmente:

```bash
curl -H "Authorization: Bearer TU_CRON_SECRET" http://localhost:4321/api/reminders
```

Nota: en local la API de Astro puede no ejecutarse en el mismo puerto si cambias la configuración; utiliza la URL que indique el terminal.

## 6. Desplegar en Vercel
1. Sube el proyecto a un repositorio Git privado o público (sin secretos).
2. Importa el repositorio desde https://vercel.com/new.
3. Añade las variables de entorno en Vercel.
4. Despliega a **Production**. Vercel Cron se activa en el despliegue de producción, no en previews.
5. En **Settings > Cron Jobs**, comprueba que `/api/reminders` aparece activo.

El cron está configurado para ejecutarse diariamente a las 08:00 UTC (`0 8 * * *`). En el plan Hobby, Vercel puede ejecutarlo en cualquier momento dentro de esa hora. España peninsular usa UTC+1 en invierno y UTC+2 en verano, por lo que la hora local cambia. La revisión diaria es suficiente para recordatorios por fecha, pero no garantiza ejecución al minuto exacto.

## Cómo funciona el recordatorio
- Cada día se buscan tareas incompletas cuya fecha límite sea exactamente dentro de 3 días.
- Se envía un correo con asignatura, tarea y fecha límite.
- Si el envío funciona, se guarda `reminder_sent_at` para evitar duplicados.
- Si editas la fecha después de haber enviado el recordatorio, esta versión no reinicia automáticamente `reminder_sent_at`; podrías ponerlo a `NULL` manualmente o ampliar la lógica.

## Limitaciones conocidas de esta versión inicial
- El recordatorio se envía al email de la cuenta que creó la tarea.
- La tabla está preparada para varios usuarios, aunque el calendario no incluye aún una pantalla de ajustes de perfil.
- La comprobación corre una vez al día; no es un sistema de notificaciones instantáneas.
- Antes de uso real, prueba el flujo de registro, permisos RLS, entrega de email y logs del cron.
