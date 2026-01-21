-- CreateTable
CREATE TABLE "groups" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "title" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "setup_code" TEXT NOT NULL,
    "mode" TEXT NOT NULL DEFAULT 'JOIN_REQUEST',
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "gate_rules" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "group_id" TEXT NOT NULL,
    "gate_type" TEXT NOT NULL,
    "token_id" TEXT NOT NULL,
    "min_amount_base" TEXT,
    "min_nft_count" INTEGER,
    "decimals" INTEGER,
    "recheck_interval_sec" INTEGER NOT NULL DEFAULT 300,
    "grace_period_sec" INTEGER NOT NULL DEFAULT 300,
    "action_on_fail" TEXT NOT NULL DEFAULT 'RESTRICT',
    "verify_address" TEXT,
    "verify_min_sat" INTEGER NOT NULL DEFAULT 2000,
    "verify_max_sat" INTEGER NOT NULL DEFAULT 2999,
    "verify_expire_min" INTEGER NOT NULL DEFAULT 10,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" DATETIME NOT NULL,
    CONSTRAINT "gate_rules_group_id_fkey" FOREIGN KEY ("group_id") REFERENCES "groups" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "users" (
    "tg_user_id" TEXT NOT NULL PRIMARY KEY,
    "username" TEXT,
    "first_name" TEXT,
    "last_name" TEXT,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "user_addresses" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "tg_user_id" TEXT NOT NULL,
    "address" TEXT NOT NULL,
    "address_type" TEXT NOT NULL DEFAULT 'UNKNOWN',
    "verified" BOOLEAN NOT NULL DEFAULT false,
    "verified_at" DATETIME,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "user_addresses_tg_user_id_fkey" FOREIGN KEY ("tg_user_id") REFERENCES "users" ("tg_user_id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "verify_sessions" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "tg_user_id" TEXT NOT NULL,
    "group_id" TEXT NOT NULL,
    "address" TEXT NOT NULL,
    "method" TEXT NOT NULL DEFAULT 'MICRO_TX',
    "amount_sat" INTEGER NOT NULL,
    "verification_address" TEXT NOT NULL,
    "expires_at" DATETIME NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "txid" TEXT,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" DATETIME NOT NULL,
    CONSTRAINT "verify_sessions_tg_user_id_fkey" FOREIGN KEY ("tg_user_id") REFERENCES "users" ("tg_user_id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "verify_sessions_group_id_fkey" FOREIGN KEY ("group_id") REFERENCES "groups" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "memberships" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "tg_user_id" TEXT NOT NULL,
    "group_id" TEXT NOT NULL,
    "state" TEXT NOT NULL DEFAULT 'UNKNOWN',
    "last_balance_base" TEXT,
    "last_checked_at" DATETIME,
    "fail_detected_at" DATETIME,
    "enforced" TEXT NOT NULL DEFAULT 'NONE',
    "updated_at" DATETIME NOT NULL,
    CONSTRAINT "memberships_tg_user_id_fkey" FOREIGN KEY ("tg_user_id") REFERENCES "users" ("tg_user_id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "memberships_group_id_fkey" FOREIGN KEY ("group_id") REFERENCES "groups" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "audit_logs" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "group_id" TEXT NOT NULL,
    "tg_user_id" TEXT,
    "type" TEXT NOT NULL,
    "payload_json" TEXT NOT NULL,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "audit_logs_group_id_fkey" FOREIGN KEY ("group_id") REFERENCES "groups" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "audit_logs_tg_user_id_fkey" FOREIGN KEY ("tg_user_id") REFERENCES "users" ("tg_user_id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateIndex
CREATE INDEX "user_addresses_tg_user_id_active_idx" ON "user_addresses"("tg_user_id", "active");

-- CreateIndex
CREATE INDEX "verify_sessions_status_expires_at_idx" ON "verify_sessions"("status", "expires_at");

-- CreateIndex
CREATE INDEX "verify_sessions_group_id_amount_sat_status_idx" ON "verify_sessions"("group_id", "amount_sat", "status");

-- CreateIndex
CREATE INDEX "memberships_group_id_state_idx" ON "memberships"("group_id", "state");

-- CreateIndex
CREATE UNIQUE INDEX "memberships_tg_user_id_group_id_key" ON "memberships"("tg_user_id", "group_id");

-- CreateIndex
CREATE INDEX "audit_logs_group_id_created_at_idx" ON "audit_logs"("group_id", "created_at");

-- CreateIndex
CREATE INDEX "audit_logs_tg_user_id_created_at_idx" ON "audit_logs"("tg_user_id", "created_at");
