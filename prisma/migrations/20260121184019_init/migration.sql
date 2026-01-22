-- CreateTable
CREATE TABLE `groups` (
    `id` VARCHAR(191) NOT NULL,
    `title` VARCHAR(255) NOT NULL,
    `type` VARCHAR(191) NOT NULL,
    `setup_code` VARCHAR(191) NOT NULL,
    `mode` ENUM('JOIN_REQUEST', 'RESTRICT') NOT NULL DEFAULT 'JOIN_REQUEST',
    `status` ENUM('ACTIVE', 'PAUSED') NOT NULL DEFAULT 'ACTIVE',
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `gate_rules` (
    `id` VARCHAR(191) NOT NULL,
    `group_id` VARCHAR(191) NOT NULL,
    `gate_type` ENUM('FT', 'NFT') NOT NULL,
    `token_id` VARCHAR(191) NOT NULL,
    `min_amount_base` VARCHAR(191) NULL,
    `min_nft_count` INTEGER NULL,
    `decimals` INTEGER NULL,
    `recheck_interval_sec` INTEGER NOT NULL DEFAULT 300,
    `grace_period_sec` INTEGER NOT NULL DEFAULT 300,
    `action_on_fail` ENUM('RESTRICT', 'KICK') NOT NULL DEFAULT 'RESTRICT',
    `verify_address` VARCHAR(191) NULL,
    `verify_min_sat` INTEGER NOT NULL DEFAULT 2000,
    `verify_max_sat` INTEGER NOT NULL DEFAULT 2999,
    `verify_expire_min` INTEGER NOT NULL DEFAULT 10,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `users` (
    `tg_user_id` VARCHAR(191) NOT NULL,
    `username` VARCHAR(191) NULL,
    `first_name` VARCHAR(191) NULL,
    `last_name` VARCHAR(191) NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    PRIMARY KEY (`tg_user_id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `user_addresses` (
    `id` VARCHAR(191) NOT NULL,
    `tg_user_id` VARCHAR(191) NOT NULL,
    `address` VARCHAR(191) NOT NULL,
    `address_type` ENUM('P2PKH', 'P2SH', 'UNKNOWN') NOT NULL DEFAULT 'UNKNOWN',
    `verified` BOOLEAN NOT NULL DEFAULT false,
    `verified_at` DATETIME(3) NULL,
    `active` BOOLEAN NOT NULL DEFAULT true,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `verify_sessions` (
    `id` VARCHAR(191) NOT NULL,
    `tg_user_id` VARCHAR(191) NOT NULL,
    `group_id` VARCHAR(191) NOT NULL,
    `address` VARCHAR(191) NOT NULL,
    `method` ENUM('MICRO_TX', 'SIGNATURE') NOT NULL DEFAULT 'MICRO_TX',
    `amount_sat` INTEGER NOT NULL,
    `verification_address` VARCHAR(191) NOT NULL,
    `expires_at` DATETIME(3) NOT NULL,
    `status` ENUM('PENDING', 'SUCCESS', 'FAILED', 'EXPIRED') NOT NULL DEFAULT 'PENDING',
    `txid` VARCHAR(191) NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `memberships` (
    `id` VARCHAR(191) NOT NULL,
    `tg_user_id` VARCHAR(191) NOT NULL,
    `group_id` VARCHAR(191) NOT NULL,
    `state` ENUM('UNKNOWN', 'PENDING_VERIFY', 'VERIFIED_FAIL', 'VERIFIED_PASS') NOT NULL DEFAULT 'UNKNOWN',
    `last_balance_base` VARCHAR(191) NULL,
    `last_checked_at` DATETIME(3) NULL,
    `fail_detected_at` DATETIME(3) NULL,
    `enforced` ENUM('NONE', 'RESTRICTED', 'KICKED') NOT NULL DEFAULT 'NONE',
    `updated_at` DATETIME(3) NOT NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `audit_logs` (
    `id` VARCHAR(191) NOT NULL,
    `group_id` VARCHAR(191) NOT NULL,
    `tg_user_id` VARCHAR(191) NULL,
    `type` ENUM('SETUP', 'VERIFY_START', 'VERIFY_SUCCESS', 'VERIFY_FAILED', 'VERIFY_EXPIRED', 'GATE_PASS', 'GATE_FAIL', 'RESTRICT', 'UNRESTRICT', 'KICK', 'RECHECK', 'GRACE_START', 'GRACE_EXPIRED', 'ERROR') NOT NULL,
    `payload_json` LONGTEXT NOT NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateIndex
CREATE INDEX `user_addresses_tg_user_id_active_idx` ON `user_addresses`(`tg_user_id`, `active`);

-- CreateIndex
CREATE INDEX `verify_sessions_status_expires_at_idx` ON `verify_sessions`(`status`, `expires_at`);

-- CreateIndex
CREATE INDEX `verify_sessions_group_id_amount_sat_status_idx` ON `verify_sessions`(`group_id`, `amount_sat`, `status`);

-- CreateIndex
CREATE INDEX `memberships_group_id_state_idx` ON `memberships`(`group_id`, `state`);

-- CreateIndex
CREATE UNIQUE INDEX `memberships_tg_user_id_group_id_key` ON `memberships`(`tg_user_id`, `group_id`);

-- CreateIndex
CREATE INDEX `audit_logs_group_id_created_at_idx` ON `audit_logs`(`group_id`, `created_at`);

-- CreateIndex
CREATE INDEX `audit_logs_tg_user_id_created_at_idx` ON `audit_logs`(`tg_user_id`, `created_at`);

-- AddForeignKey
ALTER TABLE `gate_rules` ADD CONSTRAINT `gate_rules_group_id_fkey` FOREIGN KEY (`group_id`) REFERENCES `groups`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `user_addresses` ADD CONSTRAINT `user_addresses_tg_user_id_fkey` FOREIGN KEY (`tg_user_id`) REFERENCES `users`(`tg_user_id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `verify_sessions` ADD CONSTRAINT `verify_sessions_tg_user_id_fkey` FOREIGN KEY (`tg_user_id`) REFERENCES `users`(`tg_user_id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `verify_sessions` ADD CONSTRAINT `verify_sessions_group_id_fkey` FOREIGN KEY (`group_id`) REFERENCES `groups`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `memberships` ADD CONSTRAINT `memberships_tg_user_id_fkey` FOREIGN KEY (`tg_user_id`) REFERENCES `users`(`tg_user_id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `memberships` ADD CONSTRAINT `memberships_group_id_fkey` FOREIGN KEY (`group_id`) REFERENCES `groups`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `audit_logs` ADD CONSTRAINT `audit_logs_group_id_fkey` FOREIGN KEY (`group_id`) REFERENCES `groups`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `audit_logs` ADD CONSTRAINT `audit_logs_tg_user_id_fkey` FOREIGN KEY (`tg_user_id`) REFERENCES `users`(`tg_user_id`) ON DELETE SET NULL ON UPDATE CASCADE;
