const $=s=>document.querySelector(s),esc=s=>String(s==null?'':s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
let T=sessionStorage.getItem('t'),U,P=[],D=[],M=[],UL=[];
const today=()=>new Date().toLocaleDateString('sv');
const API_ENDPOINT = '/.netlify/functions/api';

async function requestApi(action, payload = {}, token = T) {
  const response = await fetch(API_ENDPOINT, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ action, token, payload })
  });

  let result;
  try {
    result = await response.json();
  } catch {
    throw new Error('Invalid response from server.');
  }

  if (!response.ok || result.success === false) {
    const error = new Error(result.message || 'Request failed.');
    if (result.code === 'SESSION') {
      sessionStorage.clear();
      location.reload();
    }
    throw error;
  }
  return result.data;
}

const api = (a, p) => requestApi(a, p || {}, T);
function toast(m,bad){const t=$('#toast');t.textContent=m;t.style.background=bad?'var(--e)':'var(--a)';t.hidden=false;clearTimeout(window.tt);window.tt=setTimeout(()=>t.hidden=true,3500)}
const msg=e=>String(e.message||e).replace(/^Error:\s*/,'');
const st=t=>Math.abs(t-100)<.001?'<span class="bd ok">Completed</span>':'<span class="bd w">Needs review</span>';

async function doLogin() {
  const b = $('#lb');
  b.disabled = true;
  try {
    const r = await requestApi('login', {
      username: $('#lu').value.trim(),
      password: $('#lp').value
    }, null);
    T = r.token;
    sessionStorage.setItem('t', T);
    start(r.user);
  } catch (e) {
    toast(msg(e), 1);
    b.disabled = false;
  }
}
function out(){api('logout').finally(()=>{sessionStorage.clear();location.reload()})}
if(T)api('me').then(start).catch(()=>{});

const NAV=[['dash','Dashboard'],['act','Daily Activities'],['prj','Projects'],['sum','Allocation Summary','A'],['his','Activity History'],['usr','User Management','A']];
function toggleNav(){const s=$('#sidebar');const open=s.classList.toggle('nav-open');$('#menuToggle').setAttribute('aria-expanded',String(open));}
function start(u){U=u;$('#login').hidden=true;$('#app').hidden=false;$('#who').innerHTML='<b>'+esc(u.fullName)+'</b><br>'+u.role;
 $('#nav').innerHTML=NAV.filter(n=>!n[2]||u.role=='Admin').map(n=>`<a id="n_${n[0]}" onclick="go('${n[0]}')">${n[1]}</a>`).join('');
 go('dash')}
async function go(p){document.querySelectorAll('#nav a').forEach(a=>a.classList.toggle('on',a.id=='n_'+p));if(window.matchMedia('(max-width:800px)').matches){$('#sidebar').classList.remove('nav-open');$('#menuToggle').setAttribute('aria-expanded','false');}
 const n=NAV.find(x=>x[0]==p);$('#title').textContent=n[1];$('#sub').textContent=U.role=='Admin'?'All members':'My data';
 $('#view').innerHTML='<div class="card sk"></div><div class="card sk" style="margin-top:14px"></div>';try{await V[p]()}catch(e){$('#view').innerHTML='';toast(msg(e),1)}}

function modal(t,b,ok,fn){$('#m').innerHTML=`<div class="mb"><h3>${t}</h3>${b}<div class="mf"><button class="btn2" onclick="cm()">Cancel</button><button class="btn" id="mo">${ok}</button></div></div>`;$('#m').hidden=false;
 $('#mo').onclick=async()=>{$('#mo').disabled=true;try{await fn();cm()}catch(e){toast(msg(e),1);$('#mo').disabled=false}}}
const cm=()=>$('#m').hidden=true;
const tbl=(h,rows)=>rows.length?`<table><tr>${h.map(x=>'<th>'+x+'</th>').join('')}</tr>${rows.join('')}</table>`:'<div class="empty">Nothing here yet.</div>';

