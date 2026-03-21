import { Resend } from "resend";

const FROM  = () => process.env.RESEND_FROM_EMAIL    ?? "onboarding@resend.dev";
const REPLY = () => process.env.RESEND_REPLY_TO      ?? "kuanjoeking@gmail.com";
const ADMIN = () => process.env.NEXT_PUBLIC_ADMIN_URL ?? "http://localhost:3001";

function getResend() {
  if (!process.env.RESEND_API_KEY) throw new Error("RESEND_API_KEY environment variable is not set");
  return new Resend(process.env.RESEND_API_KEY);
}

export async function sendTeacherInvite(params: {
  toEmail:       string;
  teacherName:   string;
  schoolName:    string;
  principalName: string;
  tempPassword:  string;
}) {
  const resend = getResend();
  const { error } = await resend.emails.send({
    from:    FROM(),
    replyTo: REPLY(),
    to:      params.toEmail,
    subject: `You have been added to ${params.schoolName} — EduCore RW`,
    html: `<!DOCTYPE html><html><body style="margin:0;padding:0;background:#f4f1eb;font-family:Arial,sans-serif">
<div style="max-width:540px;margin:40px auto;background:#fff;border-radius:8px;overflow:hidden;border:1px solid #e4e0da">
  <div style="background:#1a3a2a;padding:28px;text-align:center">
    <h1 style="color:#fff;margin:0;font-size:22px;letter-spacing:1px">EduCore RW</h1>
    <p style="color:rgba(255,255,255,0.5);margin:6px 0 0;font-size:11px;letter-spacing:2px">SCHOOL MANAGEMENT PLATFORM</p>
  </div>
  <div style="padding:36px">
    <p style="color:#333;margin:0 0 12px;font-size:16px">Dear <strong>${params.teacherName}</strong>,</p>
    <p style="color:#555;margin:0 0 28px;line-height:1.6">You have been added as a teacher at <strong>${params.schoolName}</strong> by <strong>${params.principalName}</strong>.</p>
    <div style="background:#f4f1eb;border:1px solid #d4cfc8;border-radius:8px;padding:24px;margin:0 0 28px">
      <p style="margin:0 0 4px;font-size:11px;color:#999;text-transform:uppercase;letter-spacing:1px">Login Email</p>
      <p style="margin:0 0 20px;font-family:monospace;font-size:15px;color:#1a3a2a">${params.toEmail}</p>
      <p style="margin:0 0 4px;font-size:11px;color:#999;text-transform:uppercase;letter-spacing:1px">Temporary Password</p>
      <p style="margin:0 0 8px;font-family:monospace;font-size:26px;font-weight:bold;color:#1a3a2a;letter-spacing:3px">${params.tempPassword}</p>
      <p style="margin:0;font-size:12px;color:#e07000;font-style:italic">Change this password immediately after your first login.</p>
    </div>
    <a href="${ADMIN()}/login" style="display:inline-block;background:#1a3a2a;color:#fff;padding:14px 32px;border-radius:6px;text-decoration:none;font-weight:bold;font-size:15px">Sign In Now</a>
  </div>
  <div style="background:#f4f1eb;padding:16px;text-align:center;border-top:1px solid #e4e0da">
    <p style="margin:0;font-size:11px;color:#999">EduCore RW — Republic of Rwanda · Ministry of Education aligned</p>
  </div>
</div></body></html>`,
  });

  if (error) throw new Error(`Email failed: ${JSON.stringify(error)}`);
}

export async function sendPrincipalWelcome(params: {
  toEmail:       string;
  principalName: string;
  schoolName:    string;
  tempPassword:  string;
}) {
  const resend = getResend();
  const { error } = await resend.emails.send({
    from:    FROM(),
    replyTo: REPLY(),
    to:      params.toEmail,
    subject: `Your EduCore RW principal account is ready — ${params.schoolName}`,
    html: `<!DOCTYPE html><html><body style="margin:0;padding:0;background:#f4f1eb;font-family:Arial,sans-serif">
<div style="max-width:540px;margin:40px auto;background:#fff;border-radius:8px;overflow:hidden;border:1px solid #e4e0da">
  <div style="background:#1a3a2a;padding:28px;text-align:center">
    <h1 style="color:#fff;margin:0;font-size:22px;letter-spacing:1px">EduCore RW</h1>
    <p style="color:rgba(255,255,255,0.5);margin:6px 0 0;font-size:11px;letter-spacing:2px">SCHOOL MANAGEMENT PLATFORM</p>
  </div>
  <div style="padding:36px">
    <p style="color:#333;margin:0 0 8px;font-size:20px;font-weight:bold">Welcome, ${params.principalName}!</p>
    <p style="color:#555;margin:0 0 28px;line-height:1.6">Your EduCore RW account for <strong>${params.schoolName}</strong> is ready. You are the principal administrator.</p>
    <div style="background:#f4f1eb;border:1px solid #d4cfc8;border-radius:8px;padding:24px;margin:0 0 28px">
      <p style="margin:0 0 4px;font-size:11px;color:#999;text-transform:uppercase;letter-spacing:1px">Login Email</p>
      <p style="margin:0 0 20px;font-family:monospace;font-size:15px;color:#1a3a2a">${params.toEmail}</p>
      <p style="margin:0 0 4px;font-size:11px;color:#999;text-transform:uppercase;letter-spacing:1px">Temporary Password</p>
      <p style="margin:0 0 8px;font-family:monospace;font-size:26px;font-weight:bold;color:#1a3a2a;letter-spacing:3px">${params.tempPassword}</p>
      <p style="margin:0;font-size:12px;color:#e07000;font-style:italic">Change this password immediately after your first login.</p>
    </div>
    <a href="${ADMIN()}/login" style="display:inline-block;background:#1a3a2a;color:#fff;padding:14px 32px;border-radius:6px;text-decoration:none;font-weight:bold;font-size:15px">Open Principal Dashboard</a>
    <div style="margin:28px 0 0;padding:20px;background:#e8f4ec;border-radius:6px;border-left:4px solid #1a3a2a">
      <p style="margin:0 0 8px;font-size:13px;font-weight:bold;color:#1a3a2a">Getting started:</p>
      <ol style="margin:0;padding-left:18px;color:#333;font-size:13px;line-height:2">
        <li>Sign in and change your password</li>
        <li>Add your school levels in Settings</li>
        <li>Create classes and invite teachers</li>
        <li>Import students from CSV</li>
        <li>Start entering marks and generating reports</li>
      </ol>
    </div>
  </div>
  <div style="background:#f4f1eb;padding:16px;text-align:center;border-top:1px solid #e4e0da">
    <p style="margin:0;font-size:11px;color:#999">EduCore RW — Republic of Rwanda · Ministry of Education aligned</p>
  </div>
</div></body></html>`,
  });

  if (error) throw new Error(`Email failed: ${JSON.stringify(error)}`);
}
