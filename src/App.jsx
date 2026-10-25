import React, { useEffect, useMemo, useState } from 'react';
import { createRequest as apiCreateRequest, getDashboard, joinMission as apiJoinMission, offerHelp as apiOfferHelp } from './api.js';
import {
  Activity, ArrowDownRight, ArrowRight, ArrowUpRight, Bell, CalendarDays,
  Check, ChevronDown, ChevronRight, CircleHelp, Clock3, Compass, HandHeart,
  HeartHandshake, Home, MapPin, Menu, MessageCircle, Plus, Search, ShieldCheck,
  Sparkles, Users, X
} from 'lucide-react';

const navItems = [
  { label: 'Overview', icon: Home }, { label: 'Requests', icon: HandHeart, badge: '12' },
  { label: 'Missions', icon: Compass }, { label: 'Volunteers', icon: Users },
];

function Brand() {
  return <div className="brand"><div className="brand-mark"><HeartHandshake size={20} strokeWidth={2.4} /></div><span>LifeLink<span className="brand-360"> 360</span></span></div>;
}

function Globe() {
  const dots = [[26,32],[42,24],[58,29],[72,38],[35,48],[51,46],[66,57],[23,65],[43,68],[57,77],[77,68],[82,51],[17,48],[30,80],[70,19]];
  return <div className="globe-wrap" aria-label="Illustration of connected neighbors around the world" role="img">
    <div className="globe-orbit orbit-one"/><div className="globe-orbit orbit-two"/>
    <div className="globe"><div className="globe-grid"/>{dots.map(([x,y],i)=><span key={i} className={`globe-dot ${i%4===0?'dot-hot':''}`} style={{left:`${x}%`,top:`${y}%`}}/>)}</div>
    <span className="globe-pin pin-a"><HeartHandshake size={15}/></span><span className="globe-pin pin-b"><Users size={14}/></span><span className="globe-pin pin-c"><HandHeart size={14}/></span>
  </div>;
}

function RequestModal({ onClose, onSubmit }) {
  const [form, setForm] = useState({ title: '', category: '', location: '', urgency: 'Today', details: '', contact: '' });
  const [errors, setErrors] = useState({});
  const update = (key, value) => setForm(current => ({ ...current, [key]: value }));
  function submit(event) {
    event.preventDefault();
    const next = {};
    if (form.title.trim().length < 6) next.title = 'Describe what you need (at least 6 characters).';
    if (!form.category) next.category = 'Choose a category.';
    if (form.location.trim().length < 2) next.location = 'Add a neighborhood or area.';
    if (form.details.trim().length < 12) next.details = 'Add a little more detail (at least 12 characters).';
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.contact)) next.contact = 'Enter a valid email address.';
    setErrors(next);
    if (!Object.keys(next).length) onSubmit(form);
  }
  return <div className="modal-backdrop" onMouseDown={event => event.target === event.currentTarget && onClose()}>
    <section className="modal" role="dialog" aria-modal="true" aria-labelledby="request-heading">
      <button className="icon-button modal-close" onClick={onClose} aria-label="Close"><X size={18}/></button>
      <div className="modal-kicker"><span className="kicker-icon"><HandHeart size={17}/></span> Ask your community</div>
      <h2 id="request-heading">What would help today?</h2><p className="modal-subtitle">Share a request with nearby neighbors. Keep personal details private.</p>
      <form className="request-form" onSubmit={submit} noValidate>
        <label>Request title<input value={form.title} onChange={e=>update('title',e.target.value)} placeholder="e.g. A ride to my appointment" maxLength={80} aria-invalid={!!errors.title}/>{errors.title&&<small className="field-error">{errors.title}</small>}</label>
        <div className="form-row"><label>Type of support<select value={form.category} onChange={e=>update('category',e.target.value)} aria-invalid={!!errors.category}><option value="">Choose one</option><option>Food & essentials</option><option>Transportation</option><option>Home support</option><option>Wellbeing</option><option>Other</option></select>{errors.category&&<small className="field-error">{errors.category}</small>}</label>
          <label>When do you need it?<select value={form.urgency} onChange={e=>update('urgency',e.target.value)}><option>Today</option><option>This week</option><option>Flexible</option></select></label></div>
        <label>Neighborhood or area<input value={form.location} onChange={e=>update('location',e.target.value)} placeholder="e.g. Riverside" maxLength={60} aria-invalid={!!errors.location}/>{errors.location&&<small className="field-error">{errors.location}</small>}</label>
        <label>Helpful details<textarea value={form.details} onChange={e=>update('details',e.target.value)} placeholder="Anything a volunteer should know? Please don't include sensitive information." rows="3" maxLength={400} aria-invalid={!!errors.details}/>{errors.details&&<small className="field-error">{errors.details}</small>}</label>
        <label>Contact email<input type="email" value={form.contact} onChange={e=>update('contact',e.target.value)} placeholder="you@example.com" aria-invalid={!!errors.contact}/>{errors.contact&&<small className="field-error">{errors.contact}</small>}</label>
        <div className="form-note"><ShieldCheck size={15}/> Demo only: requests are saved in local project data. Use sample information, not personal details.</div>
        <button className="button button-primary submit-button" type="submit">Share request <ArrowRight size={17}/></button>
      </form>
    </section>
  </div>;
}

