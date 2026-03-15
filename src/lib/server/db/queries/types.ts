export interface ScheduleEntryData {
  id: number;
  schoolId: string;
  scheduleType: string;            // 'weekly' | 'dated'
  dayOfWeek: number;               // 0=Mon … 6=Sun
  date: string | null;             // "2026-03-05" for dated entries
  startTime: string;               // "07:00"
  endTime: string | null;
  duration: number | null;
  className: string;
  classDescription: string | null;
  teacher: string | null;
  level: string | null;
  style: string | null;
  location: string | null;
  totalCapacity: number | null;
  spotsLeft: number | null;
  waitingListCapacity: number | null;
  isCancelled: boolean;
  isFree: boolean;
  isBookableOnline: boolean;
  source: string;
  externalId: string | null;
  bookingUrl: string | null;
  metadata: unknown;
  lastSeenAt: string | null;
  createdAt: string | null;
}

export interface Listing {
  id: string;
  name: string;
  city: string;
  address: string;
  websiteUrl: string | null;
  phone: string | null;
  email: string | null;
  price: number | null;
  priceEstimated: boolean;
  trialPrice: number | null;
  singleClassPrice: number | null;
  pricingNotes: string | null;
  pricingUrl: string | null;
  healthStatus: string | null;
  // Detail-only fields
  pricingJson?: string | null;
  descriptionRaw?: string | null;
  rating: number | null;
  reviews: number | null;
  description: string | null;
  editorialSummary: string | null;
  openingHours: string | null;
  imageUrl: string | null;
  neighborhood: string | null;
  latitude: number | null;
  longitude: number | null;
  googleMapsUrl: string | null;
  scheduleUrl: string | null;
  scheduleSource: string | null;
  lastPriceCheck: string | null;
  lastUpdated: string | null;
  source: string | null;
  styles: string[];
  schedule: ScheduleEntryData[];
}

export interface ReviewData {
  id: string;
  authorName: string;
  rating: number;
  text: string | null;
  relativeTime: string | null;
  publishedAt: string | null;
  language: string | null;
}

/** Minimal type for homepage autocomplete/search — no prices, ratings, or descriptions */
export interface AutocompleteEntry {
  id: string;
  name: string;
  city: string;
  address: string;
  neighborhood: string | null;
  styles: string[];
}

/** Card type for city/category list views — adds coords for map pins */
export interface ListingCard {
  id: string;
  name: string;
  city: string;
  address: string;
  neighborhood: string | null;
  latitude: number | null;
  longitude: number | null;
  styles: string[];
}
