import { NextRequest, NextResponse } from 'next/server'
import { sendEmail } from '@/lib/email'

/**
 * Dev-only endpoint to test SMTP configuration.
 * GET /api/test-smtp?to=your@email.com
 * If "to" is omitted, sends to SMTP_USER from .env.
 */
export async function GET(request: NextRequest) {
  if (process.env.NODE_ENV !== 'development') {
    return NextResponse.json(
      { error: 'Test SMTP is only available in development' },
      { status: 403 }
    )
  }

  const to =
    request.nextUrl.searchParams.get('to') ||
    process.env.SMTP_USER ||
    process.env.EMAIL_FROM

  if (!to) {
    return NextResponse.json(
      {
        error:
          'No recipient. Add ?to=your@email.com or set SMTP_USER in .env',
      },
      { status: 400 }
    )
  }

  const result = await sendEmail({
    to,
    subject: 'Voxco SMTP test',
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px;">
        <h2 style="color: #215F9A;">SMTP test successful</h2>
        <p>If you received this, your SMTP settings in .env are working.</p>
        <p><small>Sent at ${new Date().toISOString()}</small></p>
      </div>
    `,
  })

  if (result.success) {
    return NextResponse.json({
      success: true,
      message: `Test email sent to ${to}`,
      messageId: result.messageId,
    })
  }

  return NextResponse.json(
    { success: false, error: result.error },
    { status: 500 }
  )
}
