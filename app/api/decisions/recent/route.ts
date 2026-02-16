import { NextResponse } from 'next/server';
import { getRecentDecisions } from '@/lib/supabase';

export async function GET() {
  try {
    const decisions = await getRecentDecisions(20);
    return NextResponse.json({ decisions });
  } catch (error: any) {
    console.error('Error fetching decisions:', error);
    return NextResponse.json(
      { error: 'Failed to fetch decisions' },
      { status: 500 }
    );
  }
}