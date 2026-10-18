import { createClient } from '@supabase/supabase-js';
import type { CommunityReport } from '@/components/ImpactMap';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

const supabase = supabaseUrl && supabaseKey
  ? createClient(supabaseUrl, supabaseKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    })
  : null;

type CommunityReportRow = {
  id: string;
  latitude: number;
  longitude: number;
  category: CommunityReport['category'];
  custom_hazard: string | null;
  details: string;
  created_at: string;
};

function requireClient() {
  if (!supabase) {
    throw new Error('Shared community reports are not configured for this deployment.');
  }
  return supabase;
}

function fromRow(row: CommunityReportRow): CommunityReport {
  return {
    id: row.id,
    point: { lat: row.latitude, lng: row.longitude },
    category: row.category,
    customHazard: row.custom_hazard ?? undefined,
    details: row.details,
    createdAt: row.created_at,
  };
}

export async function fetchCommunityReports(): Promise<CommunityReport[]> {
  const client = requireClient();
  const { data, error } = await client
    .from('community_reports')
    .select('id, latitude, longitude, category, custom_hazard, details, created_at')
    .gt('expires_at', new Date().toISOString())
    .order('created_at', { ascending: false })
    .limit(500);

  if (error) throw new Error(error.message);
  return (data as CommunityReportRow[]).map(fromRow);
}

export async function insertCommunityReport(report: CommunityReport): Promise<CommunityReport> {
  const client = requireClient();
  const { data, error } = await client
    .from('community_reports')
    .insert({
      id: report.id,
      latitude: report.point.lat,
      longitude: report.point.lng,
      category: report.category,
      custom_hazard: report.customHazard ?? null,
      details: report.details,
    })
    .select('id, latitude, longitude, category, custom_hazard, details, created_at')
    .single();

  if (error) throw new Error(error.message);
  return fromRow(data as CommunityReportRow);
}
