import { Resend } from "resend";

function getResend() {
  return new Resend(process.env.RESEND_API_KEY!);
}

const FROM  = () => process.env.RESEND_FROM_EMAIL  ?? "onboarding@resend.dev";
const REPLY = () => process.env.RESEND_REPLY_TO    ?? "support@educorerw.rw";
const ADMIN = () => process.env.NEXT_PUBLIC_ADMIN_URL ?? "http://localhost:3001";

export async function sendTeacherInvite(params: {
  toEmail:       string;
  teacherName:   string;
  schoolName:    string;
  principalName: string;
  tempPassword:  string;
}) {
  const resend = getResend();
  const result = await resend.emails.send({
    from:    FROM(),
    replyTo: REPLY(),
    to:      params.toEmail,
    subject: `You've been added to ${params.schoolName} — EduCore RW`,
    html: `
<!DOCTYPE html>
<html>
<body style="margin:0;padding:0;background:#f4f1eb;font-family:Arial,sans-serif">
<div style="max-width:520px;margin:32px auto;background:#fff;border-radius:8px;overflow:hidden;border:1px solid #e4e0da">
  <div style="background:#1a3a2a;padding:24px;text-align:center">
    <h1 style="color:#fff;margin:0;font-size:20px;letter-spacing:1px">EduCore RW</h1>
    <p style="color:rgba(255,255,255,0.5);margin:4px 0 0;font-size:11px;text-transform:uppercase;letter-spacing:2px">School Management Platform</p>
  </div>
  <div style="padding:32px">
    <p style="color:#333;margin:0 0 16px">Dear <strong>${params.teacherName}</strong>,</p>
    <p style="color:#333;margin:0 0 24px">You have been added as a teacher at <strong>${params.schoolName}</strong> by <strong>${params.principalName}</strong>.</p>
    <div style="background:#f4f1eb;border:1px solid #d4cfc8;border-radius:8px;padding:20px;margin:0 0 24px">
      <p style="margin:0 0 6px;font-size:11px;color:#999;text-transform:uppercase;letter-spacing:1px">Your Login Email</p>
      <p style="margin:0 0 16px;font-family:monospace;font-size:14px;color:#1a3a2a">${params.toEmail}</p>
      <p style="margin:0 0 6px;font-size:11px;color:#999;text-transform:uppercase;letter-spacing:1px">Temporary Password</p>
      <p style="margin:0 0 8px;font-family:monospace;font-size:24px;font-weight:bold;color:#1a3a2a;letter-spacing:2px">${params.tempPassword}</p>
      <p style="margin:0;font-size:12px;color:#999;font-style:italic">Please change this password immediately after first login.</p>
    </div>
    <a href="${ADMIN()}/login" style="display:inline-block;background:#1a3a2a;color:#fff;padding:14px 28px;border-radius:6px;text-decoration:none;font-weight:bold;font-size:14px">Sign In to Dashboard</a>
    <p style="color:#999;font-size:12px;margin:24px 0 0">If you did not expect this email, please ignore it or contact your school administrator.</p>
  </div>
  <div style="background:#f4f1eb;padding:16px;text-align:center;border-top:1px solid #e4e0da">
    <p style="margin:0;font-size:11px;color:#999">EduCore RW · Republic of Rwanda · Ministry of Education aligned</p>
  </div>
</div>
</body>
</html>`,
  });

  if (result.error) {
    throw new Error(`Resend error: ${result.error.message}`);
  }
}

export async function sendPrincipalWelcome(params: {
  toEmail:       string;
  principalName: string;
  schoolName:    string;
  tempPassword:  string;
}) {
  const resend = getResend();
  const result = await resend.emails.send({
    from:    FROM(),
    replyTo: REPLY(),
    to:      params.toEmail,
    subject: `Your EduCore RW school account is ready — ${params.schoolName}`,
    html: `
<!DOCTYPE html>
<html>
<body style="margin:0;padding:0;background:#f4f1eb;font-family:Arial,sans-serif">
<div style="max-width:520px;margin:32px auto;background:#fff;border-radius:8px;overflow:hidden;border:1px solid #e4e0da">
  <div style="background:#1a3a2a;padding:24px;text-align:center">
    <h1 style="color:#fff;margin:0;font-size:20px;letter-spacing:1px">EduCore RW</h1>
    <p style="color:rgba(255,255,255,0.5);margin:4px 0 0;font-size:11px;text-transform:uppercase;letter-spacing:2px">School Management Platform</p>
  </div>
  <div style="padding:32px">
    <p style="color:#333;margin:0 0 8px;font-size:18px;font-weight:bold">Welcome, ${params.principalName}!</p>
    <p style="color:#666;margin:0 0 24px">Your EduCore RW account for <strong>${params.schoolName}</strong> has been created. You can now log in and start setting up your school.</p>
    <div style="background:#f4f1eb;border:1px solid #d4cfc8;border-radius:8px;padding:20px;margin:0 0 24px">
      <p style="margin:0 0 6px;font-size:11px;color:#999;text-transform:uppercase;letter-spacing:1px">Your Login Email</p>
      <p style="margin:0 0 16px;font-family:monospace;font-size:14px;color:#1a3a2a">${params.toEmail}</p>
      <p style="margin:0 0 6px;font-size:11px;color:#999;text-transform:uppercase;letter-spacing:1px">Temporary Password</p>
      <p style="margin:0 0 8px;font-family:monospace;font-size:24px;font-weight:bold;color:#1a3a2a;letter-spacing:2px">${params.tempPassword}</p>
      <p style="margin:0;font-size:12px;color:#999;font-style:italic">Please change this password immediately after first login.</p>
    </div>
    <a href="${ADMIN()}/login" style="display:inline-block;background:#1a3a2a;color:#fff;padding:14px 28px;border-radius:6px;text-decoration:none;font-weight:bold;font-size:14px">Open Principal Dashboard</a>
    <div style="margin:24px 0 0;padding:16px;background:#e8f4ec;border-radius:6px;border-left:3px solid #1a3a2a">
      <p style="margin:0;font-size:13px;color:#1a3a2a;font-weight:bold">Getting started:</p>
      <ol style="margin:8px 0 0;padding-left:20px;color:#333;font-size:13px;line-height:1.8">
        <li>Sign in and change your password</li>
        <li>Go to Settings → add your school levels</li>
        <li>Create classes and invite teachers</li>
        <li>Import students from CSV</li>
        <li>Start entering marks</li>
      </ol>
    </div>
  </div>
  <div style="background:#f4f1eb;padding:16px;text-align:center;border-top:1px solid #e4e0da">
    <p style="margin:0;font-size:11px;color:#999">EduCore RW · Republic of Rwanda · Ministry of Education aligned</p>
  </div>
</div>
</body>
</html>`,
  });

  if (result.error) {
    throw new Error(`Resend error: ${result.error.message}`);
  }
}
