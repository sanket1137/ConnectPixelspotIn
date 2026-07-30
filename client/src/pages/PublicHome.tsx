import { useState, useEffect, useRef } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { MapPin, Monitor, Search, ArrowRight, LayoutDashboard, ChevronRight, Star, Users, TrendingUp, Zap, Building2, X, Utensils, Stethoscope, Dumbbell, Scissors, ShoppingBag, Home, GraduationCap, Coffee, Pill, Car, BusFront, Film } from 'lucide-react';
import { Link, useLocation } from 'wouter';
import { useAuth } from '@/contexts/AuthContext';
import { motion, useScroll, useTransform } from 'framer-motion';
import type { Screen } from '@shared/schema';
import ScreenCard from '@/components/ScreenCard';
import HeroGlobe from '@/components/HeroGlobe';
import { VENUE_CATEGORIES } from '@shared/constants';
import { PublicFooter } from "@/components/PublicFooter";
import logo from "@assets/pixelspot-logo.png";
import railwayImg from "@assets/Gemini_Generated_Image_wfa0lrwfa0lrwfa0_1763277847119.png";
import airportLargeImg from "@assets/Gemini_Generated_Image_pla8lvpla8lvpla8_1763277847120.png";
import corporateImg from "@assets/Gemini_Generated_Image_fjsgtufjsgtufjsg_1763277847121.png";
import streetBillboardImg from "@assets/Gemini_Generated_Image_a8c8zna8c8zna8c8_1763278640800.png";
import gymImg from "@assets/Gemini_Generated_Image_58c0x558c0x558c0_1763278104633.png";
import residentialImg from "@assets/Gemini_Generated_Image_n8g1q2n8g1q2n8g1_1763278640800.png";
import cafeImg from "@assets/Gemini_Generated_Image_gkftp9gkftp9gkft_1763278160282.png";
import discoverHeroImg from "@assets/Gemini_Generated_Image_a8c8zna8c8zna8c8_1763278499067.png";
import airportKioskImg from "@assets/Gemini_Generated_Image_ladsi7ladsi7lads_1763277847120.png";
import cinema1Img from "@assets/Screenshot 2025-11-16 at 9.47.23 PM_1763309847078.png";
import cinema2Img from "@assets/Screenshot 2025-11-16 at 9.32.10 PM_1763308932655.png";
import newCafeImg from "@assets/CAFE 3.png";
import newCinemaImg from "@assets/Cinema Hall 2.png";
import newCinemaImgAlt from "@assets/CINEMA HALL 5.png";
import newBillboardImg from "@assets/billboard1.png";
import newMallImg from "@assets/Mall1.png";
import newSupermarketImg from "@assets/supper market1.png";
import newTechParkImg from "@assets/Tech Park.png";
import newSalonImg from "@assets/Salon.jpeg";
import newGymImg from "@assets/Gym.jpeg";
import newBusStopImg from "@assets/Bus Stop.png";
interface HomeDataResponse {
  screens: Screen[];
  cities: string[];
  cityStats: { city: string; screenCount: number }[];
  platformStats: {
    totalPhysicalScreens: number;
    totalCities: number;
    totalAdvertisers: number;
  };
}

// ──────────────────────────────────────────────────────────
// Venue filter chips: derived from VENUE_CATEGORIES
// ──────────────────────────────────────────────────────────
const VENUE_CHIPS = [
  { label: 'All', value: '' },
  { label: 'Malls', value: 'Mall' },
  { label: 'Airports', value: 'Airport' },
  { label: 'Restaurants', value: 'Restaurant' },
  { label: 'Cafés', value: 'Café' },
  { label: 'Corporate Parks', value: 'Corporate Park' },
  { label: 'Gyms', value: 'Gym' },
  { label: 'Cinemas', value: 'Cinema' },
  { label: 'Hospitals', value: 'Hospital' },
  { label: 'Apartments', value: 'Apartment' },
  { label: 'Retail Stores', value: 'Retail Store' },
  { label: 'Hotels', value: 'Hotel' },
];

// ──────────────────────────────────────────────────────────
// FAQ Data
// ──────────────────────────────────────────────────────────
const FAQ_ITEMS = [
  {
    question: "What is Connect by PixelSpot?",
    answer: "Connect is a digital out-of-home (DOOH) advertising marketplace that helps businesses discover, compare and book digital advertising screens across India, all from one platform."
  },
  {
    question: "What types of digital screens are available?",
    answer: "Our network includes digital billboards, shopping malls, cinemas, corporate offices, cafés, restaurants, residential communities, airports, hospitals, retail stores, gyms and many other premium locations."
  },
  {
    question: "Can I advertise only around my business?",
    answer: "Yes. Connect specializes in hyperlocal advertising, allowing you to target digital screens within your preferred locality, radius or city so your campaigns reach nearby customers."
  },
  {
    question: "What is the minimum campaign budget?",
    answer: "Campaign budgets vary depending on screen type, location and duration. You can discover available screens and build a campaign that fits your marketing budget."
  },
  {
    question: "Which cities do you operate in?",
    answer: "Connect provides access to digital advertising screens across 70+ cities in India, with new locations being added regularly."
  },
  {
    question: "How do I book a campaign?",
    answer: "Simply search for screens, add them to your campaign, choose your campaign duration, upload your creative and complete your booking through the platform."
  },
  {
    question: "Can I advertise on malls and cinemas?",
    answer: "Yes. You can discover available inventory across shopping malls, cinemas, corporate campuses, cafés, restaurants and many other premium venues."
  },
  {
    question: "Can I choose multiple locations?",
    answer: "Absolutely. You can build campaigns across multiple screens, locations and cities from a single campaign."
  },
  {
    question: "Who can advertise on Connect?",
    answer: "Our platform is designed for local businesses, startups, restaurants, hospitals, real estate developers, educational institutions, retail brands, agencies and national advertisers looking to reach customers through digital screens."
  },
  {
    question: "Why should I choose DOOH advertising?",
    answer: "Digital Out-of-Home advertising increases visibility by reaching customers where they live, work, shop and travel. Multiple daily touchpoints improve brand recall and help businesses stay top of mind."
  }
];

// ──────────────────────────────────────────────────────────
// Location suggestions (city + landmark types)
// ──────────────────────────────────────────────────────────
const LOCATION_SUGGESTIONS = [
  { label: 'Bengaluru', type: 'City', icon: '🏙️' },
  { label: 'Mumbai', type: 'City', icon: '🏙️' },
  { label: 'Delhi', type: 'City', icon: '🏙️' },
  { label: 'Hyderabad', type: 'City', icon: '🏙️' },
  { label: 'Pune', type: 'City', icon: '🏙️' },
  { label: 'Chennai', type: 'City', icon: '🏙️' },
  { label: 'Ahmedabad', type: 'City', icon: '🏙️' },
  { label: 'Kolkata', type: 'City', icon: '🏙️' },
  { label: 'Whitefield', type: 'Locality', icon: '📍' },
  { label: 'Koramangala', type: 'Locality', icon: '📍' },
  { label: 'Indiranagar', type: 'Locality', icon: '📍' },
  { label: 'Bandra', type: 'Locality', icon: '📍' },
  { label: 'Andheri', type: 'Locality', icon: '📍' },
  { label: 'MG Road', type: 'Landmark', icon: '🗺️' },
  { label: 'Phoenix Mall', type: 'Mall', icon: '🛍️' },
  { label: 'DLF Mall', type: 'Mall', icon: '🛍️' },
  { label: 'Nexus Mall', type: 'Mall', icon: '🛍️' },
  { label: 'Airport Screens', type: 'Category', icon: '✈️', venueValue: 'Airport' },
  { label: 'Mall Screens', type: 'Category', icon: '🛍️', venueValue: 'Mall' },
  { label: 'Corporate Screens', type: 'Category', icon: '🏢', venueValue: 'Corporate Park' },
  { label: 'Gym Screens', type: 'Category', icon: '💪', venueValue: 'Gym' },
];

