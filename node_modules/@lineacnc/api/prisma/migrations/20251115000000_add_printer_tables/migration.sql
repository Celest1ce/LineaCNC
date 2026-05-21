-- CreateTable
CREATE TABLE `printers` (
    `id` VARCHAR(36) NOT NULL,
    `uuid` VARCHAR(255) NOT NULL,
    `name` VARCHAR(255) NOT NULL,
    `user_id` INTEGER NULL,
    `connection_status` VARCHAR(50) NOT NULL DEFAULT 'disconnected',
    `last_connected` BIGINT NULL,
    `last_error` TEXT NULL,
    `created_at` BIGINT NOT NULL,
    `updated_at` BIGINT NOT NULL,

    UNIQUE INDEX `printers_uuid_key`(`uuid`),
    INDEX `printers_uuid_idx`(`uuid`),
    INDEX `idx_user_id`(`user_id`),
    INDEX `idx_connection_status`(`connection_status`),
    INDEX `idx_updated_at`(`updated_at`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `printer_configs` (
    `printer_id` VARCHAR(36) NOT NULL,
    `auto_reconnect` BOOLEAN NOT NULL DEFAULT true,
    `reconnect_delay` INTEGER NOT NULL DEFAULT 2000,
    `max_reconnect_attempts` INTEGER NOT NULL DEFAULT 5,
    `command_timeout` INTEGER NOT NULL DEFAULT 30000,
    `keep_alive_interval` INTEGER NOT NULL DEFAULT 60000,
    `serial_options` JSON NOT NULL DEFAULT ('{"baudRate": 115200, "dataBits": 8, "stopBits": 1, "parity": "none", "flowControl": "none", "bufferSize": 255}'),
    `custom_settings` JSON NULL,
    `updated_at` BIGINT NOT NULL,

    PRIMARY KEY (`printer_id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `printer_hardware` (
    `printer_id` VARCHAR(36) NOT NULL,
    `vendor_id` INTEGER NULL,
    `product_id` INTEGER NULL,
    `manufacturer` VARCHAR(255) NULL,
    `serial_number` VARCHAR(255) NULL,
    `hardware_specs` JSON NOT NULL DEFAULT ('{}'),
    `updated_at` BIGINT NOT NULL,

    INDEX `idx_vendor_product`(`vendor_id`, `product_id`),
    PRIMARY KEY (`printer_id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `printer_firmware` (
    `printer_id` VARCHAR(36) NOT NULL,
    `name` VARCHAR(255) NULL,
    `version` VARCHAR(255) NULL,
    `build_date` VARCHAR(255) NULL,
    `capabilities` JSON NOT NULL DEFAULT ('{}'),
    `updated_at` BIGINT NOT NULL,

    INDEX `idx_name_version`(`name`, `version`),
    PRIMARY KEY (`printer_id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `printer_ports` (
    `printer_id` VARCHAR(36) NOT NULL,
    `usb_vendor_id` INTEGER NULL,
    `usb_product_id` INTEGER NULL,
    `port_metadata` JSON NULL,
    `updated_at` BIGINT NOT NULL,

    INDEX `idx_usb_ids`(`usb_vendor_id`, `usb_product_id`),
    PRIMARY KEY (`printer_id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `printer_states` (
    `printer_id` VARCHAR(36) NOT NULL,
    `status` VARCHAR(100) NULL,
    `state_data` JSON NULL,
    `updated_at` BIGINT NOT NULL,

    PRIMARY KEY (`printer_id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `commands` (
    `id` VARCHAR(36) NOT NULL,
    `printer_id` VARCHAR(36) NOT NULL,
    `command` TEXT NOT NULL,
    `timestamp` BIGINT NOT NULL,
    `status` VARCHAR(50) NOT NULL DEFAULT 'pending',
    `error` TEXT NULL,
    `response` TEXT NULL,
    `execution_time` INTEGER NULL,

    INDEX `idx_printer_timestamp`(`printer_id`, `timestamp` DESC),
    INDEX `idx_status`(`status`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `logs` (
    `id` VARCHAR(36) NOT NULL,
    `printer_id` VARCHAR(36) NULL,
    `timestamp` BIGINT NOT NULL,
    `level` VARCHAR(20) NOT NULL,
    `category` VARCHAR(50) NOT NULL,
    `message` TEXT NOT NULL,
    `data` JSON NULL,

    INDEX `idx_printer_timestamp`(`printer_id`, `timestamp` DESC),
    INDEX `idx_level`(`level`),
    INDEX `idx_category`(`category`),
    INDEX `idx_timestamp`(`timestamp` DESC),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `printer_stats` (
    `printer_id` VARCHAR(36) NOT NULL,
    `total_commands` INTEGER NOT NULL DEFAULT 0,
    `successful_commands` INTEGER NOT NULL DEFAULT 0,
    `failed_commands` INTEGER NOT NULL DEFAULT 0,
    `total_errors` INTEGER NOT NULL DEFAULT 0,
    `total_connection_time` BIGINT NOT NULL DEFAULT 0,
    `average_response_time` DOUBLE NOT NULL DEFAULT 0,
    `last_activity` BIGINT NULL,
    `stats_data` JSON NULL,
    `updated_at` BIGINT NOT NULL,

    PRIMARY KEY (`printer_id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `printer_events` (
    `id` BIGINT NOT NULL AUTO_INCREMENT,
    `printer_id` VARCHAR(36) NOT NULL,
    `event_type` VARCHAR(50) NOT NULL,
    `event_data` JSON NULL,
    `timestamp` BIGINT NOT NULL,

    INDEX `idx_printer_timestamp`(`printer_id`, `timestamp` DESC),
    INDEX `idx_event_type`(`event_type`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `user_printer_preferences` (
    `user_id` INTEGER NOT NULL,
    `printer_id` VARCHAR(36) NOT NULL,
    `favorite` BOOLEAN NOT NULL DEFAULT false,
    `display_order` INTEGER NOT NULL DEFAULT 0,
    `custom_color` VARCHAR(7) NULL,
    `notes` TEXT NULL,
    `preferences` JSON NULL,

    INDEX `idx_user_favorite`(`user_id`, `favorite`),
    INDEX `idx_display_order`(`display_order`),
    PRIMARY KEY (`user_id`, `printer_id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `printer_configs` ADD CONSTRAINT `printer_configs_printer_id_fkey` FOREIGN KEY (`printer_id`) REFERENCES `printers`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `printer_hardware` ADD CONSTRAINT `printer_hardware_printer_id_fkey` FOREIGN KEY (`printer_id`) REFERENCES `printers`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `printer_firmware` ADD CONSTRAINT `printer_firmware_printer_id_fkey` FOREIGN KEY (`printer_id`) REFERENCES `printers`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `printer_ports` ADD CONSTRAINT `printer_ports_printer_id_fkey` FOREIGN KEY (`printer_id`) REFERENCES `printers`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `printer_states` ADD CONSTRAINT `printer_states_printer_id_fkey` FOREIGN KEY (`printer_id`) REFERENCES `printers`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `commands` ADD CONSTRAINT `commands_printer_id_fkey` FOREIGN KEY (`printer_id`) REFERENCES `printers`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `logs` ADD CONSTRAINT `logs_printer_id_fkey` FOREIGN KEY (`printer_id`) REFERENCES `printers`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `printer_stats` ADD CONSTRAINT `printer_stats_printer_id_fkey` FOREIGN KEY (`printer_id`) REFERENCES `printers`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `printer_events` ADD CONSTRAINT `printer_events_printer_id_fkey` FOREIGN KEY (`printer_id`) REFERENCES `printers`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `user_printer_preferences` ADD CONSTRAINT `user_printer_preferences_printer_id_fkey` FOREIGN KEY (`printer_id`) REFERENCES `printers`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
