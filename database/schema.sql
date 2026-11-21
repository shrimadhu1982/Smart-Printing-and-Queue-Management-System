-- ====================================================================
-- Smart Printing and Queue Management System for College Campuses
-- Target RDBMS: MySQL 8.0+
-- Database Name: smart_printing_db
-- ====================================================================

-- 1. Create and switch to target database
CREATE DATABASE IF NOT EXISTS `smart_printing_db`
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;

USE `smart_printing_db`;

-- 2. Drop dependent tables in reverse order of foreign key relationships
DROP TABLE IF EXISTS `notifications`;
DROP TABLE IF EXISTS `queue`;
DROP TABLE IF EXISTS `print_orders`;
DROP TABLE IF EXISTS `print_settings`;
DROP TABLE IF EXISTS `documents`;
DROP TABLE IF EXISTS `printing_prices`;
DROP TABLE IF EXISTS `students`;
DROP TABLE IF EXISTS `staff`;
DROP TABLE IF EXISTS `admins`;

-- ====================================================================
-- Table 1: admins
-- Purpose: System-level administrators managing pricing, staff, students, and reports.
-- ====================================================================
CREATE TABLE `admins` (
    `admin_id` INT AUTO_INCREMENT PRIMARY KEY,
    `full_name` VARCHAR(100) NOT NULL,
    `email` VARCHAR(100) NOT NULL UNIQUE,
    `password_hash` VARCHAR(255) NOT NULL,
    `role` VARCHAR(20) NOT NULL DEFAULT 'admin',
    `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    INDEX `idx_admin_email` (`email`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ====================================================================
-- Table 2: staff
-- Purpose: Print counter operators reviewing and fulfilling print jobs.
-- ====================================================================
CREATE TABLE `staff` (
    `staff_id` INT AUTO_INCREMENT PRIMARY KEY,
    `staff_code` VARCHAR(50) NOT NULL UNIQUE,
    `full_name` VARCHAR(100) NOT NULL,
    `email` VARCHAR(100) NOT NULL UNIQUE,
    `password_hash` VARCHAR(255) NOT NULL,
    `phone` VARCHAR(20) NULL,
    `counter_number` VARCHAR(50) NOT NULL DEFAULT 'Counter 1',
    `role` VARCHAR(20) NOT NULL DEFAULT 'staff',
    `is_active` BOOLEAN NOT NULL DEFAULT TRUE,
    `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    INDEX `idx_staff_email` (`email`),
    INDEX `idx_staff_active` (`is_active`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ====================================================================
-- Table 3: students
-- Purpose: Registered college students placing print requests.
-- ====================================================================
CREATE TABLE `students` (
    `student_id` INT AUTO_INCREMENT PRIMARY KEY,
    `roll_number` VARCHAR(50) NOT NULL UNIQUE,
    `full_name` VARCHAR(100) NOT NULL,
    `email` VARCHAR(100) NOT NULL UNIQUE,
    `phone` VARCHAR(20) NULL,
    `department` VARCHAR(100) NOT NULL,
    `semester` VARCHAR(20) NOT NULL DEFAULT 'Semester 4',
    `password_hash` VARCHAR(255) NOT NULL,
    `role` VARCHAR(20) NOT NULL DEFAULT 'student',
    `is_active` BOOLEAN NOT NULL DEFAULT TRUE,
    `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    INDEX `idx_student_roll` (`roll_number`),
    INDEX `idx_student_email` (`email`),
    INDEX `idx_student_department` (`department`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ====================================================================
-- Table 4: documents
-- Purpose: Uploaded PDF files with metadata (file paths, page counts).
-- Files are stored on the server filesystem, NOT as binary BLOBs.
-- ====================================================================
CREATE TABLE `documents` (
    `document_id` INT AUTO_INCREMENT PRIMARY KEY,
    `student_id` INT NOT NULL,
    `original_filename` VARCHAR(255) NOT NULL,
    `stored_filename` VARCHAR(255) NOT NULL,
    `file_path` VARCHAR(500) NOT NULL,
    `file_size_bytes` INT NOT NULL,
    `total_pages` INT NOT NULL DEFAULT 1,
    `mime_type` VARCHAR(100) NOT NULL DEFAULT 'application/pdf',
    `uploaded_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    INDEX `idx_documents_student` (`student_id`),
    CONSTRAINT `fk_documents_student`
        FOREIGN KEY (`student_id`) REFERENCES `students` (`student_id`)
        ON DELETE CASCADE
        ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ====================================================================
-- Table 5: print_settings
-- Purpose: Specific user print preferences configured for an order.
-- ====================================================================
CREATE TABLE `print_settings` (
    `setting_id` INT AUTO_INCREMENT PRIMARY KEY,
    `color_mode` ENUM('bw', 'color') NOT NULL DEFAULT 'bw',
    `sides` ENUM('single', 'double') NOT NULL DEFAULT 'single',
    `copies` INT NOT NULL DEFAULT 1,
    `paper_size` ENUM('A4', 'A3') NOT NULL DEFAULT 'A4',
    `paper_type` ENUM('standard', 'premium', 'glossy') NOT NULL DEFAULT 'standard',
    `orientation` ENUM('portrait', 'landscape') NOT NULL DEFAULT 'portrait',
    `page_range` VARCHAR(100) NOT NULL DEFAULT 'all',
    `binding_type` ENUM('none', 'staple', 'spiral', 'hardbound') NOT NULL DEFAULT 'none',
    `pages_to_print` INT NOT NULL DEFAULT 1,
    `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ====================================================================
-- Table 6: print_orders
-- Purpose: Core print job records linking student, document, settings, and fulfilling staff.
-- ====================================================================
CREATE TABLE `print_orders` (
    `order_id` INT AUTO_INCREMENT PRIMARY KEY,
    `order_code` VARCHAR(50) NOT NULL UNIQUE,
    `student_id` INT NOT NULL,
    `document_id` INT NOT NULL,
    `setting_id` INT NOT NULL,
    `total_pages_billed` INT NOT NULL,
    `base_price_per_page` DECIMAL(8,2) NOT NULL DEFAULT 2.00,
    `color_surcharge` DECIMAL(8,2) NOT NULL DEFAULT 0.00,
    `paper_surcharge` DECIMAL(8,2) NOT NULL DEFAULT 0.00,
    `binding_price` DECIMAL(8,2) NOT NULL DEFAULT 0.00,
    `total_price` DECIMAL(10,2) NOT NULL,
    `status` ENUM('Pending', 'Accepted', 'Printing', 'Completed', 'Rejected', 'Cancelled') NOT NULL DEFAULT 'Pending',
    `rejection_reason` TEXT NULL,
    `special_instructions` TEXT NULL,
    `processed_by_staff_id` INT NULL,
    `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    `updated_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    `completed_at` TIMESTAMP NULL,
    INDEX `idx_orders_student` (`student_id`),
    INDEX `idx_orders_status` (`status`),
    INDEX `idx_orders_staff` (`processed_by_staff_id`),
    INDEX `idx_orders_created` (`created_at`),
    CONSTRAINT `fk_orders_student`
        FOREIGN KEY (`student_id`) REFERENCES `students` (`student_id`)
        ON DELETE CASCADE
        ON UPDATE CASCADE,
    CONSTRAINT `fk_orders_document`
        FOREIGN KEY (`document_id`) REFERENCES `documents` (`document_id`)
        ON DELETE CASCADE
        ON UPDATE CASCADE,
    CONSTRAINT `fk_orders_settings`
        FOREIGN KEY (`setting_id`) REFERENCES `print_settings` (`setting_id`)
        ON DELETE CASCADE
        ON UPDATE CASCADE,
    CONSTRAINT `fk_orders_staff`
        FOREIGN KEY (`processed_by_staff_id`) REFERENCES `staff` (`staff_id`)
        ON DELETE SET NULL
        ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ====================================================================
-- Table 7: queue
-- Purpose: Live active print queue tracking positions and dynamic waiting estimates.
-- ====================================================================
CREATE TABLE `queue` (
    `queue_id` INT AUTO_INCREMENT PRIMARY KEY,
    `order_id` INT NOT NULL UNIQUE,
    `position` INT NOT NULL,
    `estimated_wait_minutes` INT NOT NULL DEFAULT 5,
    `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    `updated_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX `idx_queue_position` (`position`),
    CONSTRAINT `fk_queue_order`
        FOREIGN KEY (`order_id`) REFERENCES `print_orders` (`order_id`)
        ON DELETE CASCADE
        ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ====================================================================
-- Table 8: printing_prices
-- Purpose: Configurable pricing rates managed by administrator.
-- ====================================================================
CREATE TABLE `printing_prices` (
    `price_id` INT AUTO_INCREMENT PRIMARY KEY,
    `category` VARCHAR(50) NOT NULL UNIQUE,
    `display_name` VARCHAR(100) NOT NULL,
    `unit_price` DECIMAL(8,2) NOT NULL,
    `description` VARCHAR(255) NULL,
    `updated_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX `idx_pricing_category` (`category`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ====================================================================
-- Table 9: notifications
-- Purpose: Real-time user notification messages triggered on order state changes.
-- ====================================================================
CREATE TABLE `notifications` (
    `notification_id` INT AUTO_INCREMENT PRIMARY KEY,
    `recipient_role` ENUM('student', 'staff', 'admin') NOT NULL,
    `recipient_id` INT NOT NULL,
    `order_id` INT NULL,
    `title` VARCHAR(150) NOT NULL,
    `message` TEXT NOT NULL,
    `is_read` BOOLEAN NOT NULL DEFAULT FALSE,
    `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    INDEX `idx_notif_recipient` (`recipient_role`, `recipient_id`, `is_read`),
    CONSTRAINT `fk_notifications_order`
        FOREIGN KEY (`order_id`) REFERENCES `print_orders` (`order_id`)
        ON DELETE SET NULL
        ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ====================================================================
-- INITIAL SEED DATA
-- Default Passwords:
-- Admin:   admin123   (Werkzeug Scrypt hash)
-- Staff:   staff123   (Werkzeug Scrypt hash)
-- Student: student123 (Werkzeug Scrypt hash)
-- ====================================================================

-- 1. Default Printing Prices
INSERT INTO `printing_prices` (`category`, `display_name`, `unit_price`, `description`) VALUES
('bw_single', 'B&W Single Sided (A4)', 2.00, 'Standard Black and White print per page'),
('bw_double', 'B&W Double Sided (A4)', 1.50, 'Discounted per side cost for eco-friendly duplex'),
('color_single', 'Color Single Sided (A4)', 8.00, 'High quality laser color print per page'),
('color_double', 'Color Double Sided (A4)', 7.00, 'High quality color print on both sides per side'),
('a3_multiplier', 'A3 Paper Multiplier', 2.00, 'Multiplier factor applied for A3 larger sheet'),
('paper_standard', 'Standard 75gsm Paper', 0.00, 'Standard regular 75gsm bond paper'),
('paper_premium', 'Premium 100gsm Paper', 2.00, 'Thick 100gsm smooth bond paper per sheet'),
('paper_glossy', 'Glossy Photo / Cardstock', 5.00, '200gsm high gloss cardstock per sheet'),
('bind_none', 'No Binding', 0.00, 'Loose printed sheets'),
('bind_staple', 'Corner / Side Stapling', 5.00, 'Heavy-duty industrial staples'),
('bind_spiral', 'Spiral / Comb Binding', 30.00, 'Plastic spiral binding with transparent PVC front cover'),
('bind_hardbound', 'Hard Cover Project Binding', 150.00, 'Gold embossed hardbound thesis cover');

-- 2. Default System Administrator (admin@campus.edu / admin123)
INSERT INTO `admins` (`full_name`, `email`, `password_hash`, `role`) VALUES
('Campus Print Admin', 'admin@campus.edu', 'scrypt:32768:8:1$rPNAbGIDWdZnOAk9$fa96eca048dae77c8582670337a3b3a97867c02cce16dcbf5d1b880f3b9ec2df4ebbdb9c729e497d8b73f1a3d39348a68a4b2ed236e9128623bfa789ec7fc418', 'admin');

-- 3. Default Counter Staff Operators (staff@campus.edu / staff123)
INSERT INTO `staff` (`full_name`, `email`, `password_hash`, `phone`, `counter_number`, `role`, `is_active`) VALUES
('David Miller', 'staff@campus.edu', 'scrypt:32768:8:1$F6AIB8jsmIan9sqR$843a57a8de4165574fe1adc1c3ae8b9040952b5804805e74be4163d8fe36b66534b7248a61879a968aad2a7ebe0719dc49105b8159653f68910a649a929c97ae', '+91 9876543210', 'Counter 1 (Main Library)', 'staff', TRUE),
('Sarah Jenkins', 'staff2@campus.edu', 'scrypt:32768:8:1$F6AIB8jsmIan9sqR$843a57a8de4165574fe1adc1c3ae8b9040952b5804805e74be4163d8fe36b66534b7248a61879a968aad2a7ebe0719dc49105b8159653f68910a649a929c97ae', '+91 9876543211', 'Counter 2 (Engineering Block)', 'staff', TRUE);

-- 4. Default Sample Students (student@campus.edu / student123)
INSERT INTO `students` (`roll_number`, `full_name`, `email`, `phone`, `department`, `semester`, `password_hash`, `role`, `is_active`) VALUES
('2024CS101', 'Alex Johnson', 'student@campus.edu', '+91 9123456780', 'Computer Science & Engineering', 'Semester 6', 'scrypt:32768:8:1$uVNtf90BcUKIONF4$7c11f838ef787bbb7797c35b318c5538ec093625d61cc28ba8e50e0798a78f571357cdcd49aa7f4d239f34a07d6f9e024ddbc2f6bc5fcfff3f4c7fa79ba923e9', 'student', TRUE),
('2024EC204', 'Emily Davis', 'emily@campus.edu', '+91 9123456781', 'Electronics & Communication', 'Semester 4', 'scrypt:32768:8:1$uVNtf90BcUKIONF4$7c11f838ef787bbb7797c35b318c5538ec093625d61cc28ba8e50e0798a78f571357cdcd49aa7f4d239f34a07d6f9e024ddbc2f6bc5fcfff3f4c7fa79ba923e9', 'student', TRUE);