// ──────────────────────────────────────────────────────────
// Section 2 — Screen venue cards
// ──────────────────────────────────────────────────────────
const VENUE_CARDS = [
  {
    label: 'Shopping Malls',
    description: "Reach shoppers while they're discovering, comparing and buying.",
    audience: 'Shoppers & Families',
    footfall: '50,000+ daily visitors',
    image: newMallImg,
    venueValue: 'Mall',
    color: '#6366f1',
  },
  {
    label: 'Cinema Hall',
    description: 'Engage audiences before the movie starts in premium INOX theaters.',
    audience: 'Moviegoers & Families',
    footfall: '15,000+ daily visitors',
    image: newCinemaImg,
    venueValue: 'Cinema',
    color: '#e11d48',
  },
  {
    label: 'Tech Parks',
    description: 'Engage professionals during their daily work hours in premium tech parks.',
    audience: 'Working Professionals',
    footfall: '10,000–50,000 employees',
    image: newTechParkImg,
    venueValue: 'Corporate Park',
    color: '#0ea5e9',
  },
  {
    label: 'Digital Billboards',
    description: 'Maximum visibility on high-traffic roads and highways.',
    audience: 'Commuters & Drivers',
    footfall: '80,000+ daily impressions',
    image: newBillboardImg,
    venueValue: 'Highway',
    color: '#f59e0b',
  },
  {
    label: 'Cinema Hall',
    description: 'High-visibility 4DX displays in VIP cinema lounges.',
    audience: 'Premium Moviegoers',
    footfall: '10,000+ daily visitors',
    image: newCinemaImgAlt,
    venueValue: 'Cinema',
    color: '#9333ea',
  },
  {
    label: 'Cafés & Restaurants',
    description: 'Captive audiences during dining and leisure moments.',
    audience: 'Young Adults & Families',
    footfall: '500–5,000 per day',
    image: newCafeImg,
    venueValue: 'Café',
    color: '#ec4899',
  },
  {
    label: 'Supermarkets',
    description: 'Influence purchase decisions right at the point of sale.',
    audience: 'Daily Shoppers',
    footfall: '2,000–8,000 per day',
    image: newSupermarketImg,
    venueValue: 'Retail Store',
    color: '#14b8a6',
  },
  {
    label: 'Gyms & Fitness Centers',
    description: 'Health-conscious audiences with high disposable income.',
    audience: 'Fitness Enthusiasts',
    footfall: '500–2,000 per day',
    image: newGymImg,
    venueValue: 'Gym',
    color: '#ef4444',
  },
  {
    label: 'Residential Apartments',
    description: 'Reach local residents near your business every day.',
    audience: 'Local Residents',
    footfall: '1,000–10,000 residents',
    image: residentialImg,
    venueValue: 'Apartment',
    color: '#10b981',
  },
  {
    label: 'Salons & Spas',
    description: 'High engagement screen placements in premium salons.',
    audience: 'Beauty & Lifestyle Consumers',
    footfall: '100–500 per day',
    image: newSalonImg,
    venueValue: 'Salon',
    color: '#d946ef',
  },
  {
    label: 'Bus Stops & Transit',
    description: 'High-frequency exposure during daily commutes.',
    audience: 'Daily Commuters',
    footfall: '20,000+ daily commuters',
    image: newBusStopImg,
    venueValue: 'Transit',
    color: '#06b6d4',
  },
];

