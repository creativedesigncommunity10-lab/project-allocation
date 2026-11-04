import { google } from "googleapis";
import crypto from "node:crypto";
import { AsyncLocalStorage } from "node:async_hooks";

const TZ = "Asia/Jakarta";
const DIVISIONS = {
  "UI/UX": process.env.SPREADSHEET_ID_UI_UX || process.env.SPREADSHEET_ID,
  "Digital Marketing": process.env.SPREADSHEET_ID_DIGITAL_MARKETING,
  "Designer": process.env.SPREADSHEET_ID_DESIGNER,
  "Admin": process.env.SPREADSHEET_ID_ADMIN
};
const DIVISION_NAMES = Object.keys(DIVISIONS);
const DEFAULT_ACTIVITY_TYPES = {
  "Digital Marketing": ["Aplikas","MBPS","MECS","Phincon","Phintech","MSS","Phintraco Group","Effist","Saldoo","emeteraiku","PNK","Shanata","Internal","RaiseCall","Natha Gadai","Nathara","Natharu","[POC] BSN","[POC] GYS","Onboarding","Others","Phintas - Profits","Trans Food","Soraba"],
  "Designer": ["Aplikas","MBPS","MECS","Phincon","Phintech","MSS","Phintraco Group","Effist","Saldoo","emeteraiku","PNK","Shanata","Internal","RaiseCall","Natha Gadai","Nathara","Branding","HR","Other","Special Request","SEAITI","Natha Farm","[POC] BSN","[POC] GYS","Onboarding","Others","Phintas - Profits","Trans Food"],
  "Admin": ["Aplikas","MBPS","MECS","Phincon","Phintech","MSS","Phintraco Group","Effist","Saldoo","emeteraiku","PNK","Shanata","Internal","RaiseCall","Natha Gadai","Nathara","Soraba","Natharu","[POC] BSN","[POC] GYS","Onboarding","Others","Phintas - Profits","Trans Food"]
};

const requestContext = new AsyncLocalStorage();
function spreadsheetId() { const id = requestContext.getStore()?.spreadsheetId; if (!id) fail("Division database context is missing.",500); return id; }
function divisionFor(id) { return DIVISION_NAMES.find(name => DIVISIONS[name] === id); }
const RESERVED = ["Users", "Projects", "Audit_Log", "2026 Master All", "Summary 2026", "Master chart"];
const HDR = ["Day & Date", "Team Name", "Activity Type (Nama PT/Project)", "Task / Deliverables", "Time Allocated (% - 100% for 1 Day)"];
const HEADERS = {
  Users: ["UserID", "Username", "FullName", "MemberSheet", "Role", "Status", "Salt", "Hash"],
  Projects: ["ProjectID", "Name", "Status", "CreatedBy", "CreatedAt"],
  Audit_Log: ["LogID", "Timestamp", "User", "Member", "Action", "ActivityDate", "Previous", "New"]
};

let sheetsClient;
const sheetMeta = new Map();

