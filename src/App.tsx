import { useEffect, useMemo, useState } from 'react'
import { ArrowRight, CalendarDays, ChevronDown, Compass, GraduationCap, MapPin, Menu, Search, Sparkles, Ticket, Users, X } from 'lucide-react'
import { getPublishedEvents, type EventRecord } from './lib/events'
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
  const [city, setCity] = useState('Kanpur')
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

  async function handleAuthSubmit(event: React.FormEvent<HTMLFormElement>) {
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

  async function handleSignOut() {
    try {
      await signOut()
      setUser(null)
    } catch (error) {
      setAuthError(error instanceof Error ? error.message : 'Could not sign out.')
    }
  }

  const filtered = useMemo(() => events.filter(event =>
    (activeCategory === 'All events' || event.category.toLowerCase() === activeCategory.toLowerCase()) &&
    (city === 'All cities' || event.city.toLowerCase() === city.toLowerCase()) &&
    `${event.title} ${event.category} ${event.city} ${event.venue}`.toLowerCase().includes(query.toLowerCase())
  ), [activeCategory, query, city])
  const featured = filtered[0]
  const selected = events.find(event => event.id === selectedEvent)
  const goExplore = () => document.getElementById('explore')?.scrollIntoView({ behavior: 'smooth' })

  return <div className="app-shell">
    <header className="site-header">
      <a className="brand" href="#"><span className="brand-mark"><GraduationCap size={21}/></span><span>campus<span className="brand-accent">ly</span></span></a>
      <nav className={mobileMenuOpen ? 'main-nav nav-open' : 'main-nav'}>
        <a className="nav-link active" href="#explore" onClick={() => setMobileMenuOpen(false)}>Discover</a>
        <a className="nav-link" href="#how-it-works" onClick={() => setMobileMenuOpen(false)}>How it works</a>
        <a className="nav-link" href="#organizers" onClick={() => setMobileMenuOpen(false)}>For organizers</a>
      </nav>
      <div className="header-actions">
        <button className="text-button" onClick={() => document.getElementById('organizers')?.scrollIntoView({ behavior: 'smooth' })}>Host an event</button>
        {user ? <button className="text-button account-button" onClick={handleSignOut}>Sign out</button> : <button className="text-button" onClick={() => { setAuthMode('signin'); setAuthError(''); setAuthMessage(''); setAuthOpen(true) }}>Sign in</button>}
        <button className="primary-button header-cta" onClick={goExplore}>Explore events <ArrowRight size={16}/></button>
      </div>
      <button className="mobile-menu-button" aria-label="Toggle navigation" onClick={() => setMobileMenuOpen(!mobileMenuOpen)}>{mobileMenuOpen ? <X/> : <Menu/>}</button>
    </header>
    <main>
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
      <section className="organizer-section" id="organizers"><div className="organizer-inner"><div className="organizer-icon"><Users size={24}/></div><div className="organizer-copy"><div className="eyebrow light-eyebrow">BUILT FOR THE PEOPLE WHO MAKE IT HAPPEN</div><h2>You bring the idea.<br/><span className="serif-accent">We'll bring the crowd.</span></h2><p>One simple space to publish events, manage registrations and keep your attendee list in order.</p></div><a className="light-button" href="mailto:hello@campusly.in?subject=I%20want%20to%20host%20a%20campus%20event">Become a pilot organizer <ArrowRight size={17}/></a><div className="organizer-decoration"><Ticket size={120}/></div></div></section>
      <section className="how-section section-wrap" id="how-it-works"><div className="section-heading"><div><div className="eyebrow muted-eyebrow">SIMPLE BY DESIGN</div><h2>Three steps. <span className="serif-accent">More campus.</span></h2></div></div><div className="steps-grid"><div className="step"><span>01</span><Compass size={25}/><h3>Discover</h3><p>Find workshops, talks, fests and opportunities worth your time.</p></div><div className="step"><span>02</span><CalendarDays size={25}/><h3>Register</h3><p>Save your spot through a simple event registration experience.</p></div><div className="step"><span>03</span><Users size={25}/><h3>Show up</h3><p>Meet new people, learn something and make the day count.</p></div></div></section>
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
    {selected && <div className="modal-backdrop" role="presentation" onClick={() => setSelectedEvent(null)}><section className="event-modal" role="dialog" aria-modal="true" aria-labelledby="modal-title" onClick={e => e.stopPropagation()}><button className="modal-close" onClick={() => setSelectedEvent(null)} aria-label="Close"><X size={20}/></button><img className="modal-image" src={selected.image} alt=""/><div className="modal-content"><div className="event-meta"><span>{selected.category}</span><span className="meta-dot"/> {selected.date}</div><h2 id="modal-title">{selected.title}</h2><div className="modal-detail"><MapPin size={16}/>{selected.venue}, {selected.city}</div><div className="modal-detail"><CalendarDays size={16}/>{selected.time}</div><p>{selected.description}</p><p>Registration will be available once the account and registration experience is enabled.</p><button className="primary-button modal-register" onClick={() => setSelectedEvent(null)}>Got it <ArrowRight size={17}/></button></div></section></div>}
  </div>
}
