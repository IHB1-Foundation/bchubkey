-- CreateEnum
CREATE TYPE "GroupMode" AS ENUM ('JOIN_REQUEST', 'RESTRICT');

-- CreateEnum
CREATE TYPE "GroupStatus" AS ENUM ('ACTIVE', 'PAUSED');

-- CreateEnum
CREATE TYPE "GateType" AS ENUM ('FT', 'NFT');

-- CreateEnum
CREATE TYPE "ActionOnFail" AS ENUM ('RESTRICT', 'KICK');

-- CreateEnum
CREATE TYPE "AddressType" AS ENUM ('P2PKH', 'P2SH', 'UNKNOWN');

-- CreateEnum
CREATE TYPE "VerifyMethod" AS ENUM ('MICRO_TX', 'SIGNATURE');

-- CreateEnum
CREATE TYPE "VerifySessionStatus" AS ENUM ('PENDING', 'SUCCESS', 'FAILED', 'EXPIRED');

-- CreateEnum
CREATE TYPE "MembershipState" AS ENUM ('UNKNOWN', 'PENDING_VERIFY', 'VERIFIED_FAIL', 'VERIFIED_PASS');

-- CreateEnum
CREATE TYPE "EnforcedStatus" AS ENUM ('NONE', 'RESTRICTED', 'KICKED');

-- CreateEnum
CREATE TYPE "AuditLogType" AS ENUM ('SETUP', 'VERIFY_START', 'VERIFY_SUCCESS', 'VERIFY_FAILED', 'VERIFY_EXPIRED', 'GATE_PASS', 'GATE_FAIL', 'RESTRICT', 'UNRESTRICT', 'KICK', 'RECHECK', 'GRACE_START', 'GRACE_EXPIRED', 'ERROR');

-- CreateTable
CREATE TABLE "groups" (
    "id" TEXT NOT NULL,
    "title" VARCHAR(255) NOT NULL,
    "type" TEXT NOT NULL,
    "setup_code" TEXT NOT NULL,
    "mode" "GroupMode" NOT NULL DEFAULT 'JOIN_REQUEST',
    "status" "GroupStatus" NOT NULL DEFAULT 'ACTIVE',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "groups_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "gate_rules" (
    "id" TEXT NOT NULL,
    "group_id" TEXT NOT NULL,
    "gate_type" "GateType" NOT NULL,
    "token_id" TEXT NOT NULL,
    "min_amount_base" TEXT,
    "min_nft_count" INTEGER,
    "decimals" INTEGER,
    "recheck_interval_sec" INTEGER NOT NULL DEFAULT 300,
    "grace_period_sec" INTEGER NOT NULL DEFAULT 300,
    "action_on_fail" "ActionOnFail" NOT NULL DEFAULT 'RESTRICT',
    "verify_address" TEXT,
    "verify_min_sat" INTEGER NOT NULL DEFAULT 2000,
    "verify_max_sat" INTEGER NOT NULL DEFAULT 2999,
    "verify_expire_min" INTEGER NOT NULL DEFAULT 10,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "gate_rules_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "users" (
    "tg_user_id" TEXT NOT NULL,
    "username" TEXT,
    "first_name" TEXT,
    "last_name" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "users_pkey" PRIMARY KEY ("tg_user_id")
);

-- CreateTable
CREATE TABLE "user_addresses" (
    "id" TEXT NOT NULL,
    "tg_user_id" TEXT NOT NULL,
    "address" TEXT NOT NULL,
    "address_type" "AddressType" NOT NULL DEFAULT 'UNKNOWN',
    "verified" BOOLEAN NOT NULL DEFAULT false,
    "verified_at" TIMESTAMP(3),
    "active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "user_addresses_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "verify_sessions" (
    "id" TEXT NOT NULL,
    "tg_user_id" TEXT NOT NULL,
    "group_id" TEXT NOT NULL,
    "address" TEXT NOT NULL,
    "method" "VerifyMethod" NOT NULL DEFAULT 'MICRO_TX',
    "amount_sat" INTEGER NOT NULL,
    "verification_address" TEXT NOT NULL,
    "expires_at" TIMESTAMP(3) NOT NULL,
    "status" "VerifySessionStatus" NOT NULL DEFAULT 'PENDING',
    "txid" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "verify_sessions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "memberships" (
    "id" TEXT NOT NULL,
    "tg_user_id" TEXT NOT NULL,
    "group_id" TEXT NOT NULL,
    "state" "MembershipState" NOT NULL DEFAULT 'UNKNOWN',
    "last_balance_base" TEXT,
    "last_checked_at" TIMESTAMP(3),
    "fail_detected_at" TIMESTAMP(3),
    "enforced" "EnforcedStatus" NOT NULL DEFAULT 'NONE',
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "memberships_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "audit_logs" (
    "id" TEXT NOT NULL,
    "group_id" TEXT NOT NULL,
    "tg_user_id" TEXT,
    "type" "AuditLogType" NOT NULL,
    "payload_json" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "audit_logs_pkey" PRIMARY KEY ("id")
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

-- AddForeignKey
ALTER TABLE "gate_rules" ADD CONSTRAINT "gate_rules_group_id_fkey" FOREIGN KEY ("group_id") REFERENCES "groups"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_addresses" ADD CONSTRAINT "user_addresses_tg_user_id_fkey" FOREIGN KEY ("tg_user_id") REFERENCES "users"("tg_user_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "verify_sessions" ADD CONSTRAINT "verify_sessions_tg_user_id_fkey" FOREIGN KEY ("tg_user_id") REFERENCES "users"("tg_user_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "verify_sessions" ADD CONSTRAINT "verify_sessions_group_id_fkey" FOREIGN KEY ("group_id") REFERENCES "groups"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "memberships" ADD CONSTRAINT "memberships_tg_user_id_fkey" FOREIGN KEY ("tg_user_id") REFERENCES "users"("tg_user_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "memberships" ADD CONSTRAINT "memberships_group_id_fkey" FOREIGN KEY ("group_id") REFERENCES "groups"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_group_id_fkey" FOREIGN KEY ("group_id") REFERENCES "groups"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_tg_user_id_fkey" FOREIGN KEY ("tg_user_id") REFERENCES "users"("tg_user_id") ON DELETE SET NULL ON UPDATE CASCADE;
