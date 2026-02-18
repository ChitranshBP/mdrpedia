import { createClient } from '@supabase/supabase-js';
import { createLogger } from './logger';

const log = createLogger('Supabase');
const supabaseUrl = import.meta.env.PUBLIC_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
    log.warn('Supabase URL or Anon Key is missing. Check your .env file.');
}

/**
 * Supabase Client
 * Authenticated client for interacting with the MDRPedia database.
 * Use this for client-side queries or public data access.
 */
export const supabase = createClient(
    supabaseUrl || 'https://placeholder.supabase.co',
    supabaseAnonKey || 'placeholder-key'
);

/**
 * Admin Client (Function Context Only)
 * For secure backend operations, use within API routes only if SERVICE_ROLE_KEY is available.
 */
export const getServiceSupabase = () => {
    const serviceKey = import.meta.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!serviceKey) return null;

    return createClient(supabaseUrl!, serviceKey);
};
