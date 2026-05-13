import dbConnect from './db';
import { Settings } from '@/models';

/**
 * Verifies the admin secret against the database.
 * If the database has no settings yet, authentication is considered unconfigured.
 */
export async function verifyAuth(secret: string | null): Promise<boolean> {
  if (!secret) return false;
  
  await dbConnect();
  
  // Find the settings document
  const settings = await Settings.findOne();
  
  // If no settings exist yet, we are in initial setup mode.
  // Note: Initial setup is handled specially in the /api/settings route.
  if (!settings || !settings.adminSecret) {
    return false;
  }
  
  // Verify against the dynamic secret in the DB
  return secret === settings.adminSecret;
}
