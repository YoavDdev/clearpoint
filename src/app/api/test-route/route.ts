import { NextResponse } from 'next/server';

export async function GET() {
  return NextResponse.json({ 
    success: true, 
    message: 'Test route works!' 
  });
}

export async function POST() {
  return NextResponse.json({ 
    success: true, 
    message: 'POST works!' 
  });
}
