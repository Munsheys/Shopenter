import { NextResponse } from 'next/server';
import mongoose from 'mongoose';
import dbConnect from '@/lib/db';

export async function GET() {
  const rawUri = process.env.MONGODB_URI || 'NOT_FOUND';
  
  // Mask the URI for safety
  let maskedUri = 'INVALID_FORMAT';
  try {
    const match = rawUri.match(/^(mongodb(?:\+srv)?:\/\/)([^:]+):([^@]+)@(.+)$/);
    if (match) {
      const [, scheme, user, pass, rest] = match;
      maskedUri = `${scheme}${user.substring(0, 2)}***:${pass.substring(0, 2)}***@${rest}`;
    }
  } catch (e) {
    maskedUri = 'ERROR_MASKING';
  }

  const results = {
    envFound: rawUri !== 'NOT_FOUND',
    maskedUri: maskedUri,
    connectionState: mongoose.connection.readyState,
    readyStateMap: {
      0: 'disconnected',
      1: 'connected',
      2: 'connecting',
      3: 'disconnecting'
    }
  };

  try {
    await dbConnect();
    return NextResponse.json({
      status: 'SUCCESS',
      message: 'Database connected successfully!',
      ...results,
      activeDatabase: mongoose.connection.db?.databaseName
    });
  } catch (error: any) {
    return NextResponse.json({
      status: 'FAILED',
      error: error.message,
      ...results
    }, { status: 500 });
  }
}
