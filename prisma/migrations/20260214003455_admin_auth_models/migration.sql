-- CreateEnum
CREATE TYPE "AdminRole" AS ENUM ('OWNER', 'ADMIN', 'VIEWER');

-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "AuditLogType" ADD VALUE 'ADMIN_LOGIN';
ALTER TYPE "AuditLogType" ADD VALUE 'ADMIN_LOGOUT';
ALTER TYPE "AuditLogType" ADD VALUE 'ADMIN_AUTH_FAIL';
ALTER TYPE "AuditLogType" ADD VALUE 'ADMIN_AUTHZ_DENY';
ALTER TYPE "AuditLogType" ADD VALUE 'ADMIN_SESSION_REFRESH';

-- CreateTable
CREATE TABLE "admin_users" (
    "id" TEXT NOT NULL,
    "tg_user_id" TEXT NOT NULL,
    "username" TEXT,
    "first_name" TEXT,
    "last_name" TEXT,
    "photo_url" TEXT,
    "auth_provider" TEXT NOT NULL DEFAULT 'telegram',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "admin_users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "group_admins" (
    "id" TEXT NOT NULL,
    "group_id" TEXT NOT NULL,
    "admin_user_id" TEXT NOT NULL,
    "role" "AdminRole" NOT NULL DEFAULT 'VIEWER',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "group_admins_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "admin_sessions" (
    "id" TEXT NOT NULL,
    "admin_user_id" TEXT NOT NULL,
    "expires_at" TIMESTAMP(3) NOT NULL,
    "revoked_at" TIMESTAMP(3),
    "ip_address" TEXT,
    "user_agent" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "admin_sessions_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "admin_users_tg_user_id_key" ON "admin_users"("tg_user_id");

-- CreateIndex
CREATE INDEX "group_admins_admin_user_id_idx" ON "group_admins"("admin_user_id");

-- CreateIndex
CREATE UNIQUE INDEX "group_admins_group_id_admin_user_id_key" ON "group_admins"("group_id", "admin_user_id");

-- CreateIndex
CREATE INDEX "admin_sessions_admin_user_id_revoked_at_idx" ON "admin_sessions"("admin_user_id", "revoked_at");

-- CreateIndex
CREATE INDEX "admin_sessions_expires_at_idx" ON "admin_sessions"("expires_at");

-- AddForeignKey
ALTER TABLE "group_admins" ADD CONSTRAINT "group_admins_group_id_fkey" FOREIGN KEY ("group_id") REFERENCES "groups"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "group_admins" ADD CONSTRAINT "group_admins_admin_user_id_fkey" FOREIGN KEY ("admin_user_id") REFERENCES "admin_users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "admin_sessions" ADD CONSTRAINT "admin_sessions_admin_user_id_fkey" FOREIGN KEY ("admin_user_id") REFERENCES "admin_users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
