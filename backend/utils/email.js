const nodemailer = require('nodemailer');

const createTransporter = () => {
  return nodemailer.createTransport({
    host: process.env.EMAIL_HOST || 'smtp.gmail.com',
    port: parseInt(process.env.EMAIL_PORT) || 587,
    secure: false,
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASS
    }
  });
};

const sendOTPEmail = async (email, name, otp, type = 'verify') => {
  const transporter = createTransporter();
  
  const subjects = {
    verify: 'Verify your SplitSmart account',
    reset: 'Reset your SplitSmart password'
  };

  const messages = {
    verify: `Welcome to SplitSmart, ${name}! Your verification code is:`,
    reset: `Hi ${name}, your password reset code is:`
  };

  const htmlTemplate = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
    </head>
    <body style="margin:0;padding:0;background-color:#0f0f0f;font-family:'Inter',Arial,sans-serif;">
      <table width="100%" cellpadding="0" cellspacing="0" style="background-color:#0f0f0f;padding:40px 20px;">
        <tr>
          <td align="center">
            <table width="500" cellpadding="0" cellspacing="0" style="background-color:#1a1a1a;border-radius:12px;overflow:hidden;border:1px solid #2a2a2a;">
              <!-- Header -->
              <tr>
                <td style="background:linear-gradient(135deg,#1a1a2e,#16213e);padding:32px;text-align:center;">
                  <div style="display:inline-block;">
                    <span style="font-size:28px;font-weight:800;color:#ffffff;letter-spacing:-1px;">Split<span style="color:#6366f1;">Smart</span></span>
                  </div>
                  <p style="color:#94a3b8;margin:8px 0 0;font-size:14px;">Shared Expense Management</p>
                </td>
              </tr>
              <!-- Body -->
              <tr>
                <td style="padding:40px 32px;">
                  <p style="color:#e2e8f0;font-size:16px;margin:0 0 8px;">${messages[type]}</p>
                  <!-- OTP Box -->
                  <div style="background:#0f0f0f;border:2px solid #6366f1;border-radius:12px;padding:24px;text-align:center;margin:24px 0;">
                    <span style="font-size:40px;font-weight:800;color:#6366f1;letter-spacing:12px;">${otp}</span>
                  </div>
                  <p style="color:#64748b;font-size:13px;margin:0;">This code expires in <strong style="color:#e2e8f0;">10 minutes</strong>. Do not share this with anyone.</p>
                </td>
              </tr>
              <!-- Footer -->
              <tr>
                <td style="padding:20px 32px;border-top:1px solid #2a2a2a;text-align:center;">
                  <p style="color:#475569;font-size:12px;margin:0;">SplitSmart &mdash; Track, Split, Settle</p>
                </td>
              </tr>
            </table>
          </td>
        </tr>
      </table>
    </body>
    </html>
  `;

  try {
    await transporter.sendMail({
      from: `"SplitSmart" <${process.env.EMAIL_USER}>`,
      to: email,
      subject: subjects[type],
      html: htmlTemplate
    });
    return true;
  } catch (error) {
    console.error('Email send error:', error);
    return false;
  }
};

module.exports = { sendOTPEmail };