function clean(v) {
  return String(v ?? "").replace(/[\u200B-\u200D\uFEFF]/g, "").trim();
}
function fail(message, status = 400, code) {
  const e = new Error(message);
  e.status = status;
  if (code) e.code = code;
  throw e;
}
function requiredEnv() {
  if (!spreadsheetId()) fail("Missing spreadsheet configuration for this division.", 500);
  if (!process.env.GOOGLE_SERVICE_ACCOUNT_JSON) fail("Missing GOOGLE_SERVICE_ACCOUNT_JSON environment variable.", 500);
  if (!process.env.SESSION_SECRET || process.env.SESSION_SECRET.length < 32) fail("SESSION_SECRET must contain at least 32 characters.", 500);
}
function client() {
  requiredEnv();
  if (sheetsClient) return sheetsClient;
  let credentials;
  try { credentials = JSON.parse(process.env.GOOGLE_SERVICE_ACCOUNT_JSON); }
  catch { fail("GOOGLE_SERVICE_ACCOUNT_JSON is not valid JSON.", 500); }
  const auth = new google.auth.GoogleAuth({
    credentials,
    scopes: ["https://www.googleapis.com/auth/spreadsheets"]
  });
  sheetsClient = google.sheets({ version: "v4", auth });
  return sheetsClient;
}
async function metadata(refresh = false) {
  const db = spreadsheetId();
  if (sheetMeta.has(db) && !refresh) return sheetMeta.get(db);
  const r = await client().spreadsheets.get({ spreadsheetId: db });
  const meta = new Map((r.data.sheets || []).map(s => [s.properties.title, {
    sheetId: s.properties.sheetId,
    title: s.properties.title,
    rowCount: s.properties.gridProperties?.rowCount || 1000
  }]));
  sheetMeta.set(db, meta);
  return meta;
}
async function ensureTab(name, header) {
  let meta = await metadata();
  if (!meta.has(name)) {
    await client().spreadsheets.batchUpdate({
      spreadsheetId: spreadsheetId(),
      requestBody: { requests: [{ addSheet: { properties: { title: name } } }] }
    });
    sheetMeta.delete(spreadsheetId());
    meta = await metadata(true);
  }
  const values = await read(`${quoteSheet(name)}!A1:${columnLetter(header.length)}1`);
  if (!values.length || values.every(v => v === "")) {
    await client().spreadsheets.values.update({
      spreadsheetId: spreadsheetId(),
      range: `${quoteSheet(name)}!A1:${columnLetter(header.length)}1`,
      valueInputOption: "RAW",
      requestBody: { values: [header] }
    });
  }
  return meta.get(name);
}
function quoteSheet(name) { return `'${String(name).replace(/'/g, "''")}'`; }
function columnLetter(n) {
  let s = "";
  while (n > 0) { const r = (n - 1) % 26; s = String.fromCharCode(65 + r) + s; n = Math.floor((n - 1) / 26); }
  return s;
}
async function read(range, options = {}) {
  const r = await client().spreadsheets.values.get({
    spreadsheetId: spreadsheetId(),
    range,
    valueRenderOption: options.valueRenderOption || "UNFORMATTED_VALUE",
    dateTimeRenderOption: "SERIAL_NUMBER"
  });
  return r.data.values || [];
}
async function write(range, values, input = "RAW") {
  return client().spreadsheets.values.update({
    spreadsheetId: spreadsheetId(), range, valueInputOption: input,
    requestBody: { values }
  });
}
async function append(range, values, input = "RAW") {
  return client().spreadsheets.values.append({
    spreadsheetId: spreadsheetId(), range, valueInputOption: input,
    insertDataOption: "INSERT_ROWS", requestBody: { values }
  });
}
async function lastRow(name) {
  const rows = await read(`${quoteSheet(name)}!A:A`);
  return rows.length;
}
function serialToDate(v) {
  if (typeof v === "number") {
    const d = new Date(Date.UTC(1899, 11, 30) + v * 86400000);
    return `${d.getUTCFullYear()}-${String(d.getUTCMonth()+1).padStart(2,"0")}-${String(d.getUTCDate()).padStart(2,"0")}`;
  }
  if (v instanceof Date) return v.toISOString().slice(0, 10);
  const s = String(v ?? "").trim();
  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return s;
  if (/^\d{1,2}\/\d{1,2}\/\d{4}$/.test(s)) {
    const [a,b,y] = s.split("/");
    return `${y}-${String(a).padStart(2,"0")}-${String(b).padStart(2,"0")}`;
  }
  return "";
}
function serialToDateTime(v) {
  if (typeof v === "number") {
    return new Date(Date.UTC(1899, 11, 30) + v * 86400000).toISOString().replace("T", " ").slice(0,16);
  }
  if (!v) return "";
  const d = new Date(v);
  return Number.isNaN(d.getTime()) ? String(v) : d.toISOString().replace("T", " ").slice(0,16);
}
function toSerial(date) {
  const [y,m,d] = date.split("-").map(Number);
  return (Date.UTC(y, m - 1, d) - Date.UTC(1899, 11, 30)) / 86400000;
}
function uuid() { return crypto.randomUUID(); }
function id(prefix) { return prefix + uuid().replace(/-/g, "").slice(0, 6); }
function hashPassword(password, salt) {
  let d = salt + password;
  for (let i = 0; i < 1000; i++) d = crypto.createHash("sha256").update(d + salt).digest("base64");
  return d;
}
function checkPassword(p) {
  if (String(p || "").length < 8) fail("Password must be at least 8 characters.");
}
function publicUser(x) {
  return { id: x.id, username: x.username, fullName: x.fullName, sheet: x.sheet, role: x.role, division: x.division || divisionFor(spreadsheetId()) };
}
async function users() {
  const rows = (await read("'Users'!A:H")).slice(1);
  return rows.map((r, i) => ({
    row: i + 2, id: r[0] || "", username: r[1] || "", fullName: r[2] || "",
    sheet: r[3] || "", role: r[4] || "", status: r[5] || "",
    salt: r[6] || "", hash: r[7] || ""
  })).filter(x => x.id || x.username);
}
async function projects() {
  const rows = (await read("'Projects'!A:E")).slice(1);
  return rows.map(r => ({ id: r[0] || "", name: r[1] || "", status: r[2] || "", by: r[3] || "" }))
    .filter(x => x.id || x.name);
}
async function memberRows(sheet) {
  return read(`${quoteSheet(sheet)}!A:E`).then(rows => rows.slice(1));
}
async function logAction(user, action, date, previous, next) {
  await append("'Audit_Log'!A:H", [[
    "L" + uuid().slice(0,8), (Date.now() - Date.UTC(1899,11,30)) / 86400000,
    user.username, user.fullName, action, date || "",
    JSON.stringify(previous || ""), JSON.stringify(next || "")
  ]], "RAW");
}
async function authUser(token) {
  if (!token) fail("SESSION", 401, "SESSION");
  const parts = token.split(".");
  if (parts.length !== 2) fail("SESSION", 401, "SESSION");
  const [body, signature] = parts;
  const expected = crypto.createHmac("sha256", process.env.SESSION_SECRET).update(body).digest("base64url");
  const a = Buffer.from(signature);
  const b = Buffer.from(expected);
  if (a.length !== b.length || !crypto.timingSafeEqual(a,b)) fail("SESSION", 401, "SESSION");
  let payload;
  try { payload = JSON.parse(Buffer.from(body, "base64url").toString("utf8")); }
  catch { fail("SESSION", 401, "SESSION"); }
  if (!payload.exp || payload.exp < Date.now()) fail("SESSION", 401, "SESSION");
  const list = await users();
  const user = list.find(x => x.id === payload.uid && x.status === "Active");
  if (!user) fail("SESSION", 401, "SESSION");
  return user;
}
function createToken(user) {
  const body = Buffer.from(JSON.stringify({ uid: user.id, division: user.division || divisionFor(spreadsheetId()), exp: Date.now() + 6 * 60 * 60 * 1000 })).toString("base64url");
  const sig = crypto.createHmac("sha256", process.env.SESSION_SECRET).update(body).digest("base64url");
  return `${body}.${sig}`;
}
function admin(user) { if (user.role !== "Admin") fail("Admin only.", 403); }
function scope(user, member) {
  return users().then(list => list.filter(x => x.sheet && (user.role === "Admin" ? (!member || x.username === member) : x.id === user.id)));
}
async function ensureMemberSheet(name) {
  if (RESERVED.includes(name)) fail(`Sheet name "${name}" is reserved.`);
  let meta = await metadata();
  if (!meta.has(name)) {
    await client().spreadsheets.batchUpdate({
      spreadsheetId: spreadsheetId(),
      requestBody: { requests: [{ addSheet: { properties: { title: name } } }] }
    });
    sheetMeta.delete(spreadsheetId());
    await metadata(true);
    await write(`${quoteSheet(name)}!A1:E1`, [HDR]);
    const m = (await metadata()).get(name);
    await client().spreadsheets.batchUpdate({
      spreadsheetId: spreadsheetId(),
      requestBody: { requests: [{ updateSheetProperties: {
        properties: { sheetId: m.sheetId, gridProperties: { frozenRowCount: 1 } },
        fields: "gridProperties.frozenRowCount"
      }}]}
    });
  }
}
async function setup(payload) {
  if (!process.env.SETUP_SECRET || payload.setupSecret !== process.env.SETUP_SECRET) fail("Invalid setup key.", 403);
  await ensureTab("Users", HEADERS.Users);
  await ensureTab("Projects", HEADERS.Projects);
  await ensureTab("Audit_Log", HEADERS.Audit_Log);
  const list = await users();
  if (!list.length && divisionFor(spreadsheetId()) === "Admin" && payload.adminPassword) {
    const password = String(payload.adminPassword || "");
    checkPassword(password);
    const salt = uuid();
    await append("'Users'!A:H", [[id("U"), "admin", "Administrator", "", "Admin", "Active", salt, hashPassword(password, salt)]]);
  }
  const existingProjects = await projects();
  if (!existingProjects.length && DEFAULT_ACTIVITY_TYPES[divisionFor(spreadsheetId())]) {
    const sourceNames = DEFAULT_ACTIVITY_TYPES[divisionFor(spreadsheetId())];
    await append("'Projects'!A:E", sourceNames.map(n => [id("P"), n, "Active", "source-dropdown", (Date.now()-Date.UTC(1899,11,30))/86400000]));
  }
  if (!existingProjects.length && divisionFor(spreadsheetId()) === "UI/UX") {
    const names = new Set();
    for (const member of ["RIAN", "RAKA", "VIO", "ZIDNY", "GHIFARI"]) {
      const meta = await metadata();
      if (!meta.has(member)) continue;
      const rows = await memberRows(member);
      rows.forEach(r => { const n = clean(r[2]); if (n) names.add(n); });
    }
    if (names.size) {
      await append("'Projects'!A:E", [...names].sort().map(n => [id("P"), n, "Active", "system", (Date.now()-Date.UTC(1899,11,30))/86400000]));
    }
  }
  return { initialized: true, adminUsername: "admin", adminCreated: list.length === 0 };
}
async function aggregate(member) {
  const rows = await memberRows(member.sheet);
  const out = [];
  rows.forEach(r => {
    const date = serialToDate(r[0]);
    if (date) out.push([date, clean(r[2]) || "(none)", Number(r[4]) || 0]);
  });
  return out;
}
async function records(list) {
  const out = [];
  for (const member of list) {
    const rows = await aggregate(member);
    rows.forEach(r => out.push({ m: member.fullName, sh: member.sheet, date: r[0], type: r[1], pct: r[2] }));
  }
  return out;
}
async function monthRows(member, month) {
  const rows = await memberRows(member.sheet);
  return rows.map(r => ({
    m: member.fullName, sh: member.sheet, date: serialToDate(r[0]),
    type: clean(r[2]) || "(none)", task: String(r[3] || ""), pct: Number(r[4]) || 0
  })).filter(r => r.date && (!month || r.date.slice(0,7) === month));
}
async function rewriteDay(sheet, date, additions, mode = "write") {
  const all = await memberRows(sheet);
  const keep = [], old = [];
  all.forEach(r => {
    if (serialToDate(r[0]) === date) old.push(r);
    else if (r.some(c => c !== "" && c != null)) keep.push(r);
  });
  if (mode === "create" && old.length) fail(`An entry for ${date} already exists. Use Edit instead.`);
  if (mode === "edit" && !old.length) fail(`No entry found for ${date}.`);
  if (mode === "delete" && !old.length) fail(`No entry found for ${date}.`);
  const newRows = keep.concat(additions);
  const meta = await metadata();
  const sheetId = meta.get(sheet)?.sheetId;
  if (sheetId == null) fail(`Member sheet "${sheet}" not found.`, 404);
  const requests = [];
  if (newRows.length) {
    requests.push({ updateCells: {
      range: { sheetId, startRowIndex: 1, startColumnIndex: 0 },
      rows: newRows.map(r => ({ values: r.map(v => ({ userEnteredValue:
        typeof v === "number" ? { numberValue: v } : { stringValue: String(v ?? "") }
      })) })),
      fields: "userEnteredValue"
    }});
  }
  if (all.length > newRows.length) {
    requests.push({ repeatCell: {
      range: { sheetId, startRowIndex: newRows.length + 1, endRowIndex: all.length + 1, startColumnIndex: 0, endColumnIndex: 5 },
      cell: { userEnteredValue: null },
      fields: "userEnteredValue"
    }});
  }
  if (requests.length) await client().spreadsheets.batchUpdate({ spreadsheetId: spreadsheetId(), requestBody: { requests } });
  return old.map(r => ({ type: r[2], task: r[3], pct: r[4] }));
}
async function apiAction(user, action, p) {
  switch (action) {
    case "me": return publicUser(user);
    case "logout": return 1;
    case "passwd": {
      if (hashPassword(String(p.old), user.salt) !== user.hash) fail("Current password is wrong.");
      checkPassword(p.next);
      const salt = uuid();
      await write(`'Users'!G${user.row}:H${user.row}`, [[salt, hashPassword(p.next, salt)]]);
      return 1;
    }
    case "days": {
      const members = await scope(user, p.member);
      const grouped = {};
      for (const member of members) {
        for (const r of await monthRows(member, p.month)) {
          const key = `${r.sh}|${r.date}`;
          if (!grouped[key]) grouped[key] = { member: r.m, date: r.date, rows: [], total: 0, mine: r.sh === user.sheet };
          grouped[key].rows.push({ type: r.type, task: r.task, pct: r.pct });
          grouped[key].total += r.pct;
        }
      }
      return Object.values(grouped).sort((a,b) => b.date.localeCompare(a.date));
    }
    case "save": {
      if (!user.sheet) fail("Your account has no member sheet.");
      const date = p.date;
      if (!/^\d{4}-\d{2}-\d{2}$/.test(date || "")) fail("Invalid date.");
      const rows = (p.rows || []).map(r => ({
        type: String(r.type || "").trim(), task: String(r.task || "").trim(),
        pct: Math.round(Number(r.pct) * 100) / 100
      }));
      if (!rows.length) fail("Add at least one activity row.");
      rows.forEach((r,i) => {
        if (!r.type) fail(`Row ${i+1}: Activity Type is required.`);
        if (!r.task) fail(`Row ${i+1}: Task / Deliverables is required.`);
        if (!(r.pct > 0)) fail(`Row ${i+1}: allocation must be greater than 0%.`);
      });
      const total = rows.reduce((a,r) => a+r.pct, 0);
      if (Math.abs(total - 100) > 0.001) fail(`Total allocation must be exactly 100% (now ${total}%).`);
      const old = await rewriteDay(user.sheet, date,
        rows.map(r => [toSerial(date), user.fullName, r.type, r.task, r.pct]),
        p.mode === "edit" ? "edit" : "create");
      const existing = await projects();
      const names = new Set(existing.map(x => x.name.toLowerCase()));
      const newProjects = rows.filter(r => {
        const k = r.type.toLowerCase();
        if (names.has(k)) return false;
        names.add(k); return true;
      }).map(r => [id("P"), r.type, user.role === "Admin" ? "Active" : "Pending", user.username,
        (Date.now()-Date.UTC(1899,11,30))/86400000]);
      if (newProjects.length) await append("'Projects'!A:E", newProjects);
      await logAction(user, old.length ? "UPDATE" : "CREATE", date, old.map(r=>({type:r[2],task:r[3],pct:r[4]})), rows);
      return 1;
    }
    case "del": {
      if (!user.sheet) fail("Your account has no member sheet.");
      const old = await rewriteDay(user.sheet, p.date, [], "delete");
      await logAction(user, "DELETE", p.date, old.map(r=>({type:r[2],task:r[3],pct:r[4]})), null);
      return 1;
    }
    case "divisionInfo": return { division: divisionFor(spreadsheetId()), members: (await users()).filter(x=>x.sheet).map(x=>({username:x.username,fullName:x.fullName,sheet:x.sheet})) };
    case "projects": return projects();
    case "requestDesign": {
      if (divisionFor(spreadsheetId()) !== "Designer") fail("Request Design is only available in Designer division.",403);
      const meta = await metadata();
      if (!meta.has("REQUEST DESIGN")) fail('Sheet "REQUEST DESIGN" was not found.',404);
      const rows = (await read("'REQUEST DESIGN'!A:T")).slice(1);
      const items = rows.map((r,i)=>({row:i+2,values:Array.from({length:20},(_,k)=>r[k]??"")})).filter(x=>x.values.some(v=>String(v).trim())).map(x=>{ x.values[0]=serialToDate(x.values[0]) || String(x.values[0]||""); return x; });
      if (p.mode === "list") return items;
      if (p.mode === "add") {
        const values = Array.from({length:20},(_,i)=>p.values?.[i] ?? "");
        if (!values[0] || !values[1] || !values[2]) fail("Date, Activity Type and Request are required.");
        await append("'REQUEST DESIGN'!A:T",[values],"USER_ENTERED");
        await logAction(user,"REQUEST_DESIGN_CREATE",String(values[0]),null,values.slice(0,4)); return 1;
      }
      const row = Number(p.row); if (!Number.isInteger(row) || row < 2) fail("Invalid request row.");
      if (p.mode === "edit") {
        const values = Array.from({length:20},(_,i)=>p.values?.[i] ?? "");
        if (!values[0] || !values[1] || !values[2]) fail("Date, Activity Type and Request are required.");
        await write(`'REQUEST DESIGN'!A${row}:T${row}`,[values],"USER_ENTERED");
        await logAction(user,"REQUEST_DESIGN_UPDATE",String(values[0]),null,values.slice(0,4)); return 1;
      }
      if (p.mode === "delete") {
        const before = await read(`'REQUEST DESIGN'!A${row}:T${row}`);
        if (!before.length) fail("Request not found.",404);
        await write(`'REQUEST DESIGN'!A${row}:T${row}`,[Array(20).fill("")],"RAW");
        await logAction(user,"REQUEST_DESIGN_DELETE",String(before[0]?.[0]||""),before[0]?.slice(0,4),null); return 1;
      }
      fail("Invalid Request Design operation.");
    }
    case "addProject": {
      const name = clean(p.name);
      if (!name) fail("Name is required.");
      if (name.length > 100) fail("Name is too long (max 100 characters).");
      const existing = await projects();
      if (existing.some(x => x.name.toLowerCase() === name.toLowerCase())) fail("Activity Type already exists.");
      const row = [id("P"), name, user.role === "Admin" ? "Active" : "Pending", user.username,
        (Date.now()-Date.UTC(1899,11,30))/86400000];
      await append("'Projects'!A:E", [row]);
      const checkRows = (await read("'Projects'!A:E")).slice(1);
      const saved = checkRows.some(r => r[0] === row[0] && clean(r[1]) === name);
      if (!saved) fail("Project could not be saved to the spreadsheet. Please try again.", 500);
      return { id: row[0], name, status: row[2], by: row[3] };
    }
    case "today": {
      const date = new Intl.DateTimeFormat("en-CA", {
        timeZone: TZ, year: "numeric", month: "2-digit", day: "2-digit"
      }).format(new Date());
      if (!user.sheet) return { date, day: null };
      const rows = await memberRows(user.sheet);
      const dayRows = rows.filter(r => serialToDate(r[0]) === date).map(r => ({
        type: clean(r[2]) || "(none)", task: String(r[3] || ""), pct: Number(r[4]) || 0
      }));
      return {
        date,
        day: dayRows.length ? {
          member: user.fullName, date, rows: dayRows,
          total: dayRows.reduce((sum, r) => sum + r.pct, 0), mine: true
        } : null
      };
    }
    case "setProject": {
      admin(user);
      const rows = (await read("'Projects'!A:E")).slice(1);
      const i = rows.findIndex(r => r[0] === p.id);
      if (i < 0) fail("Project not found.", 404);
      const name = String(p.name || "").trim();
      if (!name) fail("Name is required.");
      if (rows.some((r,k) => k !== i && String(r[1]).toLowerCase() === name.toLowerCase())) fail("Name already used.");
      await write(`'Projects'!B${i+2}:C${i+2}`, [[name, p.status]]);
      return 1;
    }
    case "dash": {
      const year = String(p.year || new Date().getFullYear());
      const month = p.month || "";
      const bp = {}, bm = {}, grouped = {}, years = {};
      let total = 0;
      for (const r of await records(await scope(user, p.member))) {
        years[r.date.slice(0,4)] = 1;
        if (r.date.slice(0,4) !== year || (month && r.date.slice(5,7) !== month)) continue;
        const md = r.pct / 100;
        total += md; bp[r.type] = (bp[r.type] || 0) + md; bm[r.m] = (bm[r.m] || 0) + md;
        const key = r.sh + r.date; grouped[key] = (grouped[key] || 0) + r.pct;
      }
      const days = Object.values(grouped);
      const top = o => Object.entries(o).filter(e=>e[1]>0).sort((a,b)=>b[1]-a[1]);
      return {
        total, days: days.length,
        review: days.filter(t=>Math.abs(t-100)>0.001).length,
        avg: days.length ? days.reduce((a,b)=>a+b,0)/days.length : 0,
        byProject: top(bp), byMember: top(bm), years: Object.keys(years).sort()
      };
    }
    case "summary": {
      admin(user);
      const members = {}, projectSet = {};
      for (const r of await records(await scope(user, p.member))) {
        if (r.date.slice(0,4) !== String(p.year) || (p.month && r.date.slice(5,7) !== p.month) || (p.project && r.type !== p.project)) continue;
        members[r.m] = members[r.m] || {};
        members[r.m][r.type] = (members[r.m][r.type] || 0) + r.pct/100;
        projectSet[r.type] = 1;
      }
      return { projects: Object.keys(projectSet).sort(), members };
    }
    case "audit": {
      const rows = (await read("'Audit_Log'!A:H")).slice(1);
      return rows.slice(-600).filter(r => user.role === "Admin" || r[2] === user.username).reverse().slice(0,200)
        .map(r => ({
          id:r[0], ts:serialToDateTime(r[1]), user:r[2], action:r[4],
          date: typeof r[5] === "number" ? serialToDate(r[5]) : r[5],
          prev:r[6], next:r[7]
        }));
    }
    case "users": {
      admin(user);
      return (await users()).map(x => Object.assign(publicUser(x), {status:x.status}));
    }
    case "saveUser": {
      admin(user);
      const list = await users();
      const existing = p.id && list.find(x => x.id === p.id);
      if (!["Admin","Member"].includes(p.role)) fail("Invalid role.");
      if (p.role === "Member" && !p.sheet) fail("Member sheet name is required.");
      if (p.sheet) {
        if (list.some(x => x.sheet === p.sheet && x.id !== existing?.id)) fail("That sheet is already assigned to another user.");
        await ensureMemberSheet(p.sheet);
      }
      if (!existing) {
        if (!/^[a-z0-9._-]{3,30}$/i.test(p.username || "")) fail("Username: 3-30 letters, numbers, . _ -");
        if (!String(p.fullName || "").trim()) fail("Full name is required.");
        if (list.some(x => x.username.toLowerCase() === p.username.toLowerCase())) fail("Username already exists.");
        checkPassword(p.password);
        const salt = uuid();
        await append("'Users'!A:H", [[id("U"),p.username,p.fullName.trim(),p.sheet||"",p.role,p.status||"Active",salt,hashPassword(p.password,salt)]]);
        await logAction(user,"USER_CREATE","",null,{username:p.username,role:p.role,sheet:p.sheet});
        return 1;
      }
      if (existing.id === user.id && p.status !== "Active") fail("You cannot deactivate yourself.");
      let salt = existing.salt, hash = existing.hash;
      if (p.password) { checkPassword(p.password); salt=uuid(); hash=hashPassword(p.password,salt); }
      await write(`'Users'!C${existing.row}:H${existing.row}`, [[p.fullName,p.sheet||"",p.role,p.status,salt,hash]]);
      await logAction(user,"USER_UPDATE","",null,{username:existing.username,role:p.role,status:p.status,passwordReset:!!p.password});
      return 1;
    }
    default: fail("Unknown action.");
  }
}

