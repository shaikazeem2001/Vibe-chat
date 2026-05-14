const { Resend } = require("resend");
const crypto = require("crypto");

// ─── Lazy Client ──────────────────────────────────────────────────────────────
// Instantiate Resend on first use, not at module load.
// This prevents a startup crash when EMAIL_API_KEY hasn't been configured yet.
let _resend = null;
function getResend() {
  if (!_resend) {
    if (!process.env.EMAIL_API_KEY) {
      throw new Error(
        "[email.js] EMAIL_API_KEY is not set in .env. " +
        "Get a free API key at https://resend.com and add it to your .env file."
      );
    }
    _resend = new Resend(process.env.EMAIL_API_KEY);
  }
  return _resend;
}

// ─── Token Utility ────────────────────────────────────────────────────────────

/**
 * Generates a cryptographically secure 64-char hex token.
 * Never use Math.random() for security tokens.
 */
function generateToken() {
  return crypto.randomBytes(32).toString("hex");
}

// ─── HTML Email Templates (inline CSS only) ───────────────────────────────────

function baseTemplate(title, bodyContent) {
  return `
  <!DOCTYPE html>
  <html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>${title}</title>
  </head>
  <body style="margin:0;padding:0;background:#0f0f0f;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#0f0f0f;">
      <tr>
        <td align="center" style="padding:48px 16px;">
          <table role="presentation" width="100%" style="max-width:520px;background:#1a1a1a;border-radius:16px;overflow:hidden;box-shadow:0 4px 32px rgba(0,0,0,0.5);">
            <!-- Header -->
            <tr>
              <td style="background:linear-gradient(135deg,#185FA5,#1a3a6b);padding:32px;text-align:center;">
                <span style="color:#fff;font-size:22px;font-weight:700;letter-spacing:1px;">HEXA-BYTE</span>
              </td>
            </tr>
            <!-- Body -->
            <tr>
              <td style="padding:40px 32px;">
                ${bodyContent}
              </td>
            </tr>
            <!-- Footer -->
            <tr>
              <td style="padding:24px 32px;border-top:1px solid #2a2a2a;text-align:center;">
                <p style="color:#555;font-size:12px;margin:0;">
                  © ${new Date().getFullYear()} Hexa-Byte. All rights reserved.
                </p>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
  </html>`;
}

function resetPasswordTemplate(name, link) {
  const body = `
    <h2 style="color:#fff;font-size:24px;margin:0 0 12px;">Reset your password</h2>
    <p style="color:#aaa;font-size:15px;line-height:1.6;margin:0 0 28px;">
      Hi <strong style="color:#fff;">${name}</strong>, we received a request to reset your Hexa-Byte password.
      Click the button below — this link expires in <strong style="color:#fff;">15 minutes</strong>.
    </p>
    <a href="${link}"
       style="display:inline-block;background:linear-gradient(135deg,#185FA5,#1a3a6b);color:#fff;
              padding:14px 28px;border-radius:10px;text-decoration:none;font-size:15px;
              font-weight:600;letter-spacing:0.5px;margin-bottom:28px;">
      Reset Password →
    </a>
    <p style="color:#666;font-size:13px;line-height:1.6;margin:0;">
      If you didn't request this, you can safely ignore this email.
      Your password will not change.
    </p>`;
  return baseTemplate("Reset your Hexa-Byte password", body);
}

function verifyEmailTemplate(name, link) {
  const body = `
    <h2 style="color:#fff;font-size:24px;margin:0 0 12px;">Welcome to Hexa-Byte! 👋</h2>
    <p style="color:#aaa;font-size:15px;line-height:1.6;margin:0 0 28px;">
      Hi <strong style="color:#fff;">${name}</strong>, thanks for signing up!
      Please verify your email address to activate your account.
      This link expires in <strong style="color:#fff;">24 hours</strong>.
    </p>
    <a href="${link}"
       style="display:inline-block;background:linear-gradient(135deg,#185FA5,#1a3a6b);color:#fff;
              padding:14px 28px;border-radius:10px;text-decoration:none;font-size:15px;
              font-weight:600;letter-spacing:0.5px;margin-bottom:28px;">
      Verify Email →
    </a>
    <p style="color:#666;font-size:13px;line-height:1.6;margin:0;">
      If you didn't create an account, ignore this email.
    </p>`;
  return baseTemplate("Verify your Hexa-Byte account", body);
}

// ─── Email Sending ─────────────────────────────────────────────────────────────

/**
 * Sends a password reset email.
 * @param {string} name  - The user's display name
 * @param {string} email - The user's email address
 * @param {string} token - The reset token (will be embedded in the link)
 */
async function sendPasswordResetEmail(name, email, token) {
  const link = `${process.env.APP_URL}/reset-password?token=${token}`;
  await getResend().emails.send({
    from: process.env.EMAIL_FROM,
    to: email,
    subject: "Reset your Hexa-Byte password",
    html: resetPasswordTemplate(name, link),
  });
}

/**
 * Sends an email verification email after signup.
 * @param {string} name  - The user's display name
 * @param {string} email - The user's email address
 * @param {string} token - The verification token
 */
async function sendVerificationEmail(name, email, token) {
  const link = `${process.env.APP_URL}/verify-email?token=${token}`;
  await getResend().emails.send({
    from: process.env.EMAIL_FROM,
    to: email,
    subject: "Verify your Hexa-Byte account",
    html: verifyEmailTemplate(name, link),
  });
}

module.exports = {
  generateToken,
  sendPasswordResetEmail,
  sendVerificationEmail,
};
