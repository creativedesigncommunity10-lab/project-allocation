# Meetings & Agenda — Phase 3: Meeting Minutes

## Included
- Hybrid MoM creation: link to an existing meeting or create a standalone MoM.
- Linked MoM inherits meeting title, date, time, project, and participant names as an editable participant snapshot (date/time remain tied to the linked meeting).
- Standalone MoM supports manual title, date, optional time, optional project, and free-text participants.
- Rich text for Summary, Discussion, and Decisions: bold, italic, underline, headings, paragraph, bullet/numbered lists, alignment, and hyperlinks.
- Action Items are simple follow-up text items only. No assignee, target date, priority, or status workflow is exposed.
- MoM list and calendar entries; PDF export uses a print-ready document and the browser's Save as PDF flow.
- Division scope is enforced by the existing authenticated backend context.

## Required Google Sheets header update
The existing `Meeting_Minutes` tab previously had 16 columns (A:P). Add these two headers without changing existing columns:
- Q1: `MeetingTime`
- R1: `Participants`

The backend now validates `Meeting_Minutes` through column R. Participants are stored as a JSON array in column R. Meeting time is stored in Q.

The existing `Action_Items` tab and its 13-column header remain unchanged for compatibility. For this simple MoM workflow, new action item rows populate only ID, MoMID, DivisionID, Title, CreatedBy, CreatedAt, and UpdatedAt; the assignment/priority/due-date/status columns remain blank.

## PDF export behavior
Export opens a print-ready document in a new browser tab/window and invokes the browser print dialog. Choose **Save as PDF**. The app does not email or externally send the PDF, and it does not automatically upload a PDF file to Drive or populate `PDFURL`.

## Validation
- `node --check` passed for `netlify/functions/api.mjs`.
- `node --check` passed for `public/assets/js/app.js`.
- Runtime integration against the live Google Sheets and Netlify deployment has not been performed in this environment.
