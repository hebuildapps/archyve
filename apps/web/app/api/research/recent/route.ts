import { NextResponse } from 'next/server';
import { getRecentPapers } from '@/lib/db/supabase';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const papers = await getRecentPapers(10);
    return NextResponse.json({ papers });
  } catch (error: any) {
    console.error('API /api/research/recent error:', error);
    return NextResponse.json({ papers: [] }, { status: 500 });
  }
}
