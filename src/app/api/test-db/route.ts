import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@/lib/db';
export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function GET(request: NextRequest) {
  try {
    console.log('🔍 Testing database connection...');
    console.log('📌 DATABASE_URL exists:', !!process.env.DATABASE_URL);
    
    // Test query sederhana
    const result = await sql`SELECT NOW() as current_time, 1 as test`;
    
    return NextResponse.json({
      success: true,
      message: 'Database connected successfully!',
      data: result,
      environment: {
        hasDatabaseUrl: !!process.env.DATABASE_URL,
        nodeEnv: process.env.NODE_ENV,
      },
    });
  } catch (error) {
    console.error('❌ Database test error:', error);
    return NextResponse.json({
      success: false,
      message: 'Database connection failed',
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined,
    }, { status: 500 });
  }
}