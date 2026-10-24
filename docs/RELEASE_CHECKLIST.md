# AlertLens pre-submission release checklist

Use this checklist on the production deployment and record the date/browser used. A successful build is not proof that live NWS data or every user workflow works.

## Automated checks

Run locally from the repository root:

- [ ] `npm ci`
- [ ] `npm run typecheck`
- [ ] `npm test`
- [ ] `npm run lint`
- [ ] `npm run build`

After pushing, confirm the matching Vercel production deployment reaches **Ready** and inspect the build logs for warnings/errors.

## Live-data workflows

- [ ] First visit: welcome dialog offers device location and manual city/address/ZIP search.
- [ ] Deny device location: manual search remains usable and no crash occurs.
- [ ] Select a second location: the selected-location label, active alert results, forecast, and map all update; old-location alerts do not flash as current.
- [ ] Location with no active point alerts: the interface says no alerts were returned, does not claim an all-clear, and does not show a duplicate empty Active Alerts panel.
- [ ] Location with active alerts: each item has understandable hazard/severity/timing/area context and an official source link.
- [ ] Force an NWS/API failure or use browser network throttling: errors/staleness are visible, and failure is never presented as “no hazards.”
- [ ] Forecast: point forecast loads or shows a clear fallback without breaking alert status.
- [ ] Confirm all external source links open the expected official NWS destination.

## Map and simulation

- [ ] Map legend distinguishes NWS alert boundaries from base-map colors and community pins.
- [ ] Select an alert and verify its details, map focus, and preparedness guidance agree.
- [ ] Run each Simulation Lab scenario. The simulation banner remains visible, synthetic data is clearly labeled, and live forecast/outlook content is hidden while simulating.
- [ ] Exit simulation and verify live fetching resumes and the app returns to the default location without retaining synthetic alerts.
- [ ] Check map interaction and report placement on a narrow/mobile viewport.

## Community reports

- [ ] Submit a report at the selected location and via map pin; confirm category, text, pin, and timestamp render correctly.
- [ ] Confirm reports are visibly labeled **unverified** and never appear as official alerts.
- [ ] With Supabase available, submit a report and verify it appears in a separate browser/device.
- [ ] With shared storage unavailable, verify the app explains browser-local fallback and does not falsely claim the report is shared.
- [ ] Try blank/overlong details, invalid coordinates, and a custom label over the limit; the client/database should reject invalid input.
- [ ] Confirm reports older than 24 hours disappear and database expiration rules reject invalid expiry windows.
- [ ] Review database RLS policies before release. Public submissions are anonymous; do not claim strong spam/rate-limit protection without a server-side control.

## UX, accessibility, and final judging pass

- [ ] At 320px mobile width and desktop width: no horizontal page overflow, clipped controls, or inaccessible map/report actions.
- [ ] Use keyboard Tab/Shift+Tab/Enter/Space on location search, alert selection, simulation dialog, outlook expand/collapse, and report form.
- [ ] Focus indicators are visible; modal dialogs can be closed and do not trap users after closing.
- [ ] Check text contrast and confirm hazard meaning is not conveyed by color alone.
- [ ] Verify page title, description, project/source links, attribution, and safety disclaimer.
- [ ] Have someone unfamiliar with the project complete the core flow without verbal help; write down where they hesitate and fix the biggest friction point.

## Demonstration outline

1. Select a location and explain the distinction between active alerts and the point forecast.
2. Open an official alert (or use a clearly labeled simulation if live conditions do not provide one) and show its geographic context and next steps.
3. Run a simulation to demonstrate the inside/outside/unknown boundary interaction without presenting it as live data.
4. Show a community report and explicitly identify it as unverified.
5. Close with the technical decisions, data sources, known limitations, and what you personally built.
