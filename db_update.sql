-- =============================================================================
-- TikSup Platform - Database Schema Update
-- Modules: Dynamic Payout Rate (RTP) & Risk Mode Engine
-- File: db_update.sql
-- =============================================================================

-- Disable foreign key checks during migration
SET FOREIGN_KEY_CHECKS = 0;

-- -----------------------------------------------------------------------------
-- 1. Primary Table: `game_settings`
-- Stores global and per-game payout rates (10-95%) and house risk modes.
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `game_settings` (
    `id` INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    `game_key` VARCHAR(50) NOT NULL UNIQUE COMMENT 'Unique identifier for the game module, e.g. global, binary_trading, dice',
    `game_name` VARCHAR(100) NOT NULL COMMENT 'Human readable name of the game/module',
    `payout_rate` INT UNSIGNED NOT NULL DEFAULT 85 COMMENT 'Statistical RTP/Payout Percentage between 10% and 95%',
    `risk_mode` ENUM('random', 'force_win', 'force_lose', 'loss_75') NOT NULL DEFAULT 'random' COMMENT 'House outcome override mode',
    `min_bet` DECIMAL(12, 2) NOT NULL DEFAULT 1.00 COMMENT 'Minimum bet/trade amount in USDT',
    `max_bet` DECIMAL(12, 2) NOT NULL DEFAULT 1000.00 COMMENT 'Maximum bet/trade amount in USDT',
    `is_active` TINYINT(1) NOT NULL DEFAULT 1 COMMENT '1 = Active, 0 = Inactive',
    `updated_by` VARCHAR(100) NULL DEFAULT 'Admin' COMMENT 'Username or email of the admin who updated the record',
    `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    CONSTRAINT `chk_payout_rate_range` CHECK (`payout_rate` >= 10 AND `payout_rate` <= 95)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='Game Engine and Risk Control Configuration';

-- -----------------------------------------------------------------------------
-- 2. Seed Default Records
-- Initializes the global configuration row if it does not already exist.
-- -----------------------------------------------------------------------------
INSERT INTO `game_settings` (`game_key`, `game_name`, `payout_rate`, `risk_mode`, `min_bet`, `max_bet`, `updated_by`)
VALUES 
    ('global', 'Global Platform Risk & Binary Engine', 85, 'random', 1.00, 1000.00, 'System Seed')
ON DUPLICATE KEY UPDATE 
    `updated_at` = CURRENT_TIMESTAMP;

-- -----------------------------------------------------------------------------
-- 3. Alternative/Complementary: ALTER Existing `admin_settings` or `site_settings`
-- If your TikSup installation stores all general parameters in an existing table,
-- execute the following snippet.
-- -----------------------------------------------------------------------------
-- In MySQL 8.0+:
-- ALTER TABLE `admin_settings`
--     ADD COLUMN IF NOT EXISTS `payout_rate` INT UNSIGNED NOT NULL DEFAULT 85 COMMENT 'RTP Rate (10-95)',
--     ADD COLUMN IF NOT EXISTS `risk_mode` ENUM('random', 'force_win', 'force_lose', 'loss_75') NOT NULL DEFAULT 'random' COMMENT 'Risk Engine Mode';

-- -----------------------------------------------------------------------------
-- 4. Audit Trail Table: `game_settings_audit_log`
-- Records every change made to payout rates or risk modes for security & auditing.
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `game_settings_audit_log` (
    `id` BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    `game_key` VARCHAR(50) NOT NULL,
    `old_payout_rate` INT UNSIGNED NULL,
    `new_payout_rate` INT UNSIGNED NOT NULL,
    `old_risk_mode` ENUM('random', 'force_win', 'force_lose', 'loss_75') NULL,
    `new_risk_mode` ENUM('random', 'force_win', 'force_lose', 'loss_75') NOT NULL,
    `admin_id` INT UNSIGNED NULL,
    `admin_username` VARCHAR(100) NOT NULL,
    `ip_address` VARCHAR(45) NOT NULL,
    `user_agent` VARCHAR(255) NULL,
    `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX `idx_game_key` (`game_key`),
    INDEX `idx_admin_username` (`admin_username`),
    INDEX `idx_created_at` (`created_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='Audit history of admin game control adjustments';

-- -----------------------------------------------------------------------------
-- 5. Game Round Outcomes Table: `game_rounds` (Optional Integration)
-- Tracks each game/binary round, applied risk mode, and final outcome.
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `game_rounds` (
    `id` BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    `round_uuid` VARCHAR(64) NOT NULL UNIQUE,
    `user_id` INT UNSIGNED NOT NULL,
    `game_key` VARCHAR(50) NOT NULL DEFAULT 'global',
    `bet_amount` DECIMAL(12, 2) NOT NULL,
    `odds` DECIMAL(8, 4) NOT NULL DEFAULT 1.8500,
    `applied_payout_rate` INT UNSIGNED NOT NULL,
    `applied_risk_mode` ENUM('random', 'force_win', 'force_lose', 'loss_75') NOT NULL,
    `outcome` ENUM('win', 'loss') NOT NULL,
    `payout_amount` DECIMAL(12, 2) NOT NULL DEFAULT 0.00,
    `profit_amount` DECIMAL(12, 2) NOT NULL DEFAULT 0.00,
    `seed_roll` DECIMAL(6, 2) NULL,
    `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX `idx_user_rounds` (`user_id`),
    INDEX `idx_round_created` (`created_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='History of game rounds executed by users';

SET FOREIGN_KEY_CHECKS = 1;