const V={
 async dash(){DS=DS||{y:String(new Date().getFullYear()),m:''};await dsh()},

 async act(){const adm=U.role=='Admin',us=adm?(UC||(UC=await api('users'))):[];await ensureP();
  $('#view').innerHTML=`<div class="bar2"><input type="month" id="fm" value="${today().slice(0,7)}" onchange="lad()">${adm?`<select id="fu" onchange="lad()"><option value="">All members</option>${us.filter(x=>x.sheet).map(x=>`<option value="${esc(x.username)}">${esc(x.fullName)}</option>`).join('')}</select>`:''}<input id="fq" placeholder="Search" oninput="db(rd)">${U.sheet?'<button class="btn" onclick="openDay(-1)">+ Add Daily Activity</button>':''}</div><div class="card" id="tb"></div>`;lad()},

 async prj(){await ensureP();
  $('#view').innerHTML=`<div class="bar2"><input id="np" placeholder="New Activity Type"><button class="btn" onclick="addP()">Add</button><input id="fq" placeholder="Search" oninput="db(rp)"></div><div class="card" id="tb"></div>`;rp()},

 async sum(){await ensureP();$('#view').innerHTML=`<div class="bar2"><input type="number" id="sy" style="width:100px" value="${new Date().getFullYear()}" onchange="ls()"><select id="sm" onchange="ls()"><option value="">All months</option>${[...Array(12)].map((_,i)=>`<option>${String(i+1).padStart(2,'0')}</option>`).join('')}</select><select id="sp" onchange="ls()"><option value="">All projects</option>${P.map(p=>`<option>${esc(p.name)}</option>`).join('')}</select><button class="btn2" onclick="csv()">Export CSV</button></div><div class="card" style="overflow:auto" id="tb"></div>`;ls()},

 async his(){const a=await api('audit');
  $('#view').innerHTML='<div class="card" style="overflow:auto">'+tbl(['Time','User','Action','Activity date','Before / after'],a.map(x=>`<tr><td>${x.ts}<td>${esc(x.user)}<td><span class="bd ${/DELETE/.test(x.action)?'er':'ok'}">${x.action}</span><td>${esc(x.date)}<td><details><summary>View</summary><pre>${esc(x.prev)}\n→\n${esc(x.next)}</pre></details></tr>`))+'</div>'},

 async usr(){UL=UC||(UC=await api('users')); 
  $('#view').innerHTML=`<div class="bar2"><button class="btn" onclick="openU(-1)">+ Create User</button></div><div class="card">${tbl(['Username','Name','Role','Member sheet','Status',''],UL.map((x,i)=>`<tr><td>${esc(x.username)}<td>${esc(x.fullName)}<td>${x.role}<td>${esc(x.sheet)}<td><span class="bd ${x.status=='Active'?'ok':'w'}">${x.status}</span><td><a onclick="openU(${i})">Edit</a></tr>`))}</div>`}
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
async function dsh(){const d=await api('dash',{year:DS.y,month:DS.m}),A=U.role=='Admin',cy=String(new Date().getFullYear()),cm=String(new Date().getMonth()+1).padStart(2,'0'),ys=[...new Set(d.years.concat([cy]))].sort(),k=(l,v)=>`<div class="card kpi"><small>${l}</small><b>${v}</b></div>`;
 $('#view').innerHTML=`<div class="bar2"><select onchange="DS.y=this.value;dsh()">${ys.map(y=>`<option ${y==DS.y?'selected':''}>${y}</option>`).join('')}</select>
 <div class="seg"><button class="${!DS.m?'on':''}" onclick="DS.m='';dsh()">Whole year</button><button class="${DS.m==cm&&DS.y==cy?'on':''}" onclick="DS.y='${cy}';DS.m='${cm}';dsh()">This month</button></div>
 <select onchange="DS.m=this.value;dsh()"><option value="">All months</option>${MN.map((n,i)=>{const v=String(i+1).padStart(2,'0');return`<option value="${v}" ${v==DS.m?'selected':''}>${n}</option>`}).join('')}</select></div>
 <div class="kpis">${k('Total mandays',d.total.toFixed(2))}${k('Active projects',d.byProject.length)}${k('Days logged',d.days)}${k('Avg daily allocation',d.avg.toFixed(0)+'%')}${k('Days needing review',d.review)}</div>
 <div class="grid2"><div class="card"><b>Project allocation</b>${pie(d.byProject)}</div>${A?`<div class="card"><b>Team member allocation</b>${pie(d.byMember)}</div>`:''}</div>`}

/* activities */
function lad(){api('days',{month:$('#fm').value,member:$('#fu')?$('#fu').value:''}).then(d=>{D=d;PGN=25;rd()}).catch(e=>toast(msg(e),1))}
function rd(){const q=($('#fq').value||'').toLowerCase(),L=D.map((d,i)=>[d,i]).filter(([d])=>!q||[d.date,d.member,...d.rows.flatMap(r=>[r.type,r.task,String(r.pct)])].join(' ').toLowerCase().includes(q));
 $('#tb').innerHTML=tbl(['Date','Member','Activities','Total','Mandays','Status',''],L.slice(0,PGN).map(([d,i])=>`<tr><td>${d.date}<td>${esc(d.member)}<td>${d.rows.map(r=>`<div><b>${esc(r.type)}</b> ${r.pct}% — ${esc(String(r.task).slice(0,90))}</div>`).join('')}<td>${d.total}%<td>${(d.total/100).toFixed(2)}<td>${st(d.total)}<td>${d.mine?`<a onclick="openDay(${i})">Edit</a><a onclick="delDay(${i})">Delete</a>`:''}</tr>`))+(L.length>PGN?`<div style="text-align:center;margin-top:12px"><button class="btn2" onclick="PGN+=25;rd()">Show more (${L.length-PGN} left)</button></div>`:'')}
async function openDay(i){await ensureP();const d=i>=0?D[i]:null;
 modal(d?'Edit Activity':'Add Daily Activity',`<datalist id="pl">${P.filter(p=>p.status!='Archived').map(p=>`<option value="${esc(p.name)}">`).join('')}</datalist><label>Activity date</label><input type="date" id="dd" value="${d?d.date:today()}" ${d?'disabled':''}><label>Project / Client (pick one or type a new Activity Type)</label><div id="rows"></div><button class="btn2" onclick="addRow()">+ Add Project Row</button><div class="sum" id="cs"></div>`,'Save',
 ()=>api('save',{mode:d?'edit':'create',date:$('#dd').value,rows:[...document.querySelectorAll('.r')].map(r=>({type:r.querySelector('.ty').value,task:r.querySelector('.tk').value,pct:r.querySelector('.pc').value}))}).then(()=>{lad();P=[];toast('Saved')}));
 (d?d.rows:[{}]).forEach(addRow);calc()}
function addRow(r){r=r||{};const e=document.createElement('div');e.className='r';
 e.innerHTML=`<input class="ty" list="pl" placeholder="Activity Type" value="${esc(r.type)}"><textarea class="tk" placeholder="Task / Deliverables">${esc(r.task)}</textarea><input class="pc" type="number" min="1" max="100" step="any" placeholder="%" value="${r.pct||''}" oninput="calc()"><button class="btn2" onclick="this.parentNode.remove();calc()">✕</button>`;$('#rows').appendChild(e);calc()}
function calc(){if(!$('#cs'))return;const t=[...document.querySelectorAll('.pc')].reduce((a,x)=>a+(+x.value||0),0);
 $('#cs').innerHTML=`Total Allocation: ${t}% · Total Mandays: ${(t/100).toFixed(2)} · ${Math.abs(t-100)<.001?'<span class="bd ok">Completed</span>':t>100?'<span class="bd er">Over 100%</span>':'<span class="bd w">Must reach 100%</span>'}`}
function delDay(i){const d=D[i];modal('Delete activity',`<p>Delete all entries on <b>${d.date}</b>? This is recorded in Activity History.</p>${d.rows.map(r=>`<div>• ${esc(r.type)} — ${r.pct}%</div>`).join('')}`,'Delete',()=>api('del',{date:d.date}).then(()=>{lad();toast('Deleted')}))}

/* projects */
function rp(){const q=$('#fq').value.toLowerCase(),A=U.role=='Admin';
 $('#tb').innerHTML=tbl(['Activity Type','Status','Created by',A?'':''],P.filter(p=>p.name.toLowerCase().includes(q)).map(p=>`<tr><td>${esc(p.name)}<td><span class="bd ${p.status=='Active'?'ok':'w'}">${p.status}</span><td>${esc(p.by)}<td>${A?`<a onclick="renP('${p.id}')">Rename</a><select onchange="setP('${p.id}',null,this.value)">${['Active','Pending','Archived'].map(s=>`<option ${s==p.status?'selected':''}>${s}</option>`).join('')}</select>`:''}</tr>`))}
function addP(){api('addProject',{name:$('#np').value}).then(()=>api('projects')).then(p=>{P=p;rp();toast('Added')}).catch(e=>toast(msg(e),1))}
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
