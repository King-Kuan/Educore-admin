import { Resend } from "resend";

const FROM  = () => process.env.RESEND_FROM_EMAIL    ?? "onboarding@resend.dev";
const REPLY = () => process.env.RESEND_REPLY_TO      ?? "kuanjoeking@gmail.com";
const ADMIN = () => process.env.NEXT_PUBLIC_ADMIN_URL ?? "http://localhost:3001";

function getResend() {
  return new Resend(process.env.RESEND_API_KEY!);
}

export async function sendTeacherInvite(params: {
  toEmail: string; teacherName: string; schoolName: string;
  principalName: string; tempPassword: string;
}) {
  const resend = getResend();
  const { error } = await resend.emails.send({
    from:    FROM(),
    replyTo: REPLY(),
    to:      params.toEmail,
    subject: `You've been added to ${params.schoolName} — EduCore RW`,
    html: `
      <div style="font-family:sans-serif;max-width:520px;margin:0 auto;padding:24px">
        <div style="background:#1a3a2a;padding:20px;border-radius:8px 8px 0 0;text-align:center">
          <h1 style="color:#fff;margin:0;font-size:20px">EduCore RW</h1>
          <p style="color:rgba(255,255,255,0.6);margin:4px 0 0;font-size:12px">School Management Platform</p>
        </div>
        <div style="background:#fff;border:1px solid #e4e0da;border-top:none;padding:24px;border-radius:0 0 8px 8px">
          <p>Dear <strong>${params.teacherName}</strong>,</p>
          <p>You have been added as a teacher at <strong>${params.schoolName}</strong> by <strong>${params.principalName}</strong>.</p>
          <div style="background:#f4f1eb;border:1px solid #d4cfc8;border-radius:8px;padding:16px;margin:20px 0">
            <p style="font-size:11px;color:#999;margin:0 0 8px;text-transform:uppercase;letter-spacing:1px">Temporary Password</p>
            <p style="font-family:monospace;font-size:18px;color:#1a3a2a;font-weight:bold;margin:0">${params.tempPassword}</p>
            <p style="font-size:12px;color:#999;margin:8px 0 0;font-style:italic">Change this immediately after first login.</p>
          </div>
          <a href="${ADMIN()}/login" style="display:inline-block;background:#1a3a2a;color:#fff;padding:12px 24px;border-radius:6px;text-decoration:none;font-weight:600;font-size:14px">Sign In to Teacher App</a>
          <p style="font-size:12px;color:#999;margin-top:20px">EduCore RW · educorerw.rw</p>
        </div>
      </div>
    `,
  });
  if (error) throw new Error(`Failed to send teacher invite: ${error.message}`);
}

export async function sendPrincipalWelcome(params: {
  toEmail: string; principalName: string; schoolName: string; tempPassword: string;
}) {
  const resend = getResend();
  const { error } = await resend.emails.send({
    from:    FROM(),
    replyTo: REPLY(),
    to:      params.toEmail,
    subject: `Your EduCore RW school account is ready — ${params.schoolName}`,
    html: `
      <div style="font-family:sans-serif;max-width:520px;margin:0 auto;padding:24px">
        <div style="background:#1a3a2a;padding:20px;border-radius:8px 8px 0 0;text-align:center">
          <h1 style="color:#fff;margin:0;font-size:20px">EduCore RW</h1>
        </div>
        <div style="background:#fff;border:1px solid #e4e0da;border-top:none;padding:24px;border-radius:0 0 8px 8px">
          <p>Dear <strong>${params.principalName}</strong>,</p>
          <p>Your EduCore RW account for <strong>${params.schoolName}</strong> is ready.</p>
          <div style="background:#f4f1eb;border:1px solid #d4cfc8;border-radius:8px;padding:16px;margin:20px 0">
            <p style="font-size:11px;color:#999;margin:0 0 8px;text-transform:uppercase;letter-spacing:1px">Temporary Password</p>
            <p style="font-family:monospace;font-size:18px;color:#1a3a2a;font-weight:bold;margin:0">${params.tempPassword}</p>
          </div>
          <a href="${ADMIN()}/login" style="display:inline-block;background:#1a3a2a;color:#fff;padding:12px 24px;border-radius:6px;text-decoration:none;font-weight:600;font-size:14px">Open Principal Dashboard</a>
        </div>
      </div>
    `,
  });
  if (error) throw new Error(`Failed to send principal welcome: ${error.message}`);
}
