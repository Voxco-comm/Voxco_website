import { createClient } from '@supabase/supabase-js'
import { NextRequest, NextResponse } from 'next/server'

// Create a Supabase client with service role key to bypass RLS
function createServiceRoleClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error('Missing Supabase environment variables for service role')
  }

  return createClient(supabaseUrl, supabaseAnonKey)
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { email, name, company_name, password_hash, message } = body

    if (!email || !name || !password_hash) {
      return NextResponse.json(
        { error: 'Email, name, and password are required' },
        { status: 400 }
      )
    }

    const supabase = createServiceRoleClient()

    // Check if a signup request with this email already exists
    const { data: existing } = await supabase
      .from('signup_requests')
      .select('id, status')
      .eq('email', email.trim())
      .single()

    if (existing) {
      if (existing.status === 'pending') {
        return NextResponse.json(
          { error: 'A signup request with this email already exists and is pending review.' },
          { status: 409 }
        )
      } else if (existing.status === 'approved') {
        return NextResponse.json(
          { error: 'This email has already been approved. Please sign in.' },
          { status: 409 }
        )
      }
      // If rejected, allow re-submission by deleting the old request
      await supabase
        .from('signup_requests')
        .delete()
        .eq('id', existing.id)
    }

    // Insert the signup request
    const { data, error } = await supabase
      .from('signup_requests')
      .insert({
        email: email.trim(),
        name: name.trim(),
        company_name: company_name?.trim() || null,
        password_hash: password_hash,
        message: message?.trim() || null,
        status: 'pending',
      })
      .select()
      .single()

    if (error) {
      console.error('Error creating signup request:', error)
      return NextResponse.json(
        { error: error.message || 'Failed to create signup request' },
        { status: 500 }
      )
    }

    return NextResponse.json({ success: true, data })
  } catch (err: any) {
    console.error('Signup request error:', err)
    return NextResponse.json(
      { error: err.message || 'Internal server error' },
      { status: 500 }
    )
  }
}


