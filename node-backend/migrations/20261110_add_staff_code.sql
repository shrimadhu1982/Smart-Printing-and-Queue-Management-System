ALTER TABLE staff
    ADD COLUMN staff_code VARCHAR(50) NULL AFTER staff_id;

UPDATE staff
SET staff_code = CONCAT('STAFF-', staff_id)
WHERE staff_code IS NULL;

ALTER TABLE staff
    MODIFY COLUMN staff_code VARCHAR(50) NOT NULL,
    ADD UNIQUE KEY uq_staff_staff_code (staff_code);
