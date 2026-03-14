/**
 * 5thVital API Client
 * REST API client for our Express backend.
 */

const API_BASE = import.meta.env.VITE_API_URL ?? '';

const TOKEN_KEY = '5v_auth_token';
const USER_KEY = '5v_auth_user';

// ─── Token Management ──────────────────────────────────────

export function getToken(): string | null {
  return localStorage.getItem(TOKEN_KEY);
}

export function getStoredUser(): { id: string; phone: string } | null {
  try {
    const raw = localStorage.getItem(USER_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export function setAuth(token: string, user: { id: string; phone: string }): void {
  localStorage.setItem(TOKEN_KEY, token);
  localStorage.setItem(USER_KEY, JSON.stringify(user));
}

export function clearAuth(): void {
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(USER_KEY);
}

export function isAuthenticated(): boolean {
  return !!getToken();
}

// ─── Base Fetch ────────────────────────────────────────────

async function apiFetch<T>(
  path: string,
  options: RequestInit = {},
): Promise<{ data: T | null; error: string | null }> {
  const token = getToken();
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string> || {}),
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  try {
    const res = await fetch(`${API_BASE}${path}`, {
      ...options,
      headers,
    });

    const json = await res.json();

    if (!res.ok) {
      return { data: null, error: json.error || `Request failed (${res.status})` };
    }

    return { data: json as T, error: null };
  } catch (err: any) {
    const message = err.message || 'Network error';
    if (message.includes('Load failed') || message.includes('Failed to fetch')) {
      return { data: null, error: 'Network connection issue. Please check your internet.' };
    }
    return { data: null, error: message };
  }
}

// ─── Auth API ──────────────────────────────────────────────

export async function sendOTP(phone: string) {
  return apiFetch<{ success: boolean; message: string }>('/api/auth/send-otp', {
    method: 'POST',
    body: JSON.stringify({ phone }),
  });
}

export async function verifyOTP(phone: string, otp: string) {
  const result = await apiFetch<{ success: boolean; token: string; user: { id: string; phone: string } }>(
    '/api/auth/verify-otp',
    { method: 'POST', body: JSON.stringify({ phone, otp }) },
  );

  if (result.data?.success && result.data.token) {
    setAuth(result.data.token, result.data.user);
  }

  return result;
}

export async function signOut() {
  clearAuth();
}

// ─── Tests API ─────────────────────────────────────────────

export interface TestResult {
  id: string;
  name: string;
  testCode: string | null;
  category: string | null;
  price: number;
  sampleType: string | null;
  turnaroundTime: string | null;
  profileName: string | null;
  isActive: boolean;
}

export async function searchTests(query: string) {
  return apiFetch<{ tests: TestResult[] }>(`/api/tests/search?q=${encodeURIComponent(query)}`);
}

// ─── Packages API ──────────────────────────────────────────

export async function fetchPackages() {
  return apiFetch<{ packages: any[] }>('/api/packages');
}

export async function fetchPackageBySlug(slug: string) {
  return apiFetch<{ package: any }>(`/api/packages/${encodeURIComponent(slug)}`);
}

// ─── Bookings API ──────────────────────────────────────────

export interface CreateBookingPayload {
  items: { id: string; name: string; price: number; type: 'test' | 'package' }[];
  customerName: string;
  customerPhone: string;
  customerEmail?: string;
  customerAge?: number;
  customerGender?: string;
  address: string;
  bookingDate: string;
  bookingTime: string;
  notes?: string;
  couponCode?: string;
  discountPercentage?: number;
  discountAmount?: number;
}

export async function createBooking(payload: CreateBookingPayload) {
  return apiFetch<{ success: boolean; bookingId: string; bookingNumber: string }>(
    '/api/bookings',
    { method: 'POST', body: JSON.stringify(payload) },
  );
}

export async function fetchUserBookings() {
  return apiFetch<{ bookings: any[] }>('/api/bookings');
}

export async function fetchBookingById(id: string) {
  return apiFetch<{ booking: any }>(`/api/bookings/${id}`);
}

// ─── Pages API ─────────────────────────────────────────────

export async function fetchPageBySlug(slug: string) {
  return apiFetch<{ page: any }>(`/api/pages/${encodeURIComponent(slug)}`);
}

// ─── Coupons API ───────────────────────────────────────────

export interface CouponResult {
  valid: boolean;
  code: string;
  type: 'percent' | 'flat';
  value: number;
  discount: number;
  description: string | null;
}

export async function validateCoupon(code: string, orderAmount: number) {
  return apiFetch<CouponResult>('/api/coupons/validate', {
    method: 'POST',
    body: JSON.stringify({ code, orderAmount }),
  });
}
