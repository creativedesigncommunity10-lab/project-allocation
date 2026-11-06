
const $=s=>document.querySelector(s),esc=s=>String(s==null?'':s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
let T=sessionStorage.getItem('t'),U,P=[],D=[],M=[],UL=[],ACTIVE_DIVISION=sessionStorage.getItem('division')||'UI/UX',AVAILABLE_DIVISIONS=[];
const today=()=>new Date().toLocaleDateString('sv',{timeZone:'Asia/Jakarta'});const nv=o=>document.body.classList.toggle('nv',o);
const API_URL='/.netlify/functions/api';
async function requestApi(action,payload={},token=T){
 const response=await fetch(API_URL,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({action,payload,token,division:ACTIVE_DIVISION})});
 let result={};try{result=await response.json()}catch(e){}
 if(!response.ok||!result.success){
  const error=new Error(result.message||`Request failed (${response.status})`);
  error.status=response.status;error.code=result.code;
  if(error.code==='SESSION'||response.status===401){sessionStorage.clear();location.reload();}
  throw error;
 }
 return result.data;
}
const api=(a,p)=>requestApi(a,p||{},T);
function toast(m,bad){const t=$('#toast');t.textContent=m;t.style.background=bad?'var(--e)':'var(--a)';t.hidden=false;clearTimeout(window.tt);window.tt=setTimeout(()=>t.hidden=true,3500)}
const msg=e=>String(e.message||e).replace(/^Error:\s*/,'');
const st=t=>Math.abs(t-100)<.001?'<span class="bd ok">Completed</span>':'<span class="bd w">Needs review</span>';

async function doLogin(){const b=$('#lb');b.disabled=true;
 try{const r=await requestApi('login',{username:$('#lu').value.trim(),password:$('#lp').value},null);T=r.token;sessionStorage.setItem('t',T);start(r.user)}
 catch(e){toast(msg(e),1);b.disabled=false}}
function out(){api('logout').finally(()=>{sessionStorage.clear();location.reload()})}
if(T)api('me').then(start).catch(()=>{});

const NAV=[['dash','Dashboard'],['act','Daily Activities'],['prj','Projects'],['sum','Allocation Summary','A'],['his','Activity History'],['req','Request Design','D'],['meetings','Meetings & Agenda'],['usr','User Management','A'],['health','Data Connection','A']];
let meetingsNavExpanded=false;
function renderNavigation(){
 const visible=NAV.filter(n=>n[2]!=='A'||U.role==='Admin').filter(n=>n[2]!=='D'||ACTIVE_DIVISION==='Designer');
 $('#nav').innerHTML=visible.map(n=>{
  if(n[0]==='meetings')return '<div class="nav-group"><button type="button" class="nav-group-toggle" id="n_meetings_group" aria-expanded="'+meetingsNavExpanded+'" onclick="toggleMeetingsNav()"><span>Meetings &amp; Agenda</span><span class="nav-chevron" aria-hidden="true">⌄</span></button><div class="nav-subnav" '+(meetingsNavExpanded?'':'hidden')+'><a id="n_meetings" onclick="go(\'meetings\')">Meetings</a><a id="n_mom" onclick="go(\'mom\')">MoM</a></div></div>';
  return `<a id="n_${n[0]}" onclick="go('${n[0]}')">${n[1]}</a>`;
 }).join('');
}
function toggleMeetingsNav(){meetingsNavExpanded=!meetingsNavExpanded;const group=document.querySelector('.nav-group');const toggle=document.getElementById('n_meetings_group');const submenu=group&&group.querySelector('.nav-subnav');if(toggle)toggle.setAttribute('aria-expanded',String(meetingsNavExpanded));if(submenu)submenu.hidden=!meetingsNavExpanded;}
function start(u){U=u;AVAILABLE_DIVISIONS=u.availableDivisions||(u.role==='Admin'?['UI/UX','Digital Marketing','Designer','Admin']:[u.division]);
 if(u.role!=='Admin')ACTIVE_DIVISION=u.division;else if(!AVAILABLE_DIVISIONS.includes(ACTIVE_DIVISION))ACTIVE_DIVISION='UI/UX';
 sessionStorage.setItem('division',ACTIVE_DIVISION);$('#login').hidden=true;$('#app').hidden=false;$('#who').innerHTML='<b>'+esc(u.fullName)+'</b><br>'+u.role;
 $('#division-control').innerHTML=u.role==='Admin'?`<label class="sr-only" for="division-select">Division</label><select id="division-select" onchange="switchDivision(this.value)">${AVAILABLE_DIVISIONS.map(d=>`<option ${d===ACTIVE_DIVISION?'selected':''}>${esc(d)}</option>`).join('')}</select>`:'';
 renderNavigation();go('dash')}
function switchDivision(d){if(U.role!=='Admin'||!AVAILABLE_DIVISIONS.includes(d))return;ACTIVE_DIVISION=d;sessionStorage.setItem('division',d);P=[];D=[];M=[];UL=[];UC=null;TDay=null;if(typeof meetingsState!=='undefined'){meetingsState.loaded=false;meetingsState.directory=null;meetingsState.meetings=[];meetingsState.participants=[];meetingsState.minutes=[];meetingsState.actionItems=[];}
 renderNavigation();go('dash')}

async function go(p){nv(0);if(p==='req'&&ACTIVE_DIVISION!=='Designer')return;if(p==='meetings'||p==='mom'){meetingsNavExpanded=true;const toggle=document.getElementById('n_meetings_group');const submenu=document.querySelector('.nav-group .nav-subnav');if(toggle)toggle.setAttribute('aria-expanded','true');if(submenu)submenu.hidden=false;}document.querySelectorAll('#nav a').forEach(a=>a.classList.toggle('on',a.id==='n_'+p));
 document.querySelectorAll('.nav-group').forEach(group=>group.classList.toggle('active',p==='meetings'||p==='mom'));
 const n=NAV.find(x=>x[0]===p);$('#title').textContent=p==='mom'?'Meeting Minutes':(p==='meetings'?'Meetings':(n?n[1]:p));$('#sub').textContent=(U.role==='Admin'?'All members':'My data')+' · '+ACTIVE_DIVISION;
 $('#view').innerHTML='<div class="card sk"></div><div class="card sk" style="margin-top:14px"></div>';try{await V[p]()}catch(e){$('#view').innerHTML='';toast(msg(e),1)}}

function modal(t,b,ok,fn){var modalClass=t==='Create Meeting'?' meeting-modal':(t==='Create Meeting Minutes'?' mom-modal':'');$('#m').innerHTML=`<div class="mb${modalClass}"><h3>${t}</h3>${b}<div class="mf"><button class="btn2" onclick="cm()">Cancel</button><button class="btn" id="mo">${ok}</button></div></div>`;$('#m').hidden=false;
 $('#mo').onclick=async()=>{$('#mo').disabled=true;try{await fn();cm()}catch(e){toast(msg(e),1);$('#mo').disabled=false}}}
const cm=()=>$('#m').hidden=true;
const tbl=(h,rows)=>rows.length?`<table class="rt"><tr>${h.map(x=>'<th>'+x+'</th>').join('')}</tr>${rows.join('')}</table>`:'<div class="empty">Nothing here yet.</div>';

const V={
 async dash(){DS=DS||{y:today().slice(0,4),m:today().slice(5,7)};await dsh()},

 async act(){const adm=U.role=='Admin',us=adm?(UC||(UC=await api('users'))):[];await ensureP();
  $('#view').innerHTML=`<div class="bar2"><input type="month" id="fm" value="${today().slice(0,7)}" onchange="lad()">${adm?`<select id="fu" onchange="lad()"><option value="">All members</option>${us.filter(x=>x.sheet).map(x=>`<option value="${esc(x.username)}">${esc(x.fullName)}</option>`).join('')}</select>`:''}<input id="fq" placeholder="Search" oninput="db(rd)">${U.sheet?'<button class="btn" onclick="openDay(-1)">+ Add Daily Activity</button>':''}</div><div class="card" id="tb"></div>`;lad()},

 async prj(){await ensureP();
  $('#view').innerHTML=`<div class="bar2"><input id="np" placeholder="New Activity Type"><button class="btn" onclick="addP()">Add</button><input id="fq" placeholder="Search" oninput="db(rp)"></div><div class="card" id="tb"></div>`;rp()},

 async sum(){await ensureP();$('#view').innerHTML=`<div class="bar2"><input type="number" id="sy" style="width:100px" value="${new Date().getFullYear()}" onchange="ls()"><select id="sm" onchange="ls()"><option value="">All months</option>${[...Array(12)].map((_,i)=>`<option>${String(i+1).padStart(2,'0')}</option>`).join('')}</select><select id="sp" onchange="ls()"><option value="">All projects</option>${P.map(p=>`<option>${esc(p.name)}</option>`).join('')}</select><button class="btn2" onclick="csv()">Export CSV</button></div><div class="card" style="overflow:auto" id="tb"></div>`;ls()},

 async his(){const a=await api('audit');
  $('#view').innerHTML='<div class="card" style="overflow:auto">'+tbl(['Time','User','Action','Activity date','Before / after'],a.map(x=>`<tr><td>${x.ts}<td>${esc(x.user)}<td><span class="bd ${/DELETE/.test(x.action)?'er':'ok'}">${x.action}</span><td>${esc(x.date)}<td><details><summary>View</summary><pre>${esc(x.prev)}\n→\n${esc(x.next)}</pre></details></tr>`))+'</div>'},

 async req(){await loadRequests()},
 async usr(){UL=UC||(UC=await api('users')); 
  $('#view').innerHTML=`<div class="bar2"><button class="btn" onclick="openU(-1)">+ Create User</button></div><div class="card">${tbl(['Username','Name','Role','Member sheet','Status',''],UL.map((x,i)=>`<tr><td>${esc(x.username)}<td>${esc(x.fullName)}<td>${x.role}<td>${esc(x.sheet)}<td><span class="bd ${x.status=='Active'?'ok':'w'}">${x.status}</span><td><a onclick="openU(${i})">Edit</a></tr>`))}</div>`},
 async health(){const rows=await api('divisionHealth');$('#view').innerHTML=`<p class="muted">Read-only check of spreadsheet access, required tabs, member sheets, and activity data for each division.</p><div class="card" style="overflow:auto">${tbl(['Division','Connection','Users','Projects','Activity rows','Details'],rows.map(x=>`<tr><td><b>${esc(x.division)}</b><td><span class="bd ${x.ok?'ok':'er'}">${x.ok?'Connected':'Issue found'}</span><td>${x.users??'—'}<td>${x.projects??'—'}<td>${x.activityRows??'—'}<td>${esc(x.message||[...(x.missingTabs||[]).map(t=>'Missing tab: '+t),...(x.missingMemberSheets||[]).map(t=>'Missing member sheet: '+t)].join('; ')|| (x.ok?'All checks passed': 'Check spreadsheet configuration'))}</tr>`))}</div><p class="muted">This check does not change any spreadsheet data.</p>`}
};

