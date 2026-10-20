# AlertLens

**A location-aware interface for understanding official weather alerts and their geographic context.**

AlertLens brings active National Weather Service (NWS) alerts and nearby observations into a map-centered interface. It is an independent civic-information project designed to make alert details easier to inspect and interpret.

> **Safety note:** AlertLens is not an emergency service and is not a substitute for official NWS alerts, local emergency management, or instructions from public-safety officials. Data can be delayed, unavailable, or incomplete. Always verify urgent information with official sources.

## What it does

- **Location search:** search for a place and view weather alerts around that location
- **Impact map:** display alert areas and map context using geographic data
- **Alert details:** inspect normalized alert information and relevant instructions
- **Nearby observations:** retrieve available observations from nearby weather stations
- **Refresh and status indicators:** show loading, freshness, and data-coverage information
- **Session timeline:** track alert changes observed during the current session
- **Preparedness guidance:** show general, hazard-specific reminders alongside official alert details
- **Simulation lab:** explore clearly labeled synthetic scenarios without confusing them with live weather
- **Community reports:** collect categorized local hazard observations; shared storage requires a configured Supabase backend

AlertLens queries the public NWS API for weather information and uses OpenStreetMap Nominatim for address search. Community reports are supplementary user-submitted observations, not verified official reports.

## Technology

- React and TypeScript
- Vite
- Tailwind CSS
- Leaflet and React Leaflet
- Turf.js for geographic operations
- Supabase client for optional shared community-report storage
- National Weather Service API
- OpenStreetMap Nominatim

## Run locally

Requires Node.js and npm.

```bash
git clone https://github.com/SrinidhiKotteswaran/AlertLens.git
cd AlertLens
npm install
npm run dev
```

Open the local URL printed by Vite.

## Optional community-report backend

The core weather-alert interface uses the public NWS API. To enable shared community reports, configure a Supabase project and provide the client-side environment variables in a local `.env` file:

```bash
VITE_SUPABASE_URL=https://your-project-ref.supabase.co
VITE_SUPABASE_ANON_KEY=your-supabase-publishable-key
```

The required `community_reports` table and its access policies must exist in that project. Never expose a Supabase service-role key in a browser application. If the backend is not configured, shared community-report storage is unavailable; the app has a local browser-storage fallback for reports.

## Quality checks

The repository defines these scripts:

```bash
npm test
npm run typecheck
npm run lint
npm run build
```

## Data sources and attribution

- **Weather alerts and observations:** [National Weather Service API](https://www.weather.gov/documentation/services-web-api)
- **Address search:** [OpenStreetMap Nominatim](https://nominatim.org/)
- **Map library:** [Leaflet](https://leafletjs.com/) and [React Leaflet](https://react-leaflet.js.org/)

Respect each provider's usage policies and attribution requirements when deploying or extending the application.

## Project status

The source code contains live-data, mapping, simulation, and community-report workflows. A public deployment link is not listed here; use the repository to inspect the implementation and run it locally.

## Developer

Built by [Srinidhi Kotteswaran](https://github.com/SrinidhiKotteswaran).
