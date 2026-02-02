import { NextRequest, NextResponse } from 'next/server';
import { createClient, SupabaseClient } from '@supabase/supabase-js';

// Initialize Supabase client only if credentials are available
let supabase: SupabaseClient | null = null;

const getSupabaseClient = () => {
  if (supabase) return supabase;
  
  const supabaseUrl = process.env.SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SERVICE_KEY;
  
  if (!supabaseUrl || !supabaseKey) {
    return null;
  }
  
  supabase = createClient(supabaseUrl, supabaseKey);
  return supabase;
};

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { email, name, source, method, metadata } = body;

    if (!email) {
      return NextResponse.json(
        { success: false, message: 'Email is required' },
        { status: 400 }
      );
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return NextResponse.json(
        { success: false, message: 'Invalid email format' },
        { status: 400 }
      );
    }

    const client = getSupabaseClient();
    
    // If Supabase is not configured, log to console and return success
    if (!client) {
      console.log('Lead captured (Supabase not configured):', {
        email: email.toLowerCase().trim(),
        name,
        source,
        method,
        metadata,
        timestamp: new Date().toISOString(),
      });
      
      return NextResponse.json({
        success: true,
        message: 'Lead captured successfully (development mode)',
      });
    }

    // Store lead in Supabase
    const { error } = await client.from('marketing_leads').upsert({
      email: email.toLowerCase().trim(),
      name: name || null,
      source: source || 'website',
      method: method || 'email',
      metadata: metadata ? JSON.stringify(metadata) : null,
      created_at: new Date().toISOString(),
    }, {
      onConflict: 'email',
    });

    if (error) {
      console.error('Supabase error:', error);
      return NextResponse.json(
        { success: false, message: 'Failed to store lead' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Lead captured successfully',
    });
  } catch (error) {
    console.error('Leads API error:', error);
    return NextResponse.json(
      { success: false, message: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function GET() {
  return NextResponse.json({
    message: 'Leads API - POST to submit a lead',
  });
}
