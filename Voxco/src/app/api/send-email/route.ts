import { NextRequest, NextResponse } from 'next/server'
import { sendEmail, emailTemplates, getNotificationEmail } from '@/lib/email'
import { createClient } from '@/lib/supabase/server'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { type, data } = body

    const supabase = await createClient()
    const baseUrl =
      process.env.NEXT_PUBLIC_APP_URL ||
      process.env.NEXT_PUBLIC_SITE_URL ||
      (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : '')
    const signInUrl = data?.signInUrl || (baseUrl ? `${baseUrl}/sign-in` : '')

    // Get notification email for admin notifications
    const notificationEmail = await getNotificationEmail(supabase)

    let emailOptions: { to: string; subject: string; html: string } | null = null

    switch (type) {
      case 'new_order':
        // Send to admin notification email
        if (notificationEmail) {
          const template = emailTemplates.newOrderAdmin({ ...data, signInUrl, companyName: data?.companyName ?? data?.company_name })
          emailOptions = {
            to: notificationEmail,
            subject: template.subject,
            html: template.html,
          }
        }
        break

      case 'order_status_update':
        // Send to customer
        if (data.customerEmail) {
          const template = emailTemplates.orderStatusUpdate({ ...data, signInUrl, companyName: data?.companyName ?? data?.company_name })
          emailOptions = {
            to: data.customerEmail,
            subject: template.subject,
            html: template.html,
          }
        }
        break

      case 'new_signup_request':
        // Send to admin notification email
        if (notificationEmail) {
          const template = emailTemplates.newSignupRequest({ ...data, companyName: data?.companyName ?? data?.company_name, signInUrl })
          emailOptions = {
            to: notificationEmail,
            subject: template.subject,
            html: template.html,
          }
        }
        break

      case 'signup_approved':
        // Send to the new user
        if (data.email) {
          const base = process.env.NEXT_PUBLIC_APP_URL || process.env.NEXT_PUBLIC_SITE_URL || ''
          const template = emailTemplates.signupApproved({ ...data, signInUrl: signInUrl || (base ? `${base}/sign-in` : '') })
          emailOptions = {
            to: data.email,
            subject: template.subject,
            html: template.html,
          }
        }
        break

      default:
        return NextResponse.json(
          { error: 'Unknown email type' },
          { status: 400 }
        )
    }

    if (!emailOptions) {
      return NextResponse.json(
        { error: 'No recipient email configured' },
        { status: 400 }
      )
    }

    const result = await sendEmail(emailOptions)

    if (result.success) {
      return NextResponse.json({ success: true, messageId: result.messageId })
    } else {
      return NextResponse.json(
        { error: result.error || 'Failed to send email' },
        { status: 500 }
      )
    }
  } catch (error: any) {
    console.error('Email API error:', error)
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    )
  }
}
