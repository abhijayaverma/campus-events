import { useEffect, useMemo, useState, type FormEvent } from 'react'
import { ArrowRight, CalendarDays, ChevronDown, Compass, GraduationCap, MapPin, Menu, Search, Sparkles, Ticket, Users, X } from 'lucide-react'
import { cancelRegistration, createEvent, getAdminEvents, getAdminRegistrations, getOrganizerRegistrations, getMyRegistrations, getPublishedEvents, registerForEvent, setAdminEventStatus, type EventRecord, type NewEvent } from './lib/events'
import { isSupabaseConfigured, supabase } from './lib/supabase'
import { getCurrentUser, signInWithEmail, signOut, signUpWithEmail } from './lib/auth'
import type { User } from '@supabase/supabase-js'

const categories = ['All events', 'Workshop', 'Hackathon', 'Talk', 'Cultural', 'Conference', 'Networking']
type CampusEvent = {
  id: string
  title: string
  category: string
  description: string
  date: string
  day: string
  month: string
  time: string
  venue: string
  city: string
  price: string
  image: string
}

function formatEvent(record: EventRecord): CampusEvent {
  const start = new Date(record.starts_at)
  const end = new Date(record.ends_at)
  const date = new Intl.DateTimeFormat('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }).format(start)
  const day = new Intl.DateTimeFormat('en-IN', { day: '2-digit' }).format(start)
  const month = new Intl.DateTimeFormat('en-IN', { month: 'short' }).format(start).toUpperCase()
  const timeOptions: Intl.DateTimeFormatOptions = { hour: 'numeric', minute: '2-digit', hour12: true }
  const time = start.toDateString() === end.toDateString()
    ? `${new Intl.DateTimeFormat('en-IN', timeOptions).format(start)} – ${new Intl.DateTimeFormat('en-IN', timeOptions).format(end)}`
    : `${new Intl.DateTimeFormat('en-IN', timeOptions).format(start)} onwards`
  return {
    id: record.id,
    title: record.title,
    category: record.category,
    description: record.description,
    date,
    day,
    month,
    time,
    venue: record.venue,
    city: record.city,
    price: 'Registration',
    image: record.cover_image_url || 'https://images.unsplash.com/photo-1523580494863-6f3031224c94?auto=format&fit=crop&w=1000&q=85',
  }
}

export default function App() {
  const [activeCategory, setActiveCategory] = useState('All events')
  const [query, setQuery] = useState('')
  const [city, setCity] = useState('All cities')
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [selectedEvent, setSelectedEvent] = useState<string | null>(null)
  const [events, setEvents] = useState<CampusEvent[]>([])
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState('')
  const [user, setUser] = useState<User | null>(null)
  const [authOpen, setAuthOpen] = useState(false)
  const [authMode, setAuthMode] = useState<'signin' | 'signup'>('signin')
  const [fullName, setFullName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [authBusy, setAuthBusy] = useState(false)
  const [authError, setAuthError] = useState('')
  const [authMessage, setAuthMessage] = useState('')
  const [registrationBusy, setRegistrationBusy] = useState(false)
  const [registrationMessage, setRegistrationMessage] = useState('')
  const [registrationError, setRegistrationError] = useState('')
  const [myRegistrations, setMyRegistrations] = useState<Array<{id:string;status:string;event: {id:string;title:string;category:string;venue:string;city:string;starts_at:string;ends_at:string;status:string} | null}>>([])
  const [dashboardLoading, setDashboardLoading] = useState(false)
  const [dashboardError, setDashboardError] = useState('')
  const [cancelBusy, setCancelBusy] = useState<string | null>(null)
  const [userRole, setUserRole] = useState<'student' | 'organizer' | 'admin'>('student')
  const [eventFormOpen, setEventFormOpen] = useState(false)
  const [eventSaving, setEventSaving] = useState(false)
  const [eventFormError, setEventFormError] = useState('')
  const [eventFormMessage, setEventFormMessage] = useState('')
  const [newEvent, setNewEvent] = useState({ title:'', description:'', category:'Workshop', venue:'', city:'Kanpur', starts_at:'', ends_at:'', cover_image_url:'', capacity:'' })
  const [adminEvents, setAdminEvents] = useState<EventRecord[]>([])
  const [adminRegistrations, setAdminRegistrations] = useState<Array<{id:string;event_id:string;user_id:string;status:string;created_at:string}>>([])
  const [organizerRegistrations, setOrganizerRegistrations] = useState<Array<{id:string;event_id:string;user_id:string;status:string;created_at:string;event_title:string}>>([])
  const [organizerAttendeesError, setOrganizerAttendeesError] = useState('')
  const [adminLoading, setAdminLoading] = useState(false)
  const [adminError, setAdminError] = useState('')
  const [adminBusy, setAdminBusy] = useState<string | null>(null)

  useEffect(() => {
    let active = true
    async function loadEvents() {
      if (!isSupabaseConfigured) {
        setLoadError('The event service is not configured yet. Please check the Supabase environment variables in Vercel.')
        setLoading(false)
        return
      }
      try {
        const records = await getPublishedEvents()
        if (active) {
          setEvents(records.map(formatEvent))
          setLoadError('')
        }
      } catch (error) {
        if (active) setLoadError(error instanceof Error ? error.message : 'Could not load events. Please try again.')
      } finally {
        if (active) setLoading(false)
      }
    }
    loadEvents()
    return () => { active = false }
  }, [])

  useEffect(() => {
    if (!supabase) return
    getCurrentUser().then(setUser).catch(() => setUser(null))
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null)
    })
    return () => subscription.unsubscribe()
  }, [])

  async function handleAuthSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setAuthBusy(true)
    setAuthError('')
    setAuthMessage('')
    try {
      if (authMode === 'signup') {
        const result = await signUpWithEmail(email.trim(), password, fullName.trim())
        if (!result.session) {
          setAuthMessage('Account created. Check your email for a verification link, then sign in.')
        } else {
          setAuthMessage('Your account is ready.')
          setAuthOpen(false)
        }
      } else {
        await signInWithEmail(email.trim(), password)
        setAuthOpen(false)
        setPassword('')
      }
    } catch (error) {
      setAuthError(error instanceof Error ? error.message : 'Authentication failed. Please try again.')
    } finally {
      setAuthBusy(false)
    }
  }

  async function handleRegister() {
    if (!user) {
      setAuthMode('signin')
      setAuthError('')
      setAuthMessage('Sign in to register for this event.')
      setAuthOpen(true)
      return
    }
    if (!selected) return
    setRegistrationBusy(true)
    setRegistrationError('')
    setRegistrationMessage('')
    try {
      await registerForEvent(selected.id)
      setRegistrationMessage('You are registered for this event. Your place has been recorded.')
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Registration could not be completed.'
      setRegistrationError(message.includes('duplicate') || message.includes('unique')
        ? 'You are already registered for this event.'
        : message)
    } finally {
      setRegistrationBusy(false)
    }
  }

  async function handleSignOut() {
    try {
      await signOut()
      setUser(null)
    } catch (error) {
      setAuthError(error instanceof Error ? error.message : 'Could not sign out.')
    }
  }

  useEffect(() => {
    let active = true
    async function loadRole() {
      if (!user || !supabase) { setUserRole('student'); return }
      const { data, error } = await supabase.from('profiles').select('role').eq('id', user.id).single()
      if (active && !error && data?.role) setUserRole(data.role as 'student' | 'organizer' | 'admin')
    }
    loadRole()
    return () => { active = false }
  }, [user])

  useEffect(() => {
    let active = true
    async function loadAdminEvents() {
      if (!user || userRole !== 'admin') return
      setAdminLoading(true)
      setAdminError('')
      try {
        const [records, registrations] = await Promise.all([getAdminEvents(), getAdminRegistrations()])
        if (active) { setAdminEvents(records); setAdminRegistrations(registrations) }
      } catch (error) {
        if (active) setAdminError(error instanceof Error ? error.message : 'Could not load the event directory.')
      } finally {
        if (active) setAdminLoading(false)
      }
    }
    loadAdminEvents()
    return () => { active = false }
  }, [user, userRole])

  const activeAdminRegistrations = adminRegistrations.filter(item => item.status === 'registered')
  const popularAdminEvents = adminEvents.map(item => ({ ...item, registrations: activeAdminRegistrations.filter(registration => registration.event_id === item.id).length }))
    .sort((a, b) => b.registrations - a.registrations).slice(0, 5)

  async function handleAdminEventStatus(eventId: string, status: EventRecord['status']) {
    setAdminBusy(eventId)
    setAdminError('')
    try {
      const updated = await setAdminEventStatus(eventId, status)
      setAdminEvents(current => current.map(item => item.id === eventId ? updated : item))
      if (status === 'published') {
        const records = await getPublishedEvents()
        setEvents(records.map(formatEvent))
      }
    } catch (error) {
      setAdminError(error instanceof Error ? error.message : 'Could not update this event.')
    } finally {
      setAdminBusy(null)
    }
  }

  useEffect(() => {
    let active = true
    async function loadOrganizerRegistrations() {
      if (!user || (userRole !== 'organizer' && userRole !== 'admin')) { setOrganizerRegistrations([]); return }
      try { const records = await getOrganizerRegistrations(); if (active) { setOrganizerRegistrations(records); setOrganizerAttendeesError('') } }
      catch (error) { if (active) setOrganizerAttendeesError(error instanceof Error ? error.message : 'Could not load attendee registrations.') }
    }
    loadOrganizerRegistrations()
    return () => { active = false }
  }, [user, userRole])

  async function handleCreateEvent(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setEventFormError('')
    setEventFormMessage('')

    const startTime = new Date(newEvent.starts_at).getTime()
    const endTime = new Date(newEvent.ends_at).getTime()
    if (!Number.isFinite(startTime) || !Number.isFinite(endTime)) {
      setEventFormError('Please enter valid event start and end dates.')
      return
    }
    if (endTime <= startTime) {
      setEventFormError('Event end date and time must be later than the start date and time.')
      return
    }

    setEventSaving(true)
    try {
      const payload: NewEvent = {
        title: newEvent.title.trim(),
        description: newEvent.description.trim(),
        category: newEvent.category,
        venue: newEvent.venue.trim(),
        city: newEvent.city.trim(),
        starts_at: new Date(newEvent.starts_at).toISOString(),
        ends_at: new Date(newEvent.ends_at).toISOString(),
        cover_image_url: newEvent.cover_image_url.trim() || undefined,
        capacity: newEvent.capacity ? Number(newEvent.capacity) : undefined,
        status: 'pending',
      }
      await createEvent(payload)
      setEventFormMessage('Event submitted for review. It will appear publicly after approval.')
      setNewEvent({ title:'', description:'', category:'Workshop', venue:'', city:'Kanpur', starts_at:'', ends_at:'', cover_image_url:'', capacity:'' })
      setEventFormOpen(false)
    } catch (error) {
      const detail = error as { message?: string; details?: string; hint?: string; code?: string }
      const parts = [detail?.message, detail?.details, detail?.hint, detail?.code ? `Code: ${detail.code}` : '']
        .filter(Boolean)
      setEventFormError(parts.join(' · ') || 'Could not submit event. Please check the event details and try again.')
    } finally {
      setEventSaving(false)
    }
  }

  useEffect(() => {
    let active = true
    async function loadMyRegistrations() {
      if (!user) {
        setMyRegistrations([])
        return
      }
      setDashboardLoading(true)
      setDashboardError('')
      try {
        const registrations = await getMyRegistrations()
        if (active) setMyRegistrations(registrations.map(item => ({
          id: item.id as string,
          status: item.status as string,
          event: (Array.isArray(item.event) ? item.event[0] : item.event) ?? null,
        })))
      } catch (error) {
        if (active) setDashboardError(error instanceof Error ? error.message : 'Could not load your registrations.')
      } finally {
        if (active) setDashboardLoading(false)
      }
    }
    loadMyRegistrations()
    return () => { active = false }
  }, [user])

  async function handleCancelRegistration(registrationId: string) {
    setCancelBusy(registrationId)
    setDashboardError('')
    try {
      await cancelRegistration(registrationId)
      setMyRegistrations(current => current.map(item => item.id === registrationId ? { ...item, status: 'cancelled' } : item))
    } catch (error) {
      setDashboardError(error instanceof Error ? error.message : 'Could not cancel this registration.')
    } finally {
      setCancelBusy(null)
    }
  }

  const filtered = useMemo(() => events.filter(event =>
    (activeCategory === 'All events' || event.category.toLowerCase() === activeCategory.toLowerCase()) &&
    (city === 'All cities' || event.city.toLowerCase() === city.toLowerCase()) &&
    `${event.title} ${event.category} ${event.city} ${event.venue}`.toLowerCase().includes(query.toLowerCase())
  ), [events, activeCategory, query, city])
  const featured = filtered[0]
  const selected = events.find(event => event.id === selectedEvent)
  const goExplore = () => window.location.assign('/events')

  const currentPage = window.location.pathname.replace(/\/$/, '') || '/'
  const page = currentPage === '/admin' ? 'admin' : currentPage === '/organizer' ? 'organizer' : currentPage === '/account' ? 'account' : 'events'

  return <div className="app-shell" data-page={page}>
    <header className="site-header">
      <a className="brand" href="#"><span className="brand-mark"><GraduationCap size={21}/></span><span>campus<span className="brand-accent">ly</span></span></a>
      <nav className={mobileMenuOpen ? 'main-nav nav-open' : 'main-nav'}>
        <a className="nav-link active" href="/events" onClick={() => setMobileMenuOpen(false)}>Discover</a>
        <a className="nav-link" href="/events#how-it-works" onClick={() => setMobileMenuOpen(false)}>How it works</a>
        <a className="nav-link" href="/organizer" onClick={() => setMobileMenuOpen(false)}>For organizers</a>
        {user && userRole === 'admin' && <a className="nav-link" href="/admin" onClick={() => setMobileMenuOpen(false)}>Super Admin</a>}
      </nav>
      <div className="header-actions">
        <button className="text-button" onClick={() => window.location.assign(user && (userRole === 'organizer' || userRole === 'admin') ? '/organizer' : '/organizer')}>Host an event</button>
        {user ? <><button className="text-button account-button" onClick={() => window.location.assign('/account')}>My account</button><button className="text-button account-button" onClick={handleSignOut}>Sign out</button></> : <button className="text-button" onClick={() => { setAuthMode('signin'); setAuthError(''); setAuthMessage(''); setAuthOpen(true) }}>Sign in</button>}
        <button className="primary-button header-cta" onClick={goExplore}>Explore events <ArrowRight size={16}/></button>
      </div>
      <button className="mobile-menu-button" aria-label="Toggle navigation" onClick={() => setMobileMenuOpen(!mobileMenuOpen)}>{mobileMenuOpen ? <X/> : <Menu/>}</button>
    </header>
    <main>
      {page === 'events' && <>
      <section className="hero">
        <div className="hero-copy">
          <div className="eyebrow"><span className="eyebrow-dot"/>YOUR CAMPUS, YOUR COMMUNITY</div>
          <h1>Make campus<br/>life <span className="serif-accent">happen.</span></h1>
          <p className="hero-description">The workshops, ideas, people and experiences worth showing up for — all in one place.</p>
          <div className="hero-search">
            <div className="search-field"><Search size={19}/><input aria-label="Search events" placeholder="Search events, workshops, colleges..." value={query} onChange={e => setQuery(e.target.value)}/></div>
            <div className="location-field"><MapPin size={18}/><select aria-label="Choose city" value={city} onChange={e => setCity(e.target.value)}><option>Kanpur</option><option>Lucknow</option><option>Delhi</option><option>Jaipur</option><option>All cities</option></select><ChevronDown size={15}/></div>
            <button aria-label="Search" className="search-submit" onClick={goExplore}><ArrowRight size={20}/></button>
          </div>
          <div className="hero-note"><Sparkles size={15}/>Discover something beyond your timetable.</div>
        </div>
        <div className="hero-art">
          <div className="hero-image-wrap"><img src="https://images.unsplash.com/photo-1523580494863-6f3031224c94?auto=format&fit=crop&w=1200&q=90" alt="Students gathered at a university event"/></div>
          <div className="floating-card floating-card-top"><span className="floating-icon"><CalendarDays size={18}/></span><span><strong>Something happening</strong><small>Every week on campus</small></span></div>
          <div className="floating-card floating-card-bottom"><div className="avatar-stack"><i>R</i><i>A</i><i>S</i><i>+</i></div><span><strong>Find your people</strong><small>Meet beyond your classroom</small></span></div>
          <div className="hero-sticker">Show up.<br/><span>Stand out.</span></div>
        </div>
      </section>
      <section className="stats-strip"><div><strong>One place</strong><span>for campus happenings</span></div><div><strong>Every interest</strong><span>from tech to culture</span></div><div><strong>Your community</strong><span>across nearby colleges</span></div></section>
      <section className="events-section section-wrap" id="explore">
        <div className="section-heading"><div><div className="eyebrow muted-eyebrow">FIND YOUR NEXT EXPERIENCE</div><h2>What's happening <span className="serif-accent">around you?</span></h2><p>Good things happen when you step out of the classroom.</p></div><a className="subtle-link" href="#all-events">Explore the calendar <ArrowRight size={16}/></a></div>
        {featured && <div className="featured-event">
          <div className="featured-image"><img src={featured.image} alt=""/><span className="featured-label"><Sparkles size={13}/>FEATURED EVENT</span></div>
          <div className="featured-content"><div className="event-meta"><span>{featured.category}</span><span className="meta-dot"/> {featured.date}</div><h3>{featured.title}</h3><p>{featured.description}</p><div className="featured-details"><span><MapPin size={15}/>{featured.venue}, {featured.city}</span><span><CalendarDays size={15}/>{featured.time}</span></div><div className="featured-footer"><span className="free-tag">{featured.price}</span><button className="dark-button" onClick={() => setSelectedEvent(featured.id)}>View event <ArrowRight size={16}/></button></div></div>
        </div>}
        <div className="section-heading events-heading" id="all-events"><div><div className="eyebrow muted-eyebrow">THE CAMPUS CALENDAR</div><h2>Explore <span className="serif-accent">events.</span></h2></div><span className="result-count">{loading ? 'Loading events…' : `${filtered.length} events in ${city === 'All cities' ? 'India' : city}`}</span></div>
        <div className="filter-row" role="tablist" aria-label="Filter events by category">{categories.map(category => <button key={category} role="tab" aria-selected={activeCategory === category} className={activeCategory === category ? 'filter-chip selected' : 'filter-chip'} onClick={() => setActiveCategory(category)}>{category}</button>)}</div>
        <div className="event-grid">
          {filtered.map(event => <article className="event-card" key={event.id}>
            <button className="event-image-button" onClick={() => setSelectedEvent(event.id)} aria-label={`View ${event.title}`}><img src={event.image} alt=""/><span className="date-badge"><strong>{event.day}</strong><small>{event.month}</small></span></button>
            <div className="event-card-body"><div className="event-meta"><span>{event.category}</span><span className="meta-dot"/> {event.time}</div><h3><button className="event-title-button" onClick={() => setSelectedEvent(event.id)}>{event.title}</button></h3><div className="card-location"><MapPin size={14}/>{event.venue}, {event.city}</div><div className="event-card-footer"><span className="free-tag">{event.price}</span><button className="round-arrow" aria-label={`View ${event.title}`} onClick={() => setSelectedEvent(event.id)}><ArrowRight size={17}/></button></div></div>
          </article>)}
          {!loading && filtered.length === 0 && <div className="empty-state"><Search size={28}/><h3>{loadError ? 'Events could not be loaded' : 'No published events yet'}</h3><p>{loadError || 'There are no published events matching your filters. Check back soon or try another city.'}</p><button className="text-button" onClick={() => { setQuery(''); setActiveCategory('All events'); setCity('All cities') }}>Clear filters</button></div>}
        </div>
      </section>
      </>}
      {page === 'admin' && (user && userRole === 'admin' ? <section className="super-admin section-wrap" id="super-admin">
        <div className="section-heading"><div><div className="eyebrow muted-eyebrow">CAMPUSLY CONTROL CENTRE</div><h2>Super admin <span className="serif-accent">portal.</span></h2><p>Review every event submitted across Campusly and manage its publication status.</p></div><button className="primary-button" onClick={async () => { setAdminLoading(true); try { setAdminEvents(await getAdminEvents()); setAdminRegistrations(await getAdminRegistrations()) } catch (error) { setAdminError(error instanceof Error ? error.message : 'Could not refresh events.') } finally { setAdminLoading(false) } }}>Refresh events</button></div>
        <div className="admin-stats">
          <div><span>Total events</span><strong>{adminEvents.length}</strong></div>
          <div><span>Pending review</span><strong>{adminEvents.filter(item => item.status === 'pending').length}</strong></div>
          <div><span>Published</span><strong>{adminEvents.filter(item => item.status === 'published').length}</strong></div>
          <div><span>Rejected / cancelled</span><strong>{adminEvents.filter(item => item.status === 'rejected' || item.status === 'cancelled').length}</strong></div>
          <div><span>Total registrations</span><strong>{adminRegistrations.length}</strong></div>
          <div><span>Active registrations</span><strong>{activeAdminRegistrations.length}</strong></div>
          <div><span>Unique attendees</span><strong>{new Set(activeAdminRegistrations.map(item => item.user_id)).size}</strong></div>
          <div><span>Events with registrations</span><strong>{new Set(activeAdminRegistrations.map(item => item.event_id)).size}</strong></div>
        </div>
        <div className="admin-analytics">
          <div className="admin-analytics-heading"><div><span className="eyebrow muted-eyebrow">AUDIENCE INSIGHTS</span><h3>Most popular events</h3></div><span>By active registrations</span></div>
          {popularAdminEvents.length === 0 || popularAdminEvents.every(item => item.registrations === 0) ? <p className="admin-analytics-empty">Registration data will appear here as students book their places.</p> : <div className="admin-popular-list">{popularAdminEvents.map(item => <div className="admin-popular-row" key={item.id}><span title={item.title}>{item.title}</span><div className="admin-bar-track"><i style={{width:`${Math.max(3, item.registrations / Math.max(...popularAdminEvents.map(event => event.registrations)) * 100)}%`}}/></div><strong>{item.registrations}</strong></div>)}</div>}
        </div>
        {adminError && <p className="auth-error" role="alert">{adminError}</p>}
        {adminLoading ? <div className="account-empty">Loading the Campusly event directory…</div> : adminEvents.length === 0 ? <div className="account-empty">No events have been submitted yet.</div> :
          <div className="admin-event-list">{adminEvents.map(item => <article className="admin-event-card" key={item.id}>
            <div className="admin-event-top"><div><span className="admin-category">{item.category}</span><h3>{item.title}</h3></div><span className={'admin-status status-' + item.status}>{item.status}</span></div>
            <p>{item.description}</p>
            <div className="admin-event-details"><span><strong>Venue</strong>{item.venue}, {item.city}</span><span><strong>Starts</strong>{new Intl.DateTimeFormat('en-IN',{dateStyle:'medium',timeStyle:'short'}).format(new Date(item.starts_at))}</span><span><strong>Ends</strong>{new Intl.DateTimeFormat('en-IN',{dateStyle:'medium',timeStyle:'short'}).format(new Date(item.ends_at))}</span><span><strong>Organizer ID</strong><code>{item.organizer_id}</code></span><span><strong>Capacity</strong>{item.capacity ?? 'Not specified'}</span><span><strong>Submitted</strong>{new Intl.DateTimeFormat('en-IN',{dateStyle:'medium'}).format(new Date(item.created_at))}</span></div>
            {item.cover_image_url && <a className="admin-image-link" href={item.cover_image_url} target="_blank" rel="noreferrer">View cover image</a>}
            <div className="admin-event-actions">
              {item.status !== 'published' && <button className="primary-button" disabled={adminBusy === item.id} onClick={() => handleAdminEventStatus(item.id,'published')}>{adminBusy === item.id ? 'Updating…' : 'Approve & publish'}</button>}
              {item.status !== 'rejected' && item.status !== 'published' && <button className="admin-reject" disabled={adminBusy === item.id} onClick={() => handleAdminEventStatus(item.id,'rejected')}>Reject submission</button>}
              {item.status === 'published' && <button className="admin-reject" disabled={adminBusy === item.id} onClick={() => handleAdminEventStatus(item.id,'cancelled')}>Unpublish event</button>}
              {item.status === 'rejected' && <button className="admin-reject" disabled={adminBusy === item.id} onClick={() => handleAdminEventStatus(item.id,'pending')}>Restore to pending</button>}
            </div>
          </article>)}</div>}
      </section> : <section className="route-access section-wrap"><div className="eyebrow muted-eyebrow">SUPER ADMIN</div><h2>Admin access required</h2><p>Sign in with an administrator account to manage Campusly events.</p></section>)}
      {page === 'organizer' && (user && (userRole === 'organizer' || userRole === 'admin') ? <section className="organizer-dashboard section-wrap" id="organizer-dashboard">
        <div className="section-heading"><div><div className="eyebrow muted-eyebrow">ORGANIZER WORKSPACE</div><h2>Host an <span className="serif-accent">event.</span></h2><p>Submit campus events for review and publication.</p></div><button className="primary-button" onClick={() => { setEventFormOpen(!eventFormOpen); setEventFormError(''); setEventFormMessage('') }}>{eventFormOpen ? 'Close form' : 'Create event'}</button></div>
        {eventFormMessage && <p className="auth-message">{eventFormMessage}</p>}
        {eventFormError && <p className="auth-error" role="alert">{eventFormError}</p>}
        {eventFormOpen && <form className="organizer-form" onSubmit={handleCreateEvent}>
          <label>Event title<input required maxLength={120} value={newEvent.title} onChange={e=>setNewEvent({...newEvent,title:e.target.value})}/></label>
          <label>Description<textarea required rows={4} value={newEvent.description} onChange={e=>setNewEvent({...newEvent,description:e.target.value})}/></label>
          <div className="organizer-form-grid">
            <label>Category<select value={newEvent.category} onChange={e=>setNewEvent({...newEvent,category:e.target.value})}>{categories.slice(1).map(item=><option key={item}>{item}</option>)}</select></label>
            <label>City<input required value={newEvent.city} onChange={e=>setNewEvent({...newEvent,city:e.target.value})}/></label>
            <label>Venue<input required value={newEvent.venue} onChange={e=>setNewEvent({...newEvent,venue:e.target.value})}/></label>
            <label>Capacity (optional)<input type="number" min="1" value={newEvent.capacity} onChange={e=>setNewEvent({...newEvent,capacity:e.target.value})}/></label>
            <label>Starts at<input type="datetime-local" required value={newEvent.starts_at} onChange={e=>setNewEvent({...newEvent,starts_at:e.target.value})}/></label>
            <label>Ends at<input type="datetime-local" required min={newEvent.starts_at || undefined} value={newEvent.ends_at} onChange={e=>setNewEvent({...newEvent,ends_at:e.target.value})}/></label>
          </div>
          <label>Cover image URL (optional)<input type="url" placeholder="https://…" value={newEvent.cover_image_url} onChange={e=>setNewEvent({...newEvent,cover_image_url:e.target.value})}/></label>
          <button className="primary-button" type="submit" disabled={eventSaving}>{eventSaving ? 'Submitting…' : 'Submit for review'} <ArrowRight size={16}/></button>
          <small className="auth-footnote">New events are submitted as pending and require approval before public listing.</small>
        </form>}
        <div className="organizer-attendees">
          <div className="account-list-heading"><h3>Event attendees</h3><span>{organizerRegistrations.filter(item => item.status === 'registered').length} active registrations</span></div>
          {organizerAttendeesError && <p className="auth-error" role="alert">{organizerAttendeesError}</p>}
          {organizerRegistrations.length === 0 ? <div className="account-empty">Attendee registrations for your events will appear here.</div> : <div className="registration-list">{organizerRegistrations.map(item => <article className="registration-item" key={item.id}><div><strong>{item.event_title}</strong><span>Attendee ID: <code>{item.user_id}</code></span><small>Registered {new Intl.DateTimeFormat('en-IN',{dateStyle:'medium',timeStyle:'short'}).format(new Date(item.created_at))}</small><em className={item.status === 'registered' ? 'registration-status active' : 'registration-status'}>{item.status}</em></div></article>)}</div>}
        </div>
      </section> : <section className="route-access section-wrap"><div className="eyebrow muted-eyebrow">ORGANIZER WORKSPACE</div><h2>Organizer access</h2><p>Sign in with an organizer account to create events and manage attendees.</p><button className="primary-button" onClick={() => { setAuthMode('signin'); setAuthOpen(true) }}>Sign in</button></section>)}
      {page === 'account' && (user ? <section className="account-section section-wrap" id="my-account">
        <div className="section-heading"><div><div className="eyebrow muted-eyebrow">YOUR CAMPUSLY SPACE</div><h2>My <span className="serif-accent">account.</span></h2><p>Manage your profile and keep track of your campus plans.</p></div></div>
        <div className="account-profile">
          <div className="profile-avatar">{(user.user_metadata?.full_name || user.email || 'S').toString().charAt(0).toUpperCase()}</div>
          <div><strong>{user.user_metadata?.full_name || 'Campusly student'}</strong><span>{user.email}</span><small>Student account</small></div>
        </div>
        <div className="account-list-heading"><h3>My registrations</h3><span>{myRegistrations.filter(item => item.status === 'registered').length} active</span></div>
        {dashboardError && <p className="auth-error" role="alert">{dashboardError}</p>}
        {dashboardLoading ? <p className="account-empty">Loading your registrations…</p> : myRegistrations.length === 0 ? <div className="account-empty">You haven't registered for any events yet. Explore events above to get started.</div> :
          <div className="registration-list">{myRegistrations.map(item => <article className="registration-item" key={item.id}>
            <div><strong>{item.event?.title || 'Event'}</strong><span>{item.event ? `${item.event.category} · ${item.event.venue}, ${item.event.city}` : 'Event details unavailable'}</span><small>{item.event ? new Intl.DateTimeFormat('en-IN', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(item.event.starts_at)) : ''}</small><em className={item.status === 'registered' ? 'registration-status active' : 'registration-status'}>{item.status}</em></div>
            {item.status === 'registered' && <button className="cancel-registration" disabled={cancelBusy === item.id} onClick={() => handleCancelRegistration(item.id)}>{cancelBusy === item.id ? 'Cancelling…' : 'Cancel registration'}</button>}
          </article>)}</div>}
      </section> : <section className="route-access section-wrap"><div className="eyebrow muted-eyebrow">MY ACCOUNT</div><h2>Sign in to view your account</h2><p>Your registrations and account details will be available here after you sign in.</p><button className="primary-button" onClick={() => { setAuthMode('signin'); setAuthOpen(true) }}>Sign in</button></section>)}
      {page === 'events' && <>
      <section className="organizer-section" id="organizers"><div className="organizer-inner"><div className="organizer-icon"><Users size={24}/></div><div className="organizer-copy"><div className="eyebrow light-eyebrow">BUILT FOR THE PEOPLE WHO MAKE IT HAPPEN</div><h2>You bring the idea.<br/><span className="serif-accent">We'll bring the crowd.</span></h2><p>One simple space to publish events, manage registrations and keep your attendee list in order.</p></div><a className="light-button" href="mailto:hello@campusly.in?subject=I%20want%20to%20host%20a%20campus%20event">Become a pilot organizer <ArrowRight size={17}/></a><div className="organizer-decoration"><Ticket size={120}/></div></div></section>
      <section className="how-section section-wrap" id="how-it-works"><div className="section-heading"><div><div className="eyebrow muted-eyebrow">SIMPLE BY DESIGN</div><h2>Three steps. <span className="serif-accent">More campus.</span></h2></div></div><div className="steps-grid"><div className="step"><span>01</span><Compass size={25}/><h3>Discover</h3><p>Find workshops, talks, fests and opportunities worth your time.</p></div><div className="step"><span>02</span><CalendarDays size={25}/><h3>Register</h3><p>Save your spot through a simple event registration experience.</p></div><div className="step"><span>03</span><Users size={25}/><h3>Show up</h3><p>Meet new people, learn something and make the day count.</p></div></div></section>
      </>}
    </main>
    <footer className="site-footer"><a className="brand footer-brand" href="#"><span className="brand-mark"><GraduationCap size={19}/></span><span>campus<span className="brand-accent">ly</span></span></a><span>Made for campus communities in India.</span><span>© 2026 Campusly · Early preview</span></footer>
    {authOpen && <div className="modal-backdrop" role="presentation" onClick={() => setAuthOpen(false)}>
      <section className="auth-modal" role="dialog" aria-modal="true" aria-labelledby="auth-title" onClick={event => event.stopPropagation()}>
        <button className="modal-close" onClick={() => setAuthOpen(false)} aria-label="Close"><X size={20}/></button>
        <div className="auth-modal-content">
          <div className="eyebrow muted-eyebrow">YOUR CAMPUS COMMUNITY</div>
          <h2 id="auth-title">{authMode === 'signin' ? 'Welcome back.' : 'Create your account.'}</h2>
          <p>{authMode === 'signin' ? 'Sign in to continue to Campusly.' : 'Join Campusly with your email address.'}</p>
          <form className="auth-form" onSubmit={handleAuthSubmit}>
            {authMode === 'signup' && <label>Full name<input autoComplete="name" required value={fullName} onChange={event => setFullName(event.target.value)} placeholder="Your full name"/></label>}
            <label>Email address<input type="email" autoComplete="email" required value={email} onChange={event => setEmail(event.target.value)} placeholder="you@example.com"/></label>
            <label>Password<input type="password" autoComplete={authMode === 'signin' ? 'current-password' : 'new-password'} minLength={6} required value={password} onChange={event => setPassword(event.target.value)} placeholder="At least 6 characters"/></label>
            {authError && <p className="auth-error" role="alert">{authError}</p>}
            {authMessage && <p className="auth-message" role="status">{authMessage}</p>}
            <button className="primary-button modal-register" type="submit" disabled={authBusy}>{authBusy ? 'Please wait…' : authMode === 'signin' ? 'Sign in' : 'Create account'} <ArrowRight size={17}/></button>
          </form>
          <p className="auth-switch">{authMode === 'signin' ? "New to Campusly?" : 'Already have an account?'} <button type="button" onClick={() => { setAuthMode(authMode === 'signin' ? 'signup' : 'signin'); setAuthError(''); setAuthMessage('') }}>{authMode === 'signin' ? 'Create an account' : 'Sign in'}</button></p>
          <small className="auth-footnote">Student accounts are created with the standard student role. Organizer access is granted separately.</small>
        </div>
      </section>
    </div>}
    {selected && <div className="modal-backdrop" role="presentation" onClick={() => setSelectedEvent(null)}><section className="event-modal" role="dialog" aria-modal="true" aria-labelledby="modal-title" onClick={e => e.stopPropagation()}><button className="modal-close" onClick={() => setSelectedEvent(null)} aria-label="Close"><X size={20}/></button><img className="modal-image" src={selected.image} alt=""/><div className="modal-content"><div className="event-meta"><span>{selected.category}</span><span className="meta-dot"/> {selected.date}</div><h2 id="modal-title">{selected.title}</h2><div className="modal-detail"><MapPin size={16}/>{selected.venue}, {selected.city}</div><div className="modal-detail"><CalendarDays size={16}/>{selected.time}</div><p>{selected.description}</p>
          {registrationError && <p className="auth-error" role="alert">{registrationError}</p>}
          {registrationMessage && <p className="auth-message" role="status">{registrationMessage}</p>}
          <button className="primary-button modal-register" onClick={handleRegister} disabled={registrationBusy || Boolean(registrationMessage)}>{registrationBusy ? 'Registering…' : registrationMessage ? 'Registered' : user ? 'Register for event' : 'Sign in to register'} <ArrowRight size={17}/></button>
          <small className="auth-footnote">Registration is subject to event capacity and the organizer's registration deadline.</small></div></section></div>}
  </div>
}
