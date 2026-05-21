-- CreateTable
CREATE TABLE `parameter_definitions` (
    `id` VARCHAR(100) NOT NULL,
    `parameter_key` VARCHAR(100) NOT NULL,
    `parameter_type` VARCHAR(20) NOT NULL,
    `default_value` JSON NULL,
    `min_value` DOUBLE NULL,
    `max_value` DOUBLE NULL,
    `category` VARCHAR(50) NULL,
    `display_order` INTEGER NOT NULL DEFAULT 0,
    `created_at` BIGINT NOT NULL,
    `updated_at` BIGINT NOT NULL,

    UNIQUE INDEX `parameter_definitions_parameter_key_key`(`parameter_key`),
    INDEX `idx_category`(`category`),
    INDEX `idx_display_order`(`display_order`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `printer_parameters` (
    `user_id` INTEGER NOT NULL,
    `printer_id` VARCHAR(36) NOT NULL,
    `parameter_id` VARCHAR(100) NOT NULL,
    `value` JSON NOT NULL,
    `updated_at` BIGINT NOT NULL,

    INDEX `idx_printer_id`(`printer_id`),
    INDEX `idx_parameter_id`(`parameter_id`),
    PRIMARY KEY (`user_id`, `printer_id`, `parameter_id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `printer_parameters` ADD CONSTRAINT `printer_parameters_printer_id_fkey` FOREIGN KEY (`printer_id`) REFERENCES `printers`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `printer_parameters` ADD CONSTRAINT `printer_parameters_parameter_id_fkey` FOREIGN KEY (`parameter_id`) REFERENCES `parameter_definitions`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
