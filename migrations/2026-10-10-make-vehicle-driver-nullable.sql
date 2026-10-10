-- Make vehicle.driver_id nullable and default to NULL
-- Run this against your MySQL database for the GetYourRideWeb project.

ALTER TABLE vehicle
	MODIFY COLUMN driver_id INT NULL DEFAULT NULL;

-- If the foreign key constraint prevents NULLs, you may need to drop and recreate it.
-- Replace `fk_vehicle_driver` with your actual FK name if different.

-- Example to drop and recreate (ensure you use correct FK and index names):
-- ALTER TABLE vehicle DROP FOREIGN KEY fk_vehicle_driver;
-- ALTER TABLE vehicle
--     MODIFY COLUMN driver_id INT NULL DEFAULT NULL;
-- ALTER TABLE vehicle
--     ADD CONSTRAINT fk_vehicle_driver FOREIGN KEY (driver_id) REFERENCES driver(driver_id) ON DELETE SET NULL ON UPDATE CASCADE;

-- To apply: from your MySQL client run:
-- mysql -u <user> -p <database_name> < migrations/2026-10-10-make-vehicle-driver-nullable.sql

-- Or, if you prefer to execute interactively, connect and run the ALTER TABLE statements shown above.
