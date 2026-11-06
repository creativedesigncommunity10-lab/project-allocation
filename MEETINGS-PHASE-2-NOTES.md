# Meetings & Agenda — Phase 2 Frontend

## Included
- Added `Meetings & Agenda` to the existing navbar for all authenticated roles/divisions.
- Added Meetings overview with total/upcoming/meeting-minutes counts.
- Added compact calendar with Month, Week, and Day views.
- Added selected-date schedule and upcoming-meetings panels.
- Added searchable Meeting List and read-only Meeting Details modal.
- Added Create Meeting modal with date/time, online/offline type, optional project, location/link, agenda, description, and selected participants.
- Participant choices are loaded from the active division's existing User Management users through `meetingDirectory`.
- Uses existing `meetingList`, `meetingDirectory`, and `meetingCreate` APIs from Phase 1.
- Responsive layout for mobile screens.

## Not included yet
- Meeting editing/cancellation/status updates.
- Meeting Minutes create/edit/publish/PDF export.
- Action Items management/history.
- Attendance update workflow.
- Live Google Sheets / Netlify deployment test.

## Validation performed
- `node --check public/assets/js/app.js` passed.
- `node --check netlify/functions/api.mjs` passed.
- No Netlify deployment was performed.

## Deployment boundary
Continue only on `development-multi-division`. Do not merge to `main` or trigger a Production deployment before the user's stated date/approval.