let PGN=25,UC=null;const db=f=>{clearTimeout(window.dt);window.dt=setTimeout(f,200)};
async function ensureP(){if(!P.length)P=await api('projects');return P}
/* dashboard */
let DS=null;const MN='Jan Feb Mar Apr May Jun Jul Aug Sep Oct Nov Dec'.split(' '),PC=['#0B3C8C','#1D5FD0','#3B82F6','#38BDF8','#60A5FA','#93C5FD','#7DD3FC','#BFDBFE'];
function pie(e){if(!e.length)return'<div class="empty">No allocation in this period.</div>';
 let L=e.slice(0,7);const o=e.slice(7).reduce((a,x)=>a+x[1],0);if(o>0)L=L.concat([['Others',o]]);
 const t=L.reduce((a,x)=>a+x[1],0),P=(a)=>(100+90*Math.cos(a)).toFixed(2)+','+(100+90*Math.sin(a)).toFixed(2);let a0=-Math.PI/2;
 const sl=L.map((x,i)=>{const f=x[1]/t,a1=a0+f*2*Math.PI,c=PC[i%8];let s=f>.9999?`<circle cx="100" cy="100" r="90" fill="${c}"/>`:`<path d="M100 100L${P(a0)}A90 90 0 ${f>.5?1:0} 1 ${P(a1)}Z" fill="${c}" stroke="#fff" stroke-width="2"><title>${esc(x[0])}: ${(f*100).toFixed(1)}%</title></path>`;a0=a1;return s}).join('');
 return`<div class="pie"><svg viewBox="0 0 200 200">${sl}</svg><div class="lg2">${L.map((x,i)=>`<div><i style="background:${PC[i%8]}"></i><span>${esc(x[0])}</span><b>${(x[1]/t*100).toFixed(1)}%</b><em>${x[1].toFixed(1)} MD</em></div>`).join('')}</div></div>`}
async function dsh(){const d=await api('dash',{year:DS.y,month:DS.m}),A=U.role=='Admin',cy=today().slice(0,4),cm=today().slice(5,7),ys=[...new Set(d.years.concat([cy]))].sort(),k=(l,v)=>`<div class="card kpi"><small>${l}</small><b>${v}</b></div>`;
 $('#view').innerHTML=`<div class="bar2"><select onchange="DS.y=this.value;dsh()">${ys.map(y=>`<option ${y==DS.y?'selected':''}>${y}</option>`).join('')}</select>
 <div class="seg"><button class="${!DS.m?'on':''}" onclick="DS.m='';dsh()">Whole year</button><button class="${DS.m==cm&&DS.y==cy?'on':''}" onclick="DS.y='${cy}';DS.m='${cm}';dsh()">This month</button></div>
 <select onchange="DS.m=this.value;dsh()"><option value="">All months</option>${MN.map((n,i)=>{const v=String(i+1).padStart(2,'0');return`<option value="${v}" ${v==DS.m?'selected':''}>${n}</option>`}).join('')}</select></div>
 <div class="kpis">${k('Total mandays',d.total.toFixed(2))}${k('Active projects',d.byProject.length)}${k('Days logged',d.days)}${k('Avg daily allocation',d.avg.toFixed(0)+'%')}${k('Days needing review',d.review)}</div>
 ${U.sheet?'<div class="card" id="td" style="margin-bottom:14px"></div>':''}
 <div class="grid2"><div class="card"><b>Project allocation</b>${pie(d.byProject)}</div>${A?`<div class="card"><b>Team member allocation</b>${pie(d.byMember)}</div>`:''}</div>`;if($('#td'))TDay?rtd():ltd()}
/* today's activity shortcut (own records, today only; Asia/Jakarta date from server) */
let TDay=null;
function ltd(){TDay=null;rtd();api('today').then(r=>{TDay=r;rtd()}).catch(e=>{const x=$('#td');if(x)x.innerHTML='<div class="empty">Could not load today\'s activities. <a onclick="ltd()">Retry</a></div>'})}
function rtd(){const e=$('#td'),d=TDay;if(!e)return;
 e.innerHTML=!d?'<div class="sk" style="height:70px;border-radius:12px"></div>':!d.day?`<b>Apa yang kamu lakukan hari ini?</b><p style="color:var(--t2);margin:6px 0 12px">Tambahkan aktivitas harianmu untuk mencatat pekerjaan yang telah kamu selesaikan.</p><button class="btn" onclick="openDay(-1)">+ Add Daily Activity</button>`
 :`<div class="bar2" style="justify-content:space-between;margin-bottom:6px"><b>Today · ${d.date}</b><button class="btn2" onclick="openDay(0,[TDay.day])">Edit</button></div>${d.day.rows.map(r=>`<div style="padding:8px 0;border-top:1px solid rgba(29,95,208,.1)"><b>${esc(r.type)}</b> · ${r.pct}%<div style="color:var(--t2);white-space:pre-wrap">${esc(r.task)}</div></div>`).join('')}<div style="margin-top:6px">${st(d.day.total)}</div>`}

/* activities */
function lad(){api('days',{month:$('#fm').value,member:$('#fu')?$('#fu').value:''}).then(d=>{D=d;PGN=25;rd()}).catch(e=>toast(msg(e),1))}
function rd(){const q=($('#fq').value||'').toLowerCase(),L=D.map((d,i)=>[d,i]).filter(([d])=>!q||[d.date,d.member,...d.rows.flatMap(r=>[r.type,r.task,String(r.pct)])].join(' ').toLowerCase().includes(q));
 $('#tb').innerHTML=tbl(['Date','Member','Activities','Total','Mandays','Status',''],L.slice(0,PGN).map(([d,i])=>`<tr><td>${d.date}<td>${esc(d.member)}<td>${d.rows.map(r=>`<div><b>${esc(r.type)}</b> ${r.pct}% — ${esc(String(r.task).slice(0,90))}</div>`).join('')}<td>${d.total}%<td>${(d.total/100).toFixed(2)}<td>${st(d.total)}<td>${d.mine?`<a onclick="openDay(${i})">Edit</a><a onclick="delDay(${i})">Delete</a>`:''}</tr>`))+(L.length>PGN?`<div style="text-align:center;margin-top:12px"><button class="btn2" onclick="PGN+=25;rd()">Show more (${L.length-PGN} left)</button></div>`:'')}
async function openDay(i,src){await ensureP();const d=i>=0?(src||D)[i]:null;
 modal(d?'Edit Activity':'Add Daily Activity',`<datalist id="pl">${P.filter(p=>p.status!='Archived').map(p=>`<option value="${esc(p.name)}">`).join('')}</datalist><label>Activity date</label><input type="date" id="dd" value="${d?d.date:today()}" ${d?'disabled':''}><label>Project / Client (pick one or type a new Activity Type)</label><div id="rows"></div><button class="btn2" onclick="addRow()">+ Add Project Row</button><div class="sum" id="cs"></div>`,'Save',
 ()=>api('save',{mode:d?'edit':'create',date:$('#dd').value,rows:[...document.querySelectorAll('.r')].map(r=>({type:r.querySelector('.ty').value,task:r.querySelector('.tk').value,pct:r.querySelector('.pc').value}))}).then(()=>{P=[];toast('Saved');if($('#fm'))lad();if($('#td'))ltd()}));
 (d?d.rows:[{}]).forEach(addRow);calc()}
function addRow(r){r=r||{};const e=document.createElement('div');e.className='r';
 e.innerHTML=`<input class="ty" list="pl" placeholder="Activity Type" value="${esc(r.type)}"><textarea class="tk" placeholder="Task / Deliverables">${esc(r.task)}</textarea><input class="pc" type="number" min="1" max="100" step="any" placeholder="%" value="${r.pct||''}" oninput="calc()"><button class="btn2" onclick="this.parentNode.remove();calc()">✕</button>`;$('#rows').appendChild(e);calc()}
