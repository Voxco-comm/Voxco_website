import { NextRequest, NextResponse } from 'next/server'
import { sendEmail, emailTemplates, getNotificationEmail } from '@/lib/email'
import { createClient } from '@/lib/supabase/server'
import { createServiceRoleClient } from '@/lib/supabase/service-role'
import { isAdmin } from '@/lib/admin'

// Stored by the admin dashboard when a signup is rejected without a reason;
// it's a placeholder, not a real reason, so it is never shown to the applicant.
const DEFAULT_SIGNUP_REJECTED_REASON = 'Application rejected'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { type, data } = body

    const baseUrl =
      process.env.NEXT_PUBLIC_APP_URL ||
      process.env.NEXT_PUBLIC_SITE_URL ||
      (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : '')
    const signInUrl = data?.signInUrl || (baseUrl ? `${baseUrl}/sign-in` : '')

    const serviceClient = createServiceRoleClient()
    const supabaseForSettings = serviceClient ?? (await createClient())
    const notificationEmail = await getNotificationEmail(supabaseForSettings)

    let emailOptions: { to: string; subject: string; html: string } | null = null

    switch (type) {
      case 'new_order':
        if (notificationEmail) {
          const template = emailTemplates.newOrderAdmin({
            ...data,
            signInUrl,
            companyName: data?.companyName ?? data?.company_name,
          })
          emailOptions = {
            to: notificationEmail,
            subject: template.subject,
            html: template.html,
          }
        }
        break

      case 'order_status_update':
        if (data.customerEmail) {
          const template = emailTemplates.orderStatusUpdate({
            ...data,
            signInUrl,
            companyName: data?.companyName ?? data?.company_name,
          })
          emailOptions = {
            to: data.customerEmail,
            subject: template.subject,
            html: template.html,
          }
        }
        break

      case 'new_signup_request':
        if (notificationEmail) {
          const template = emailTemplates.newSignupRequest({
            ...data,
            companyName: data?.companyName ?? data?.company_name,
            signInUrl,
          })
          emailOptions = {
            to: notificationEmail,
            subject: template.subject,
            html: template.html,
          }
        }
        break

      case 'signup_approved':
        if (data.email) {
          const base = process.env.NEXT_PUBLIC_APP_URL || process.env.NEXT_PUBLIC_SITE_URL || ''
          const template = emailTemplates.signupApproved({
            ...data,
            signInUrl: signInUrl || (base ? `${base}/sign-in` : ''),
          })
          emailOptions = {
            to: data.email,
            subject: template.subject,
            html: template.html,
          }
        }
        break

      case 'signup_rejected': {
        // Trusted path: only an active admin may trigger this, and the
        // recipient, name and reason come from the database row — never from
        // the request body — so callers cannot direct mail to arbitrary
        // addresses or send it for a request that wasn't actually rejected.
        if (!(await isAdmin())) {
          return NextResponse.json({ error: 'Not authorized', code: 'FORBIDDEN' }, { status: 403 })
        }
        const requestId = data?.requestId
        if (!requestId || typeof requestId !== 'string') {
          return NextResponse.json({ error: 'Signup request ID is required', code: 'BAD_REQUEST' }, { status: 400 })
        }
        const { data: signupRequest, error: signupError } = await supabaseForSettings
          .from('signup_requests')
          .select('email, name, status, rejected_reason')
          .eq('id', requestId)
          .single()
        if (signupError || !signupRequest) {
          return NextResponse.json({ error: 'Signup request not found', code: 'NOT_FOUND' }, { status: 404 })
        }
        if (signupRequest.status !== 'rejected') {
          return NextResponse.json(
            { error: 'Signup request is not rejected', code: 'INVALID_STATUS' },
            { status: 409 }
          )
        }
        const reason =
          signupRequest.rejected_reason && signupRequest.rejected_reason !== DEFAULT_SIGNUP_REJECTED_REASON
            ? signupRequest.rejected_reason
            : undefined
        const template = emailTemplates.signupRejected({ name: signupRequest.name, reason })
        emailOptions = {
          to: signupRequest.email,
          subject: template.subject,
          html: template.html,
        }
        break
      }

      case 'test_notification':
        if (notificationEmail) {
          const template = emailTemplates.testNotification({ signInUrl })
          emailOptions = {
            to: notificationEmail,
            subject: template.subject,
            html: template.html,
          }
        }
        break

      default:
        return NextResponse.json({ error: 'Unknown email type', code: 'UNKNOWN_TYPE' }, { status: 400 })
    }

    if (!emailOptions) {
      return NextResponse.json(
        {
          error:
            'No notification recipient configured. Save an address in Admin → Settings, or set ADMIN_NOTIFICATION_EMAIL in the server environment.',
          code: 'NO_RECIPIENT',
        },
        { status: 400 }
      )
    }

    const result = await sendEmail(emailOptions)

    if (result.success) {
      return NextResponse.json({ success: true, messageId: result.messageId })
    }

    const smtpMissing = result.error === 'Email service not configured'
    return NextResponse.json(
      {
        error: smtpMissing
          ? 'SMTP is not configured. Set SMTP_HOST, SMTP_PORT, SMTP_USER, and SMTP_PASS (and optionally EMAIL_FROM) on the server.'
          : result.error || 'Failed to send email',
        code: smtpMissing ? 'SMTP_NOT_CONFIGURED' : 'SMTP_ERROR',
      },
      { status: 500 }
    )
  } catch (error: any) {
    console.error('Email API error:', error)
    return NextResponse.json(
      { error: error.message || 'Internal server error', code: 'INTERNAL' },
      { status: 500 }
    )
  }
}
