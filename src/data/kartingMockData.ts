/**
 * ⚠️  DEMO / DEVELOPMENT DATA ONLY
 * ============================================================
 * Mock karting data used ONLY for local development/testing.
 * In production, karts, sessions and lap records are loaded from
 * the Supabase database. This file must NEVER be used as a
 * fallback when real data is unavailable.
 * ============================================================
 */
import { Kart, GoKartingSession, LapRecord } from '../types';

// Empty arrays — production data comes from Supabase
export const mockKarts: Kart[] = [];
export const mockSessions: GoKartingSession[] = [];
export const mockLapRecords: LapRecord[] = [];