function calc(){if(!$('#cs'))return;const t=[...document.querySelectorAll('.pc')].reduce((a,x)=>a+(+x.value||0),0);
 $('#cs').innerHTML=`Total Allocation: ${t}% · Total Mandays: ${(t/100).toFixed(2)} · ${Math.abs(t-100)<.001?'<span class="bd ok">Completed</span>':t>100?'<span class="bd er">Over 100%</span>':'<span class="bd w">Must reach 100%</span>'}`}
function delDay(i){const d=D[i];modal('Delete activity',`<p>Delete all entries on <b>${d.date}</b>? This is recorded in Activity History.</p>${d.rows.map(r=>`<div>• ${esc(r.type)} — ${r.pct}%</div>`).join('')}`,'Delete',()=>api('del',{date:d.date}).then(()=>{lad();toast('Deleted')}))}

/* projects */
function rp(){const q=$('#fq').value.toLowerCase(),A=U.role=='Admin';
 $('#tb').innerHTML=tbl(['Activity Type','Status','Created by',A?'':''],P.filter(p=>p.name.toLowerCase().includes(q)).map(p=>`<tr><td>${esc(p.name)}<td><span class="bd ${p.status=='Active'?'ok':'w'}">${p.status}</span><td>${esc(p.by)}<td>${A?`<a onclick="renP('${p.id}')">Rename</a><select onchange="setP('${p.id}',null,this.value)">${['Active','Pending','Archived'].map(s=>`<option ${s==p.status?'selected':''}>${s}</option>`).join('')}</select>`:''}</tr>`))}
let APB=0;function addP(){if(APB)return;APB=1;api('addProject',{name:$('#np').value}).then(()=>api('projects')).then(p=>{P=p;$('#np').value='';rp();toast('Saved to spreadsheet')}).catch(e=>toast(msg(e),1)).finally(()=>APB=0)}
function setP(id,name,status){const p=P.find(x=>x.id==id);api('setProject',{id,name:name||p.name,status:status||p.status}).then(()=>api('projects')).then(x=>{P=x;rp();toast('Updated')}).catch(e=>{toast(msg(e),1);rp()})}
function renP(id){const p=P.find(x=>x.id==id);modal('Rename Activity Type',`<p>Past activities keep their original name.</p><input id="rn" value="${esc(p.name)}">`,'Save',()=>new Promise((ok,no)=>{api('setProject',{id,name:$('#rn').value,status:p.status}).then(()=>api('projects')).then(x=>{P=x;rp();ok()}).catch(no)}))}

/* summary */
function ls(){api('summary',{year:$('#sy').value,month:$('#sm').value,project:$('#sp').value}).then(r=>{const ms=Object.keys(r.members).sort(),pj=r.projects;
 M=[['Team Member',...pj,'Total']];ms.forEach(m=>{const v=pj.map(p=>r.members[m][p]||0);M.push([m,...v,v.reduce((a,b)=>a+b,0)])});
 const b=M.slice(1);M.push(['Total',...pj.map((_,j)=>b.reduce((a,x)=>a+x[j+1],0)),b.reduce((a,x)=>a+x[x.length-1],0)]);
 $('#tb').innerHTML=ms.length?`<table>${M.map((x,i)=>'<tr>'+x.map((c,j)=>i==0?`<th>${esc(c)}</th>`:j==0?`<td><b>${esc(c)}</b></td>`:`<td class="n">${c?c.toFixed(2):''}</td>`).join('')+'</tr>').join('')}</table>`:'<div class="empty">No data for this filter.</div>'}).catch(e=>toast(msg(e),1))}
