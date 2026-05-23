import { Resend } from "resend";

function getResend() {
  const key = process.env.RESEND_API_KEY;
  if (!key) throw new Error("RESEND_API_KEY is not set.");
  return new Resend(key);
}

export async function sendPasswordResetEmail(toEmail: string, resetToken: string) {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
  const fromName = process.env.SMTP_FROM_NAME ?? "Hyrd";
  const fromEmail = process.env.SMTP_USER ?? "noreply@hyrdjobfinder.com";
  const resetUrl = `${appUrl}/reset-password/${resetToken}`;

  const resend = getResend();

  const { error } = await resend.emails.send({
    from: `${fromName} <${fromEmail}>`,
    to: toEmail,
    subject: "Reset your Hyrd password",
    text: [
      `Hi,`,
      ``,
      `Someone requested a password reset for your Hyrd account.`,
      ``,
      `Click the link below to set a new password (expires in 1 hour):`,
      `${resetUrl}`,
      ``,
      `If you didn't request this, you can safely ignore this email.`,
      ``,
      `— The Hyrd team`,
    ].join("\n"),
    html: `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
</head>
<body style="margin:0;padding:0;background:#050505;font-family:Inter,ui-sans-serif,system-ui,-apple-system,sans-serif;color:#f5f5f5;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#050505;padding:40px 16px;">
    <tr>
      <td align="center">
        <table width="100%" cellpadding="0" cellspacing="0" style="max-width:520px;">

          <tr>
            <td style="padding-bottom:28px;">
              <span style="font-size:18px;font-weight:800;letter-spacing:0.06em;text-transform:uppercase;color:#f5f5f5;">
                HYRD
              </span>
            </td>
          </tr>

          <tr>
            <td style="background:linear-gradient(180deg,rgba(20,20,22,0.98),rgba(12,12,14,1));border:1px solid rgba(255,255,255,0.09);border-radius:20px;padding:32px 28px;">
              <p style="margin:0 0 8px;font-size:22px;font-weight:800;letter-spacing:-0.03em;color:#f5f5f5;">
                Reset your password
              </p>
              <p style="margin:0 0 24px;font-size:14px;color:#b5b5bc;line-height:1.6;">
                We received a request to reset the password for your account.
                Click the button below to choose a new password.
                This link expires in <strong style="color:#f5f5f5;">1 hour</strong>.
              </p>

              <table cellpadding="0" cellspacing="0" style="margin-bottom:24px;">
                <tr>
                  <td style="background:linear-gradient(180deg,#ff3368,#d11a47);border-radius:12px;box-shadow:0 8px 20px rgba(225,29,72,0.3);">
                    <a href="${resetUrl}"
                       style="display:inline-block;padding:14px 28px;font-size:15px;font-weight:700;color:#fff;text-decoration:none;letter-spacing:0.01em;">
                      Set new password →
                    </a>
                  </td>
                </tr>
              </table>

              <p style="margin:0 0 6px;font-size:12px;color:#6b7280;">
                Or copy and paste this link into your browser:
              </p>
              <p style="margin:0;font-size:12px;color:#6b7280;word-break:break-all;">
                <a href="${resetUrl}" style="color:#ff3368;">${resetUrl}</a>
              </p>

              <hr style="border:none;border-top:1px solid rgba(255,255,255,0.08);margin:24px 0;" />

              <p style="margin:0;font-size:12px;color:#6b7280;line-height:1.6;">
                If you didn't request a password reset, you can safely ignore this email.
                Your password won't change until you click the link above.
              </p>
            </td>
          </tr>

          <tr>
            <td style="padding-top:20px;text-align:center;font-size:12px;color:#4b4b56;">
              Hyrd · hyrdjobfinder.com
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>`,
  });

  if (error) {
    throw new Error(error.message);
  }
}

