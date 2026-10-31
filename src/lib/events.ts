import { requireSupabase } from './supabase'

export type EventRecord = {
  id: string
  organizer_id: string
  title: string
  description: string
  category: string
  venue: string
  city: string
  starts_at: string
  ends_at: string
  cover_image_url: string | null
  capacity: number | null
  registration_deadline: string | null
  status: 'draft' | 'pending' | 'published' | 'cancelled' | 'completed' | 'rejected'
  created_at: string
}

export type NewEvent = Pick<EventRecord,
  'title' | 'description' | 'category' | 'venue' | 'city' | 'starts_at' | 'ends_at'
> & Partial<Pick<EventRecord, 'cover_image_url' | 'capacity' | 'registration_deadline' | 'status'>>

export async function getPublishedEvents() {
  const { data, error } = await requireSupabase().from('events').select('*')
    .eq('status', 'published').gte('ends_at', new Date().toISOString())
    .order('starts_at', { ascending: true })
  if (error) throw error
  return (data ?? []) as EventRecord[]
}

export async function createEvent(input: NewEvent) {
  const client = requireSupabase()
  const { data: { user }, error: userError } = await client.auth.getUser()
  if (userError) throw userError
  if (!user) throw new Error('Sign in before creating an event.')
  const { data, error } = await client.from('events')
    .insert({ ...input, organizer_id: user.id }).select().single()
  if (error) throw error
  return data as EventRecord
}


export async function getAdminEvents() {
  const { data, error } = await requireSupabase().from('events').select('*')
    .order('created_at', { ascending: false })
  if (error) throw error
  return (data ?? []) as EventRecord[]
}

export async function getOrganizerEvents() {
  const client = requireSupabase()
  const { data: { user }, error: userError } = await client.auth.getUser()
  if (userError) throw userError
  if (!user) throw new Error('Sign in to view your events.')
  const { data, error } = await client.from('events').select('*').eq('organizer_id', user.id).order('created_at', { ascending: false })
  if (error) throw error
  return (data ?? []) as EventRecord[]
}

export async function getOrganizerRegistrations() {
  const client = requireSupabase()
  const { data: { user }, error: userError } = await client.auth.getUser()
  if (userError) throw userError
  if (!user) throw new Error('Sign in to view event registrations.')
  const { data: ownedEvents, error: eventsError } = await client.from('events').select('id,title').eq('organizer_id', user.id)
  if (eventsError) throw eventsError
  const eventIds = (ownedEvents ?? []).map(event => event.id)
  if (eventIds.length === 0) return []
  const { data, error } = await client.from('registrations').select('id,event_id,user_id,status,created_at').in('event_id', eventIds).order('created_at', { ascending: false })
  if (error) throw error
  return (data ?? []).map(registration => ({ ...registration, event_title: ownedEvents?.find(event => event.id === registration.event_id)?.title ?? 'Event' }))
}

export async function getAdminRegistrations() {
  const { data, error } = await requireSupabase().from('registrations')
    .select('id,event_id,user_id,status,created_at')
  if (error) throw error
  return data ?? []
}

export async function setAdminEventStatus(eventId: string, status: EventRecord['status']) {
  const { data, error } = await requireSupabase().from('events')
    .update({ status }).eq('id', eventId).select().single()
  if (error) throw error
  return data as EventRecord
}

export async function registerForEvent(eventId: string) {
  const client = requireSupabase()
  const { data: { user }, error: userError } = await client.auth.getUser()
  if (userError) throw userError
  if (!user) throw new Error('Sign in before registering for an event.')
  const { data, error } = await client.from('registrations')
    .insert({ event_id: eventId, user_id: user.id }).select().single()
  if (error) throw error
  return data
}

export async function cancelRegistration(registrationId: string) {
  const { error } = await requireSupabase().from('registrations')
    .update({ status: 'cancelled' }).eq('id', registrationId)
  if (error) throw error
}

export async function getMyRegistrations() {
  const { data, error } = await requireSupabase().from('registrations')
    .select('id,status,created_at,event:events(id,title,category,venue,city,starts_at,ends_at,status)')
    .order('created_at', { ascending: false })
  if (error) throw error
  return data ?? []
}

export async function saveEvent(eventId: string) {
  const client = requireSupabase()
  const { data: { user }, error: userError } = await client.auth.getUser()
  if (userError) throw userError
  if (!user) throw new Error('Sign in before saving an event.')
  const { error } = await client.from('saved_events')
    .insert({ user_id: user.id, event_id: eventId })
  if (error) throw error
}

export async function unsaveEvent(eventId: string) {
  const client = requireSupabase()
  const { data: { user }, error: userError } = await client.auth.getUser()
  if (userError) throw userError
  if (!user) throw new Error('Sign in before removing a saved event.')
  const { error } = await client.from('saved_events')
    .delete().eq('user_id', user.id).eq('event_id', eventId)
  if (error) throw error
}


export async function getSavedEventIds() {
  const client = requireSupabase()
  const { data: { user }, error: userError } = await client.auth.getUser()
  if (userError) throw userError
  if (!user) return []
  const { data, error } = await client.from('saved_events').select('event_id').order('created_at', { ascending: false })
  if (error) throw error
  return (data ?? []).map(item => item.event_id as string)
}

export async function markRegistrationAttended(registrationId: string) {
  const { data, error } = await requireSupabase().from('registrations')
    .update({ status: 'attended' }).eq('id', registrationId).eq('status', 'registered')
    .select('id,status').single()
  if (error) throw error
  return data
}
