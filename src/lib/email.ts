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
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background-color: #215F9A; color: white; padding: 20px; text-align: center;">
          <h1 style="margin: 0;">New Order Received</h1>
        </div>
        <div style="padding: 20px; background-color: #f9f9f9;">
          <h2 style="color: #215F9A;">Order Details</h2>
          <table style="width: 100%; border-collapse: collapse;">
            <tr>
              <td style="padding: 10px; border-bottom: 1px solid #ddd;"><strong>Customer:</strong></td>
              <td style="padding: 10px; border-bottom: 1px solid #ddd;">${orderDetails.customerName}</td>
            </tr>
            ${orderDetails.companyName ? `<tr><td style="padding: 10px; border-bottom: 1px solid #ddd;"><strong>Company:</strong></td><td style="padding: 10px; border-bottom: 1px solid #ddd;">${orderDetails.companyName}</td></tr>` : ''}
            <tr>
              <td style="padding: 10px; border-bottom: 1px solid #ddd;"><strong>Email:</strong></td>
              <td style="padding: 10px; border-bottom: 1px solid #ddd;">${orderDetails.customerEmail}</td>
            </tr>
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
              <td style="padding: 10px; border-bottom: 1px solid #ddd;"><strong>MRC:</strong></td>
              <td style="padding: 10px; border-bottom: 1px solid #ddd;">${orderDetails.currency} ${orderDetails.mrc.toFixed(2)}</td>
            </tr>
            <tr>
              <td style="padding: 10px; border-bottom: 1px solid #ddd;"><strong>NRC:</strong></td>
              <td style="padding: 10px; border-bottom: 1px solid #ddd;">${orderDetails.currency} ${orderDetails.nrc.toFixed(2)}</td>
            </tr>
          </table>
          <p style="margin-top: 20px;">Please review and process this order in the admin dashboard.</p>
          ${orderDetails.signInUrl ? `<p style="margin-top: 16px;"><a href="${orderDetails.signInUrl}" style="color: #215F9A; font-weight: bold;">Sign in to the portal</a></p>` : ''}
        </div>
        <div style="background-color: #215F9A; color: white; padding: 10px; text-align: center; font-size: 12px;">
          <p>Voxco Number Ordering Portal</p>
        </div>
      </div>
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
