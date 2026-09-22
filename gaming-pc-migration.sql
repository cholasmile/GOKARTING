-- SQL Migration for Gaming PC Module Tables & Security Policies

CREATE TABLE IF NOT EXISTS "gaming_pcs" (
  "id" TEXT PRIMARY KEY,
  "pcName" TEXT NOT NULL,
  "ipAddress" TEXT,
  "macAddress" TEXT,
  "status" TEXT NOT NULL DEFAULT 'AVAILABLE',
  "currentSessionId" TEXT,
  "currentCustomerName" TEXT,
  "currentGameName" TEXT,
  "remainingSeconds" INTEGER DEFAULT 0,
  "lastHeartbeat" TEXT,
  "clientVersion" TEXT DEFAULT '1.0.0',
  "isKioskLocked" BOOLEAN DEFAULT true,
  "notes" TEXT,
  "createdAt" TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  "updatedAt" TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

CREATE TABLE IF NOT EXISTS "gaming_games" (
  "id" TEXT PRIMARY KEY,
  "name" TEXT NOT NULL,
  "executablePath" TEXT NOT NULL,
  "processName" TEXT NOT NULL,
  "launchArguments" TEXT,
  "iconUrl" TEXT,
  "isEnabled" BOOLEAN DEFAULT true,
  "category" TEXT,
  "createdAt" TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

CREATE TABLE IF NOT EXISTS "gaming_packages" (
  "id" TEXT PRIMARY KEY,
  "name" TEXT NOT NULL,
  "durationMinutes" INTEGER NOT NULL,
  "price" NUMERIC NOT NULL,
  "description" TEXT,
  "isActive" BOOLEAN DEFAULT true,
  "createdAt" TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

CREATE TABLE IF NOT EXISTS "gaming_sessions" (
  "id" TEXT PRIMARY KEY,
  "pcId" TEXT NOT NULL REFERENCES "gaming_pcs"("id") ON DELETE CASCADE,
  "customerId" TEXT,
  "customerName" TEXT NOT NULL,
  "customerPhone" TEXT,
  "packageId" TEXT NOT NULL,
  "packageName" TEXT NOT NULL,
  "gameId" TEXT,
  "gameName" TEXT,
  "paymentId" TEXT,
  "paymentRef" TEXT,
  "startTime" TEXT NOT NULL,
  "expiryTime" TEXT NOT NULL,
  "actualEndTime" TEXT,
  "durationMinutes" INTEGER NOT NULL,
  "remainingSecondsAtLastSync" INTEGER,
  "status" TEXT NOT NULL DEFAULT 'AUTHORIZED',
  "notes" TEXT,
  "createdAt" TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  "updatedAt" TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

CREATE TABLE IF NOT EXISTS "gaming_pc_events" (
  "id" TEXT PRIMARY KEY,
  "eventId" TEXT UNIQUE NOT NULL,
  "pcId" TEXT NOT NULL,
  "sessionId" TEXT,
  "eventType" TEXT NOT NULL,
  "eventData" JSONB,
  "timestamp" TEXT NOT NULL,
  "uploadedAt" TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Row Level Security
ALTER TABLE "gaming_pcs" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "gaming_games" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "gaming_packages" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "gaming_sessions" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "gaming_pc_events" ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow anonymous read gaming_pcs" ON "gaming_pcs" FOR SELECT USING (true);
CREATE POLICY "Allow anonymous insert gaming_pcs" ON "gaming_pcs" FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow anonymous update gaming_pcs" ON "gaming_pcs" FOR UPDATE USING (true);
CREATE POLICY "Allow anonymous delete gaming_pcs" ON "gaming_pcs" FOR DELETE USING (true);

CREATE POLICY "Allow anonymous read gaming_games" ON "gaming_games" FOR SELECT USING (true);
CREATE POLICY "Allow anonymous insert gaming_games" ON "gaming_games" FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow anonymous update gaming_games" ON "gaming_games" FOR UPDATE USING (true);
CREATE POLICY "Allow anonymous delete gaming_games" ON "gaming_games" FOR DELETE USING (true);

CREATE POLICY "Allow anonymous read gaming_packages" ON "gaming_packages" FOR SELECT USING (true);
CREATE POLICY "Allow anonymous insert gaming_packages" ON "gaming_packages" FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow anonymous update gaming_packages" ON "gaming_packages" FOR UPDATE USING (true);
CREATE POLICY "Allow anonymous delete gaming_packages" ON "gaming_packages" FOR DELETE USING (true);

CREATE POLICY "Allow anonymous read gaming_sessions" ON "gaming_sessions" FOR SELECT USING (true);
CREATE POLICY "Allow anonymous insert gaming_sessions" ON "gaming_sessions" FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow anonymous update gaming_sessions" ON "gaming_sessions" FOR UPDATE USING (true);
CREATE POLICY "Allow anonymous delete gaming_sessions" ON "gaming_sessions" FOR DELETE USING (true);

CREATE POLICY "Allow anonymous read gaming_pc_events" ON "gaming_pc_events" FOR SELECT USING (true);
CREATE POLICY "Allow anonymous insert gaming_pc_events" ON "gaming_pc_events" FOR INSERT WITH CHECK (true);