function csv(){const s=M.map(r=>r.map(c=>'"'+String(typeof c=='number'?c.toFixed(2):c).replace(/"/g,'""')+'"').join(',')).join('\n'),a=document.createElement('a');
 a.href=URL.createObjectURL(new Blob([s],{type:'text/csv'}));a.download='allocation-summary.csv';a.click()}

/* users + password */
function openU(i){const x=i>=0?UL[i]:{role:'Member',status:'Active'};
 modal(i>=0?'Edit User':'Create User',`<label>Username</label><input id="uu" value="${esc(x.username||'')}" ${i>=0?'disabled':''}><label>Full name (written to Team Name)</label><input id="un" value="${esc(x.fullName||'')}"><label>Role</label><select id="ur"><option>Member<option>Admin</select><label>Member sheet name (e.g. RIAN; created if missing)</label><input id="us" value="${esc(x.sheet||'')}"><label>Status</label><select id="ut"><option>Active<option>Inactive</select><label>Password ${i>=0?'(leave blank to keep)':'(min 8 characters)'}</label><input id="up" autocomplete="off">`,'Save',
 ()=>api('saveUser',{id:x.id,username:$('#uu').value,fullName:$('#un').value,role:$('#ur').value,sheet:$('#us').value.trim(),status:$('#ut').value,password:$('#up').value}).then(()=>{UC=null;UL=[];toast('Saved');go('usr')}));
 $('#ur').value=x.role;$('#ut').value=x.status}
function pw(){modal('Change password','<label>Current password</label><input type="password" id="po"><label>New password (min 8 characters)</label><input type="password" id="pn">','Save',()=>api('passwd',{old:$('#po').value,next:$('#pn').value}).then(()=>toast('Password changed')))}

/* Designer-only Request Design module. The API preserves all 20 source columns. */
let REQUESTS=[];
async function loadRequests(){
 const rows=await api('requestDesign',{mode:'list'});REQUESTS=rows;
 $('#view').innerHTML=`<div class="bar2"><input id="rq-search" placeholder="Search requests..." oninput="renderRequests()"><select id="rq-month" onchange="renderRequests()"><option value="">All dates</option>${[...new Set(rows.map(x=>String(x.values[0]||'').slice(0,7)).filter(Boolean))].sort().reverse().map(x=>`<option value="${esc(x)}">${esc(x)}</option>`).join('')}</select><button class="btn" onclick="editRequest(-1)">+ Add Request</button></div><div class="card" id="rq-table" style="overflow:auto"></div>`;
 renderRequests();
}
function renderRequests(){const q=($('#rq-search')?.value||'').toLowerCase(),m=$('#rq-month')?.value||'';
 const list=REQUESTS.filter(x=>{const v=x.values;return (!m||String(v[0]||'').slice(0,7)===m)&&(!q||v.join(' ').toLowerCase().includes(q))});
 $('#rq-table').innerHTML=tbl(['Day & Date','Activity Type','Request','Attachment / Link',''],list.map(x=>`<tr><td>${esc(x.values[0])}<td>${esc(x.values[1])}<td style="white-space:pre-wrap;min-width:240px">${esc(x.values[2])}<td>${/^https?:\/\//i.test(String(x.values[3]||''))?`<a href="${esc(x.values[3])}" target="_blank" rel="noopener noreferrer">Open link</a>`:esc(x.values[3]||'—')}<td><a onclick="editRequest(${x.row})">Edit</a> <a onclick="deleteRequest(${x.row})">Delete</a></tr>`));
}
function editRequest(row){const old=row<0?Array(20).fill(''):[...(REQUESTS.find(x=>x.row===row)?.values||Array(20).fill(''))];
 if(row>=0&&!REQUESTS.some(x=>x.row===row))return toast('Request not found. Please refresh.',1);
 modal(row<0?'Add Request':'Edit Request',`<label>Day & Date</label><input type="date" id="rq-date" value="${esc(normalizeRequestDate(old[0]))}"><label>Activity Type</label><input id="rq-type" list="rq-types" value="${esc(old[1])}"><datalist id="rq-types">${[...new Set(REQUESTS.map(x=>x.values[1]).filter(Boolean))].map(x=>`<option value="${esc(x)}">`).join('')}</datalist><label>Request</label><textarea id="rq-text" rows="4">${esc(old[2])}</textarea><label>Attachment / Link</label><input id="rq-link" type="url" value="${esc(old[3])}" placeholder="https://..."><p class="muted">Kolom lain pada sheet akan dipertahankan saat edit.</p>`, 'Save',async()=>{old[0]=$('#rq-date').value;old[1]=$('#rq-type').value.trim();old[2]=$('#rq-text').value.trim();old[3]=$('#rq-link').value.trim();await api('requestDesign',{mode:row<0?'add':'edit',row,values:old});await loadRequests();toast('Request saved')});
}
function normalizeRequestDate(v){if(!v)return'';const s=String(v);if(/^\d{4}-\d{2}-\d{2}/.test(s))return s.slice(0,10);const d=new Date(s);return Number.isNaN(d.getTime())?'':new Date(d.getTime()-d.getTimezoneOffset()*60000).toISOString().slice(0,10)}
function deleteRequest(row){const item=REQUESTS.find(x=>x.row===row);if(!item)return;modal('Delete Request',`<p>Delete this request?</p><b>${esc(item.values[2])}</b><p>This action clears the row values in the source sheet.</p>`,'Delete',async()=>{await api('requestDesign',{mode:'delete',row});await loadRequests();toast('Request deleted')})}

/* ---------- Branded controls: custom date/month picker + select dropdown ---------- */
const MONTH_NAMES=['January','February','March','April','May','June','July','August','September','October','November','December'];
const SHORT_MONTHS=['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
const isoToday=()=>new Intl.DateTimeFormat('en-CA',{timeZone:'Asia/Jakarta',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date());
const pad2=n=>String(n).padStart(2,'0');
const parseISO=s=>{const m=/^(\d{4})-(\d{2})-(\d{2})$/.exec(s||'');return m?{y:+m[1],m:+m[2],d:+m[3]}:null};
const isoDate=(y,m,d)=>`${y}-${pad2(m)}-${pad2(d)}`;
const dateLabel=s=>{const p=parseISO(s);return p?`${p.d} ${SHORT_MONTHS[p.m-1]} ${p.y}`:'Select date'};
const monthLabel=s=>{const m=/^(\d{4})-(\d{2})$/.exec(s||'');return m?`${MONTH_NAMES[+m[2]-1]} ${m[1]}`:'Select month'};
function svgIcon(name){return name==='chevron'?'<svg class="select-ui-chevron" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="m6 9 6 6 6-6"/></svg>':'<svg class="date-ui-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="3" y="5" width="18" height="16" rx="2"/><path d="M16 3v4M8 3v4M3 10h18"/></svg>'}
function syncSelectUI(sel){
 const wrap=sel._selectUI;if(!wrap)return;
 const value=wrap.querySelector('.select-ui-value'),trigger=wrap.querySelector('.select-ui-trigger');
 const option=[...sel.options].find(o=>o.value===sel.value);
 value.textContent=option?option.textContent.trim():'Select an option';
 trigger.disabled=sel.disabled;
 trigger.setAttribute('aria-expanded',wrap.classList.contains('open')?'true':'false');
 wrap.querySelectorAll('.select-ui-option').forEach(b=>b.setAttribute('aria-selected',String(b.dataset.value===sel.value)));
}
function closeSelectUI(wrap){wrap.classList.remove('open');const menu=wrap.querySelector('.select-ui-menu');if(menu)menu.hidden=true;syncSelectUI(wrap._native)}
function enhanceSelect(sel){
 if(sel.dataset.enhanced==='1')return;
 sel.dataset.enhanced='1';
 const wrap=document.createElement('div');wrap.className='select-ui';
 if(sel.closest('.mb'))wrap.dataset.full='true';
 const trigger=document.createElement('button');trigger.type='button';trigger.className='select-ui-trigger';trigger.innerHTML='<span class="select-ui-value"></span>'+svgIcon('chevron');
 trigger.setAttribute('aria-haspopup','listbox');
 const menu=document.createElement('div');menu.className='select-ui-menu';menu.hidden=true;menu.setAttribute('role','listbox');
 const rebuild=()=>{
  menu.innerHTML='';
  [...sel.options].forEach(opt=>{
   const b=document.createElement('button');b.type='button';b.className='select-ui-option';b.textContent=opt.textContent.trim();b.dataset.value=opt.value;b.disabled=opt.disabled;
   b.setAttribute('role','option');b.setAttribute('aria-selected',String(opt.value===sel.value));
   b.addEventListener('click',()=>{if(opt.disabled)return;sel.value=opt.value;sel.dispatchEvent(new Event('input',{bubbles:true}));sel.dispatchEvent(new Event('change',{bubbles:true}));closeSelectUI(wrap)});
   menu.appendChild(b);
  });
  if(!sel.options.length)menu.innerHTML='<div class="select-ui-empty">No options available</div>';
  syncSelectUI(sel);
 };
 wrap.append(trigger,menu);sel.parentNode.insertBefore(wrap,sel);wrap.appendChild(sel);
 sel.classList.add('select-native-hidden');sel._selectUI=wrap;wrap._native=sel;
 trigger.addEventListener('click',()=>{
  if(sel.disabled)return;
  document.querySelectorAll('.select-ui.open').forEach(x=>{if(x!==wrap)closeSelectUI(x)});
  const opening=!wrap.classList.contains('open');wrap.classList.toggle('open',opening);menu.hidden=!opening;
  if(opening){rebuild();const r=wrap.getBoundingClientRect();menu.classList.toggle('select-ui-up',window.innerHeight-r.bottom<menu.offsetHeight+30);trigger.setAttribute('aria-expanded','true')}
 });
 sel.addEventListener('change',()=>syncSelectUI(sel));
 rebuild();
}
function enhanceDateInput(input){
 if(input.dataset.enhanced==='1')return;
 input.dataset.enhanced='1';
 const isMonth=input.type==='month',wrap=document.createElement('div');wrap.className='date-ui';if(input.closest('.mb'))wrap.dataset.full='true';
 const trigger=document.createElement('button');trigger.type='button';trigger.className='date-ui-trigger';trigger.innerHTML=`<span class="date-ui-value"></span>${svgIcon('calendar')}`;
 const pop=document.createElement('div');pop.className='date-ui-pop';pop.hidden=true;
 wrap.append(trigger,pop);input.parentNode.insertBefore(wrap,input);wrap.appendChild(input);
 input.classList.add(isMonth?'month-native-hidden':'date-native-hidden');input._dateUI={wrap,trigger,pop,isMonth};
 const sync=()=>{trigger.querySelector('.date-ui-value').textContent=isMonth?monthLabel(input.value):dateLabel(input.value);trigger.disabled=input.disabled};
 const close=()=>{pop.hidden=true;wrap.classList.remove('open')};
 const open=()=>{document.querySelectorAll('.date-ui.open').forEach(x=>{if(x!==wrap){x.classList.remove('open');x.querySelector('.date-ui-pop').hidden=true}});wrap.classList.add('open');pop.hidden=false;render()};
 const dispatch=()=>{input.dispatchEvent(new Event('input',{bubbles:true}));input.dispatchEvent(new Event('change',{bubbles:true}));sync()};
 function render(){
  if(isMonth){renderMonths();return}
  const selected=parseISO(input.value)||parseISO(isoToday());let year=selected.y,month=selected.m;
  if(pop.dataset.year)year=+pop.dataset.year;if(pop.dataset.month)month=+pop.dataset.month;
  const first=new Date(year,month-1,1),offset=(first.getDay()+6)%7,days=new Date(year,month,0).getDate();
  let cells='';
  for(let i=0;i<42;i++){
   const day=i-offset+1,valid=day>=1&&day<=days;
   const date=valid?isoDate(year,month,day):'';
   const cls=['date-ui-day',valid&&date===input.value?'selected':'',valid&&date===isoToday()?'today':'',valid?'':'muted'].filter(Boolean).join(' ');
   const shown=valid?day:(day<1?new Date(year,month-1,0).getDate()+day:day-days);
   cells+=`<button type="button" class="${cls}" ${valid?'':'disabled'} data-date="${date}">${shown}</button>`;
  }
  pop.innerHTML=`<div class="date-ui-head"><button type="button" class="date-ui-nav" data-step="-1" aria-label="Previous month">‹</button><strong class="date-ui-title">${MONTH_NAMES[month-1]} ${year}</strong><button type="button" class="date-ui-nav" data-step="1" aria-label="Next month">›</button></div><div class="date-ui-week">${['Mon','Tue','Wed','Thu','Fri','Sat','Sun'].map(x=>`<span>${x}</span>`).join('')}</div><div class="date-ui-grid">${cells}</div><div class="date-ui-footer"><button type="button" class="date-ui-text-btn" data-today>Today</button><button type="button" class="date-ui-text-btn" data-close>Close</button></div>`;
  pop.querySelectorAll('[data-step]').forEach(b=>b.addEventListener('click',()=>{let m=month+(+b.dataset.step),y=year;if(m<1){m=12;y--}if(m>12){m=1;y++}pop.dataset.year=y;pop.dataset.month=m;render()}));
  pop.querySelectorAll('[data-date]').forEach(b=>b.addEventListener('click',()=>{input.value=b.dataset.date;delete pop.dataset.year;delete pop.dataset.month;dispatch();close()}));
  pop.querySelector('[data-today]').addEventListener('click',()=>{input.value=isoToday();dispatch();close()});
  pop.querySelector('[data-close]').addEventListener('click',close);
 }
 function renderMonths(){
  const p=/^(\d{4})-(\d{2})$/.exec(input.value||'')||/^(\d{4})-(\d{2})/.exec(isoToday());let year=pop.dataset.year?+pop.dataset.year:+p[1];
  pop.innerHTML=`<div class="date-ui-month-year"><button type="button" data-y="-1">‹</button><strong>${year}</strong><button type="button" data-y="1">›</button></div><div class="date-ui-month-grid">${MONTH_NAMES.map((m,i)=>`<button type="button" class="date-ui-month ${input.value===`${year}-${pad2(i+1)}`?'selected':''}" data-month="${pad2(i+1)}">${m.slice(0,3)}</button>`).join('')}</div><div class="date-ui-footer"><button type="button" class="date-ui-text-btn" data-current>Current month</button><button type="button" class="date-ui-text-btn" data-close>Close</button></div>`;
  pop.querySelectorAll('[data-y]').forEach(b=>b.addEventListener('click',()=>{pop.dataset.year=year+(+b.dataset.y);renderMonths()}));
  pop.querySelectorAll('[data-month]').forEach(b=>b.addEventListener('click',()=>{input.value=`${year}-${b.dataset.month}`;dispatch();close()}));
  pop.querySelector('[data-current]').addEventListener('click',()=>{input.value=isoToday().slice(0,7);dispatch();close()});
  pop.querySelector('[data-close]').addEventListener('click',close);
 }
 trigger.addEventListener('click',()=>{if(input.disabled)return;if(wrap.classList.contains('open'))close();else open()});
 input.addEventListener('change',sync);sync();
}
function enhanceControls(root=document){
 root.querySelectorAll('select:not([data-enhanced="1"])').forEach(enhanceSelect);
 root.querySelectorAll('input[type="date"]:not([data-enhanced="1"]),input[type="month"]:not([data-enhanced="1"])').forEach(enhanceDateInput);
}
document.addEventListener('click',e=>{
 if(!e.target.closest('.select-ui'))document.querySelectorAll('.select-ui.open').forEach(closeSelectUI);
 if(!e.target.closest('.date-ui'))document.querySelectorAll('.date-ui.open').forEach(w=>{w.classList.remove('open');const p=w.querySelector('.date-ui-pop');if(p)p.hidden=true});
});
document.addEventListener('keydown',e=>{if(e.key==='Escape'){document.querySelectorAll('.select-ui.open').forEach(closeSelectUI);document.querySelectorAll('.date-ui.open').forEach(w=>{w.classList.remove('open');w.querySelector('.date-ui-pop').hidden=true})}});
const controlObserver=new MutationObserver(records=>{for(const r of records)r.addedNodes.forEach(n=>{if(n.nodeType===1){if(n.matches?.('select,input[type="date"],input[type="month"]'))enhanceControls(n.parentNode||document);else enhanceControls(n)}})});
controlObserver.observe(document.body,{childList:true,subtree:true});
document.addEventListener('DOMContentLoaded',()=>enhanceControls());



/* =========================
   MEETINGS & AGENDA — PHASE 2
   Additive UI extension. Keep existing Phase 1 globals and flows untouched.
   ========================= */
if (!NAV.some(item => item[0] === 'meetings')) NAV.push(['meetings', 'Meetings & Agenda']);

var meetingsState = {
  loaded: false,
  loading: false,
  meetings: [],
  participants: [],
  minutes: [],
  actionItems: [],
  draftParticipants: [],
  directory: null,
  view: 'month',
  cursor: today(),
  selectedDate: today(),
  query: ''
};

function meetingsEsc(value) {
  return esc(value == null ? '' : String(value));
}
function meetingsDateParts(value) {
  var match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(value || ''));
  return match ? { year: Number(match[1]), month: Number(match[2]), day: Number(match[3]) } : null;
}
function meetingsDateString(year, month, day) {
  return String(year) + '-' + String(month).padStart(2, '0') + '-' + String(day).padStart(2, '0');
}
function meetingsLocalDate(value) {
  var p = meetingsDateParts(value);
  return p ? new Date(p.year, p.month - 1, p.day) : new Date();
}
function meetingsFormatDate(value) {
  var p = meetingsDateParts(value);
  if (!p) return value || '—';
  return new Intl.DateTimeFormat('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })
    .format(new Date(p.year, p.month - 1, p.day));
}
function meetingsMonthTitle(value) {
  var p = meetingsDateParts(value);
  return p ? new Intl.DateTimeFormat('en', { month: 'long', year: 'numeric' }).format(new Date(p.year, p.month - 1, 1)) : '';
}
function meetingsShiftDate(value, amount) {
  var d = meetingsLocalDate(value);
  d.setDate(d.getDate() + amount);
  return meetingsDateString(d.getFullYear(), d.getMonth() + 1, d.getDate());
}
function meetingsGetItemsForDate(date) {
  var meetings = meetingsState.meetings.filter(function (item) { return item.date === date; })
    .map(function (item) { return { kind: 'Meeting', title: item.title, time: item.startTime || '', item: item }; });
  var minutes = meetingsState.minutes.filter(function (item) { return item.date === date; })
    .map(function (item) { return { kind: 'Meeting Minutes', title: item.title, time: '', item: item }; });
  return meetings.concat(minutes).sort(function (a, b) { return String(a.time).localeCompare(String(b.time)); });
}
function meetingsRenderCalendar() {
  var host = document.getElementById('meetings-calendar');
  if (!host) return;
  var selected = meetingsState.selectedDate;
  var cursorParts = meetingsDateParts(meetingsState.cursor);
  if (!cursorParts) return;
  var html = '';
  if (meetingsState.view === 'month') {
    var first = new Date(cursorParts.year, cursorParts.month - 1, 1);
    var offset = (first.getDay() + 6) % 7;
    var start = new Date(cursorParts.year, cursorParts.month - 1, 1 - offset);
    html = '<div class="meet-cal-weekdays">' + ['Mon','Tue','Wed','Thu','Fri','Sat','Sun'].map(function (day) { return '<span>' + day + '</span>'; }).join('') + '</div><div class="meet-cal-month-grid">';
    for (var i = 0; i < 42; i++) {
      var cell = new Date(start);
      cell.setDate(start.getDate() + i);
      var date = meetingsDateString(cell.getFullYear(), cell.getMonth() + 1, cell.getDate());
      var sameMonth = cell.getMonth() === cursorParts.month - 1;
      var dayItems = meetingsGetItemsForDate(date);
      var count = dayItems.length;
      var hasMeeting = dayItems.some(function (entry) { return entry.kind === 'Meeting'; });
      var hasMom = dayItems.some(function (entry) { return entry.kind === 'Meeting Minutes'; });
      var markers = count ? '<span class="meet-cal-markers" aria-label="' + count + ' scheduled item(s)">' +
        (hasMeeting ? '<i class="meet-cal-dot meeting-dot" title="Meeting"></i>' : '') +
        (hasMom ? '<i class="meet-cal-dot mom-dot" title="MoM"></i>' : '') + '</span>' : '';
      var classes = ['meet-cal-day', sameMonth ? '' : 'outside', date === selected ? 'selected' : '', date === today() ? 'today' : ''].filter(Boolean).join(' ');
      html += '<button type="button" class="' + classes + '" onclick="meetingsSelectDate(\'' + date + '\')"><span>' + cell.getDate() + '</span>' + markers + '</button>';
    }
    html += '</div>';
  } else if (meetingsState.view === 'week') {
    var day = meetingsLocalDate(meetingsState.cursor);
    day.setDate(day.getDate() - ((day.getDay() + 6) % 7));
    html = '<div class="meet-cal-week-grid">';
    for (var w = 0; w < 7; w++) {
      var wd = new Date(day);
      wd.setDate(day.getDate() + w);
      var wdStr = meetingsDateString(wd.getFullYear(), wd.getMonth() + 1, wd.getDate());
      var items = meetingsGetItemsForDate(wdStr);
      var weekHasMeeting = items.some(function (entry) { return entry.kind === 'Meeting'; });
      var weekHasMom = items.some(function (entry) { return entry.kind === 'Meeting Minutes'; });
      var weekMarkers = '<span class="meet-cal-markers">' + (weekHasMeeting ? '<i class="meet-cal-dot meeting-dot"></i>' : '') + (weekHasMom ? '<i class="meet-cal-dot mom-dot"></i>' : '') + '</span>';
      html += '<button type="button" class="meet-cal-week-day ' + (wdStr === selected ? 'selected' : '') + '" onclick="meetingsSelectDate(\'' + wdStr + '\')">' +
        '<small>' + ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'][wd.getDay()] + '</small><b>' + wd.getDate() + '</b>' + weekMarkers + '<span>' + items.length + ' item' + (items.length === 1 ? '' : 's') + '</span></button>';
    }
    html += '</div>';
  } else {
    var dateItems = meetingsGetItemsForDate(selected);
    html = '<div class="meet-cal-day-view"><div class="meet-cal-day-heading">' + meetingsFormatDate(selected) + '</div>' +
      (dateItems.length ? dateItems.map(meetingsEventMarkup).join('') : '<div class="empty">No meetings scheduled for this day.</div>') + '</div>';
  }
  host.innerHTML = html;
  var selectedHost = document.getElementById('meetings-selected-items');
  if (selectedHost) {
    var selectedItems = meetingsGetItemsForDate(selected);
    selectedHost.innerHTML = '<div class="meet-section-head"><div><b>' + meetingsFormatDate(selected) + '</b><small>' + selectedItems.length + ' scheduled item(s)</small></div>' +
      '<button class="btn2" type="button" onclick="meetingsOpenCreate(\'' + selected + '\')">+ Add meeting</button></div>' +
      (selectedItems.length ? selectedItems.map(meetingsEventMarkup).join('') : '<div class="empty">No meetings or minutes on this date.</div>');
  }
}
function meetingsEventMarkup(entry) {
  var item = entry.item || {};
  var label = entry.kind === 'Meeting' ? ((item.startTime || '') + (item.endTime ? ' – ' + item.endTime : '')) : 'Minutes';
  var onclick = entry.kind === 'Meeting' ? 'meetingsShowDetails(\'' + meetingsEsc(item.id) + '\')' : 'momShowDetails(\'' + meetingsEsc(item.id) + '\')';
  var eventClass = entry.kind === 'Meeting' ? 'meeting-event' : 'mom-event';
  return '<button type="button" class="meet-event ' + eventClass + '" ' + (onclick ? 'onclick="' + onclick + '"' : 'disabled') + '>' +
    '<span class="meet-event-kind">' + meetingsEsc(entry.kind === 'Meeting Minutes' ? 'MoM' : entry.kind) + '</span><b>' + meetingsEsc(entry.title) + '</b><small>' + meetingsEsc(label) + '</small></button>';
}
function meetingsSelectDate(date) {
  if (!meetingsDateParts(date)) return;
  meetingsState.selectedDate = date;
  meetingsState.cursor = date;
  meetingsRenderCalendar();
}
function meetingsSetView(view) {
  if (['month','week','day'].indexOf(view) < 0) return;
  meetingsState.view = view;
  meetingsRenderCalendar();
  var buttons = document.querySelectorAll('[data-meet-view]');
  buttons.forEach(function (button) { button.classList.toggle('on', button.dataset.meetView === view); });
}
function meetingsNavigate(step) {
  var d = meetingsLocalDate(meetingsState.cursor);
  if (meetingsState.view === 'month') d.setMonth(d.getMonth() + step, 1);
  else if (meetingsState.view === 'week') d.setDate(d.getDate() + (step * 7));
  else d.setDate(d.getDate() + step);
  meetingsState.cursor = meetingsDateString(d.getFullYear(), d.getMonth() + 1, d.getDate());
  meetingsState.selectedDate = meetingsState.cursor;
  meetingsRenderCalendar();
  var title = document.getElementById('meetings-period-title');
  if (title) title.textContent = meetingsState.view === 'month' ? meetingsMonthTitle(meetingsState.cursor) :
    meetingsState.view === 'week' ? 'Week of ' + meetingsFormatDate(meetingsState.cursor) : meetingsFormatDate(meetingsState.cursor);
}
function meetingsRefreshPeriodTitle() {
  var title = document.getElementById('meetings-period-title');
  if (!title) return;
  title.textContent = meetingsState.view === 'month' ? meetingsMonthTitle(meetingsState.cursor) :
    meetingsState.view === 'week' ? 'Week of ' + meetingsFormatDate(meetingsState.cursor) : meetingsFormatDate(meetingsState.cursor);
}
function meetingsRenderList() {
  var host = document.getElementById('meetings-list');
  if (!host) return;
  var q = meetingsState.query.toLowerCase();
  var rows = meetingsState.meetings.filter(function (item) {
    return !q || [item.title,item.projectName,item.location,item.type,item.status,item.date].join(' ').toLowerCase().indexOf(q) >= 0;
  }).sort(function (a,b) { return (a.date + a.startTime).localeCompare(b.date + b.startTime); });
  host.innerHTML = rows.length ? rows.map(function (item) {
    return '<button type="button" class="meet-list-row" onclick="meetingsShowDetails(\'' + meetingsEsc(item.id) + '\')">' +
      '<span class="meet-list-date"><b>' + meetingsEsc(String(item.date || '').slice(8,10) || '—') + '</b><small>' + meetingsEsc(String(item.date || '').slice(0,7)) + '</small></span>' +
      '<span class="meet-list-main"><b>' + meetingsEsc(item.title) + '</b><small>' + meetingsEsc(item.projectName || 'No project') + ' · ' + meetingsEsc(item.type || 'Meeting') + '</small></span>' +
      '<span class="meet-list-time">' + meetingsEsc(item.startTime || '') + (item.endTime ? ' – ' + meetingsEsc(item.endTime) : '') + '</span>' +
      '<span class="bd w">' + meetingsEsc(item.status || 'Scheduled') + '</span></button>';
  }).join('') : '<div class="empty">No meetings found.</div>';
}
async function meetingsShowDetails(id) {
  var item = meetingsState.meetings.find(function (meeting) { return meeting.id === id; });
  if (!item) return;
  try { await meetingsLoadDirectory(); } catch (error) { /* Details remain available without participant names. */ }
  var people = meetingsState.participants.filter(function (p) { return p.meetingId === id; });
  var names = people.map(function (p) { return p.name || 'Unnamed participant'; });
  var body = '<div class="meet-detail-grid">' +
    '<div><small>Date</small><b>' + meetingsEsc(meetingsFormatDate(item.date)) + '</b></div>' +
    '<div><small>Time</small><b>' + meetingsEsc(item.startTime + ' – ' + item.endTime) + '</b></div>' +
    '<div><small>Type</small><b>' + meetingsEsc(item.type) + '</b></div>' +
    '<div><small>Project</small><b>' + meetingsEsc(item.projectName || 'Not assigned') + '</b></div>' +
    '<div><small>Location / Link</small><b>' + meetingsEsc(item.location || item.link || 'Not specified') + '</b></div>' +
    '<div><small>Participants</small><b>' + meetingsEsc(names.join(', ') || 'No participants listed') + '</b></div>' +
    '</div><div class="meet-detail-block"><small>Agenda</small><p>' + meetingsEsc(item.agenda || 'No agenda provided.') + '</p></div>' +
    '<div class="meet-detail-block"><small>Description</small><p>' + meetingsEsc(item.description || 'No description provided.') + '</p></div>';
  modal(meetingsEsc(item.title), body, 'Close', async function () {});
}
async function meetingsLoad(force) {
  if (meetingsState.loading) return;
  if (meetingsState.loaded && !force) return;
  meetingsState.loading = true;
  try {
    // Deliberately load one endpoint first; directory is fetched only when creating a meeting.
    // This avoids parallel duplicate validation calls against the central spreadsheet.
    var result = await api('meetingList');
    meetingsState.meetings = Array.isArray(result.meetings) ? result.meetings : [];
    meetingsState.participants = Array.isArray(result.participants) ? result.participants : [];
    meetingsState.minutes = Array.isArray(result.minutes) ? result.minutes : [];
    meetingsState.actionItems = Array.isArray(result.actionItems) ? result.actionItems : [];
    meetingsState.loaded = true;
  } finally {
    meetingsState.loading = false;
  }
}
async function meetingsLoadDirectory() {
  if (meetingsState.directory) return meetingsState.directory;
  meetingsState.directory = await api('meetingDirectory');
  return meetingsState.directory;
}
function meetingsRenderParticipantChips() {
  var host = document.getElementById('meet-participant-chips');
  if (!host) return;
  host.innerHTML = meetingsState.draftParticipants.length
    ? meetingsState.draftParticipants.map(function (name, index) {
        return '<span class="meet-participant-chip">' + meetingsEsc(name) +
          '<button type="button" aria-label="Remove ' + meetingsEsc(name) + '" onclick="meetingsRemoveParticipant(' + index + ')">×</button></span>';
      }).join('')
    : '<span class="meet-participant-empty">No participants added yet.</span>';
}
function meetingsAddParticipant() {
  var input = document.getElementById('meet-participant-input');
  if (!input) return;
  var name = input.value.trim().replace(/\s+/g, ' ');
  if (!name) return;
  if (meetingsState.draftParticipants.some(function (existing) { return existing.toLowerCase() === name.toLowerCase(); })) {
    toast('This participant is already added.', 1);
    return;
  }
  if (meetingsState.draftParticipants.length >= 50) {
    toast('A meeting can have up to 50 participants.', 1);
    return;
  }
  meetingsState.draftParticipants.push(name.slice(0, 120));
  input.value = '';
  meetingsRenderParticipantChips();
  input.focus();
}
function meetingsRemoveParticipant(index) {
  meetingsState.draftParticipants.splice(index, 1);
  meetingsRenderParticipantChips();
}
function meetingsOpenCreate(date) {
  meetingsState.draftParticipants = [];
  meetingsLoadDirectory().then(function (directory) {
    var projects = directory.projects || [];
    var selectedDate = meetingsDateParts(date) ? date : today();
    var body = '<div class="meet-form-grid">' +
      '<label class="meet-field meet-span-2">Meeting title<input id="meet-title" maxlength="160" required placeholder="e.g. Weekly Project Review"></label>' +
      '<label class="meet-field">Date<input id="meet-date" type="date" value="' + meetingsEsc(selectedDate) + '" required></label>' +
      '<label class="meet-field">Project (optional)<select id="meet-project"><option value="">No project</option>' + projects.map(function (p) { return '<option value="' + meetingsEsc(p.id) + '">' + meetingsEsc(p.name) + '</option>'; }).join('') + '</select></label>' +
      '<label class="meet-field">Start time<input id="meet-start" type="time" value="09:00" required></label>' +
      '<label class="meet-field">End time<input id="meet-end" type="time" value="10:00" required></label>' +
      '<label class="meet-field">Meeting type<select id="meet-type"><option>Online</option><option>Offline</option></select></label>' +
      '<label class="meet-field">Location<input id="meet-location" placeholder="Meeting room / venue"></label>' +
      '<label class="meet-field meet-span-2">Meeting link<input id="meet-link" type="url" placeholder="https://..."></label>' +
      '<label class="meet-field">Agenda<textarea id="meet-agenda" rows="2" placeholder="Topics to discuss"></textarea></label>' +
      '<label class="meet-field">Description<textarea id="meet-description" rows="2" placeholder="Additional information"></textarea></label>' +
      '</div><div class="meet-participants"><b>Participants</b><small>Add any name freely, including internal members, clients, or external guests. No User Management lookup is used.</small>' +
      '<div class="meet-participant-entry"><input id="meet-participant-input" maxlength="120" placeholder="Enter participant name" onkeydown="if(event.key===\'Enter\'){event.preventDefault();meetingsAddParticipant()}"><button type="button" class="btn2" onclick="meetingsAddParticipant()">Add</button></div>' +
      '<div id="meet-participant-chips" class="meet-participant-chips"><span class="meet-participant-empty">No participants added yet.</span></div></div>';
    modal('Create Meeting', body, 'Create meeting', async function () {
      var title = document.getElementById('meet-title').value.trim();
      var dateValue = document.getElementById('meet-date').value;
      var startTime = document.getElementById('meet-start').value;
      var endTime = document.getElementById('meet-end').value;
      if (!title || !dateValue || !startTime || !endTime) throw new Error('Please complete the meeting title, date, and time.');
      if (endTime <= startTime) throw new Error('End time must be later than start time.');
      var participantNames = meetingsState.draftParticipants.slice();
      await api('meetingCreate', {
        title: title, date: dateValue, startTime: startTime, endTime: endTime,
        projectId: document.getElementById('meet-project').value,
        type: document.getElementById('meet-type').value,
        location: document.getElementById('meet-location').value.trim(),
        link: document.getElementById('meet-link').value.trim(),
        agenda: document.getElementById('meet-agenda').value.trim(),
        description: document.getElementById('meet-description').value.trim(),
        participants: participantNames
      });
      meetingsState.loaded = false;
      await meetingsLoad(true);
      meetingsState.cursor = dateValue;
      meetingsState.selectedDate = dateValue;
      meetingsRenderPage();
      toast('Meeting created successfully.');
    });
  }).catch(function (error) { toast(msg(error), 1); });
}
function meetingsRenderPage() {
  var view = document.getElementById('view');
  if (!view) return;
  view.innerHTML = '<div class="meet-toolbar">' +
    '<div class="meet-toolbar-left"><button class="btn" type="button" onclick="meetingsOpenCreate(meetingsState.selectedDate)">+ Create Meeting</button>' +
    '<span class="meet-division-label">' + meetingsEsc(ACTIVE_DIVISION) + ' division</span></div>' +
    '<div class="meet-toolbar-right"><button class="btn2" type="button" onclick="meetingsReload()">Refresh</button></div></div>' +
    '<section class="meet-calendar-card card"><div class="meet-cal-toolbar"><div class="meet-cal-nav"><button class="btn2" type="button" onclick="meetingsNavigate(-1)" aria-label="Previous period">‹</button><b id="meetings-period-title"></b><button class="btn2" type="button" onclick="meetingsNavigate(1)" aria-label="Next period">›</button><button class="btn2" type="button" onclick="meetingsGoToday()">Today</button></div>' +
    '<div class="seg meet-view-switch"><button type="button" data-meet-view="month" class="on" onclick="meetingsSetView(\'month\')">Month</button><button type="button" data-meet-view="week" onclick="meetingsSetView(\'week\')">Week</button><button type="button" data-meet-view="day" onclick="meetingsSetView(\'day\')">Day</button></div></div>' +
    '<div class="meet-calendar-legend"><span><i class="meeting-key"></i> Meeting</span><span><i class="mom-key"></i> MoM</span></div><div id="meetings-calendar"></div><div id="meetings-selected-items" class="meet-selected-items"></div></section>' +
    '<section class="card meet-list-card"><div class="meet-list-head"><div><b>Meetings</b><small>Schedules in ' + meetingsEsc(ACTIVE_DIVISION) + '</small></div><input id="meetings-search" type="search" placeholder="Search meetings" value="' + meetingsEsc(meetingsState.query) + '" oninput="meetingsState.query=this.value;meetingsRenderList()"></div><div id="meetings-list"></div></section>';
  meetingsRefreshPeriodTitle();
  meetingsSetView(meetingsState.view);
  meetingsRenderList();
}
function meetingsGoToday() {
  meetingsState.cursor = today();
  meetingsState.selectedDate = today();
  meetingsRenderCalendar();
  meetingsRefreshPeriodTitle();
}
async function meetingsReload() {
  try {
    meetingsState.loaded = false;
    await meetingsLoad(true);
    meetingsRenderPage();
    toast('Meetings refreshed.');
  } catch (error) { toast(msg(error), 1); }
}
V.meetings = async function () {
  try {
    await meetingsLoad(false);
    meetingsRenderPage();
  } catch (error) {
    // Keep the error visible and the rest of the application usable.
    document.getElementById('view').innerHTML = '<div class="card"><div class="empty">Meetings could not be loaded. Check the Meetings database connection, then use Refresh to try again.</div><button class="btn2" type="button" onclick="meetingsReload()">Retry</button></div>';
    toast(msg(error), 1);
  }
};


/* Meeting Minutes: hybrid linked/standalone creation, rich text, and print-to-PDF export. */
meetingsState.actionItems = meetingsState.actionItems || [];
function momRichEditor(id, label, value) {
  return '<div class="mom-field"><label>'+label+'</label><div class="mom-toolbar">'+
    '<button type="button" onmousedown="event.preventDefault()" onclick="momCmd(\'bold\')"><b>B</b></button><button type="button" onmousedown="event.preventDefault()" onclick="momCmd(\'italic\')"><i>I</i></button><button type="button" onmousedown="event.preventDefault()" onclick="momCmd(\'underline\')"><u>U</u></button><button type="button" onmousedown="event.preventDefault()" onclick="momCmd(\'insertUnorderedList\')">• List</button><button type="button" onmousedown="event.preventDefault()" onclick="momCmd(\'insertOrderedList\')">1. List</button><button type="button" onmousedown="event.preventDefault()" onclick="momFormat(\'h2\')">Heading</button><button type="button" onmousedown="event.preventDefault()" onclick="momFormat(\'p\')">Paragraph</button><button type="button" onmousedown="event.preventDefault()" onclick="momCmd(\'justifyLeft\')">Left</button><button type="button" onmousedown="event.preventDefault()" onclick="momCmd(\'justifyCenter\')">Center</button><button type="button" onmousedown="event.preventDefault()" onclick="momLink()">Link</button></div>'+
    '<div id="'+id+'" class="mom-editor" contenteditable="true" data-placeholder="Write '+label.toLowerCase()+'...">'+(value||'')+'</div></div>';
}
function momCmd(command){document.execCommand(command,false,null)}
function momFormat(tag){document.execCommand('formatBlock',false,tag)}
function momLink(){var url=prompt('Enter link URL');if(url&&/^https?:\/\//i.test(url))document.execCommand('createLink',false,url)}
function momAddParticipant(){var input=document.getElementById('mom-person-input');if(!input)return;var name=input.value.trim().replace(/\s+/g,' ');if(!name)return;if(meetingsState.draftParticipants.some(x=>x.toLowerCase()===name.toLowerCase()))return toast('Participant already added.',1);if(meetingsState.draftParticipants.length>=50)return toast('Maximum 50 participants.',1);meetingsState.draftParticipants.push(name.slice(0,120));input.value='';momRenderPeople();input.focus()}
function momRemoveParticipant(i){meetingsState.draftParticipants.splice(i,1);momRenderPeople()}
function momRenderPeople(){var host=document.getElementById('mom-people');if(!host)return;host.innerHTML=meetingsState.draftParticipants.map((n,i)=>'<span class="meet-participant-chip">'+meetingsEsc(n)+' <button type="button" onclick="momRemoveParticipant('+i+')">×</button></span>').join('')||'<span class="meet-participant-empty">No participants added yet.</span>'}
function momAddAction(){var input=document.getElementById('mom-action-input');if(!input)return;var v=input.value.trim();if(!v)return;var host=document.getElementById('mom-action-list');var row=document.createElement('div');row.className='mom-action-row';row.innerHTML='<span></span><button type="button" aria-label="Remove action item">×</button>';row.querySelector('span').textContent=v;row.querySelector('button').onclick=()=>row.remove();host.appendChild(row);input.value='';input.focus()}
function momReadActions(){return Array.from(document.querySelectorAll('#mom-action-list .mom-action-row span')).map(x=>x.textContent.trim()).filter(Boolean)}
async function momOpenCreate(date){
  try{await meetingsLoadDirectory();meetingsState.draftParticipants=[];var linkedOptions=meetingsState.meetings.slice().sort((a,b)=>(b.date||'').localeCompare(a.date||'')).map(m=>'<option value="'+meetingsEsc(m.id)+'">'+meetingsEsc(m.title+' · '+m.date)+'</option>').join('');var projects=meetingsState.directory.projects||[];
  var body='<div class="mom-form">'+
    '<div class="mom-grid mom-meta-grid"><label class="mom-field">Link to existing meeting (optional)<select id="mom-meeting" onchange="momApplyMeeting(this.value)"><option value="">Standalone MoM — no meeting linked</option>'+linkedOptions+'</select></label>'+ 
    '<label class="mom-field">MoM title<input id="mom-title" maxlength="160" placeholder="e.g. Project Discussion – Client Name" required></label>'+ 
    '<label class="mom-field">Meeting date<input id="mom-date" type="date" value="'+meetingsEsc(date||today())+'" required></label><label class="mom-field">Meeting time<input id="mom-time" placeholder="e.g. 09:00 – 10:00"></label><label class="mom-field">Project (optional)<select id="mom-project"><option value="">No project</option>'+projects.map(p=>'<option value="'+meetingsEsc(p.id)+'">'+meetingsEsc(p.name)+'</option>').join('')+'</select></label></div>'+ 
    '<div class="mom-field mom-participants-field"><label>Participants</label><div class="meet-participant-entry"><input id="mom-person-input" maxlength="120" placeholder="Enter participant name" onkeydown="if(event.key===\'Enter\'){event.preventDefault();momAddParticipant()}"><button type="button" class="btn2" onclick="momAddParticipant()">Add</button></div><div id="mom-people" class="meet-participant-chips"><span class="meet-participant-empty">No participants added yet.</span></div></div>'+ 
    '<div class="mom-editor-section mom-discussion-section"><div class="mom-section-heading"><b>Discussion</b><small>Describe the topics discussed during the meeting.</small></div>'+momRichEditor('mom-discussion','Discussion','')+'</div>'+ 
    '<div class="mom-optional-sections"><div class="mom-optional-section" id="mom-summary-section"><button type="button" class="mom-add-section" onclick="momToggleSection(\'summary\')">+ Add Summary</button><div id="mom-summary-wrap" hidden>'+momRichEditor('mom-summary','Summary','')+'</div></div><div class="mom-optional-section" id="mom-decisions-section"><button type="button" class="mom-add-section" onclick="momToggleSection(\'decisions\')">+ Add Decisions</button><div id="mom-decisions-wrap" hidden>'+momRichEditor('mom-decisions','Decisions','')+'</div></div></div>'+ 
    '<div class="mom-field mom-actions-field"><label>Action Items</label><div class="meet-participant-entry"><input id="mom-action-input" placeholder="Add a follow-up item" onkeydown="if(event.key===\'Enter\'){event.preventDefault();momAddAction()}"><button type="button" class="btn2" onclick="momAddAction()">Add</button></div><div id="mom-action-list" class="mom-action-list"></div></div></div>';
  modal('Create Meeting Minutes',body,'Save MoM',async function(){var title=document.getElementById('mom-title').value.trim(),dateValue=document.getElementById('mom-date').value;if(!title||!dateValue)throw new Error('Please complete the MoM title and meeting date.');var getContent=function(id){var el=document.getElementById(id);return el?el.innerHTML:''};var payload={meetingId:document.getElementById('mom-meeting').value,title:title,date:dateValue,meetingTime:document.getElementById('mom-time').value.trim(),projectId:document.getElementById('mom-project').value,participants:meetingsState.draftParticipants.slice(),summary:getContent('mom-summary'),discussion:getContent('mom-discussion'),decisions:getContent('mom-decisions'),actionItems:momReadActions()};await api('meetingMinutesCreate',payload);meetingsState.loaded=false;await meetingsLoad(true);meetingsState.cursor=dateValue;meetingsState.selectedDate=dateValue;meetingsRenderPage();toast('Meeting minutes saved.');});
  enhanceControls(document.getElementById('m'));
  }catch(e){toast(msg(e),1)}
}
function momToggleSection(section){var wrap=document.getElementById('mom-'+section+'-wrap');if(!wrap)return;var button=wrap.parentElement.querySelector('.mom-add-section');var opening=wrap.hidden;wrap.hidden=!opening;if(!opening){var editor=wrap.querySelector('.mom-editor');if(editor)editor.innerHTML='';button.textContent='+ Add '+(section==='summary'?'Summary':'Decisions')}else{button.textContent='− Remove '+(section==='summary'?'Summary':'Decisions');var editor=wrap.querySelector('.mom-editor');if(editor)editor.focus()}}
function momApplyMeeting(id){var date=document.getElementById('mom-date');date.disabled=!!id;if(date._dateUI)date._dateUI.trigger.disabled=!!id;if(!id){document.getElementById('mom-time').disabled=false;document.getElementById('mom-time').value='';meetingsState.draftParticipants=[];momRenderPeople();return;}var m=meetingsState.meetings.find(x=>x.id===id);if(!m)return;document.getElementById('mom-title').value=m.title;date.value=m.date;document.getElementById('mom-time').value=m.startTime&&m.endTime?m.startTime+' – '+m.endTime:'';document.getElementById('mom-time').disabled=true;document.getElementById('mom-project').value=m.projectId||'';meetingsState.draftParticipants=meetingsState.participants.filter(p=>p.meetingId===id).map(p=>p.name);momRenderPeople()}
function momShowDetails(id){var m=meetingsState.minutes.find(x=>x.id===id);if(!m)return;var acts=meetingsState.actionItems.filter(x=>x.momId===id);var people=Array.isArray(m.participants)?m.participants:[];var html='<article class="mom-print"><div class="mom-print-head"><small>MEETING MINUTES</small><h1>'+meetingsEsc(m.title)+'</h1><p>'+meetingsEsc(meetingsFormatDate(m.date))+(m.meetingTime?' · '+meetingsEsc(m.meetingTime):'')+(m.projectName?' · '+meetingsEsc(m.projectName):'')+'</p></div><h3>Participants</h3><p>'+meetingsEsc(people.join(', ')||'—')+'</p>'+momPrintSection('Summary',m.summary)+momPrintSection('Discussion',m.discussion)+momPrintSection('Decisions',m.decisions)+'<h3>Action Items</h3><ul>'+acts.map(x=>'<li>'+meetingsEsc(x.title)+'</li>').join('')+'</ul></article>';var shell='<div class="mom-detail-actions"><button type="button" class="btn" onclick="momExport(\''+meetingsEsc(id)+'\')">Export PDF</button></div>'+html;modal(m.title,shell,'Close',async function(){});var ok=document.getElementById('mo');if(ok)ok.textContent='Close'}
function momPrintSection(title,html){return '<h3>'+title+'</h3><div class="mom-rich-output">'+(html||'<p>—</p>')+'</div>'}
function momExport(id){var m=meetingsState.minutes.find(x=>x.id===id);if(!m)return;var acts=meetingsState.actionItems.filter(x=>x.momId===id);var people=Array.isArray(m.participants)?m.participants:[];var doc='<!doctype html><html><head><meta charset="utf-8"><title>'+meetingsEsc(m.title)+'</title><style>body{font:14px Arial,sans-serif;color:#202938;line-height:1.6;margin:36px}h1{font-size:24px;margin:6px 0}h2{font-size:16px;margin:26px 0 8px;border-bottom:1px solid #d9e0ea;padding-bottom:6px}.meta{color:#64748b}.brand{font-size:11px;letter-spacing:1.5px;color:#2563a8;font-weight:bold}.content{overflow-wrap:anywhere}li{margin:5px 0}@media print{body{margin:18mm}h2{break-after:avoid}li,p{orphans:3;widows:3}}</style></head><body><div class="brand">MEETING MINUTES</div><h1>'+meetingsEsc(m.title)+'</h1><p class="meta">'+meetingsEsc(meetingsFormatDate(m.date))+(m.meetingTime?' · '+meetingsEsc(m.meetingTime):'')+(m.projectName?' · '+meetingsEsc(m.projectName):'')+'</p><h2>Participants</h2><p>'+meetingsEsc(people.join(', ')||'—')+'</p><h2>Summary</h2><div class="content">'+(m.summary||'—')+'</div><h2>Discussion</h2><div class="content">'+(m.discussion||'—')+'</div><h2>Decisions</h2><div class="content">'+(m.decisions||'—')+'</div><h2>Action Items</h2><ul>'+acts.map(x=>'<li>'+meetingsEsc(x.title)+'</li>').join('')+'</ul></body></html>';var w=window.open('','_blank');if(!w)return toast('Please allow pop-ups to export the PDF.',1);w.document.open();w.document.write(doc);w.document.close();w.focus();setTimeout(function(){w.print()},350)}
V.mom = async function(){await meetingsLoad(false);var rows=meetingsState.minutes.slice().sort((a,b)=>(b.date||'').localeCompare(a.date||''));var html='<div class="meet-toolbar"><div class="meet-toolbar-left"><button class="btn" onclick="momOpenCreate(meetingsState.selectedDate)">+ Create MoM</button><span class="meet-division-label">'+meetingsEsc(ACTIVE_DIVISION)+' division</span></div><button class="btn2" onclick="meetingsReloadMom()">Refresh</button></div><section class="card mom-list-card"><div class="meet-list-head"><div><b>Meeting Minutes</b><small>Linked and standalone minutes</small></div></div>'+(rows.length?rows.map(m=>'<button class="meet-list-row" onclick="momShowDetails(\''+meetingsEsc(m.id)+'\')"><span class="meet-list-date"><b>'+meetingsEsc(String(m.date||'').slice(8,10))+'</b><small>'+meetingsEsc(String(m.date||'').slice(0,7))+'</small></span><span class="meet-list-main"><b>'+meetingsEsc(m.title)+'</b><small>'+(m.meetingId?'Linked meeting':'Standalone')+' · '+meetingsEsc(m.projectName||'No project')+'</small></span><span class="meet-list-time">'+meetingsEsc(m.status||'Draft')+'</span></button>').join(''):'<div class="empty">No meeting minutes yet.</div>')+'</section>';document.getElementById('view').innerHTML=html;};
async function meetingsReloadMom(){meetingsState.loaded=false;await meetingsLoad(true);V.mom()}
