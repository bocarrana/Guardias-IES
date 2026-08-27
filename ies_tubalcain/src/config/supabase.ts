import { createClient, SupabaseClient } from '@supabase/supabase-js';

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL as string;
const SUPABASE_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY as string;

if (!SUPABASE_URL || !SUPABASE_KEY) {
    console.error('❌ Supabase environment variables are missing. Check your .env file.');
}

export const supabase: SupabaseClient = createClient(SUPABASE_URL, SUPABASE_KEY);

// Storage buckets
export const BUCKET_PHOTOS = 'Fotos';
export const BUCKET_LOGOS = 'Logos';

// Logo URLs
export const LOGO_DARK_URL = '/logo.png';
export const LOGO_LIGHT_URL = '/logo.png';

// Helper: get public URL for a storage path
export const getStorageUrl = (path: string | undefined, bucket: string = BUCKET_PHOTOS): string => {
    if (!path) return '';
    if (path.startsWith('http')) return path;
    const { data } = supabase.storage.from(bucket).getPublicUrl(path);
    return data.publicUrl;
};
