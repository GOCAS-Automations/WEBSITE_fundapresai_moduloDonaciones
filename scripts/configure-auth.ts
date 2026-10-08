/**
 * Configura Supabase Auth con la Management API (plan §4 y §9).
 *
 * 1. Registro público desactivado (las cuentas las crea el administrador
 *    general en /admin/usuarios), sin correo de confirmación
 *    (mailer_autoconfirm), contraseñas de al menos 10 caracteres, cambio de
 *    contraseña sin código por correo (no hay SMTP; «Mi cuenta» pide la
 *    contraseña actual), site_url y lista de redirecciones permitidas.
 * 2. Correos de recuperación e invitación en español. En el plan gratuito
 *    Supabase solo deja editarlos si hay un SMTP propio: si no, se avisa y sigue.
 *    Solo sirven si se activa PASSWORD_RECOVERY_ENABLED (ver README).
 *
 * Uso:  npm run auth:configure [-- --site-url https://midominio]
 *       (hoy: -- --site-url https://fundapresai-donaciones.vercel.app)
 * Requiere SUPABASE_ACCESS_TOKEN (sbp_...) y NEXT_PUBLIC_SUPABASE_URL.
 *
 * Los enlaces de los correos usan token_hash y apuntan a /auth/confirm, que se
 * implementa en la fase 4 (panel) con supabase.auth.verifyOtp(). Funcionan
 * aunque la persona abra el correo en otro dispositivo.
 */
import { loadLocalEnv, projectRef, requireEnv } from "./lib/env";

const PURPLE = "#5f2c85";

type TemplateInput = { title: string; intro: string; cta: string; href: string; outro: string };

function emailTemplate({ title, intro, cta, href, outro }: TemplateInput) {
  return `<!doctype html>
<html lang="es">
  <body style="margin:0;padding:24px;background:#f5f5f7;font-family:Poppins,Segoe UI,Roboto,Arial,sans-serif;color:#2b2233;">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;margin:0 auto;background:#ffffff;border-radius:24px;">
      <tr><td style="padding:32px;">
        <p style="margin:0 0 8px;font-size:16px;color:#544a5c;">Fundación Fundapresai</p>
        <h1 style="margin:0 0 16px;font-size:26px;line-height:1.3;color:${PURPLE};">${title}</h1>
        <p style="margin:0 0 24px;font-size:18px;line-height:1.6;">${intro}</p>
        <p style="margin:0 0 24px;">
          <a href="${href}" style="display:inline-block;background:${PURPLE};color:#ffffff;text-decoration:none;font-weight:600;font-size:18px;padding:16px 28px;border-radius:16px;">${cta}</a>
        </p>
        <p style="margin:0;font-size:16px;line-height:1.6;color:#544a5c;">${outro}</p>
      </td></tr>
    </table>
  </body>
</html>`;
}

async function main() {
  loadLocalEnv();
  const ref = projectRef(requireEnv("NEXT_PUBLIC_SUPABASE_URL"));
  const token = requireEnv("SUPABASE_ACCESS_TOKEN");
  const siteArg = process.argv.indexOf("--site-url");
  const siteUrl = siteArg > -1 ? process.argv[siteArg + 1] : "http://localhost:3000";
  const confirmBase = "{{ .SiteURL }}/auth/confirm?token_hash={{ .TokenHash }}";

  const base = {
    disable_signup: true,
    // Sin SMTP no hay correos: las cuentas nacen confirmadas (el panel además
    // las crea con email_confirm: true) y cambiar la contraseña no exige
    // reautenticarse con un código por correo.
    mailer_autoconfirm: true,
    security_update_password_require_reauthentication: false,
    password_min_length: 10,
    site_url: siteUrl,
    uri_allow_list: ["http://localhost:3000/**", "https://*.vercel.app/**"].join(","),
  };

  const templates = {
    mailer_subjects_recovery: "Restablezca su contraseña del panel de Fundapresai",
    mailer_templates_recovery_content: emailTemplate({
      title: "Restablezca su contraseña",
      intro:
        "Recibimos una solicitud para cambiar la contraseña de su cuenta del panel de Fundapresai. Toque el botón para crear una nueva.",
      cta: "Crear nueva contraseña",
      href: `${confirmBase}&type=recovery&next=/admin/restablecer`,
      outro: "Si usted no lo solicitó, puede ignorar este correo: su contraseña no cambiará. El enlace vence en una hora.",
    }),
    mailer_subjects_invite: "Su acceso al panel de Fundapresai",
    mailer_templates_invite_content: emailTemplate({
      title: "Le damos la bienvenida al panel de Fundapresai",
      intro:
        "Le crearon una cuenta para administrar el sitio de donaciones de Fundapresai. Toque el botón para crear su contraseña.",
      cta: "Crear mi contraseña",
      href: `${confirmBase}&type=invite&next=/admin/restablecer`,
      outro: "Si no esperaba este correo, puede ignorarlo.",
    }),
  };

  const patch = async (body: Record<string, unknown>) => {
    const res = await fetch(`https://api.supabase.com/v1/projects/${ref}/config/auth`, {
      method: "PATCH",
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    return { ok: res.ok, status: res.status, text: await res.text() };
  };

  const first = await patch(base);
  if (!first.ok) throw new Error(`Management API respondió ${first.status}: ${first.text.slice(0, 400)}`);
  let cfg = JSON.parse(first.text) as Record<string, unknown>;

  const second = await patch(templates);
  if (second.ok) cfg = JSON.parse(second.text) as Record<string, unknown>;
  else console.warn(`Plantillas de correo NO aplicadas (${second.status}): ${second.text.slice(0, 300)}`);

  console.log(`Auth configurado en el proyecto ${ref}:`);
  console.log(
    JSON.stringify(
      {
        disable_signup: cfg.disable_signup,
        mailer_autoconfirm: cfg.mailer_autoconfirm,
        security_update_password_require_reauthentication: cfg.security_update_password_require_reauthentication,
        password_min_length: cfg.password_min_length,
        site_url: cfg.site_url,
        uri_allow_list: cfg.uri_allow_list,
        plantillas_en_espanol: second.ok,
        smtp_configurado: Boolean(cfg.smtp_host),
      },
      null,
      2,
    ),
  );
  if (!cfg.smtp_host) {
    console.warn(
      "Aviso: sin SMTP propio, Supabase solo envía correos a los miembros del equipo del proyecto, con un límite bajo, " +
        "y no deja traducir las plantillas. Configure un SMTP (Auth → SMTP Settings) y vuelva a correr este script.",
    );
  }
}

main().catch((err) => {
  console.error(err instanceof Error ? err.message : err);
  process.exit(1);
});
