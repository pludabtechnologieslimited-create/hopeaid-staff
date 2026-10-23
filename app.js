
const app=document.getElementById('app');
const C=window.HOPEAID_CONFIG||{},ready=Boolean(C.supabaseUrl&&C.supabasePublishableKey);
let supabase=null,busy=false;
const state={demo:false,user:null,profile:null,page:'overview',data:emptyData(),modal:null,filter:'all',search:'',toast:'',error:''};
function emptyData(){return{team:[],tasks:[],programmes:[],reports:[],attendance:[],announcements:[]}}
const sample=()=>({
 team:[
 {id:'demo1',full_name:'Amina Yusuf',email:'amina@example.org',department:'Programmes',job_title:'Programme Manager',role:'manager',is_active:true},
 {id:'demo2',full_name:'David Ibrahim',email:'david@example.org',department:'Health & Nutrition',job_title:'Field Officer',role:'staff',is_active:true},
 {id:'demo3',full_name:'Zainab Musa',email:'zainab@example.org',department:'Monitoring & Evaluation',job_title:'M&E Officer',role:'staff',is_active:true},
 {id:'demo4',full_name:'Grace Samuel',email:'grace@example.org',department:'Community Engagement',job_title:'Mobiliser',role:'staff',is_active:true}
 ],
 programmes:[
 {id:'p1',name:'Community Health & Nutrition',description:'Strengthening preventive healthcare, nutrition education and community wellbeing.',sector:'Health & Nutrition',location:'Maiduguri, Borno',start_date:'2026-09-01',status:'active'},
 {id:'p2',name:'Learning for Resilience',description:'Building access to skills, inclusive education and opportunities for local communities.',sector:'Education',location:'Borno State',start_date:'2026-10-01',status:'active'},
 {id:'p3',name:'Community Protection Outreach',description:'Awareness, dignity and safe referral pathways for at-risk communities.',sector:'Protection',location:'Maiduguri, Borno',start_date:'2026-11-01',status:'planning'}
 ],
 tasks:[
 {id:'t1',title:'Prepare community outreach report',description:'Summarise field activities and planned follow-up actions.',assigned_to:'demo1',priority:'high',status:'in_progress',due_date:'2026-10-26',programme_id:'p1'},
 {id:'t2',title:'Review nutrition activity plan',description:'Confirm the logistics and planned responsibilities.',assigned_to:'demo1',priority:'medium',status:'todo',due_date:'2026-10-28',programme_id:'p1'},
 {id:'t3',title:'Compile attendance sheets',description:'Prepare the monthly attendance totals.',assigned_to:'demo3',priority:'low',status:'done',due_date:'2026-10-21',programme_id:'p2'},
 {id:'t4',title:'Coordinate volunteer briefing',description:'Prepare the session materials and invitees.',assigned_to:'demo4',priority:'medium',status:'todo',due_date:'2026-10-30',programme_id:'p2'}
 ],
 announcements:[
 {id:'a1',title:'Welcome to the workspace',body:'This is a fictional preview. Live HopeAid records appear only when secure authentication and the dedicated database are configured.',created_at:'2026-10-23T08:00:00Z'},
 {id:'a2',title:'Monthly reporting reminder',body:'Share activity highlights, blockers and next steps with your programme supervisor.',created_at:'2026-10-20T09:30:00Z'}
 ],
 reports:[{id:'r1',title:'October outreach update',summary:'Planned community activities reviewed and next actions agreed.',challenges:'Field transport requires confirmation.',next_steps:'Confirm logistics and implementation dates.',author_id:'demo1',programme_id:'p1',created_at:'2026-10-18T11:00:00Z'}],
 attendance:[]
});
function esc(v){return String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]))}
function dateToday(){return new Intl.DateTimeFormat('en-CA',{timeZone:'Africa/Lagos',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date())}
function fmt(v,options){if(!v)return 'Not set';const d=new Date(String(v).length===10?v+'T12:00:00':v);return isNaN(+d)?'—':new Intl.DateTimeFormat('en-NG',{timeZone:'Africa/Lagos',...(options||{day:'numeric',month:'short',year:'numeric'})}).format(d)}
function manager(){return ['manager','admin','super_admin'].includes(state.profile?.role)}
function roleLabel(role){return ({super_admin:'Super Admin',admin:'Administrator',manager:'Manager',staff:'Staff'})[role]||'Staff'}
function fname(){return state.profile?.full_name?.trim().split(/\s+/)[0]||'Team'}
function initials(n){return String(n||'Staff').split(' ').filter(Boolean).slice(0,2).map(x=>x[0].toUpperCase()).join('')}
function avatar(n,extra=''){return '<span class="avatar '+extra+'">'+esc(initials(n))+'</span>'}
function pill(x){return '<span class="pill '+esc(x||'')+'">'+esc(({todo:'To do',in_progress:'In progress',done:'Completed',planning:'Planning',active:'Active',completed:'Completed',on_hold:'On hold'}[x])||x||'—')+'</span>'}
function empty(title,body){return '<div class="empty"><div class="icon">✓</div><b>'+esc(title)+'</b>'+esc(body)+'</div>'}
function button(txt,action,variant=''){return '<button type="button" class="button '+variant+'" data-action="'+esc(action)+'">'+txt+'</button>'}
function title(eyebrow,heading,desc,action=''){return '<div class="pagehead"><div><span class="eyebrow">'+esc(eyebrow)+'</span><h1>'+esc(heading)+'</h1><p>'+esc(desc)+'</p></div>'+action+'</div>'}
function panelhead(t,d,to){return '<header class="panelhead"><div><h3>'+esc(t)+'</h3><p>'+esc(d)+'</p></div><button class="link" data-page="'+to+'">View all →</button></header>'}
function pname(id){return state.data.programmes.find(p=>p.id===id)?.name||'General'}
function staffname(id){return state.data.team.find(p=>p.id===id)?.full_name||'Staff member'}
function alertBox(){return state.error?'<div class="errorbar" role="alert">'+esc(state.error)+'</div>':''}
const navItems=[['overview','◫','Overview'],['tasks','☑','My Tasks'],['programmes','▣','Programmes'],['attendance','◷','Attendance'],['reports','▤','Reports'],['announcements','◉','Announcements'],['team','♙','Staff Directory'],['settings','⚙','My Profile']];
function renderLogin(){
 app.innerHTML='<div class="signin"><aside class="sign-art"><div class="brand"><span class="mark">✦</span><div><b>hopeaid<span>247</span></b><small>STAFF WORKSPACE</small></div></div><section class="signmessage"><span class="eyebrow">✦ OUR PEOPLE, OUR IMPACT</span><h1>Good work starts<br>with <em>people.</em></h1><p>One organised space to collaborate, stay accountable and strengthen every community we serve.</p></section><small>Empowering Communities. Restoring Hope.</small></aside><main class="sign-panel"><div class="sign-card"><span class="eyebrow">STAFF WORKSPACE</span><h2>Welcome back<span style="color:#16995f">.</span></h2><p>Sign in with your approved HopeAid staff account.</p><form id="login-form"><label for="email">Work email address</label><input id="email" name="email" type="email" autocomplete="username" placeholder="you@hopeaid.ngo" required ><label for="password">Password</label><input id="password" name="password" type="password" autocomplete="current-password" placeholder="Enter your password" required >'+alertBox()+'<button type="submit" class="button" '+(busy?'disabled':'')+'>Sign in securely →</button></form>'+(!ready?'<div class="setup-alert" role="status">🔒 Login activation pending: Staff authentication is not yet connected. You can type into these fields, but the account cannot sign in until the database is activated. Do not enter a real or reused password yet.</div>':'')+'<div class="division">OR EXPLORE THE DESIGN</div>'+button('◫ &nbsp; Explore sample dashboard','demo','secondary')+'<p class="disclaimer">Sample mode uses fictional records only. No staff data is saved or transmitted.</p></div></main></div>';
}
function renderLocked(){app.innerHTML='<div class="locked"><div class="mark">✦</div><h1>Staff access pending</h1><p>'+esc(state.error||'Your account is signed in but does not have an active HopeAid staff profile. Contact your administrator for approval.')+'</p>'+button('Sign out','logout','secondary')+'</div>'}
function overview(){
 const mine=state.data.tasks.filter(t=>t.assigned_to===state.profile.id),open=mine.filter(t=>t.status!=='done'),done=mine.filter(t=>t.status==='done');
 const soon=open.filter(t=>t.due_date&&t.due_date<=new Date(Date.now()+7*86400000).toISOString().slice(0,10)).length;
 const stats=[['☑',open.length,'My open tasks','Work in progress'],['✓',done.length,'Tasks completed','Keep up the good work'],['▣',state.data.programmes.filter(p=>p.status==='active').length,'Active programmes','Foundation initiatives'],['◷',soon,'Due this week / overdue',soon?'Needs attention':'All caught up']];
 let out='<section class="welcome"><div><div class="eyebrow">✦ THE HOPEAID WORKSPACE</div><h1>Hello, '+esc(fname())+' 👋</h1><p>Here’s what’s happening across your work today. Every action contributes to stronger communities.</p><div class="welcome-buttons">'+button('▤ &nbsp; Submit a report','new-report','white')+'<button class="text-button" data-page="tasks">View my tasks →</button></div></div></section><div class="sectlabel">AT A GLANCE • '+esc(fmt(dateToday(),{weekday:'long',month:'long',day:'numeric'}))+'</div><div class="stats">'+stats.map(s=>'<div class="stat"><span class="stat-icon">'+s[0]+'</span><div class="stat-value">'+String(s[1]).padStart(2,'0')+'</div><div class="stat-title">'+esc(s[2])+'</div><div class="stat-foot">↗ '+esc(s[3])+'</div></div>').join('')+'</div>';
 out+='<div class="columns"><div class="stack"><section class="panel">'+panelhead('My priority tasks','Stay focused on what matters most','tasks')+'<div class="list">'+(open.length?open.slice(0,5).map(t=>'<div class="taskrow"><span class="taskicon">☑</span><div class="taskdetails"><strong>'+esc(t.title)+'</strong><small>'+(t.due_date?'Due '+esc(fmt(t.due_date)):'No due date')+' • '+esc(pname(t.programme_id))+'</small></div>'+pill(t.priority)+'</div>').join(''):empty('All clear','You have no pending tasks.'))+'</div></section>';
 out+='<section class="panel">'+panelhead('Our programmes','Community initiatives in motion','programmes')+'<div class="miniprogs">'+(state.data.programmes.length?state.data.programmes.slice(0,3).map(p=>'<div class="miniprog"><span class="miniicon">▣</span><main><strong>'+esc(p.name)+'</strong><small>⌖ '+esc(p.location)+'</small></main>'+pill(p.status)+'</div>').join(''):empty('No programmes','Manager-created programmes appear here.'))+'</div></section></div>';
 out+='<div class="stack"><section class="panel">'+panelhead('Announcements','News from the team','announcements')+(state.data.announcements.length?state.data.announcements.slice(0,3).map(a=>'<article class="notice"><span class="dot"></span><div><strong>'+esc(a.title)+'</strong><p>'+esc(a.body)+'</p><small>'+esc(fmt(a.created_at))+'</small></div></article>').join(''):empty('No updates','Team notices appear here.'))+'</section><section class="quote"><b>“</b><p>Every act of service is a step towards a community where everyone can thrive.</p><small>HOPE AID 247 FOUNDATION</small></section></div></div>';return out;
}
function tasks(){
 const visible=state.data.tasks.filter(t=>(manager()||t.assigned_to===state.profile.id)&&(state.filter==='all'||t.status===state.filter)&&((t.title+' '+(t.description||'')).toLowerCase().includes(state.search.toLowerCase())));
 const add=manager()?button('＋ Assign task','new-task'):'';
 return title('YOUR WORK','Tasks & assignments','Track responsibilities, progress and deadlines.',add)+'<section class="panel pad"><div class="toolrow"><div class="filters">'+[['all','All'],['todo','To do'],['in_progress','In progress'],['done','Completed']].map(x=>'<button data-filter="'+x[0]+'" class="'+(state.filter===x[0]?'selected':'')+'">'+x[1]+'</button>').join('')+'</div><form id="search-form"><input class="search" name="query" aria-label="Search tasks" placeholder="Search tasks…" value="'+esc(state.search)+'"><button class="button tiny secondary">Search</button></form></div>'+(visible.length?'<div class="scroll"><table><thead><tr><th>Task</th><th>Priority</th>'+(manager()?'<th>Assigned to</th>':'')+'<th>Due date</th><th>Status</th><th>Update</th></tr></thead><tbody>'+visible.map(t=>'<tr><td><strong>'+esc(t.title)+'</strong><small>'+esc(t.description||pname(t.programme_id))+'</small></td><td>'+pill(t.priority)+'</td>'+(manager()?'<td>'+esc(staffname(t.assigned_to))+'</td>':'')+'<td>'+esc(fmt(t.due_date))+'</td><td>'+pill(t.status)+'</td><td><select class="statusselect" data-task="'+esc(t.id)+'" aria-label="Status for '+esc(t.title)+'">'+[['todo','To do'],['in_progress','In progress'],['done','Completed']].map(([v,n])=>'<option value="'+v+'" '+(t.status===v?'selected':'')+'>'+n+'</option>').join('')+'</select></td></tr>').join('')+'</tbody></table></div>':empty('No matching tasks','Try another filter or search.'))+'</section>';
}
function programmes(){return title('OUR IMPACT','Programmes','Follow the foundation’s programmes and community activities.',manager()?button('＋ New programme','new-programme'):'')+'<div class="cards">'+(state.data.programmes.length?state.data.programmes.map(p=>'<article class="pcard"><div class="pcardcover"><span>▣</span>'+pill(p.status)+'</div><div class="pcardbody"><small>'+esc(p.sector||'GENERAL')+'</small><h3>'+esc(p.name)+'</h3><p>'+esc(p.description||'Programme details will appear here.')+'</p><div class="pcardmeta"><span>⌖ '+esc(p.location||'Location not specified')+'</span><span>◷ '+esc(fmt(p.start_date))+'</span></div></div></article>').join(''):empty('No programmes','Managers can create the first programme.'))+'</div>'}
function attendance(){
 const mine=state.data.attendance.filter(a=>a.staff_id===state.profile.id).sort((a,b)=>b.work_date.localeCompare(a.work_date)),shift=mine.find(x=>x.work_date===dateToday()),active=Boolean(shift?.clock_in&&!shift.clock_out);
 return title('WORKDAY','Attendance','Record the start and end of your working day.')+'<div class="attendance-grid"><div class="clockcard"><div class="clockicon">◷</div><span class="eyebrow">TODAY’S ATTENDANCE</span><h2>'+esc(fmt(dateToday(),{weekday:'long',month:'long',day:'numeric',year:'numeric'}))+'</h2><div class="state">● '+(active?'Currently checked in':shift?'Shift completed':'Not checked in yet')+'</div><div class="times"><div><small>Check in</small><b>'+esc(shift?.clock_in?fmt(shift.clock_in,{hour:'numeric',minute:'2-digit'}):'—')+'</b></div><div><small>Check out</small><b>'+esc(shift?.clock_out?fmt(shift.clock_out,{hour:'numeric',minute:'2-digit'}):'—')+'</b></div></div><button class="button" data-action="'+(active?'clock-out':'clock-in')+'" '+(shift?.clock_out||busy?'disabled':'')+'>'+(active?'Check out':'◷ &nbsp; '+(shift?'Attendance recorded':'Check in now'))+'</button><p>Attendance uses server-recorded time. Never record attendance for another person.</p></div><section class="panel pad"><h3>Recent attendance</h3><p class="muted">Your personal clock-in history</p><div class="history">'+(mine.length?mine.slice(0,15).map(a=>'<div class="historyline"><b>'+esc(fmt(a.work_date))+'</b><span>'+esc(fmt(a.clock_in,{hour:'numeric',minute:'2-digit'}))+' – '+esc(a.clock_out?fmt(a.clock_out,{hour:'numeric',minute:'2-digit'}):'In progress')+'</span>'+pill(a.clock_out?'done':'in_progress')+'</div>').join(''):empty('No attendance yet','Your recorded workdays will appear here.'))+'</div></section></div>';
}
function reports(){
 const records=state.data.reports.filter(r=>manager()||r.author_id===state.profile.id);
 return title('DOCUMENTATION','Activity reports','Capture field updates, challenges and next steps.',button('＋ Submit report','new-report'))+'<div class="privacy">▣ Do not enter personal beneficiary details or confidential protection/safeguarding cases in general activity reports.</div><section class="panel pad"><h3>Submitted reports</h3><p class="muted">Reports accessible to your account</p>'+(records.length?records.map(r=>'<div class="report"><span class="reporticon">▤</span><div><strong>'+esc(r.title)+'</strong><p>'+esc(r.summary)+'</p><small>'+esc(pname(r.programme_id))+' • '+esc(fmt(r.created_at))+(manager()?' • '+esc(staffname(r.author_id)):'')+'</small>'+((r.challenges||r.next_steps)?'<details><summary>Challenges and next steps</summary><p><b>Challenges:</b> '+esc(r.challenges||'—')+'</p><p><b>Next steps:</b> '+esc(r.next_steps||'—')+'</p></details>':'')+'</div></div>').join(''):empty('No reports yet','Use Submit report to record activity progress.'))+'</section>';
}
function announcements(){return title('STAY CONNECTED','Announcements','Important updates from foundation leadership.',manager()?button('＋ Post announcement','new-announcement'):'')+(state.data.announcements.length?state.data.announcements.map(a=>'<article class="announcement"><span class="icon">◉</span><div class="body"><header><h3>'+esc(a.title)+'</h3><small>'+esc(fmt(a.created_at))+'</small></header><p>'+esc(a.body)+'</p><footer>HOPEAID STAFF NOTICE</footer></div></article>').join(''):empty('No announcements','Management notices appear here.'))}
function team(){return title('OUR PEOPLE','Staff directory','Staff information visible to authorised managers.')+'<section class="panel pad"><h3>'+state.data.team.length+' team members</h3><div class="staffgrid" style="margin-top:20px">'+state.data.team.map(p=>'<article class="staffcard">'+avatar(p.full_name,'big')+'<h3>'+esc(p.full_name)+'</h3><p>'+esc(p.job_title||'Staff member')+'</p><span class="department">'+esc(p.department||'General')+'</span><footer><span class="'+(p.is_active?'active':'')+'">● '+(p.is_active?'Active':'Inactive')+'</span><span>'+esc(roleLabel(p.role))+'</span></footer></article>').join('')+'</div></section>'}
function settings(){const p=state.profile;return title('ACCOUNT','My profile','Your staff identity and access details.')+'<div class="settings"><section class="panel pad"><div class="profilehead">'+avatar(p.full_name,'big')+'<div><h2>'+esc(p.full_name)+'</h2><p>'+esc(p.job_title||p.department||'Staff member')+'</p></div></div>'+[['Email',state.demo?'Fictional sample account':p.email],['Department',p.department||'Not assigned'],['Account role',roleLabel(p.role)],['Status',p.is_active?'Active':'Inactive']].map(x=>'<div class="profield"><span>'+x[0]+'</span><b>'+esc(x[1])+'</b></div>').join('')+'</section><section class="panel pad"><h3>Account security</h3><p class="muted">Only authorised HopeAid staff can access protected records. Contact your administrator for account changes.</p><div class="security"><b>🔒 Access protection</b>Roles and data access are enforced by server-side database permissions.</div>'+button(state.demo?'Leave sample dashboard':'Sign out','logout','secondary')+'</section></div>'}
function field(label,name,required=false,type='text',placeholder=''){return '<label class="field"><span>'+esc(label)+'</span>'+(type==='textarea'?'<textarea name="'+name+'" rows="3" '+(required?'required':'')+' placeholder="'+esc(placeholder)+'"></textarea>':'<input name="'+name+'" type="'+type+'" '+(required?'required':'')+' placeholder="'+esc(placeholder)+'">')+'</label>'}
function select(label,name,opts){return '<label class="field"><span>'+esc(label)+'</span><select name="'+name+'">'+opts.map(o=>'<option value="'+esc(o[0])+'">'+esc(o[1])+'</option>').join('')+'</select></label>'}
function modalMarkup(){
 const kind=state.modal;if(!kind)return '';
 let body='',heading='';
 const programmes=[['','General / no programme'],...state.data.programmes.map(p=>[p.id,p.name])];
 if(kind==='task'){heading='Assign a task';body=field('Task title','title',true,'text','What needs to be done?')+field('Instructions','description',false,'textarea','Activity requirements')+select('Assigned staff','assigned_to',state.data.team.filter(p=>p.is_active).map(p=>[p.id,p.full_name]))+'<div class="twofields">'+select('Priority','priority',[['medium','Medium'],['low','Low'],['high','High']])+field('Due date','due_date',false,'date')+'</div>'+select('Programme','programme_id',programmes)}
 if(kind==='programme'){heading='Create programme';body=field('Programme name','name',true,'text','Programme name')+field('Description','description',false,'textarea','Objectives and activities')+field('Sector','sector',true,'text','e.g. Health & Nutrition')+field('Location','location',false,'text','e.g. Maiduguri, Borno')+'<div class="twofields">'+field('Start date','start_date',false,'date')+select('Status','status',[['planning','Planning'],['active','Active'],['on_hold','On hold'],['completed','Completed']])+'</div>'}
 if(kind==='report'){heading='Submit activity report';body=field('Report title','title',true,'text','Report title')+select('Related programme','programme_id',programmes)+field('Summary','summary',true,'textarea','Activities and outcomes, without personal data')+field('Challenges','challenges',false,'textarea','Logistical or operational challenges')+field('Next steps','next_steps',false,'textarea','What happens next?')+'<div class="privacy">Do not enter beneficiary names, confidential case information or safeguarding allegations.</div>'}
 if(kind==='announcement'){heading='Post announcement';body=field('Notice title','title',true,'text','Announcement title')+field('Message','body',true,'textarea','Write the message to staff')}
 return '<div class="overlay" id="overlay"><section class="modal" role="dialog" aria-modal="true" aria-labelledby="modal-title"><div class="modalhead"><div><span class="eyebrow">HOPEAID WORKSPACE</span><h2 id="modal-title">'+heading+'</h2></div><button class="xclose" type="button" data-action="close" aria-label="Close">×</button></div><form id="create-form" data-kind="'+kind+'"><div class="modalform">'+body+'</div><footer class="modalfoot">'+button('Cancel','close','secondary')+'<button type="submit" class="button" '+(busy?'disabled':'')+'>Save</button></footer></form></section></div>';
}
function render(){
 if(!state.demo&&!state.user){renderLogin();return}
 if(!state.profile){renderLocked();return}
 if(state.page==='team'&&!manager())state.page='overview';
 const pageContent={overview,tasks,programmes,attendance,reports,announcements,team,settings}[state.page]?.()||overview();
 const nav=navItems.slice(0,7).filter(x=>x[0]!=='team'||manager()).map(x=>'<button class="navlink '+(state.page===x[0]?'current':'')+'" data-page="'+x[0]+'"><span class="ico">'+x[1]+'</span>'+x[2]+(state.page===x[0]?'<span class="arrow">●</span>':'')+'</button>').join('');
 app.innerHTML='<div class="screen-shade" data-action="close-nav"></div><div class="shell"><aside class="sidebar"><div class="brand"><span class="mark">✦</span><div><b>hopeaid<span>247</span></b><small>STAFF WORKSPACE</small></div><button class="sidebar-close" data-action="close-nav">×</button></div><div class="workspace"><span class="symbol">✦</span><div><b>Hope Aid Foundation</b><small>Internal workspace</small></div><span class="chev">⌄</span></div><div class="navlabel">WORKSPACE</div><nav class="navlist" aria-label="Staff navigation">'+nav+'</nav><div class="navlabel support-label">SUPPORT</div><nav class="navlist"><a class="navlink" href="https://hopeaid.ngo/safeguarding.html" target="_blank" rel="noopener noreferrer"><span class="ico">♧</span>Safeguarding policy ↗</a><button class="navlink '+(state.page==='settings'?'current':'')+'" data-page="settings"><span class="ico">⚙</span>My Profile</button></nav><div class="sidebar-bottom"><div class="support-card"><strong>✦ Making impact together</strong><p>Small actions. Lasting change.</p><a href="https://hopeaid.ngo" rel="noopener noreferrer" target="_blank">Visit foundation website ↗</a></div><div class="user-chip">'+avatar(state.profile.full_name)+'<div><b>'+esc(state.profile.full_name)+'</b><small>'+esc(state.profile.job_title||state.profile.department||'Staff member')+'</small></div></div></div></aside><div class="main"><header class="topbar"><div class="crumb"><button class="hamburger" data-action="toggle-nav" aria-label="Open menu">☰</button>Workspace &nbsp; › &nbsp; <b>'+esc(navItems.find(x=>x[0]===state.page)?.[2]||'Overview')+'</b></div><div class="top-actions">'+(state.demo?'<span class="preview-tag">● DEMO MODE</span>':'')+'<span class="date">◷ '+esc(fmt(dateToday()))+'</span><button class="topuser" data-page="settings">'+avatar(state.profile.full_name)+'<b>'+esc(fname())+'</b></button></div></header><main class="content"><div class="inner">'+alertBox()+pageContent+'<footer class="sitefoot"><span>© '+new Date().getFullYear()+' Hope Aid 247 Foundation</span><span>Built for the people behind the impact ✦</span></footer></div></main></div></div>'+modalMarkup();
}
function flash(msg,error=false){state.toast=msg;document.querySelector('.toast')?.remove();const el=document.createElement('div');el.className='toast'+(error?' err':'');el.setAttribute('role','status');el.textContent=msg;const close=document.createElement('button');close.textContent='×';close.onclick=()=>el.remove();el.appendChild(close);document.body.appendChild(el)}
function err(e){state.error=e?.message||String(e)||'Operation failed';render();flash(state.error,true)}
async function loadData(uid){
 if(!supabase||!uid)return;
 const {data:p,error:e}=await supabase.from('staff_profiles').select('*').eq('id',uid).maybeSingle();if(e)throw e;
 state.profile=p?.is_active?p:null;
 if(!state.profile){state.data=emptyData();render();return}
 const isMgr=manager();
 const results=await Promise.all([
 supabase.from('tasks').select('*').order('created_at',{ascending:false}).limit(200),
 supabase.from('programmes').select('*').order('created_at',{ascending:false}).limit(200),
 supabase.from('reports').select('*').order('created_at',{ascending:false}).limit(200),
 supabase.from('attendance').select('*').order('work_date',{ascending:false}).limit(200),
 supabase.from('announcements').select('*').order('created_at',{ascending:false}).limit(100),
 isMgr?supabase.from('staff_profiles').select('*').order('full_name').limit(200):Promise.resolve({data:[p],error:null})
 ]);
 const failed=results.find(r=>r.error);if(failed)throw failed.error;
 for(const [i,name] of ['tasks','programmes','reports','attendance','announcements','team'].entries())state.data[name]=results[i].data||[];
 state.error='';render();
}
function startDemo(){state.demo=true;state.data=sample();state.profile=state.data.team[0];state.page='overview';state.filter='all';state.search='';state.error='';render();flash('Sample preview only — changes are not saved.')}
async function login(form){if(!supabase){state.error='Staff login is not active yet. A dedicated HopeAid authentication database is required.';renderLogin();return}busy=true;state.error='';renderLogin();try{const {data,error:e}=await supabase.auth.signInWithPassword({email:String(form.get('email')).trim(),password:String(form.get('password'))});if(e)throw e;state.user=data.user;await loadData(data.user.id)}catch(e){err(e)}finally{busy=false}}
async function logout(){if(state.demo){state.demo=false;state.data=emptyData();state.profile=null;state.user=null;state.error='';state.page='overview';render();return}if(supabase){const {error:e}=await supabase.auth.signOut();if(e){err(e);return}}state.user=null;state.profile=null;state.data=emptyData();state.page='overview';state.error='';render()}
async function write(kind,form){
 const get=n=>String(form.get(n)||'').trim();
 const payloads={
 task:{title:get('title'),description:get('description'),assigned_to:get('assigned_to'),priority:get('priority'),due_date:get('due_date')||null,programme_id:get('programme_id')||null,status:'todo'},
 programme:{name:get('name'),description:get('description'),sector:get('sector'),location:get('location'),start_date:get('start_date')||null,status:get('status')},
 report:{title:get('title'),summary:get('summary'),challenges:get('challenges'),next_steps:get('next_steps'),programme_id:get('programme_id')||null},
 announcement:{title:get('title'),body:get('body')}
 };
 const table={task:'tasks',programme:'programmes',report:'reports',announcement:'announcements'}[kind];
 if(!table||!payloads[kind])return;
 if(['task','programme','announcement'].includes(kind)&&!manager())throw new Error('Manager access required');
 const payload=payloads[kind];
 if(state.demo){const row={...payload,id:'demo-'+Date.now(),created_at:new Date().toISOString(),...(kind==='report'?{author_id:state.profile.id}:{}),...(kind==='announcement'?{author_id:state.profile.id}:{})};state.data[table].unshift(row)}
 else{const {error:e}=await supabase.from(table).insert(payload);if(e)throw e;await loadData(state.user.id)}
 state.modal=null;render();flash(kind[0].toUpperCase()+kind.slice(1)+' saved'+(state.demo?' in sample mode':'')+'.');
}
async function taskStatus(id,value){
 if(state.demo){const t=state.data.tasks.find(x=>x.id===id);if(t)t.status=value}
 else{const {error:e}=await supabase.rpc('set_task_status',{p_task_id:id,p_status:value});if(e)throw e;await loadData(state.user.id)}
 render();flash('Task status updated.');
}
async function clock(which){
 if(state.demo){const day=dateToday(),now=new Date().toISOString(),todayRow=state.data.attendance.find(a=>a.staff_id===state.profile.id&&a.work_date===day);if(which==='clock-in'){if(todayRow)throw new Error('Already checked in today');state.data.attendance.unshift({id:'d'+Date.now(),staff_id:state.profile.id,work_date:day,clock_in:now,clock_out:null})}else{if(!todayRow||todayRow.clock_out)throw new Error('No active shift');todayRow.clock_out=now}}
 else{const {error:e}=await supabase.rpc(which.replace('-','_'));if(e)throw e;await loadData(state.user.id)}
 render();flash(which==='clock-in'?'Checked in successfully.':'Checked out successfully.');
}
document.addEventListener('click',async e=>{
 const page=e.target.closest('[data-page]');if(page){state.page=page.dataset.page;state.error='';document.body.classList.remove('nav-open');render();return}
 const a=e.target.closest('[data-action]');if(!a)return;
 const action=a.dataset.action;
 if(action==='toggle-nav'){document.body.classList.toggle('nav-open');return}
 if(action==='close-nav'){document.body.classList.remove('nav-open');return}
 if(action==='demo'){startDemo();return}
 if(action==='close'){state.modal=null;render();return}
 if(action==='logout'){await logout();return}
 if(action.startsWith('new-')){if(['new-task','new-programme','new-announcement'].includes(action)&&!manager())return;state.modal=action.slice(4);state.error='';render();return}
 if(action==='clock-in'||action==='clock-out'){if(busy)return;busy=true;try{await clock(action)}catch(e){err(e)}finally{busy=false}}
});
document.addEventListener('click',e=>{const f=e.target.closest('[data-filter]');if(!f)return;state.filter=f.dataset.filter;render()});
document.addEventListener('change',async e=>{const el=e.target.closest('[data-task]');if(!el||busy)return;busy=true;try{await taskStatus(el.dataset.task,el.value)}catch(ex){err(ex)}finally{busy=false}});
document.addEventListener('submit',async e=>{
 if(!['login-form','create-form','search-form'].includes(e.target.id))return;e.preventDefault();
 if(e.target.id==='search-form'){state.search=String(new FormData(e.target).get('query')||'');render();return}
 if(busy)return;busy=true;
 const form=new FormData(e.target);
 try{if(e.target.id==='login-form')await login(form);else await write(e.target.dataset.kind,form)}
 catch(ex){err(ex)}finally{busy=false}
});
document.addEventListener('keydown',e=>{if(e.key==='Escape'&&state.modal){state.modal=null;render()}});
async function init(){
 if(!ready){renderLogin();return}
 try{
 const {createClient}=await import('https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.57.4/+esm');
 supabase=createClient(C.supabaseUrl,C.supabasePublishableKey);
 const {data,error:e}=await supabase.auth.getUser();
 if(e&&e.name!=='AuthSessionMissingError')throw e;
 state.user=data?.user||null;
 if(state.user)await loadData(state.user.id);else renderLogin();
 }catch(e){state.error='Unable to connect staff login: '+(e?.message||'unknown error');renderLogin()}
}
init();
