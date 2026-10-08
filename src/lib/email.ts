/**
 * Email Utility Functions
 * 
 * This implementation uses Gmail SMTP via Nodemailer.
 * 
 * To use Gmail SMTP:
 * 1. Enable 2-Step Verification on your Google Account
 * 2. Generate an App Password: https://myaccount.google.com/apppasswords
 * 3. Set the following environment variables:
 *    - SMTP_HOST=smtp.gmail.com
 *    - SMTP_PORT=587
 *    - SMTP_USER=your-email@gmail.com
 *    - SMTP_PASS=your-app-password (16 characters)
 *    - EMAIL_FROM=your-email@gmail.com (optional, defaults to SMTP_USER)
 */

import nodemailer from 'nodemailer'

interface EmailOptions {
  to: string
  subject: string
  html: string
  from?: string
}

interface EmailResult {
  success: boolean
  error?: string
  messageId?: string
}

// Email templates
export const emailTemplates = {
  // Admin notification for new order
  newOrderAdmin: (orderDetails: {
    customerName: string
    customerEmail: string
    companyName?: string
    country: string
    numberType: string
    quantity: number
    mrc: number
    nrc: number
    currency: string
    signInUrl?: string
  }) => ({
    subject: `New Order Received from ${orderDetails.customerName}`,
    html: `
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="width: 100%; background-color: #F5F7FA;">
        <tr>
          <td align="center" style="padding: 20px;">
            <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="width: 100%; max-width: 560px; background-color: #FFFFFF; border: 1px solid #EDF1F6; border-radius: 14px; border-collapse: separate; overflow: hidden;">
              <tr>
                <td bgcolor="#215F9A" style="background-color: #215F9A; background-image: linear-gradient(135deg, #215F9A 0%, #12324F 100%); border-radius: 14px 14px 0 0; padding: 20px 20px 24px 20px;">
                  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="width: 100%;">
                    <tr>
                      <td align="left" valign="middle" style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; font-size: 12px; line-height: 16px; font-weight: 500; letter-spacing: 0.24em; text-transform: uppercase; color: #FFFFFF;">Voxco</td>
                      <td align="right" valign="middle">
                        <table role="presentation" cellpadding="0" cellspacing="0" border="0" align="right">
                          <tr>
                            <td style="border: 1px solid #5B83AD; border-color: rgba(255,255,255,0.35); border-radius: 999px; padding: 4px 10px; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; font-size: 10px; line-height: 14px; font-weight: 500; letter-spacing: 0.08em; text-transform: uppercase; color: #FFFFFF; white-space: nowrap;"><span style="color: #F97316; font-size: 8px; line-height: 14px; vertical-align: 1px;">&#9679;</span>&nbsp; Action Required</td>
                          </tr>
                        </table>
                      </td>
                    </tr>
                    <tr>
                      <td colspan="2" style="padding: 28px 0 0 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;">
                        <h1 style="margin: 0; font-size: 22px; line-height: 28px; font-weight: 600; letter-spacing: -0.01em; color: #FFFFFF;">New Order Received</h1>
                        <p style="margin: 4px 0 0 0; font-size: 13px; line-height: 20px; font-weight: 400; color: #C3D3E4; color: rgba(255,255,255,0.7); word-break: break-word; overflow-wrap: anywhere;">from ${orderDetails.customerName}</p>
                      </td>
                    </tr>
                  </table>
                </td>
              </tr>
              <tr>
                <td style="padding: 16px 22px 24px 22px;">
                  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="width: 100%; border-collapse: collapse;">
                    <tr>
                      <td width="38%" valign="top" style="width: 38%; padding: 14px 10px 11px 0; border-bottom: 1px solid #F1F5F9; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; font-size: 11px; line-height: 16px; font-weight: 400; letter-spacing: 0.08em; text-transform: uppercase; color: #94A3B8;">Customer</td>
                      <td width="62%" valign="top" style="width: 62%; padding: 11px 0; border-bottom: 1px solid #F1F5F9; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; font-size: 14px; line-height: 21px; font-weight: 400; color: #0F172A; text-align: left; word-break: break-word; overflow-wrap: anywhere;">${orderDetails.customerName}</td>
                    </tr>
                    ${orderDetails.companyName ? `<tr><td width="38%" valign="top" style="width: 38%; padding: 14px 10px 11px 0; border-bottom: 1px solid #F1F5F9; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; font-size: 11px; line-height: 16px; font-weight: 400; letter-spacing: 0.08em; text-transform: uppercase; color: #94A3B8;">Company</td><td width="62%" valign="top" style="width: 62%; padding: 11px 0; border-bottom: 1px solid #F1F5F9; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; font-size: 14px; line-height: 21px; font-weight: 400; color: #0F172A; text-align: left; word-break: break-word; overflow-wrap: anywhere;">${orderDetails.companyName}</td></tr>` : ''}
                    <tr>
                      <td width="38%" valign="top" style="width: 38%; padding: 14px 10px 11px 0; border-bottom: 1px solid #F1F5F9; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; font-size: 11px; line-height: 16px; font-weight: 400; letter-spacing: 0.08em; text-transform: uppercase; color: #94A3B8;">Email</td>
                      <td width="62%" valign="top" style="width: 62%; padding: 11px 0; border-bottom: 1px solid #F1F5F9; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; font-size: 12px; line-height: 21px; font-weight: 400; color: #0F172A; text-align: left; word-break: break-word; overflow-wrap: anywhere;"><a href="mailto:${orderDetails.customerEmail}" style="color: #0F172A; text-decoration: none;">${orderDetails.customerEmail}</a></td>
                    </tr>
                    <tr>
                      <td width="38%" valign="top" style="width: 38%; padding: 14px 10px 11px 0; border-bottom: 1px solid #F1F5F9; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; font-size: 11px; line-height: 16px; font-weight: 400; letter-spacing: 0.08em; text-transform: uppercase; color: #94A3B8;">Country</td>
                      <td width="62%" valign="top" style="width: 62%; padding: 11px 0; border-bottom: 1px solid #F1F5F9; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; font-size: 14px; line-height: 21px; font-weight: 400; color: #0F172A; text-align: left; word-break: break-word; overflow-wrap: anywhere;">${orderDetails.country}</td>
                    </tr>
                    <tr>
                      <td width="38%" valign="top" style="width: 38%; padding: 14px 10px 11px 0; border-bottom: 1px solid #F1F5F9; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; font-size: 11px; line-height: 16px; font-weight: 400; letter-spacing: 0.08em; text-transform: uppercase; color: #94A3B8;">Number Type</td>
                      <td width="62%" valign="top" style="width: 62%; padding: 11px 0; border-bottom: 1px solid #F1F5F9; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; font-size: 14px; line-height: 21px; font-weight: 400; color: #0F172A; text-align: left; word-break: break-word; overflow-wrap: anywhere;">${orderDetails.numberType}</td>
                    </tr>
                    <tr>
                      <td width="38%" valign="top" style="width: 38%; padding: 14px 10px 11px 0; border-bottom: 1px solid #F1F5F9; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; font-size: 11px; line-height: 16px; font-weight: 400; letter-spacing: 0.08em; text-transform: uppercase; color: #94A3B8;">Quantity</td>
                      <td width="62%" valign="top" style="width: 62%; padding: 11px 0; border-bottom: 1px solid #F1F5F9; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; font-size: 14px; line-height: 21px; font-weight: 400; color: #0F172A; text-align: left;">${orderDetails.quantity}</td>
                    </tr>
                    <tr>
                      <td width="38%" valign="top" style="width: 38%; padding: 14px 10px 11px 0; border-bottom: 1px solid #F1F5F9; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; font-size: 11px; line-height: 16px; font-weight: 400; letter-spacing: 0.08em; text-transform: uppercase; color: #94A3B8;">MRC</td>
                      <td width="62%" valign="top" style="width: 62%; padding: 11px 0; border-bottom: 1px solid #F1F5F9; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; font-size: 14px; line-height: 21px; font-weight: 500; color: #0F172A; text-align: left; word-break: break-word; overflow-wrap: anywhere;">${orderDetails.currency} ${orderDetails.mrc.toFixed(2)}</td>
                    </tr>
                    <tr>
                      <td width="38%" valign="top" style="width: 38%; padding: 14px 10px 11px 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; font-size: 11px; line-height: 16px; font-weight: 400; letter-spacing: 0.08em; text-transform: uppercase; color: #94A3B8;">NRC</td>
                      <td width="62%" valign="top" style="width: 62%; padding: 11px 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; font-size: 14px; line-height: 21px; font-weight: 500; color: #0F172A; text-align: left; word-break: break-word; overflow-wrap: anywhere;">${orderDetails.currency} ${orderDetails.nrc.toFixed(2)}</td>
                    </tr>
                  </table>
                  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="width: 100%;">
                    <tr>
                      <td style="padding: 16px 0 4px 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; font-size: 13px; line-height: 20px; font-weight: 400; color: #64748B;">Please review and process this order in the admin dashboard.</td>
                    </tr>
                  </table>
                  ${orderDetails.signInUrl ? `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="width: 100%;"><tr><td style="padding: 16px 0 0 0;"><table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="width: 100%; border-collapse: separate;"><tr><td width="100%" align="center" bgcolor="#215F9A" style="width: 100%; background-color: #215F9A; border-bottom: 1px solid #184A78; border-radius: 10px; mso-padding-alt: 15px 24px;"><a href="${orderDetails.signInUrl}" target="_blank" style="display: block; width: 100%; box-sizing: border-box; min-height: 50px; padding: 15px 24px; border-radius: 10px; background-color: #215F9A; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; font-size: 15px; line-height: 20px; font-weight: 600; letter-spacing: 0.01em; color: #FFFFFF; text-align: center; text-decoration: none;">Open Admin Dashboard&nbsp;&nbsp;&rarr;</a></td></tr></table></td></tr></table>` : ''}
                </td>
              </tr>
            </table>
          </td>
        </tr>
      </table>
    `,
  }),

  // Customer notification for order status update
  orderStatusUpdate: (orderDetails: {
    customerName: string
    companyName?: string
    status: string
    country: string
    numberType: string
    quantity: number
    reason?: string
    signInUrl?: string
  }) => ({
    subject: `Order ${orderDetails.status === 'granted' ? 'Approved' : 'Update'} - Voxco`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background-color: #215F9A; color: white; padding: 20px; text-align: center;">
          <h1 style="margin: 0;">Order ${orderDetails.status === 'granted' ? 'Approved!' : 'Status Update'}</h1>
        </div>
        <div style="padding: 20px; background-color: #f9f9f9;">
          <p>Dear ${orderDetails.customerName}${orderDetails.companyName ? ` (${orderDetails.companyName})` : ''},</p>
          ${orderDetails.status === 'granted'
        ? `<p style="color: #22c55e; font-size: 18px;"><strong>Great news! Your order has been approved.</strong></p>`
        : orderDetails.status === 'rejected'
          ? `<p style="color: #ef4444; font-size: 18px;"><strong>We regret to inform you that your order has been rejected due to the below reasons:</strong></p>`
          : `<p style="color: #ef4444; font-size: 18px;"><strong>Your order has been ${orderDetails.status}.</strong></p>`
      }
          <h3 style="color: #215F9A;">Order Details</h3>
          <table style="width: 100%; border-collapse: collapse;">
            <tr>
              <td style="padding: 10px; border-bottom: 1px solid #ddd;"><strong>Country:</strong></td>
              <td style="padding: 10px; border-bottom: 1px solid #ddd;">${orderDetails.country}</td>
            </tr>
            <tr>
              <td style="padding: 10px; border-bottom: 1px solid #ddd;"><strong>Number Type:</strong></td>
              <td style="padding: 10px; border-bottom: 1px solid #ddd;">${orderDetails.numberType}</td>
            </tr>
            <tr>
              <td style="padding: 10px; border-bottom: 1px solid #ddd;"><strong>Quantity:</strong></td>
              <td style="padding: 10px; border-bottom: 1px solid #ddd;">${orderDetails.quantity}</td>
            </tr>
            <tr>
              <td style="padding: 10px; border-bottom: 1px solid #ddd;"><strong>Status:</strong></td>
              <td style="padding: 10px; border-bottom: 1px solid #ddd;">
                <span style="color: ${orderDetails.status === 'granted' ? '#22c55e' : '#ef4444'}; font-weight: bold;">
                  ${orderDetails.status.charAt(0).toUpperCase() + orderDetails.status.slice(1)}
                </span>
              </td>
            </tr>
            ${orderDetails.reason ? `
            <tr>
              <td style="padding: 10px; border-bottom: 1px solid #ddd;"><strong>Reason:</strong></td>
              <td style="padding: 10px; border-bottom: 1px solid #ddd;">${orderDetails.reason}</td>
            </tr>
            ` : ''}
          </table>
          ${orderDetails.status === 'granted'
        ? `<p style="margin-top: 20px;">Your numbers will be provisioned shortly. You can view your order in the dashboard.</p>`
        : `<p style="margin-top: 20px;">If you have questions, please contact our support team.</p>`
      }
          ${orderDetails.signInUrl ? `<p style="margin-top: 16px;"><a href="${orderDetails.signInUrl}" style="color: #215F9A; font-weight: bold;">Sign in to the portal</a></p>` : ''}
        </div>
        <div style="background-color: #215F9A; color: white; padding: 10px; text-align: center; font-size: 12px;">
          <p>Voxco Number Ordering Portal</p>
        </div>
      </div>
    `,
  }),

  // Signup request notification for admin
  newSignupRequest: (details: {
    name: string
    email: string
    companyName?: string
    message: string
    signInUrl?: string
  }) => ({
    subject: `New Signup Request from ${details.name}`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background-color: #215F9A; color: white; padding: 20px; text-align: center;">
          <h1 style="margin: 0;">New Signup Request</h1>
        </div>
        <div style="padding: 20px; background-color: #f9f9f9;">
          <h2 style="color: #215F9A;">Applicant Details</h2>
          <table style="width: 100%; border-collapse: collapse;">
            <tr>
              <td style="padding: 10px; border-bottom: 1px solid #ddd;"><strong>Name:</strong></td>
              <td style="padding: 10px; border-bottom: 1px solid #ddd;">${details.name}</td>
            </tr>
            <tr>
              <td style="padding: 10px; border-bottom: 1px solid #ddd;"><strong>Email:</strong></td>
              <td style="padding: 10px; border-bottom: 1px solid #ddd;">${details.email}</td>
            </tr>
            ${details.companyName ? `<tr><td style="padding: 10px; border-bottom: 1px solid #ddd;"><strong>Company:</strong></td><td style="padding: 10px; border-bottom: 1px solid #ddd;">${details.companyName}</td></tr>` : ''}
            <tr>
              <td style="padding: 10px; border-bottom: 1px solid #ddd;"><strong>Message:</strong></td>
              <td style="padding: 10px; border-bottom: 1px solid #ddd;">${details.message}</td>
            </tr>
          </table>
          <p style="margin-top: 20px;">Please review this request in the admin dashboard.</p>
          ${details.signInUrl ? `<p style="margin-top: 16px;"><a href="${details.signInUrl}" style="color: #215F9A; font-weight: bold;">Sign in to the portal</a></p>` : ''}
        </div>
        <div style="background-color: #215F9A; color: white; padding: 10px; text-align: center; font-size: 12px;">
          <p>Voxco Number Ordering Portal</p>
        </div>
      </div>
    `,
  }),

  // Signup approved notification for user
  signupApproved: (details: { name: string; signInUrl?: string }) => ({
    subject: 'Your Account Has Been Approved - Voxco',
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background-color: #215F9A; color: white; padding: 20px; text-align: center;">
          <h1 style="margin: 0;">Welcome to Voxco!</h1>
        </div>
        <div style="padding: 20px; background-color: #f9f9f9;">
          <p>Dear ${details.name},</p>
          <p style="color: #22c55e; font-size: 18px;"><strong>Your account has been approved!</strong></p>
          <p>You can now sign in to the Voxco Number Ordering Portal and start ordering numbers.</p>
          ${details.signInUrl ? `<p><a href="${details.signInUrl}" style="color: #215F9A; font-weight: bold;">Sign in to the portal</a></p>` : ''}
          <p>If you have any questions, please don't hesitate to contact our support team.</p>
        </div>
        <div style="background-color: #215F9A; color: white; padding: 10px; text-align: center; font-size: 12px;">
          <p>Voxco Number Ordering Portal</p>
        </div>
      </div>
    `,
  }),

  testNotification: (opts: { signInUrl?: string }) => ({
    subject: 'Voxco: notification email test',
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background-color: #215F9A; color: white; padding: 20px; text-align: center;">
          <h1 style="margin: 0;">Test email</h1>
        </div>
        <div style="padding: 20px; background-color: #f9f9f9;">
          <p>This message confirms that admin notification email delivery is working.</p>
          ${opts.signInUrl ? `<p><a href="${opts.signInUrl}" style="color: #215F9A;">Sign in to the portal</a></p>` : ''}
        </div>
      </div>
    `,
  }),
}

