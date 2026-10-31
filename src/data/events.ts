export type CampusEvent = {
  id: number
  title: string
  category: string
  date: string
  day: string
  month: string
  time: string
  venue: string
  college: string
  price: 'Free' | string
  image: string
  accent: string
  featured?: boolean
}

export const events: CampusEvent[] = [
  {
    id: 1,
    title: 'Engineering the Future',
    category: 'Workshop',
    date: '02 Nov 2026',
    day: '02',
    month: 'NOV',
    time: '11:00 AM – 4:00 PM',
    venue: 'UIET, CSJMU',
    college: 'CSJMU · Kanpur',
    price: 'Free',
    image: 'https://images.unsplash.com/photo-1531482615713-2afd69097998?auto=format&fit=crop&w=1000&q=85',
    accent: 'lavender',
    featured: true,
  },
  {
    id: 2,
    title: 'Build for Tomorrow Hackathon',
    category: 'Hackathon',
    date: '08 Nov 2026',
    day: '08',
    month: 'NOV',
    time: '9:00 AM onwards',
    venue: 'Innovation Centre',
    college: 'IIT Kanpur · Kanpur',
    price: 'Free',
    image: 'https://images.unsplash.com/photo-1504384308090-c894fdcc538d?auto=format&fit=crop&w=1000&q=85',
    accent: 'peach',
  },
  {
    id: 3,
    title: 'Design Dialogues',
    category: 'Talk',
    date: '12 Nov 2026',
    day: '12',
    month: 'NOV',
    time: '2:00 PM – 5:00 PM',
    venue: 'Seminar Hall',
    college: 'HBTU · Kanpur',
    price: 'Free',
    image: 'https://images.unsplash.com/photo-1475721027785-f74eccf877e2?auto=format&fit=crop&w=1000&q=85',
    accent: 'mint',
  },
  {
    id: 4,
    title: 'Campus Music Evening',
    category: 'Cultural',
    date: '16 Nov 2026',
    day: '16',
    month: 'NOV',
    time: '5:30 PM – 8:30 PM',
    venue: 'Open Air Theatre',
    college: 'PSIT · Kanpur',
    price: 'Free',
    image: 'https://images.unsplash.com/photo-1501386761578-eac5c94b800a?auto=format&fit=crop&w=1000&q=85',
    accent: 'blue',
  },
  {
    id: 5,
    title: 'Materials & Manufacturing Meet',
    category: 'Conference',
    date: '21 Nov 2026',
    day: '21',
    month: 'NOV',
    time: '10:00 AM – 3:00 PM',
    venue: 'Department Auditorium',
    college: 'CSJMU · Kanpur',
    price: 'Free',
    image: 'https://images.unsplash.com/photo-1581092921461-eab62e97a780?auto=format&fit=crop&w=1000&q=85',
    accent: 'peach',
  },
  {
    id: 6,
    title: 'Startup & Founders Meetup',
    category: 'Networking',
    date: '28 Nov 2026',
    day: '28',
    month: 'NOV',
    time: '11:00 AM – 1:00 PM',
    venue: 'Business School',
    college: 'IIT Kanpur · Kanpur',
    price: 'Free',
    image: 'https://images.unsplash.com/photo-1517245386807-bb43f82c33c4?auto=format&fit=crop&w=1000&q=85',
    accent: 'mint',
  },
]