// ──────────────────────────────────────────────────────────
// Shared Search Autocomplete (used in header + hero)
// ──────────────────────────────────────────────────────────
function LocationSearchBar({
  onSearch,
  placeholder = 'Search by city, locality, mall, airport or landmark...',
  variant = 'hero',
}: {
  onSearch: (query: string, type: string, venueValue?: string) => void;
  placeholder?: string;
  variant?: 'hero' | 'header';
}) {
  const [query, setQuery] = useState('');
  const [suggestions, setSuggestions] = useState<typeof LOCATION_SUGGESTIONS>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [focused, setFocused] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Typewriter effect state
  const [placeholderIndex, setPlaceholderIndex] = useState(0);
  const [animatedText, setAnimatedText] = useState('');
  const [isDeleting, setIsDeleting] = useState(false);

  // Use default or passed placeholder for static text, but use typewriter effect for the animated part
  const animatedWords = ['Delhi', 'Jayanagar Bangalore', 'Phoenix Mall', 'Koramangala', 'Mumbai'];

  useEffect(() => {
    if (focused) return;

    let timer: NodeJS.Timeout;
    const currentWord = animatedWords[placeholderIndex];
    
    if (isDeleting) {
      timer = setTimeout(() => {
        setAnimatedText(currentWord.substring(0, animatedText.length - 1));
        if (animatedText.length === 0) {
          setIsDeleting(false);
          setPlaceholderIndex((prev) => (prev + 1) % animatedWords.length);
        }
      }, 50);
    } else {
      timer = setTimeout(() => {
        setAnimatedText(currentWord.substring(0, animatedText.length + 1));
        if (animatedText.length === currentWord.length) {
          setTimeout(() => setIsDeleting(true), 2000); // Wait 2s before deleting
        }
      }, 100);
    }
    
    return () => clearTimeout(timer);
  }, [animatedText, isDeleting, placeholderIndex, focused]);

  const displayPlaceholder = focused ? placeholder : `Digital hoarding in ${animatedText}|`;

  useEffect(() => {
    if (query.length === 0 && focused) {
      setSuggestions(LOCATION_SUGGESTIONS.slice(0, 8));
      setIsOpen(true);
    } else if (query.length > 0) {
      const filtered = LOCATION_SUGGESTIONS.filter(s =>
        s.label.toLowerCase().includes(query.toLowerCase())
      );
      setSuggestions(filtered);
      setIsOpen(true);
    } else {
      setIsOpen(false);
    }
  }, [query, focused]);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
        setFocused(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSelect = (s: typeof LOCATION_SUGGESTIONS[0]) => {
    setQuery(s.label);
    setIsOpen(false);
    onSearch(s.label, s.type, s.venueValue);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (query.trim()) {
      onSearch(query, 'search');
    }
  };

  return (
    <div ref={containerRef} className="relative w-full">
      <form onSubmit={handleSubmit}>
        <div className={`flex items-center bg-white rounded-full shadow-lg border-2 transition-all duration-200 ${
          variant === 'hero'
            ? focused ? 'border-blue-500 shadow-indigo-100 shadow-xl' : 'border-gray-200'
            : focused ? 'border-blue-400' : 'border-gray-200'
        }`}>
          <div className="flex items-center gap-3 flex-1 px-5 py-3">
            <button type="submit" className="shrink-0 flex items-center justify-center">
              <Search className={`${variant === 'hero' ? 'w-5 h-5 text-gray-400 hover:text-blue-500 transition-colors' : 'w-4 h-4 text-gray-400 hover:text-blue-500 transition-colors'}`} />
            </button>
            <input
              ref={inputRef}
              type="text"
              value={query}
              onChange={e => setQuery(e.target.value)}
              onFocus={() => setFocused(true)}
              onBlur={() => setFocused(false)}
              placeholder={displayPlaceholder}
              className={`flex-1 bg-transparent outline-none text-gray-900 placeholder:text-gray-400 font-medium ${
                variant === 'hero' ? 'text-base' : 'text-sm'
              }`}
              data-testid="input-hero-search"
            />
            {query && (
              <button type="button" onClick={() => setQuery('')} className="text-gray-400 hover:text-gray-600 transition-colors">
                <X className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>
      </form>

      {/* Dropdown */}
      {isOpen && suggestions.length > 0 && (
        <div className={`absolute left-0 right-0 mt-2 bg-white rounded-2xl shadow-2xl border border-gray-100 overflow-hidden z-[9999] ${variant === 'header' ? 'top-full' : 'top-full'}`}>
          {!query && <div className="px-4 pt-3 pb-1 text-xs font-semibold text-gray-400 uppercase tracking-wider">Popular Searches</div>}
          {suggestions.map((s, i) => (
            <button
              key={i}
              type="button"
              onClick={() => handleSelect(s)}
              className="flex items-center gap-3 w-full px-4 py-3 hover:bg-gray-50 transition-colors text-left group"
            >
              <span className="text-xl">{s.icon}</span>
              <div className="flex-1 min-w-0">
                <span className="font-medium text-gray-900 text-sm">{s.label}</span>
              </div>
              <Badge variant="secondary" className="text-xs shrink-0 bg-gray-100 text-gray-500 group-hover:bg-indigo-50 group-hover:text-blue-600">
                {s.type}
              </Badge>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

// ──────────────────────────────────────────────────────────
// Venue Card
// ──────────────────────────────────────────────────────────
function VenueCard({ card, onSelect }: { card: typeof VENUE_CARDS[0]; onSelect: (venue: string) => void }) {
  return (
    <div
      className="group relative flex-shrink-0 w-72 sm:w-[320px] h-[400px] cursor-pointer overflow-hidden rounded-3xl bg-white shadow-sm border border-gray-100 hover:shadow-xl hover:-translate-y-2 transition-all duration-300"
      onClick={() => onSelect(card.venueValue)}
    >
      {/* 80% Image */}
      <div className="relative h-[80%] w-full overflow-hidden">
        <img
          src={card.image}
          alt={card.label}
          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent" />
        <div
          className="absolute top-4 left-4 w-2.5 h-2.5 rounded-full shadow-sm"
          style={{ backgroundColor: card.color }}
        />
      </div>

      {/* 20% Content */}
      <div className="h-[20%] w-full px-5 flex items-center justify-between bg-white">
        <h3 className="font-bold text-gray-900 text-lg pr-3 leading-tight">{card.label}</h3>
        <div
          className="inline-flex items-center gap-1 shrink-0 text-xs font-bold px-3 py-1.5 rounded-full"
          style={{ backgroundColor: `${card.color}15`, color: card.color }}
        >
          <TrendingUp className="w-3.5 h-3.5" />
          {card.footfall}
        </div>
      </div>
    </div>
  );
}

// ──────────────────────────────────────────────────────────
// Animated Network Stats (Scroll-Linked Dial)
// ──────────────────────────────────────────────────────────
function AnimatedNetworkStats({ platformStats }: { platformStats: any }) {
  const containerRef = useRef<HTMLDivElement>(null);
  
  const { scrollYProgress } = useScroll({
    target: containerRef,
    offset: ["start start", "end end"]
  });

  // Dial Animation Mappings for 3 items
  // Item 0
  const y0 = useTransform(scrollYProgress, [0, 0.5, 1], ["0%", "-80%", "-160%"]);
  const op0 = useTransform(scrollYProgress, [0, 0.25, 0.5], [1, 0.3, 0]);
  const scale0 = useTransform(scrollYProgress, [0, 0.25, 0.5], [1, 0.9, 0.8]);

  // Item 1
  const y1 = useTransform(scrollYProgress, [0, 0.5, 1], ["80%", "0%", "-80%"]);
  const op1 = useTransform(scrollYProgress, [0, 0.25, 0.5, 0.75, 1], [0, 0.3, 1, 0.3, 0]);
  const scale1 = useTransform(scrollYProgress, [0, 0.25, 0.5, 0.75, 1], [0.8, 0.9, 1, 0.9, 0.8]);

  // Item 2
  const y2 = useTransform(scrollYProgress, [0, 0.5, 1], ["160%", "80%", "0%"]);
  const op2 = useTransform(scrollYProgress, [0.5, 0.75, 1], [0, 0.3, 1]);
  const scale2 = useTransform(scrollYProgress, [0.5, 0.75, 1], [0.8, 0.9, 1]);

  const stats = [
    { text: `${platformStats?.totalPhysicalScreens?.toLocaleString() || '3,192'}+ DIGITAL SCREENS`, y: y0, op: op0, scale: scale0 },
    { text: `${platformStats?.totalCities || '78'}+ CITIES ACROSS INDIA`, y: y1, op: op1, scale: scale1 },
    { text: `100M+ IMPRESSIONS`, y: y2, op: op2, scale: scale2 }
  ];

  return (
    <section ref={containerRef} className="relative h-[300vh] bg-white">
      <div className="sticky top-0 h-screen w-full flex items-center justify-center p-3 sm:p-4 md:p-6 lg:p-8 xl:p-12">
        
        {/* Premium Black Container */}
        <div className="relative w-full h-[85vh] md:h-[80vh] min-h-[600px] bg-black rounded-[32px] overflow-hidden shadow-2xl flex flex-col md:flex-row border border-gray-900">
          
          {/* Left Side Title */}
          <div className="md:w-[320px] lg:w-[400px] xl:w-[450px] p-8 md:p-16 flex flex-col justify-center relative z-20 bg-black/80 backdrop-blur-md">
            <p className="text-gray-400 font-bold uppercase tracking-widest text-xs mb-3 md:mb-4">
              Our Network
            </p>
            <h2 className="text-4xl md:text-5xl lg:text-6xl font-extrabold text-white leading-[1.1] tracking-tight shrink-0">
              Scale That<br />Delivers
            </h2>
          </div>

          {/* Right Side Dial Typography */}
          <div className="relative h-full flex-1 flex items-center justify-center md:justify-end min-w-0">
            
            {/* Gradient Fades for Smooth Entry/Exit */}
            <div className="absolute top-0 left-0 right-0 h-32 md:h-40 bg-gradient-to-b from-black to-transparent z-10 pointer-events-none" />
            <div className="absolute bottom-0 left-0 right-0 h-32 md:h-40 bg-gradient-to-t from-black to-transparent z-10 pointer-events-none" />

            <div className="relative w-full h-full flex items-center justify-center md:justify-end pr-0 md:pr-16">
              {stats.map((stat, i) => (
                <motion.div 
                  key={i}
                  style={{ y: stat.y, opacity: stat.op, scale: stat.scale }}
                  className="absolute w-full px-6 md:px-0 text-center md:text-right origin-center md:origin-right"
                >
                  <h3 className="text-6xl sm:text-7xl md:text-8xl lg:text-[110px] xl:text-[130px] 2xl:text-[150px] font-black text-white leading-[0.85] tracking-[-0.04em] uppercase flex flex-col md:inline-block">
                    {stat.text.split('+').map((part, idx, arr) => (
                      <span key={idx}>
                        {part}
                        {idx < arr.length - 1 && <span className="text-gray-600">+</span>}
                      </span>
                    ))}
                  </h3>
                </motion.div>
              ))}
            </div>

          </div>
          
        </div>
      </div>
    </section>
  );
}

// ──────────────────────────────────────────────────────────
// Stats Counter (Legacy, to be removed if unused)
// ──────────────────────────────────────────────────────────
function StatItem({ value, label, icon }: { value: string; label: string; icon: React.ReactNode }) {
  return (
    <div className="flex items-center gap-4">
      <div className="w-12 h-12 rounded-2xl bg-indigo-50 flex items-center justify-center shrink-0">
        {icon}
      </div>
      <div>
        <div className="text-2xl font-bold text-gray-900 leading-tight">{value}</div>
        <div className="text-sm text-gray-500">{label}</div>
      </div>
    </div>
  );
}

// ──────────────────────────────────────────────────────────
// Destination Brands (Curated Partner Venues)
// ──────────────────────────────────────────────────────────
const DESTINATION_BRANDS = [
  { name: 'PVR', color: '#dc2626', type: 'Cinema' },
  { name: 'INOX', color: '#1e3a8a', type: 'Cinema' },
  { name: 'Cinepolis', color: '#0369a1', type: 'Cinema' },
  { name: 'Phoenix Marketcity', color: '#b91c1c', type: 'Mall' },
  { name: 'Prestige Group', color: '#1f2937', type: 'Corporate' },
  { name: 'Brigade Group', color: '#4338ca', type: 'Corporate' },
  { name: 'Nexus Malls', color: '#ea580c', type: 'Mall' },
  { name: 'Lulu Mall', color: '#047857', type: 'Mall' },
  { name: 'Starbucks', color: '#15803d', type: 'Cafe' },
  { name: 'Café Coffee Day', color: '#be123c', type: 'Cafe' },
  { name: 'WeWork', color: '#000000', type: 'Workspace' },
  { name: 'Embassy Tech Village', color: '#0f766e', type: 'Corporate' },
  { name: 'RMZ', color: '#111827', type: 'Corporate' },
  { name: 'Manyata Tech Park', color: '#4f46e5', type: 'Corporate' },
  { name: 'Miraj Cinemas', color: '#e11d48', type: 'Cinema' },
  { name: 'Lakme Salon', color: '#db2777', type: 'Salon' },
  { name: 'Vande Bharat Trains', color: '#ea580c', type: 'Transit' },
  { name: 'Royal Meenakshi Mall', color: '#9333ea', type: 'Mall' },
  { name: 'WTF Gyms', color: '#000000', type: 'Gym' },
];

function BrandLogo({ brand }: { brand: typeof DESTINATION_BRANDS[0] }) {
  const [, navigate] = useLocation();
  const [isHovered, setIsHovered] = useState(false);

  return (
    <div 
      className="flex flex-col items-center justify-center px-10 py-8 mx-3 bg-white rounded-2xl shadow-[0_2px_8px_rgb(0,0,0,0.04)] border border-gray-100 cursor-pointer transition-all duration-300 transform hover:-translate-y-1 hover:shadow-[0_8px_24px_rgb(0,0,0,0.08)] min-w-[240px]"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      onClick={() => navigate(`/advertiser/discover?q=${encodeURIComponent(brand.name)}`)}
    >
      <span 
        className="text-2xl md:text-3xl font-black tracking-tight transition-colors duration-500 text-center"
        style={{ color: isHovered ? brand.color : '#9ca3af' }}
      >
        {brand.name}
      </span>
      <span className="text-[10px] font-semibold uppercase tracking-widest text-gray-400 mt-2 opacity-60">
        {brand.type}
      </span>
    </div>
  );
}

function DestinationBrandsSection() {
  // Split into 3 staggered rows for depth (19 items total)
  const row1 = [DESTINATION_BRANDS[0], DESTINATION_BRANDS[3], DESTINATION_BRANDS[6], DESTINATION_BRANDS[9], DESTINATION_BRANDS[12], DESTINATION_BRANDS[15], DESTINATION_BRANDS[18]];
  const row2 = [DESTINATION_BRANDS[1], DESTINATION_BRANDS[4], DESTINATION_BRANDS[7], DESTINATION_BRANDS[10], DESTINATION_BRANDS[13], DESTINATION_BRANDS[16]];
  const row3 = [DESTINATION_BRANDS[2], DESTINATION_BRANDS[5], DESTINATION_BRANDS[8], DESTINATION_BRANDS[11], DESTINATION_BRANDS[14], DESTINATION_BRANDS[17]];

  return (
    <section className="py-24 bg-white overflow-hidden border-t border-gray-100">
      <style>{`
        @keyframes scroll-left {
          0% { transform: translateX(0); }
          100% { transform: translateX(-50%); }
        }
        @keyframes scroll-right {
          0% { transform: translateX(-50%); }
          100% { transform: translateX(0); }
        }
        .animate-scroll-left {
          animation: scroll-left var(--speed, 40s) linear infinite;
          display: flex;
          width: max-content;
        }
        .animate-scroll-right {
          animation: scroll-right var(--speed, 40s) linear infinite;
          display: flex;
          width: max-content;
        }
        .pause-on-hover:hover .animate-scroll-left,
        .pause-on-hover:hover .animate-scroll-right {
          animation-play-state: paused;
        }
      `}</style>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 mb-16 text-center">
        <p className="text-sm font-semibold text-blue-600 uppercase tracking-wider mb-3">Premium Destinations</p>
        <h2 className="text-4xl md:text-5xl font-bold text-gray-900 tracking-tight leading-tight mb-4">
          Advertise at India's Most Visited Destinations.
        </h2>
        <p className="text-lg text-gray-500 leading-relaxed max-w-3xl mx-auto">
          Reach audiences at leading malls, cinemas, cafés, corporate campuses and other premium venues across your city.
        </p>
      </div>

      <div className="max-w-[95%] xl:max-w-[90%] mx-auto bg-gray-50 rounded-[32px] md:rounded-[48px] py-16 md:py-20 border border-gray-100 shadow-inner relative overflow-hidden pause-on-hover">
        
        {/* Gradients to fade edges */}
        <div className="absolute top-0 bottom-0 left-0 w-16 md:w-32 bg-gradient-to-r from-gray-50 to-transparent z-10 pointer-events-none" />
        <div className="absolute top-0 bottom-0 right-0 w-16 md:w-32 bg-gradient-to-l from-gray-50 to-transparent z-10 pointer-events-none" />

        {/* Row 1 - Left - Fast */}
        <div className="w-full overflow-hidden mb-6 md:mb-8" style={{ '--speed': '45s' } as any}>
          <div className="animate-scroll-left">
            {[...row1, ...row1, ...row1, ...row1].map((brand, i) => (
              <BrandLogo key={`r1-${i}`} brand={brand} />
            ))}
          </div>
        </div>

        {/* Row 2 - Right - Medium */}
        <div className="w-full overflow-hidden mb-6 md:mb-8" style={{ '--speed': '55s' } as any}>
          <div className="animate-scroll-right -ml-[50%]">
            {[...row2, ...row2, ...row2, ...row2].map((brand, i) => (
              <BrandLogo key={`r2-${i}`} brand={brand} />
            ))}
          </div>
        </div>

        {/* Row 3 - Left - Slow */}
        <div className="w-full overflow-hidden" style={{ '--speed': '65s' } as any}>
          <div className="animate-scroll-left -ml-24">
            {[...row3, ...row3, ...row3, ...row3].map((brand, i) => (
              <BrandLogo key={`r3-${i}`} brand={brand} />
            ))}
          </div>
        </div>
        
      </div>
    </section>
  );
}

// ──────────────────────────────────────────────────────────
// Main Component
// ──────────────────────────────────────────────────────────
// ──────────────────────────────────────────────────────────
// Customer Journey Animation
// ──────────────────────────────────────────────────────────
function CustomerJourneySection() {
  const [hoveredNode, setHoveredNode] = useState<number | null>(null);

  const nodes = [
    { id: 0, label: 'Home', desc: 'Build awareness before customers leave home.', icon: Home },
    { id: 1, label: 'Bus Stop', desc: 'Capture attention during the daily commute.', icon: BusFront },
    { id: 2, label: 'Billboard', desc: 'Reinforce your message on the move.', icon: Monitor },
    { id: 3, label: 'Office', desc: 'Stay visible during the workday.', icon: Building2 },
    { id: 4, label: 'Café', desc: 'Reach customers during leisure breaks.', icon: Coffee },
    { id: 5, label: 'Shopping Mall', desc: 'Influence purchase decisions while shopping.', icon: ShoppingBag },
    { id: 6, label: 'Cinema', desc: 'Engage audiences in a premium environment.', icon: Film },
    { id: 7, label: 'Gym', desc: 'Connect with health-conscious consumers.', icon: Dumbbell },
  ];

  return (
    <section className="py-24 bg-white overflow-hidden border-t border-gray-100">
      <style>{`
        @keyframes spin-orbit {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
        .animate-spin-orbit {
          animation: spin-orbit 16s linear infinite;
          transform-origin: 250px 250px;
        }
        @keyframes node-pulse {
          0%, 15% { 
            transform: scale(1.15); 
            box-shadow: 0 10px 25px -5px rgba(59,130,246,0.3); 
            border-color: #60a5fa; 
          }
          20%, 100% { 
            transform: scale(1); 
            box-shadow: 0 4px 6px -1px rgba(0,0,0,0.05); 
            border-color: #f3f4f6; 
          }
        }
        @keyframes icon-pulse {
          0%, 15% { color: #2563eb; }
          20%, 100% { color: #6b7280; }
        }
        .animate-node-pulse {
          animation: node-pulse 16s ease-in-out infinite;
        }
        .animate-icon-pulse {
          animation: icon-pulse 16s ease-in-out infinite;
        }
        .is-paused, .is-paused * {
          animation-play-state: paused !important;
        }
      `}</style>

      <div className="max-w-5xl mx-auto px-4 sm:px-6 mb-20 text-center">
        <h2 className="text-4xl md:text-5xl font-bold text-gray-900 tracking-tight leading-tight mb-4">
          Reach Customers at Every Step of Their Day.
        </h2>
        <p className="text-lg text-gray-500 leading-relaxed max-w-3xl mx-auto">
          One campaign can create multiple moments of visibility. From apartments and bus stops to offices, cafés, malls, gyms and cinemas, your brand stays with customers throughout their daily routine—building familiarity, trust and lasting brand recall.
        </p>
      </div>

      <div className={`relative w-[300px] h-[300px] md:w-[460px] md:h-[460px] mx-auto mb-24 ${hoveredNode !== null ? 'is-paused' : ''}`}>
        {/* SVG Circle Path & Glowing Dot */}
        <div className="absolute inset-0 pointer-events-none">
          <svg className="w-full h-full overflow-visible" viewBox="0 0 500 500">
            <circle cx="250" cy="250" r="250" fill="none" stroke="#f3f4f6" strokeWidth="2" strokeDasharray="8 8" />
            <g className="animate-spin-orbit">
              <circle cx="250" cy="0" r="8" fill="#3b82f6" style={{ filter: 'drop-shadow(0 0 12px rgba(59,130,246,0.8))' }} />
              <circle cx="250" cy="0" r="20" fill="#3b82f6" opacity="0.2" className="animate-pulse" />
            </g>
          </svg>
        </div>

        {/* Center Brand Badge */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-10 w-28 h-28 md:w-36 md:h-36 bg-white rounded-full shadow-[0_8px_30px_rgb(0,0,0,0.08)] border border-gray-100 flex items-center justify-center">
          <div className="w-20 h-20 md:w-28 md:h-28 rounded-full bg-gray-900 flex items-center justify-center relative overflow-hidden shadow-inner">
             <div className="absolute inset-0 bg-blue-500/20 blur-xl"></div>
             <span className="text-white font-bold text-xs md:text-sm tracking-widest text-center relative z-10 leading-tight">YOUR<br/>BRAND</span>
          </div>
        </div>

        {/* Nodes */}
        {nodes.map((node, i) => {
          const htmlAngle = (i * 45) - 90;
          const x = 50 * Math.cos((htmlAngle * Math.PI) / 180);
          const y = 50 * Math.sin((htmlAngle * Math.PI) / 180);
          const delay = i * 2;
          const isHovered = hoveredNode === i;
          
          const Icon = node.icon;
          
          return (
            <div
              key={node.id}
              className="absolute z-20"
              style={{ left: `calc(50% + ${x}%)`, top: `calc(50% + ${y}%)`, transform: 'translate(-50%, -50%)' }}
              onMouseEnter={() => setHoveredNode(i)}
              onMouseLeave={() => setHoveredNode(null)}
            >
              <div className="relative flex items-center justify-center">
                <div 
                  className={`w-14 h-14 md:w-16 md:h-16 rounded-2xl bg-white flex items-center justify-center shadow-sm border border-gray-100 cursor-pointer animate-node-pulse ${isHovered ? '!scale-125 !border-blue-400 !shadow-blue-500/20 z-30' : ''}`}
                  style={{ animationDelay: `${delay}s` }}
                >
                  <Icon 
                    className={`w-6 h-6 text-gray-500 animate-icon-pulse ${isHovered ? '!text-blue-600' : ''}`} 
                    style={{ animationDelay: `${delay}s` }} 
                  />
                </div>
                
                {/* Tooltip */}
                <div 
                  className={`absolute top-[calc(100%+16px)] left-1/2 -translate-x-1/2 bg-gray-900 text-white p-3 md:p-4 rounded-2xl shadow-xl w-48 md:w-56 text-center transition-all duration-300 pointer-events-none z-50 ${isHovered ? 'opacity-100 translate-y-0 scale-100' : 'opacity-0 -translate-y-2 scale-95'}`}
                >
                  <p className="text-xs md:text-sm font-bold mb-1 md:mb-1.5">{node.label}</p>
                  <p className="text-[10px] md:text-xs text-gray-300 leading-relaxed">{node.desc}</p>
                  <div className="absolute -top-2 left-1/2 -translate-x-1/2 w-4 h-4 bg-gray-900 rotate-45 rounded-sm"></div>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Value Cards */}
      <div className="max-w-5xl mx-auto px-4 sm:px-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {[
            { title: 'Multiple Touchpoints', desc: 'Reach the same audience across multiple locations throughout their day.', icon: '🎯' },
            { title: 'Stronger Brand Recall', desc: 'Repeated exposure increases familiarity and keeps your business top of mind.', icon: '🧠' },
            { title: 'Better Performance', desc: 'More visibility across everyday moments leads to higher awareness and stronger marketing results.', icon: '📈' },
          ].map(card => (
            <div key={card.title} className="bg-gray-50/80 rounded-3xl p-8 border border-gray-100 hover:shadow-md transition-shadow">
              <div className="w-12 h-12 rounded-2xl bg-white flex items-center justify-center mb-6 shadow-sm border border-gray-100 text-2xl">
                {card.icon}
              </div>
              <h3 className="text-lg font-bold text-gray-900 mb-2">{card.title}</h3>
              <p className="text-sm text-gray-500 leading-relaxed">{card.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

export default function PublicHome() {
  const { user: currentUser } = useAuth();
  const [, navigate] = useLocation();
  const [activeVenueChip, setActiveVenueChip] = useState('');
  const venueScrollRef = useRef<HTMLDivElement>(null);
  const venueCardsScrollRef = useRef<HTMLDivElement>(null);

  const { data: homeData } = useQuery<HomeDataResponse>({
    queryKey: ['/api/public/home-data'],
    staleTime: 5 * 60 * 1000,
  });

  const platformStats = homeData?.platformStats;

  const handleSearchSelect = (query: string, type: string, venueValue?: string) => {
    if (venueValue) {
      navigate(`/advertiser/discover?venue=${encodeURIComponent(venueValue)}`);
    } else {
      navigate(`/advertiser/discover?q=${encodeURIComponent(query)}`);
    }
  };

  const handleVenueCardSelect = (venue: string) => {
    navigate(`/advertiser/discover?venue=${encodeURIComponent(venue)}`);
  };

  const handleVenueChip = (value: string) => {
    setActiveVenueChip(value);
    if (venueCardsScrollRef.current) {
      venueCardsScrollRef.current.scrollTo({ left: 0, behavior: 'smooth' });
    }
    if (value) {
      navigate(`/advertiser/discover?venue=${encodeURIComponent(value)}`);
    } else {
      navigate('/advertiser/discover');
    }
  };

  const getDashboardLink = () => {
    if (!currentUser) return '/login';
    if (currentUser.role === 'admin') return '/admin';
    if (currentUser.role === 'screen_owner') return '/owner';
    return '/advertiser';
  };

  return (
    <div className="min-h-screen bg-white" style={{ fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, sans-serif" }}>

      {/* ─────────────────── HEADER ─────────────────── */}
      <header className="sticky top-0 z-50 bg-white/95 backdrop-blur-md border-b border-gray-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          <div className="flex items-center h-16 gap-4">

            {/* Left: Logo */}
            <div className="flex-1 basis-0">
              <Link href="/" className="shrink-0 inline-block">
                <img src={logo} alt="Pixelspot" className="h-8 w-auto" data-testid="img-logo" />
              </Link>
            </div>

            {/* Center: Functional Search perfectly centered */}
            <div className="flex-[2] max-w-2xl hidden md:flex justify-center">
              <div className="w-full">
                <LocationSearchBar onSearch={handleSearchSelect} variant="header" placeholder="Search by city, locality, mall or landmark..." />
              </div>
            </div>

            {/* Right: Auth */}
            <div className="flex-1 basis-0 flex justify-end items-center gap-2">
              {currentUser ? (
                <Link href={getDashboardLink()}>
                  <Button size="sm" variant="outline" className="rounded-xl gap-2 font-medium border-gray-200 hover:border-indigo-300 hover:text-blue-600 transition-all" data-testid="button-header-dashboard">
                    <LayoutDashboard className="w-4 h-4" />
                    <span className="hidden sm:inline">Dashboard</span>
                  </Button>
                </Link>
              ) : (
                <>
                  <Link href="/login">
                    <Button variant="ghost" size="sm" className="rounded-xl font-medium text-gray-700 hover:text-blue-600" data-testid="button-header-login">
                      Login
                    </Button>
                  </Link>
                  <Link href="/register?role=advertiser">
                    <Button size="sm" className="hidden sm:flex rounded-xl font-semibold bg-blue-600 hover:bg-blue-700 text-white px-5" data-testid="button-header-signup">
                      Get Started
                    </Button>
                  </Link>
                </>
              )}
            </div>
          </div>
          {/* Mobile Search - Render below on small screens */}
          <div className="md:hidden pb-3">
            <LocationSearchBar onSearch={handleSearchSelect} variant="header" placeholder="Search by city, locality or mall..." />
          </div>
        </div>
      </header>

<<<<<<< HEAD
      {/* Hero Section */}
      <section className="relative pt-20 pb-24 min-h-[85vh] flex items-center justify-center overflow-hidden bg-background">
        {/* Background Video Layer */}
        <div className="absolute inset-0 z-0 opacity-15 pointer-events-none overflow-hidden">
          <video
            autoPlay
            loop
            muted
            playsInline
            className="w-full h-full object-cover"
          >
            <source src="https://assets.mixkit.co/videos/preview/mixkit-abstract-digital-technology-background-43093-large.mp4" type="video/mp4" />
          </video>
          <div className="absolute inset-0 bg-gradient-to-b from-background/40 via-background/90 to-background" />
        </div>

        {/* 3D Holographic Particle Globe Layer */}
        <div className="absolute inset-0 z-0 pointer-events-none flex items-center justify-center overflow-hidden select-none">
          <div className="w-[90vw] h-[90vw] md:w-[80vw] md:h-[80vw] lg:w-[70vw] lg:h-[70vw] max-w-[850px] aspect-square flex items-center justify-center opacity-90">
            <HeroGlobe />
          </div>
        </div>

        <div className="container mx-auto px-4 relative z-10 text-center">
          <div className="max-w-4xl mx-auto space-y-10 animate-in fade-in slide-in-from-bottom duration-1000">
            <div className="space-y-6">
              <Badge variant="outline" className="px-4 py-1.5 border-primary/30 text-primary font-medium bg-primary/5 mx-auto">
                Digital Outdoor Advertising Platform
              </Badge>
              <h1 className="text-5xl sm:text-7xl lg:text-8xl font-black tracking-tighter text-foreground leading-[1.1]">
                Run Ads Across <br />
                <span className="text-primary italic">Real-World</span> Screens
              </h1>
              <p className="text-xl sm:text-2xl text-muted-foreground max-w-2xl mx-auto leading-relaxed">
                Launch outdoor ad campaigns across digital screens in your city — all from one platform. Google Ads, but for the physical world.
              </p>
            </div>

            <div className="flex flex-wrap gap-6 justify-center">
              <Link href="/register?role=advertiser">
                <Button size="lg" className="h-16 px-10 text-xl font-bold shadow-2xl shadow-primary/20 hover:scale-[1.02] transition-transform">
                  Start Campaign
                </Button>
              </Link>
              <Button 
                size="lg" 
                variant="outline" 
                className="h-16 px-10 text-xl font-bold border-2"
                onClick={scrollToScreens}
=======
      {/* ─────────────── Secondary nav: Venue filter chips ─────────────── */}
      <div className="border-b border-gray-100 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          <div
            ref={venueScrollRef}
            className="flex items-center gap-2 py-3 overflow-x-auto no-scrollbar scroll-smooth"
          >
            {VENUE_CHIPS.map(chip => (
              <button
                key={chip.value}
                onClick={() => handleVenueChip(chip.value)}
                className={`px-4 py-1.5 rounded-full text-sm font-medium transition-all duration-200 border whitespace-nowrap ${
                  activeVenueChip === chip.value
                    ? 'bg-gray-900 text-white border-gray-900'
                    : 'bg-white text-gray-700 border-gray-200 hover:border-gray-900 hover:bg-gray-900 hover:text-white'
                }`}
>>>>>>> 640b4e0be806b957bcb05d3434b742a2df9d475f
              >
                {chip.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* ─────────────────── HERO ─────────────────── */}
      <section className="relative bg-white pt-16 pb-24 overflow-hidden">
        {/* Subtle gradient background */}
        <div className="absolute inset-0 bg-gradient-to-b from-indigo-50/40 via-white to-white pointer-events-none" />
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[900px] h-[500px] bg-gradient-radial from-indigo-100/50 to-transparent pointer-events-none" />

        <div className="max-w-7xl mx-auto px-4 sm:px-6 relative z-10 text-center">
          {/* Eyebrow badge */}
          <div className="inline-flex items-center gap-2 bg-indigo-50 text-blue-700 text-sm font-semibold px-4 py-2 rounded-full mb-8 border border-indigo-100">
            <div className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-pulse" />
            Hyperlocal Digital Screen Advertising
          </div>

          {/* Headline */}
          <h1 className="text-5xl md:text-6xl lg:text-7xl xl:text-[6.2rem] font-extrabold text-gray-900 leading-[1.05] tracking-tighter mb-6">
            <span className="whitespace-nowrap">Advertise Where Your</span><br />
            <span className="text-blue-600">Customers Live,</span>{' '}
            <span className="text-gray-900">Work</span>{' '}
            <span className="text-gray-400">&</span>{' '}
            <span className="text-gray-900">Shop.</span>
          </h1>

          {/* Sub-headline */}
          <p className="text-xl text-gray-500 max-w-2xl mx-auto leading-relaxed mb-10 font-normal">
            Launch hyperlocal campaigns on nearby digital screens and reach customers where they live, work, shop and make buying decisions.
          </p>

          {/* CTAs */}
          <div className="flex flex-wrap items-center justify-center gap-4">
            <Link href="/advertiser/discover">
              <Button size="lg" className="px-8 rounded-full font-semibold bg-blue-600 hover:bg-blue-700 text-white text-base shadow-lg hover:shadow-xl transition-all">
                <MapPin className="w-4 h-4 mr-2" />
                Find Nearby Screens
              </Button>
            </Link>
            <Link href="/register?role=advertiser">
              <Button size="lg" variant="outline" className="px-8 rounded-full font-semibold text-base border-gray-300 text-gray-700 hover:border-gray-900 hover:bg-gray-900 hover:text-white transition-all">
                Plan My Campaign
                <ChevronRight className="w-4 h-4 ml-1" />
              </Button>
            </Link>
          </div>

          {/* Trust signals */}
          <div className="flex flex-wrap items-center justify-center gap-6 mt-10 text-sm text-gray-400">
            {['Go live in minutes', 'Flexible budgets', 'Local targeting'].map(t => (
              <span key={t} className="flex items-center gap-1.5">
                <Star className="w-3.5 h-3.5 text-gray-400 fill-gray-300" />
                {t}
              </span>
            ))}
          </div>
        </div>
      </section>

      {/* ─────────────────── SECTION 2: VENUE TYPES ─────────────────── */}
      <section className="py-24 bg-white overflow-hidden border-t border-gray-100" id="venue-types">
        <style>{`
          @keyframes marquee {
            0% { transform: translateX(0); }
            100% { transform: translateX(-50%); }
          }
          .animate-marquee {
            animation: marquee 40s linear infinite;
            display: flex;
            width: max-content;
          }
          .animate-marquee:hover {
            animation-play-state: paused;
          }
        `}</style>
        
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          {/* Heading */}
          <div className="max-w-3xl mx-auto text-center mb-16">
            <p className="text-sm font-semibold text-blue-600 uppercase tracking-wider mb-3">
              Screen Locations
            </p>
            <h2 className="text-4xl sm:text-5xl font-bold text-gray-900 leading-tight tracking-tight mb-4">
              Reach Customers Across Their Everyday Journey.
            </h2>
            <p className="text-lg text-gray-500 leading-relaxed">
              Choose from premium digital screens in the places your customers visit every day.
            </p>
          </div>
        </div>

        {/* Auto-scrolling horizontally scrollable cards */}
        <div className="w-full overflow-hidden pb-8">
          <div className="animate-marquee gap-5 px-4 sm:px-6">
            {[...VENUE_CARDS, ...VENUE_CARDS].map((card, i) => (
              <VenueCard key={`${card.label}-${i}`} card={card} onSelect={handleVenueCardSelect} />
            ))}
          </div>
        </div>

        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          <div className="mt-8 flex justify-center">
            <Link href="/advertiser/discover">
              <Button variant="outline" size="lg" className="rounded-xl font-semibold border-gray-200 text-gray-700 hover:border-blue-300 hover:text-blue-600 transition-all px-8">
                Browse All Screen Locations
                <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* ─────────────────── ANIMATED STATS STRIP ─────────────────── */}
      <AnimatedNetworkStats platformStats={platformStats} />

      {/* ─────────────────── DESTINATION BRANDS ─────────────────── */}
      <DestinationBrandsSection />

      {/* ─────────────────── HOW IT WORKS ─────────────────── */}
      <section className="py-24 bg-gray-50" id="how-it-works">
        <div className="max-w-5xl mx-auto px-4 sm:px-6">
          <div className="text-center mb-16">
            <p className="text-sm font-semibold text-blue-600 uppercase tracking-wider mb-3">Simple Process</p>
            <h2 className="text-4xl font-bold text-gray-900 tracking-tight mb-4">Launch in 4 Easy Steps</h2>
            <p className="text-lg text-gray-500">No agencies. No long contracts. Just results.</p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8">
            {[
              {
                step: '01',
                title: 'Find Nearby Screens',
                desc: 'Search screens by city, locality, or venue type near your business.',
                icon: <Search className="w-6 h-6 text-blue-600" />,
              },
              {
                step: '02',
                title: 'Choose Your Locations',
                desc: 'Pick the screens that reach your customers — with full pricing transparency.',
                icon: <MapPin className="w-6 h-6 text-blue-600" />,
              },
              {
                step: '03',
                title: 'Upload Your Creative',
                desc: 'Add your ad, set dates and budget. Preview before going live.',
                icon: <Monitor className="w-6 h-6 text-blue-600" />,
              },
              {
                step: '04',
                title: 'Go Live & Get Noticed',
                desc: 'Your ad starts playing. More visibility, more walk-ins, more customers.',
                icon: <Zap className="w-6 h-6 text-blue-600" />,
              },
            ].map((s, i) => (
              <div key={s.step} className="relative">
                {i < 3 && (
                  <div className="hidden lg:block absolute top-10 left-full w-full h-px border-t-2 border-dashed border-gray-200 z-0 -translate-x-4" />
                )}
                <div className="relative z-10 bg-white rounded-3xl p-6 border border-gray-100 shadow-sm hover:shadow-md transition-shadow">
                  <div className="text-xs font-bold text-gray-300 mb-4 font-mono">{s.step}</div>
                  <div className="w-12 h-12 rounded-2xl bg-indigo-50 flex items-center justify-center mb-4">
                    {s.icon}
                  </div>
                  <h3 className="font-semibold text-gray-900 text-base mb-2">{s.title}</h3>
                  <p className="text-gray-500 text-sm leading-relaxed">{s.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ─────────────────── CUSTOMER JOURNEY (SECTION 5) ─────────────────── */}
      <CustomerJourneySection />

      {/* ─────────────────── WHY CONNECT ─────────────────── */}
      <section className="py-24 bg-white">
        <div className="max-w-5xl mx-auto px-4 sm:px-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
            <div>
              <p className="text-sm font-semibold text-blue-600 uppercase tracking-wider mb-3">Built for Local Businesses</p>
              <h2 className="text-4xl font-bold text-gray-900 tracking-tight leading-tight mb-6">
                Built for Restaurants, Clinics, Gyms, Salons & More.
              </h2>
              <p className="text-lg text-gray-500 leading-relaxed mb-8">
                Whether you run a restaurant, a clinic, a gym, a retail store or a real estate project — Connect helps you run digital screen ads near your business without the complexity or cost of traditional advertising.
              </p>

              <div className="space-y-4">
                {[
                  { title: 'Hyperlocal Targeting', desc: 'Reach customers within 1–10 km of your business location.', icon: <MapPin className="w-4 h-4 text-blue-600" /> },
                  { title: 'Transparent Pricing', desc: 'See exact daily rates upfront. No hidden fees or surprise bills.', icon: <Star className="w-4 h-4 text-blue-600" /> },
                  { title: 'Flexible Campaigns', desc: 'Run ads for a day, a week, or longer. Pause anytime.', icon: <Zap className="w-4 h-4 text-blue-600" /> },
                  { title: 'Real Results', desc: 'More visibility, more walk-ins, more customers.', icon: <TrendingUp className="w-4 h-4 text-blue-600" /> },
                ].map(f => (
                  <div key={f.title} className="flex items-start gap-4 p-4 rounded-2xl bg-gray-50 hover:bg-indigo-50/50 transition-colors">
                    <div className="w-9 h-9 rounded-xl bg-white border border-gray-100 shadow-sm flex items-center justify-center shrink-0 mt-0.5">
                      {f.icon}
                    </div>
                    <div>
                      <h4 className="font-semibold text-gray-900 text-sm">{f.title}</h4>
                      <p className="text-gray-500 text-sm mt-0.5">{f.desc}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Mockup card */}
            <div className="relative">
              <div className="absolute inset-0 bg-indigo-100 rounded-3xl rotate-2 scale-95 opacity-50" />
              <div className="relative bg-white rounded-3xl border border-gray-100 shadow-2xl overflow-hidden">
                <div className="bg-gray-900 px-6 py-4 flex items-center justify-between">
                  <div>
                    <p className="text-xs text-gray-400 font-medium uppercase tracking-widest mb-1">Live Campaign</p>
                    <h4 className="text-white font-bold text-lg">Dr. Sharma's Clinic</h4>
                  </div>
                  <span className="flex items-center gap-1.5 bg-green-500 text-white text-xs font-semibold px-2.5 py-1 rounded-full">
                    <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" />
                    Live
                  </span>
                </div>
                <div className="p-6 space-y-5">
                  <div>
                    <div className="flex justify-between text-sm mb-2">
                      <span className="text-gray-500 font-medium">Campaign Reach</span>
                      <span className="text-blue-600 font-semibold">74%</span>
                    </div>
                    <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                      <div className="h-full bg-blue-500 rounded-full" style={{ width: '74%' }} />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    {[
                      { label: 'Impressions', value: '18,400' },
                      { label: 'Screens Active', value: '12' },
                      { label: 'Daily Budget', value: '₹2,400' },
                      { label: 'Locality', value: 'Koramangala' },
                    ].map(s => (
                      <div key={s.label} className="bg-gray-50 rounded-2xl p-4">
                        <p className="text-xs text-gray-400 font-medium uppercase tracking-wider mb-1">{s.label}</p>
                        <p className="text-xl font-bold text-gray-900">{s.value}</p>
                      </div>
                    ))}
                  </div>

                  <div className="bg-indigo-50 rounded-2xl p-4 flex items-center gap-3">
                    <MapPin className="w-5 h-5 text-indigo-500 shrink-0" />
                    <div>
                      <p className="text-sm font-semibold text-gray-900">Hyperlocal Focus</p>
                      <p className="text-xs text-gray-500">Bengaluru — 3 km radius from clinic</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ─────────────────── WHO IS THIS FOR ─────────────────── */}
      <section className="py-24 bg-gray-50">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 text-center">
          <p className="text-sm font-semibold text-blue-600 uppercase tracking-wider mb-3">Perfect For</p>
          <h2 className="text-4xl font-bold text-gray-900 tracking-tight mb-4">Made for Every Business</h2>
          <p className="text-lg text-gray-500 mb-12 max-w-2xl mx-auto">Connect is built for businesses that want to grow locally — not just nationwide brands with massive budgets.</p>

          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
            {[
              { label: 'Restaurants', icon: <Utensils className="w-7 h-7 text-blue-600" /> },
              { label: 'Clinics', icon: <Stethoscope className="w-7 h-7 text-blue-600" /> },
              { label: 'Gyms', icon: <Dumbbell className="w-7 h-7 text-blue-600" /> },
              { label: 'Salons', icon: <Scissors className="w-7 h-7 text-blue-600" /> },
              { label: 'Retail Stores', icon: <ShoppingBag className="w-7 h-7 text-blue-600" /> },
              { label: 'Real Estate', icon: <Home className="w-7 h-7 text-blue-600" /> },
              { label: 'Schools & Colleges', icon: <GraduationCap className="w-7 h-7 text-blue-600" /> },
              { label: 'Cafés', icon: <Coffee className="w-7 h-7 text-blue-600" /> },
              { label: 'Pharmacies', icon: <Pill className="w-7 h-7 text-blue-600" /> },
              { label: 'Auto Showrooms', icon: <Car className="w-7 h-7 text-blue-600" /> },
            ].map(b => (
              <div key={b.label} className="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all cursor-pointer flex flex-col items-start">
                <div className="w-12 h-12 rounded-xl bg-indigo-50 flex items-center justify-center mb-3">
                  {b.icon}
                </div>
                <p className="text-sm font-semibold text-gray-700">{b.label}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ─────────────────── SCREEN OWNERS CTA ─────────────────── */}
      <section className="py-24 bg-white">
        <div className="max-w-5xl mx-auto px-4 sm:px-6">
          <div className="bg-gray-900 rounded-3xl p-12 text-center relative overflow-hidden">
            <div className="absolute top-0 left-0 w-64 h-64 bg-blue-600/20 rounded-full blur-3xl -translate-x-1/2 -translate-y-1/2" />
            <div className="absolute bottom-0 right-0 w-64 h-64 bg-indigo-400/10 rounded-full blur-3xl translate-x-1/2 translate-y-1/2" />
            <div className="relative z-10">
              <div className="inline-flex items-center gap-2 bg-white/10 text-white text-sm font-semibold px-4 py-2 rounded-full mb-6 border border-white/10">
                <Monitor className="w-4 h-4" />
                For Screen Owners
              </div>
              <h2 className="text-4xl font-bold text-white mb-4">Monetize Your Digital Screens</h2>
              <p className="text-lg text-gray-400 max-w-xl mx-auto mb-8">
                Own a digital display or LED screen? Join the Connect network and start earning by running advertiser campaigns on your screens.
              </p>
              <div className="flex flex-wrap items-center justify-center gap-4">
                <Link href="/register?role=screen_owner">
                  <Button size="lg" className="bg-white text-gray-900 hover:bg-gray-100 font-semibold rounded-xl px-8">
                    List Your Screen
                  </Button>
                </Link>
                <Link href="/login">
                  <Button size="lg" variant="ghost" className="text-white hover:text-white hover:bg-white/10 rounded-xl font-semibold px-8 border border-white/20">
                    Already Listed? Sign In
                  </Button>
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ─────────────────── FAQ SECTION ─────────────────── */}
      <section className="py-24 bg-gray-50 border-t border-gray-100" id="faq">
        <div className="max-w-4xl mx-auto px-4 sm:px-6">
          <div className="text-center mb-12">
            <h2 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-4 tracking-tight">Frequently Asked Questions</h2>
            <p className="text-lg text-gray-500 max-w-2xl mx-auto">
              Everything you need to know before launching your outdoor advertising campaign with Connect.
            </p>
          </div>
          
          <div className="bg-white rounded-3xl p-6 sm:p-10 shadow-sm border border-gray-100">
            <Accordion type="single" collapsible defaultValue="faq-0" className="w-full">
              {FAQ_ITEMS.map((item, index) => (
                <AccordionItem key={index} value={`faq-${index}`} className="border-b-gray-100 last:border-0 py-1">
                  <AccordionTrigger className="text-left font-semibold text-gray-900 hover:text-blue-600 text-lg hover:no-underline py-4">
                    {item.question}
                  </AccordionTrigger>
                  <AccordionContent className="text-gray-500 text-base leading-relaxed pb-4 pr-6">
                    {item.answer}
                  </AccordionContent>
                </AccordionItem>
              ))}
            </Accordion>
          </div>
        </div>
        
        {/* SEO FAQ Schema */}
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              "@context": "https://schema.org",
              "@type": "FAQPage",
              "mainEntity": FAQ_ITEMS.map((item) => ({
                "@type": "Question",
                "name": item.question,
                "acceptedAnswer": {
                  "@type": "Answer",
                  "text": item.answer
                }
              }))
            })
          }}
        />
      </section>

      {/* ─────────────────── FINAL CTA ─────────────────── */}
      <section className="py-24 bg-blue-600">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 text-center">
          <h2 className="text-4xl sm:text-5xl font-bold text-white mb-4 tracking-tight">
            Your Customers Are<br />Already Outside.
          </h2>
          <p className="text-xl text-indigo-200 mb-10 leading-relaxed">
            Put your brand where people see it. Launch your local screen campaign today and start getting noticed.
          </p>
          <div className="flex flex-wrap items-center justify-center gap-4">
            <Link href="/register?role=advertiser">
              <Button size="lg" className="bg-white text-blue-700 hover:bg-gray-100 font-semibold rounded-xl px-8 text-base h-12">
                Start Your Campaign — Free
                <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            </Link>
            <Link href="/advertiser/discover">
              <Button size="lg" variant="ghost" className="text-white border border-white/30 hover:bg-white/10 font-semibold rounded-xl px-8 text-base h-12">
                Browse Screens
              </Button>
            </Link>
          </div>
          <p className="text-indigo-300 text-sm mt-6">No credit card required · Launch in minutes</p>
        </div>
      </section>

      <PublicFooter platformStats={platformStats} />
    </div>
  );
}
