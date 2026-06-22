DROP DATABASE IF EXISTS getyourride;
CREATE DATABASE getyourride;
USE getyourride;

CREATE TABLE Users (
    UserID INT AUTO_INCREMENT PRIMARY KEY,
    FullName VARCHAR(100) NOT NULL,
    Email VARCHAR(100) NOT NULL UNIQUE,
    Password VARCHAR(100) NOT NULL,
    Role VARCHAR(20) NOT NULL
);

INSERT INTO Users (FullName, Email, Password, Role)
VALUES 
('Admin User', 'admin@getyourride.com', '1234', 'Admin'),
('Shuttle Coordinator', 'coord@getyourride.com', '1234', 'Coordinator'),
('Driver One','driver@ride.com','1234','driver');
SELECT * FROM Users;
SHOW TABLES;
SHOW TABLES;