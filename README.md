# AlertLens

**A location-aware civic safety app that helps people understand official weather alerts.**

[**Open the live app →**](https://alert-lens.vercel.app/)

AlertLens connects National Weather Service (NWS) alerts to a location a person chooses, then brings the map, alert details, practical next steps, and recent community observations into one place. The goal is to make official weather information easier to navigate—not to replace the agencies responsible for emergency warnings.

## Try the app

1. **Choose a U.S. location.** Search for a city, address, or ZIP code.
2. **Check the status.** Review the latest available NWS alert information and its freshness/coverage indicators.
3. **Explore the map.** Select an alert area to inspect its geographic context.
4. **Review next steps.** Read the official alert and general preparedness guidance.
5. **Try the Simulation Lab.** Explore a clearly labeled synthetic scenario without confusing it with live weather.
6. **Explore community reports.** Reports are user-submitted, unverified, timestamped, and expire after 24 hours.

## Safety and data integrity

- **Official alerts:** Weather alert data comes from the public NWS API.
- **Freshness matters:** If a request fails or data may be stale, the interface should say so rather than implying conditions are clear.
- **No false all-clear:** “No active alerts returned” is not a guarantee of safe conditions.
- **Simulation is not live:** Synthetic scenarios are labeled separately from live data.
- **Community reports are unverified:** They are supplementary observations, not official warnings.
- **Emergency use:** AlertLens is an independent student project, not an emergency service. Always follow official NWS alerts, local emergency management, and public-safety instructions.

## Features

- Location search and selected-location weather checks
- Current active NWS alerts with freshness/error states
- Map-based geographic context for official alert areas
- Alert severity, affected-area context, and official-source links
- Loading, freshness, error, and coverage status
- Nearby weather-station observations
- Session alert timeline
- Hazard-specific general preparedness reminders
- Simulation Lab with synthetic scenarios
- Community hazard reports with local browser-storage fallback and optional shared storage
- Input validation in the client and database constraints for report coordinates, categories, text length, and expiry

## Built with

- React, TypeScript, and Vite
- Tailwind CSS
- Leaflet and React Leaflet
- Turf.js for geographic operations
- National Weather Service API
- OpenStreetMap / Nominatim for map and place-search functionality
- Supabase client for optional shared community-report storage

## Architecture and trust boundaries

- `src/lib/nwsClient.ts` retrieves official active alerts, NWS point metadata, and nearby observation data.
- `src/components/LocalForecastOutlook.tsx` presents the selected point's forecast.
- `src/components/ImpactMap.tsx` displays official alert geometry and separately styled community reports.
- `src/lib/simulation.ts` supplies synthetic demo scenarios. Simulation records are not live NWS alerts.
- `src/lib/communityReports.ts` validates submissions before they reach Supabase. Database constraints independently restrict valid coordinates, categories, text lengths, and expiration windows.

Community reports are anonymous and unverified. Client-side validation and database constraints reduce malformed submissions but are **not** a substitute for server-side abuse/rate limiting. Do not use community reports as emergency warnings.

## Run locally

Requires Node.js and npm.

```bash
git clone https://github.com/SrinidhiKotteswaran/AlertLens.git
cd AlertLens
npm install
npm run dev
```

Open the local URL printed by Vite.

## Optional shared community-report backend

The core weather-alert interface uses the public NWS API. To enable shared community reports, configure a Supabase project and add these client-side environment variables to a local `.env` file:

```env
VITE_SUPABASE_URL=https://your-project-ref.supabase.co
VITE_SUPABASE_ANON_KEY=your-supabase-publishable-key
```

The `community_reports` table and its access policies must be configured in that project. Never put a Supabase service-role key in a browser application. If the backend is not configured, shared storage is unavailable and reports use the browser's local-storage fallback.

## Quality checks

Run the project's checks before proposing changes:

```bash
npm run typecheck
npm test
npm run lint
npm run build
```

## Data sources and attribution

- [National Weather Service API documentation](https://www.weather.gov/documentation/services-web-api)
- [OpenStreetMap Nominatim](https://nominatim.org/)
- [Leaflet](https://leafletjs.com/) and [React Leaflet](https://react-leaflet.js.org/)

Respect provider usage policies and attribution requirements.

## Project

Built by [Srinidhi Kotteswaran](https://github.com/SrinidhiKotteswaran).

Source code: [github.com/SrinidhiKotteswaran/AlertLens](https://github.com/SrinidhiKotteswaran/AlertLens)