export default async (request) => {
  if (request.method !== "POST") {
    return Response.json({success:false,message:"Method not allowed."},{status:405});
  }
  try {
    const body = await request.json();
    const action = String(body.action || "");
    const payload = body.payload || {};
    if (action === "setup") {
      const results = {};
      for (const division of DIVISION_NAMES) {
        if (!DIVISIONS[division]) continue;
        results[division] = await requestContext.run({ spreadsheetId: DIVISIONS[division], division }, () => setup(payload));
      }
      return Response.json({success:true,data:{initialized:true,divisions:results}});
    }
    let data;
    if (action === "login") data = await login(payload.username, payload.password);
    else {
      let tokenPayload;
      try { tokenPayload = JSON.parse(Buffer.from(String(body.token||"").split(".")[0], "base64url").toString("utf8")); } catch { fail("SESSION",401,"SESSION"); }
      const homeDivision = tokenPayload.division;
      if (!DIVISIONS[homeDivision]) fail("SESSION",401,"SESSION");
      const user = await requestContext.run({ spreadsheetId: DIVISIONS[homeDivision], division: homeDivision }, () => authUser(body.token));
      const requestedDivision = body.division || payload.division;
      const activeDivision = user.role === "Admin" ? (DIVISIONS[requestedDivision] ? requestedDivision : "UI/UX") : homeDivision;
      if (action === "passwd") data = await requestContext.run({ spreadsheetId: DIVISIONS[homeDivision], division: homeDivision }, () => apiAction(user, action, payload));
      else data = await requestContext.run({ spreadsheetId: DIVISIONS[activeDivision], division: activeDivision }, async () => {
        const scopedUser = { ...user, division: activeDivision };
        if (action === "me") return { ...publicUser(user), activeDivision, availableDivisions: user.role === "Admin" ? DIVISION_NAMES.filter(d=>!!DIVISIONS[d]) : [homeDivision] };
        return apiAction(scopedUser, action, payload);
      });
    }
    return Response.json({success:true,data});
  } catch (error) {
    console.error("Project Allocation API:", error);
    const status = error.status || 500;
    return Response.json({
      success:false,
      message: status >= 500 ? "Server error. Check the Netlify Function logs for details." : error.message,
      ...(error.code ? {code:error.code} : {})
    }, {status});
  }
};

