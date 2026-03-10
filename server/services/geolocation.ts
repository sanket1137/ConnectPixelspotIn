/**
 * IP-based Geolocation Service
 * 
 * Uses ip-api.com (free tier, no API key) to detect visitor's city/state/coordinates
 * from their IP address. Server-to-server call — no client-side exposure.
 * 
 * Rate limit: 45 requests/minute on free tier.
 * Mitigation: In-memory LRU cache (keyed by IP, 1-hour TTL, max 5000 entries).
 */

interface GeoResult {
  city: string;
  state: string;
  lat: number;
  lng: number;
  country: string;
}

interface IpApiResponse {
  status: "success" | "fail";
  city?: string;
  regionName?: string;
  lat?: number;
  lon?: number;
  country?: string;
  message?: string;
}

interface CacheEntry {
  result: GeoResult | null;
  expiresAt: number;
}

const CACHE_TTL_MS = 60 * 60 * 1000; // 1 hour
const MAX_CACHE_SIZE = 5000;
const REQUEST_TIMEOUT_MS = 2000; // 2 seconds — fast fail

class GeolocationService {
  private cache = new Map<string, CacheEntry>();

  /**
   * Detect location from IP address using ip-api.com.
   * Returns null for private/localhost IPs, on error, or on timeout.
   */
  async detectLocation(ip: string): Promise<GeoResult | null> {
    // Skip private/localhost IPs
    if (this.isPrivateIp(ip)) {
      return null;
    }

    // Check cache
    const cached = this.cache.get(ip);
    if (cached && cached.expiresAt > Date.now()) {
      return cached.result;
    }

    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

      // ip-api.com free tier: HTTP only (not HTTPS). This is fine — it's server-to-server.
      const response = await fetch(
        `http://ip-api.com/json/${ip}?fields=status,city,regionName,lat,lon,country,message`,
        { signal: controller.signal }
      );
      clearTimeout(timeout);

      if (!response.ok) {
        console.warn(`⚠️ Geolocation: ip-api returned ${response.status} for IP ${ip}`);
        this.cacheResult(ip, null);
        return null;
      }

      const data: IpApiResponse = await response.json();

      if (data.status !== "success" || !data.city || data.lat === undefined || data.lon === undefined) {
        console.warn(`⚠️ Geolocation: ip-api lookup failed for ${ip}: ${data.message || "no city"}`);
        this.cacheResult(ip, null);
        return null;
      }

      const result: GeoResult = {
        city: data.city,
        state: data.regionName || "",
        lat: data.lat,
        lng: data.lon,
        country: data.country || "India",
      };

      this.cacheResult(ip, result);
      console.log(`📍 Geolocation: ${ip} → ${result.city}, ${result.state} (${result.lat}, ${result.lng})`);
      return result;
    } catch (err: any) {
      if (err.name === "AbortError") {
        console.warn(`⚠️ Geolocation: timeout for IP ${ip}`);
      } else {
        console.warn(`⚠️ Geolocation: error for IP ${ip}:`, err.message);
      }
      this.cacheResult(ip, null);
      return null;
    }
  }

  /**
   * Extract the real client IP from request headers (nginx X-Real-IP / X-Forwarded-For).
   */
  extractClientIp(req: { headers: Record<string, string | string[] | undefined>; ip?: string }): string {
    const xRealIp = req.headers["x-real-ip"];
    if (typeof xRealIp === "string" && xRealIp) return xRealIp.trim();

    const xForwardedFor = req.headers["x-forwarded-for"];
    if (typeof xForwardedFor === "string" && xForwardedFor) {
      // First IP in the list is the original client
      return xForwardedFor.split(",")[0].trim();
    }

    return req.ip || "127.0.0.1";
  }

  private isPrivateIp(ip: string): boolean {
    return (
      ip === "127.0.0.1" ||
      ip === "::1" ||
      ip === "::ffff:127.0.0.1" ||
      ip.startsWith("10.") ||
      ip.startsWith("192.168.") ||
      ip.startsWith("172.16.") ||
      ip.startsWith("172.17.") ||
      ip.startsWith("172.18.") ||
      ip.startsWith("172.19.") ||
      ip.startsWith("172.2") || // 172.20-29
      ip.startsWith("172.30.") ||
      ip.startsWith("172.31.") ||
      ip === "localhost"
    );
  }

  private cacheResult(ip: string, result: GeoResult | null): void {
    // Evict oldest entries if cache is full
    if (this.cache.size >= MAX_CACHE_SIZE) {
      const keysToDelete: string[] = [];
      const now = Date.now();

      // First pass: evict expired entries
      Array.from(this.cache.entries()).forEach(([key, entry]) => {
        if (entry.expiresAt <= now) {
          keysToDelete.push(key);
        }
      });
      keysToDelete.forEach((k) => this.cache.delete(k));

      // If still too full, evict oldest 20%
      if (this.cache.size >= MAX_CACHE_SIZE) {
        const deleteCount = Math.floor(MAX_CACHE_SIZE * 0.2);
        const keysArr = Array.from(this.cache.keys());
        for (let i = 0; i < Math.min(deleteCount, keysArr.length); i++) {
          this.cache.delete(keysArr[i]);
        }
      }
    }

    this.cache.set(ip, {
      result,
      expiresAt: Date.now() + CACHE_TTL_MS,
    });
  }
}

export const geolocationService = new GeolocationService();
