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

const ALLOWED_CATEGORIES = new Set<string>([
  'Flooding (Street / Stream)',
  'Flash Flooding (Rapid Rise / Evacuation)',
  'Downed Tree / Blocked Road',
  'Power Outage / Downed Utility Lines',
  'Structural Property Damage',
  'Hail Sighting',
  'Funnel Cloud / Tornado Sighting',
  'Heavy Snow / Unplowed Drifts',
  'Ice Accumulation / Freezing Rain',
  'High Wind / Wind Damage',
  'Lightning / Thunderstorm Damage',
  'Smoke / Poor Air Quality',
  'Landslide / Sinkhole',
  'Coastal / High Surf Hazard',
  'Other Safety Hazard',
]);

function validateReport(report: CommunityReport): CommunityReport {
  const details = report.details.trim();
  const customHazard = report.customHazard?.trim() || undefined;
  const createdAt = new Date(report.createdAt).getTime();
  if (!Number.isFinite(report.point.lat) || report.point.lat < -90 || report.point.lat > 90 ||
      !Number.isFinite(report.point.lng) || report.point.lng < -180 || report.point.lng > 180) {
    throw new Error('Choose a valid location on the map before submitting a report.');
  }
  if (!ALLOWED_CATEGORIES.has(report.category)) throw new Error('Choose a hazard category from the list.');
  if (!details || details.length > 500) throw new Error('Report details must be between 1 and 500 characters.');
  if (customHazard && customHazard.length > 80) throw new Error('Custom hazard labels must be 80 characters or fewer.');
  if (!Number.isFinite(createdAt) || createdAt > Date.now() + 5 * 60_000 || createdAt < Date.now() - 24 * 60 * 60_000) {
    throw new Error('This report timestamp is invalid or too old. Create a new report.');
  }
  return { ...report, details, customHazard };
}

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
  const validReport = validateReport(report);
  const client = requireClient();
  const { data, error } = await client
    .from('community_reports')
    .insert({
      id: validReport.id,
      latitude: validReport.point.lat,
      longitude: validReport.point.lng,
      category: validReport.category,
      custom_hazard: validReport.customHazard ?? null,
      details: validReport.details,
      created_at: validReport.createdAt,
      expires_at: new Date(new Date(validReport.createdAt).getTime() + 24 * 60 * 60 * 1000).toISOString(),
    })
    .select('id, latitude, longitude, category, custom_hazard, details, created_at')
    .single();

  if (error) throw new Error(error.message);
  return fromRow(data as CommunityReportRow);
}