function App() {
  const [activeNav, setActiveNav] = useState('Overview');
  const [requests, setRequests] = useState([]);
  const [missions, setMissions] = useState([]);
  const [stats, setStats] = useState({ openRequests: 0, activeVolunteers: 0, actsOfKindness: 0, communityScore: 0 });
  const [apiStatus, setApiStatus] = useState('connecting');
  const [modal, setModal] = useState(false);
  const [joined, setJoined] = useState([]);
  const [toast, setToast] = useState('');
  const [mobileNav, setMobileNav] = useState(false);
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState('All requests');
  const [notifications, setNotifications] = useState(false);
  const [profileMenu, setProfileMenu] = useState(false);
  const filteredRequests = useMemo(() => requests.filter(item => `${item.title} ${item.category} ${item.place}`.toLowerCase().includes(search.toLowerCase()) && (filter === 'All requests' || item.urgency === filter)), [requests, search, filter]);
  useEffect(() => {
    let current = true;
    getDashboard().then(data => {
      if (!current) return;
      setRequests(data.requests);
      setMissions(data.missions);
      setStats(data.stats);
      setJoined(data.missions.filter(mission => mission.joinedByMe).map(mission => mission.slug));
      setApiStatus('connected');
    }).catch(() => { if (current) setApiStatus('offline'); });
    return () => { current = false; };
  }, []);
  function notify(message) { setToast(message); window.setTimeout(() => setToast(''), 2800); }
  async function createRequest(form) {
    try {
      const data = await apiCreateRequest(form);
      setRequests(current => [data.request, ...current]);
      setStats(data.stats);
      setModal(false); setActiveNav('Overview'); notify('Your request was saved to the demo API.');
    } catch (error) { notify(error.message); }
  }
  async function offerHelp(item) {
    try {
      const data = await apiOfferHelp(item.id);
      setRequests(current => current.map(request => request.id === item.id ? data.request : request));
      setStats(data.stats);
      notify(data.alreadyOffered ? 'You already offered to help with this request.' : `Your offer for “${item.title}” was saved.`);
    } catch (error) { notify(error.message); }
  }
  async function joinMission(mission) {
    try {
      const data = await apiJoinMission(mission.slug);
      setMissions(current => current.map(item => item.slug === mission.slug ? data.mission : item));
      setJoined(current => current.includes(mission.slug) ? current : [...current, mission.slug]);
      setStats(data.stats);
      notify(data.alreadyJoined ? 'You are already on this mission.' : `You joined “${mission.title}”.`);
    } catch (error) { notify(error.message); }
  }
  const navLabel = activeNav === 'Overview' ? 'Your community, at a glance' : `Explore ${activeNav.toLowerCase()} in your community`;
  return <div className="app-shell">
    <aside className={`sidebar ${mobileNav?'sidebar-open':''}`}>
      <div className="sidebar-top"><Brand/><button className="icon-button sidebar-close" onClick={()=>setMobileNav(false)} aria-label="Close menu"><X size={18}/></button></div>
      <div className="community-switch"><div className="community-avatar">🌼</div><div><strong>Bloomfield</strong><span>Community hub</span></div><ChevronDown size={15} className="switch-chevron"/></div>
      <div className="nav-caption">YOUR SPACE</div>
      <nav className="main-nav" aria-label="Main navigation">{navItems.map(({label,icon:Icon,badge})=><button key={label} className={`nav-link ${activeNav===label?'active':''}`} onClick={()=>{setActiveNav(label);setMobileNav(false)}}><Icon size={18}/><span>{label}</span>{badge&&<small>{stats.openRequests}</small>}</button>)}</nav>
      <div className="nav-caption nav-caption-extra">YOUR COMMUNITY</div>
      <button className="nav-link" onClick={()=>notify('Community chat is a preview for this project.')}><MessageCircle size={18}/><span>Community chat</span><span className="unread-dot"/></button>
      <button className="nav-link" onClick={()=>notify('Community guide is coming soon.')}><CircleHelp size={18}/><span>Community guide</span></button>
      <div className="sidebar-spacer"/>
      <div className="impact-card"><div className="impact-badge"><Sparkles size={16}/></div><strong>Small acts, big impact.</strong><p>Your kindness makes Bloomfield a better place to call home.</p><button onClick={()=>setActiveNav('Missions')}>See what’s happening <ArrowRight size={14}/></button></div>
      <button className="profile-row" onClick={()=>setProfileMenu(v=>!v)}><div className="avatar user-avatar">D</div><div className="profile-meta"><strong>Dhanvanth</strong><span>Community member</span></div><ChevronDown size={16}/></button>
      {profileMenu&&<div className="profile-popover"><strong>Dhanvanth</strong><span>dhanvanth@example.com</span><button onClick={()=>notify('Profile settings are a demo preview.')}>Profile settings</button></div>}
    </aside>
    {mobileNav&&<button className="mobile-scrim" onClick={()=>setMobileNav(false)} aria-label="Close navigation"/>}
    <main className="main-area">
      <header className="topbar"><button className="icon-button mobile-menu" onClick={()=>setMobileNav(true)} aria-label="Open menu"><Menu size={20}/></button><div className="breadcrumb">Bloomfield <ChevronRight size={14}/> <span>{activeNav}</span></div><div className="topbar-actions"><div className="search-box"><Search size={16}/><input placeholder="Search requests..." value={search} onChange={e=>setSearch(e.target.value)} aria-label="Search requests"/><kbd>⌘ K</kbd></div><div className="notification-wrap"><button className="icon-button notification-button" aria-label="Notifications" onClick={()=>setNotifications(v=>!v)}><Bell size={18}/><span/></button>{notifications&&<div className="notification-popover"><strong>You’re all caught up</strong><p>New community updates will appear here.</p><button onClick={()=>setNotifications(false)}>Got it</button></div>}</div><button className="avatar top-avatar" onClick={()=>setProfileMenu(v=>!v)} aria-label="Open profile">D</button></div></header>
      <div className="page-content">
        <section className="welcome-row"><div><div className="eyebrow"><span className="live-dot"/> SUNDAY, OCTOBER 25</div><h1>Good morning, Dhanvanth <span className="wave">✦</span></h1><p>{navLabel}. A little help goes a long way.</p></div><button className="button button-primary" onClick={()=>setModal(true)}><Plus size={18}/> Ask for help</button></section>
        <section className="hero-card"><div className="hero-copy"><span className="hero-eyebrow"><Sparkles size={14}/> THE POWER OF SHOWING UP</span><h2>Neighbors helping<br/>neighbors, <em>every day.</em></h2><p>Every small act of kindness builds a stronger, more connected community.</p><button className="button button-white" onClick={()=>setActiveNav('Missions')}>Explore community missions <ArrowRight size={16}/></button><div className="hero-social"><div className="avatar-stack"><span>AM</span><span>RK</span><span>D</span><span>+</span></div><span><b>128 neighbors</b> making a difference this week</span></div></div><Globe/><div className="hero-sparkle sparkle-a">✦</div><div className="hero-sparkle sparkle-b">✧</div></section>
        <section className="stats-grid" aria-label="Community impact statistics">
          <article className="stat-card"><div className="stat-top"><span>Open requests</span><span className="stat-icon icon-lime"><HandHeart size={17}/></span></div><div className="stat-value">{stats.openRequests}<span className="stat-change"><ArrowUpRight size={13}/> 12%</span></div><div className="stat-foot">People looking for a helping hand</div><div className="sparkline spark-green"><i/><i/><i/><i/><i/><i/><i/><i/><i/><i/></div></article>
          <article className="stat-card"><div className="stat-top"><span>Active volunteers</span><span className="stat-icon icon-lavender"><Users size={17}/></span></div><div className="stat-value">{stats.activeVolunteers}<span className="stat-change"><ArrowUpRight size={13}/> 8%</span></div><div className="stat-foot">Neighbors ready to lend a hand</div><div className="sparkline spark-purple"><i/><i/><i/><i/><i/><i/><i/><i/><i/><i/></div></article>
          <article className="stat-card"><div className="stat-top"><span>Acts of kindness</span><span className="stat-icon icon-peach"><HeartHandshake size={17}/></span></div><div className="stat-value">{stats.actsOfKindness}<span className="stat-change"><ArrowUpRight size={13}/> 24%</span></div><div className="stat-foot">Good things happening this month</div><div className="sparkline spark-orange"><i/><i/><i/><i/><i/><i/><i/><i/><i/><i/></div></article>
          <article className="stat-card"><div className="stat-top"><span>Community score</span><span className="stat-icon icon-blue"><Activity size={17}/></span></div><div className="stat-value">{stats.communityScore}<span className="stat-unit">/100</span><span className="stat-change"><ArrowUpRight size={13}/> 6%</span></div><div className="stat-foot">Your kindness is catching on</div><div className="sparkline spark-blue"><i/><i/><i/><i/><i/><i/><i/><i/><i/><i/></div></article>
        </section>
        <div className="content-grid">
          <section className="panel requests-panel"><div className="panel-heading"><div><span className="section-kicker">A HAND WHEN IT’S NEEDED</span><h2>Nearby requests <span className="count-pill">{filteredRequests.length}</span></h2></div><button className="text-link" onClick={()=>setActiveNav('Requests')}>View all <ArrowRight size={15}/></button></div>
            <div className="request-tools"><div className="request-tabs">{['All requests','Today','This week'].map(label=><button key={label} className={filter===label?'selected':''} onClick={()=>setFilter(label)}>{label}</button>)}</div><button className="sort-button" onClick={()=>setFilter('All requests')}>Newest first <ChevronDown size={14}/></button></div>
            <div className="request-list">{filteredRequests.slice(0,4).map(item=><article className="request-item" key={item.id}><div className={`request-emoji ${item.color}`}>{item.icon}</div><div className="request-info"><div className="request-title-row"><h3>{item.title}</h3><span className={`urgency ${item.urgency==='Today'?'urgent':''}`}>{item.urgency}</span></div><div className="request-meta"><span>{item.category}</span><i>·</i><span><MapPin size={12}/>{item.place}</span><i>·</i><span><Clock3 size={12}/>{item.time}</span></div></div><button className="offer-button" onClick={()=>offerHelp(item)}>Offer help <ArrowRight size={14}/></button></article>)}{filteredRequests.length===0&&<div className="empty-state">{apiStatus==='connecting'?'Loading requests…':apiStatus==='offline'?'The demo API is offline. Start it with npm run api.':'No requests match this search. Try another keyword.'}</div>}</div>
            <button className="panel-footer-link" onClick={()=>setActiveNav('Requests')}>Browse all community requests <ArrowRight size={15}/></button>
          </section>
          <section className="panel missions-panel"><div className="panel-heading"><div><span className="section-kicker">BETTER, TOGETHER</span><h2>Community missions</h2></div><button className="icon-button subtle-icon" onClick={()=>setActiveNav('Missions')} aria-label="View missions"><ArrowRight size={17}/></button></div>
            <div className="mission-list">{missions.map((mission,index)=><article className="mission-card" key={mission.slug}><div className={`mission-art ${mission.color}`}><span>{mission.icon}</span><small>0{index+1}</small></div><div className="mission-details"><h3>{mission.title}</h3><p>{mission.detail}</p><div className="mission-progress"><div className="progress-track"><span style={{width:`${mission.joined/mission.goal*100}%`}}/></div><span>{mission.joined}<i>/{mission.goal} joined</i></span></div><button className={`join-button ${joined.includes(mission.slug)?'joined':''}`} onClick={()=>joinMission(mission)}>{joined.includes(mission.slug)?<><Check size={14}/> Joined</>:'Join mission'}</button></div></article>)}{missions.length===0&&apiStatus!=='connecting'&&<div className="empty-state">{apiStatus==='offline'?'Start the demo API to load missions.':'No community missions yet.'}</div>}</div>
            <button className="panel-footer-link" onClick={()=>setActiveNav('Missions')}>Discover all missions <ArrowRight size={15}/></button>
          </section>
        </div>
        <footer className="page-footer"><span><ShieldCheck size={14}/> Built on kindness. Designed for community.</span><span><span className={`api-indicator ${apiStatus}`} />API {apiStatus} <i>·</i> Student project preview</span></footer>
      </div>
    </main>
    {modal&&<RequestModal onClose={()=>setModal(false)} onSubmit={createRequest}/>}
    {toast&&<div className="toast"><span><Check size={16}/></span>{toast}<button onClick={()=>setToast('')} aria-label="Dismiss"><X size={15}/></button></div>}
  </div>;
}

export default App;