// Create reusable transporter for Gmail SMTP
let transporter: nodemailer.Transporter | null = null

function getTransporter(): nodemailer.Transporter | null {
  if (transporter) {
    return transporter
  }

  const smtpHost = process.env.SMTP_HOST
  const smtpPort = process.env.SMTP_PORT
  const smtpUser = process.env.SMTP_USER
  const smtpPass = process.env.SMTP_PASS

  if (!smtpHost || !smtpPort || !smtpUser || !smtpPass) {
    console.warn('SMTP configuration incomplete. Missing required environment variables.')
    return null
  }

  transporter = nodemailer.createTransport({
    host: smtpHost,
    port: parseInt(smtpPort, 10),
    secure: parseInt(smtpPort, 10) === 465, // true for 465, false for other ports
    auth: {
      user: smtpUser,
      pass: smtpPass,
    },
  })

  return transporter
}

// Send email using Gmail SMTP
export async function sendEmail(options: EmailOptions): Promise<EmailResult> {
  const mailTransporter = getTransporter()

  if (!mailTransporter) {
    console.warn('SMTP not configured. Email not sent.')
    return { success: false, error: 'Email service not configured' }
  }

  try {
    const fromEmail = options.from || process.env.EMAIL_FROM || process.env.SMTP_USER || 'noreply@voxco.com'

    const info = await mailTransporter.sendMail({
      from: fromEmail,
      to: options.to,
      subject: options.subject,
      html: options.html,
    })

    return { success: true, messageId: info.messageId }
  } catch (error: any) {
    console.error('Error sending email:', error)
    return { success: false, error: error.message || 'Failed to send email' }
  }
}

// Helper to get notification email from settings
// Uses a database function with SECURITY DEFINER to bypass RLS
export async function getNotificationEmail(supabase: any): Promise<string | null> {
  try {
    const { data, error } = await supabase.rpc('get_notification_email')

    if (error) {
      console.error('Error getting notification email:', error)
    } else {
      const fromDb = typeof data === 'string' ? data.trim() : ''
      if (fromDb) return fromDb
    }
  } catch (err) {
    console.error('Exception getting notification email:', err)
  }

  const fallback = process.env.ADMIN_NOTIFICATION_EMAIL?.trim()
  return fallback || null
}
