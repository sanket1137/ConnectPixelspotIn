// Fixed option lists for screen fields — one source for the screen form, the admin Excel template,
// the import validator and the data cleanup. Free text in these columns breaks Discover filters.
import { DETAILED_AGE_GROUPS, GENDER_ORIENTATIONS, INCOME_LEVELS, INDIAN_STATES, VISIBILITY_LEVELS } from "./constants";

export const SCREEN_CATEGORIES = ["Digital Display", "LED Video Wall", "Kiosk", "Mall LED", "Lift Display", "Transit Display"] as const;
export const DISPLAY_FORMATS = ["Portrait", "Landscape", "Square"] as const;
export const ENVIRONMENT_TYPES = ["Indoor", "Semi-Outdoor", "Outdoor Digital"] as const;
export const TRAFFIC_TYPES = ["Pedestrian", "Seated Audience", "Transit", "Mixed"] as const;
export const TIME_OF_DAY_SLOTS = ["Morning Rush", "Lunch Hours", "Evening Leisure", "Late Night"] as const;
export const OCCUPATIONS = ["Students", "Working Professionals", "Business Owners", "Homemakers"] as const;
export const USER_INTENTS = ["Shopping", "Commuting", "Dining", "Fitness", "Entertainment", "Work", "Education"] as const;
export const USER_MOODS = ["Relaxed", "Rushed", "Social", "Focused", "Leisure"] as const;
export const CONTENT_TYPES = ["Static Image", "Video", "Interactive", "HTML5"] as const;
export const WEEK_DAYS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"] as const;
export const SCREEN_STATUSES = ["pending", "inactive", "active"] as const;

export { DETAILED_AGE_GROUPS, GENDER_ORIENTATIONS, INCOME_LEVELS, INDIAN_STATES, VISIBILITY_LEVELS };

// Opening/closing time dropdown: 00:00 … 23:45 in 15-minute steps
export const TIME_OPTIONS: string[] = Array.from({ length: 96 }, (_, i) => `${String(Math.floor(i / 4)).padStart(2, "0")}:${String((i % 4) * 15).padStart(2, "0")}`);
