import { NextResponse } from 'next/server'

// PDF processing is disabled due to build compatibility issues
// PDFs should be uploaded directly and processed by admin manually
export async function POST() {
  return NextResponse.json(
    {
      error: 'PDF processing is not available. Please upload CSV or Excel files instead.',
      success: false
    },
    { status: 400 }
  )
}


