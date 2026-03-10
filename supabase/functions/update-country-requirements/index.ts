// @ts-nocheck

import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // Initialize Supabase client
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false
        }
      }
    )

    // Parse request body
    const body = await req.json().catch(() => ({}))
    const { country_id, country_name, country_code, provider } = body

    // If specific country provided, update only that one
    if (country_id || country_name) {
      let country

      if (country_id) {
        const { data, error } = await supabaseClient
          .from('countries')
          .select('*')
          .eq('id', country_id)
          .single()

        if (error) throw error
        country = data
      } else if (country_name) {
        const { data, error } = await supabaseClient
          .from('countries')
          .select('*')
          .eq('name', country_name)
          .single()

        if (error) throw error
        country = data
      }

      if (!country) {
        throw new Error('Country not found')
      }

      // Call Next.js API route to fetch requirements using LLM
      const nextjsUrl = Deno.env.get('NEXTJS_API_URL') || 'http://voxco.vercel.app'
      const apiResponse = await fetch(`${nextjsUrl}/api/country-requirements`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          countryName: country.name,
          countryCode: country.country_code,
          provider: provider || null,
        }),
      })

      if (!apiResponse.ok) {
        throw new Error('Failed to fetch requirements from API')
      }

      const { requirements, prefix_area_code } = await apiResponse.json()

      // Update country requirements
      const { error: updateError } = await supabaseClient.rpc('update_country_requirements', {
        p_country_id: country.id,
        p_requirements: requirements,
        p_prefix_area_code: prefix_area_code,
        p_updated_by: 'edge_function'
      })

      if (updateError) {
        throw updateError
      }

      return new Response(
        JSON.stringify({
          success: true,
          message: `Country requirements updated for ${country.name}`,
          country_id: country.id
        }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 200,
        },
      )
    }

    // If no specific country, update all countries (for cron job)
    const { data: countries, error: countriesError } = await supabaseClient
      .from('countries')
      .select('id, name, country_code')

    if (countriesError) throw countriesError

    const nextjsUrl = Deno.env.get('NEXTJS_API_URL') || 'http://localhost:3000'
    const updateResults = []

    for (const country of countries || []) {
      try {
        // Call Next.js API route
        const apiResponse = await fetch(`${nextjsUrl}/api/country-requirements`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            countryName: country.name,
            countryCode: country.country_code,
          }),
        })

        if (!apiResponse.ok) {
          console.error(`Failed to fetch requirements for ${country.name}`)
          continue
        }

        const { requirements, prefix_area_code } = await apiResponse.json()

        // Update country
        const { error: updateError } = await supabaseClient.rpc('update_country_requirements', {
          p_country_id: country.id,
          p_requirements: requirements,
          p_prefix_area_code: prefix_area_code,
          p_updated_by: 'edge_function_cron'
        })

        if (updateError) {
          console.error(`Error updating ${country.name}:`, updateError)
        } else {
          updateResults.push({ country: country.name, success: true })
        }
      } catch (err) {
        console.error(`Error processing ${country.name}:`, err)
        updateResults.push({ country: country.name, success: false, error: err.message })
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        message: 'Country requirements update completed',
        results: updateResults
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      },
    )
  } catch (error: any) {
    return new Response(
      JSON.stringify({ error: error.message || 'Unknown error' }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      },
    )
  }
})