async function login(username, password) {
  const candidates = ["Admin", "UI/UX", "Digital Marketing", "Designer"].filter(d => DIVISIONS[d]);
  const matches = [];
  const missingUsersTabs = [];

  // A division without a Users tab must not break authentication for every other division.
  // Check sheet metadata first so Google Sheets does not receive an invalid sheet range.
  for (const division of candidates) {
    const found = await requestContext.run({ spreadsheetId: DIVISIONS[division], division }, async () => {
      const meta = await metadata();
      if (!meta.has("Users")) {
        missingUsersTabs.push(division);
        return [];
      }
      const list = await users();
      return list
        .filter(x => String(x.username).trim().toLowerCase() === String(username || "").trim().toLowerCase())
        .map(x => ({ ...x, division }));
    });
    matches.push(...found);
  }

  if (matches.length > 1) {
    fail("This username exists in more than one division. Ask an administrator to make usernames unique.", 409);
  }
  const u = matches[0];
  if (!u) {
    if (missingUsersTabs.length === candidates.length) {
      fail("User directories are not initialized. Run the development Setup first.", 503);
    }
    if (missingUsersTabs.length) {
      fail(`The Users tab is missing in: ${missingUsersTabs.join(", ")}. Run Setup to initialize all divisions, then try again.`, 503);
    }
    fail("Invalid username or password.", 401);
  }
  if (u.status !== "Active" || hashPassword(String(password || ""), u.salt) !== u.hash) {
    fail("Invalid username or password.", 401);
  }
  return requestContext.run({ spreadsheetId: DIVISIONS[u.division], division: u.division }, () => ({
    token: createToken(u),
    user: {
      ...publicUser(u),
      availableDivisions: u.role === "Admin" ? DIVISION_NAMES.filter(d => !!DIVISIONS[d]) : [u.division]
    }
  }));
}
