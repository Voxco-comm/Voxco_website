import { createClient } from '@supabase/supabase-js'
import { NextRequest, NextResponse } from 'next/server'

// Create a Supabase client with service role key to use admin API
function createServiceRoleClient() {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

    if (!supabaseUrl || !supabaseServiceRoleKey) {
        throw new Error('Missing Supabase environment variables for service role')
    }

    return createClient(supabaseUrl, supabaseServiceRoleKey, {
        auth: {
            autoRefreshToken: false,
            persistSession: false,
        },
    })
}

// Find an existing auth user by email (paginates through all users).
async function findAuthUserByEmail(
    supabase: ReturnType<typeof createServiceRoleClient>,
    email: string
) {
    const target = email.trim().toLowerCase()
    const perPage = 1000
    for (let page = 1; page <= 50; page++) {
        const { data, error } = await supabase.auth.admin.listUsers({ page, perPage })
        if (error || !data) return null
        const found = data.users.find((u) => (u.email || '').toLowerCase() === target)
        if (found) return found
        if (data.users.length < perPage) return null
    }
    return null
}

export async function POST(request: NextRequest) {
    try {
        const body = await request.json()
        const { requestId, adminUserId } = body

        if (!requestId) {
            return NextResponse.json(
                { error: 'Request ID is required' },
                { status: 400 }
            )
        }

        const supabase = createServiceRoleClient()

        // Get the signup request
        const { data: signupRequest, error: fetchError } = await supabase
            .from('signup_requests')
            .select('*')
            .eq('id', requestId)
            .single()

        if (fetchError || !signupRequest) {
            return NextResponse.json(
                { error: 'Signup request not found' },
                { status: 404 }
            )
        }

        if (signupRequest.status !== 'pending') {
            return NextResponse.json(
                { error: 'This signup request has already been processed' },
                { status: 400 }
            )
        }

        // If an auth user already exists for this email, this is a re-approval of a
        // previously deleted/disabled user. Reset their password to the newly
        // submitted one and confirm their email so they can sign in immediately.
        const existingUser = await findAuthUserByEmail(supabase, signupRequest.email)
        if (existingUser) {
            const { error: updateUserError } = await supabase.auth.admin.updateUserById(existingUser.id, {
                password: signupRequest.password_hash,
                email_confirm: true,
                user_metadata: {
                    name: signupRequest.name,
                    message: signupRequest.message,
                },
            })

            if (updateUserError) {
                console.error('Error reactivating auth user:', updateUserError)
                return NextResponse.json(
                    { error: updateUserError.message || 'Failed to reactivate account' },
                    { status: 500 }
                )
            }

            // Mark the request approved
            await supabase
                .from('signup_requests')
                .update({
                    status: 'approved',
                    approved_by: adminUserId,
                    approved_at: new Date().toISOString(),
                })
                .eq('id', requestId)

            // Restore (or re-enable / create) their customer record
            try {
                const { data: existingCustomer } = await supabase
                    .from('customers')
                    .select('id')
                    .eq('user_id', existingUser.id)
                    .maybeSingle()
                if (existingCustomer) {
                    await supabase
                        .from('customers')
                        .update({ is_disabled: false, name: signupRequest.name, email: signupRequest.email })
                        .eq('id', existingCustomer.id)
                } else {
                    await supabase.from('customers').insert({
                        user_id: existingUser.id,
                        email: signupRequest.email,
                        name: signupRequest.name,
                    })
                }
            } catch (restoreErr) {
                console.warn('Failed to restore customer record for existing user:', restoreErr)
            }

            // Notify the customer their account is active again (email already confirmed)
            try {
                const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'
                await fetch(`${siteUrl}/api/send-email`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        type: 'signup_approved',
                        data: {
                            email: signupRequest.email,
                            name: signupRequest.name,
                            signInUrl: `${siteUrl}/sign-in`,
                        },
                    }),
                })
            } catch (emailErr) {
                console.warn('Failed to send approval email:', emailErr)
            }

            return NextResponse.json({
                success: true,
                message: 'Account reactivated with the new password.',
                userAlreadyExists: true,
            })
        }

        // Create auth user using signUp - this properly triggers the confirmation email
        const { data: authData, error: signUpError } = await supabase.auth.signUp({
            email: signupRequest.email,
            password: signupRequest.password_hash, // Use the password they provided during signup
            options: {
                data: {
                    name: signupRequest.name,
                    message: signupRequest.message,
                },
            },
        })

        if (signUpError) {
            console.error('Error creating auth user:', signUpError)
            return NextResponse.json(
                { error: signUpError.message || 'Failed to create user account' },
                { status: 500 }
            )
        }

        if (!authData.user) {
            return NextResponse.json(
                { error: 'Failed to create user - no user returned' },
                { status: 500 }
            )
        }

        // Update signup request status
        const { error: updateError } = await supabase
            .from('signup_requests')
            .update({
                status: 'approved',
                approved_by: adminUserId,
                approved_at: new Date().toISOString(),
            })
            .eq('id', requestId)

        if (updateError) {
            console.error('Error updating signup request:', updateError)
            // Don't fail the whole operation if just the status update fails
        }

        // Create customer record
        const { error: customerError } = await supabase
            .from('customers')
            .insert({
                user_id: authData.user.id,
                email: signupRequest.email,
                name: signupRequest.name,
            })

        if (customerError) {
            console.error('Error creating customer record:', customerError)
            // Don't fail the whole operation if customer creation fails
        }

        // Send approval notification email
        try {
            const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'
            await fetch(`${siteUrl}/api/send-email`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    type: 'signup_approved',
                    data: {
                        email: signupRequest.email,
                        name: signupRequest.name,
                        signInUrl: `${siteUrl}/sign-in`,
                    },
                }),
            })
        } catch (emailErr) {
            console.warn('Failed to send approval email:', emailErr)
        }

        return NextResponse.json({
            success: true,
            message: `User ${signupRequest.email} has been created. A confirmation email has been sent.`,
            userId: authData.user.id,
        })
    } catch (err: any) {
        console.error('Approve signup error:', err)
        return NextResponse.json(
            { error: err.message || 'Internal server error' },
            { status: 500 }
        )
    }
}

