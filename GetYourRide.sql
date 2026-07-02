DROP DATABASE IF EXISTS getyourride;
CREATE DATABASE getyourride;
USE getyourride;

-- 1. USERS TABLE
CREATE TABLE Users (
    UserID INT AUTO_INCREMENT PRIMARY KEY,
    StudentNumber VARCHAR(20) NULL,
    fName VARCHAR(50) NOT NULL,                 
    lName VARCHAR(50) NOT NULL,                 
    Email VARCHAR(100) NOT NULL UNIQUE,
    Password VARCHAR(100) NOT NULL,
    Role VARCHAR(20) NOT NULL,                  -- 'Student', 'Driver', 'Admin', 'Coordinator'
    JoinDate DATE DEFAULT (CURDATE()),
    IsVerified TINYINT(1) DEFAULT 1,
    AverageRating DECIMAL(3,2) DEFAULT 5.00,
    TotalTrips INT DEFAULT 0,
    TotalRatingsCount INT DEFAULT 0
);

-- 2. ROUTES TABLE (Aligned to match API fields: DepartureFrom & ArrivalAt)
CREATE TABLE Routes (
    RouteID INT AUTO_INCREMENT PRIMARY KEY,
    RouteName VARCHAR(50) NOT NULL,
    DepartureFrom VARCHAR(100) NOT NULL,        -- Matched to API code
    ArrivalAt VARCHAR(100) NOT NULL,            -- Matched to API code
    DepartureTime TIME NOT NULL
);

-- 3. BOOKINGS TABLE
CREATE TABLE Bookings (
    BookingID INT AUTO_INCREMENT PRIMARY KEY,
    StudentID INT NOT NULL,
    RouteID INT NOT NULL,
    BookingDate DATE NOT NULL,
    Status VARCHAR(20) DEFAULT 'Booked',
    FOREIGN KEY (StudentID) REFERENCES Users(UserID) ON DELETE CASCADE,
    FOREIGN KEY (RouteID) REFERENCES Routes(RouteID) ON DELETE CASCADE
);

-- 4. DRIVER APPLICATIONS TABLE
CREATE TABLE DriverApplications (
    ApplicationID INT AUTO_INCREMENT PRIMARY KEY,
    UserID INT NOT NULL,
    ContactNumber VARCHAR(20) NOT NULL,
    VehicleMakeModel VARCHAR(100) NOT NULL,
    RegistrationNumber VARCHAR(30) NOT NULL,
    SeatingCapacity INT NOT NULL,
    VehicleColor VARCHAR(30) NOT NULL,
    LicenseImagePath VARCHAR(255) NOT NULL,
    RegistrationFilePath VARCHAR(255) NOT NULL,
    ApplicationStatus VARCHAR(20) DEFAULT 'Pending Review',
    FOREIGN KEY (UserID) REFERENCES Users(UserID) ON DELETE CASCADE
);

-- 5. SHUTTLES TABLE
CREATE TABLE Shuttles (
    ShuttleID INT AUTO_INCREMENT PRIMARY KEY,
    ShuttleName VARCHAR(50) NOT NULL,
    LicensePlate VARCHAR(20) NOT NULL UNIQUE,
    Capacity INT NOT NULL,
    Status VARCHAR(20) DEFAULT 'Active'
);

-- 6. SHUTTLE SCHEDULES TABLE
CREATE TABLE ShuttleSchedules (
    ScheduleID INT AUTO_INCREMENT PRIMARY KEY,
    RouteID INT NOT NULL,
    ScheduleDate DATE NOT NULL,
    DepartureTime TIME NOT NULL,
    ShuttleID INT NOT NULL,
    DriverID INT NOT NULL,
    FOREIGN KEY (RouteID) REFERENCES Routes(RouteID) ON DELETE CASCADE,
    FOREIGN KEY (ShuttleID) REFERENCES Shuttles(ShuttleID) ON DELETE CASCADE,
    FOREIGN KEY (DriverID) REFERENCES Users(UserID) ON DELETE CASCADE
);


-- ========================================================
-- SEED DATA 
-- ========================================================

-- Admins & Coordinators
INSERT INTO Users (StudentNumber, fName, lName, Email, Password, Role, IsVerified, AverageRating, TotalTrips, TotalRatingsCount)
VALUES 
(NULL, 'Admin', 'User', 'admin@getyourride.com', '1234', 'Admin', 1, 5.00, 0, 0),
(NULL, 'Shuttle', 'Coordinator', 'coord@getyourride.com', '1234', 'Coordinator', 1, 5.00, 0, 0);

-- Active Drivers
INSERT INTO Users (StudentNumber, fName, lName, Email, Password, Role, JoinDate, IsVerified, AverageRating, TotalTrips, TotalRatingsCount)
VALUES
('ID-99481', 'Nation', 'Ntuli', 'driver@ride.com', '1234', 'Driver', '2025-02-14', 1, 4.80, 142, 110),
('ID-22941', 'Jordan', 'Henderson', 'jordan@ride.com', '1234', 'Driver', '2025-01-10', 1, 4.90, 1240, 982),
('ID-88492', 'Marcus', 'Chen', 'marcus@ride.com', '1234', 'Driver', '2025-05-14', 1, 2.70, 310, 256); 

-- Pending Drivers
INSERT INTO Users (StudentNumber, fName, lName, Email, Password, Role, JoinDate, IsVerified, AverageRating, TotalTrips, TotalRatingsCount)
VALUES
('ID-99201', 'Alex', 'Thompson', 'alex@ride.com', '1234', 'Driver', '2026-06-21', 0, 5.00, 0, 0),
('ID-44310', 'Emily', 'Blunt', 'emily@ride.com', '1234', 'Driver', '2026-06-22', 0, 5.00, 0, 0),
('ID-45880', 'Lanele', 'Blunt', 'lanele@ride.com', '1234', 'Driver', '2026-06-23', 0, 5.00, 0, 0),
('ID-44510', 'Vusi', 'Blunt', 'vusumzi@ride.com', '1234', 'Driver', '2026-06-22', 0, 5.00, 0, 0);

-- Students (UserIDs: Thabo = 10, Jane = 11, Sipho = 12)
INSERT INTO Users (StudentNumber, fName, lName, Email, Password, Role) 
VALUES  
('2267898997', 'Thabo', 'Khumalo', 'thabo@ride.com', '1234', 'Student'),
('4567890', 'Jane', 'Smith', 'jane@ride.com', '1234', 'Student'),
('473683768', 'Sipho', 'Zulu', 'sipho@ride.com', '1234', 'Student');

-- Routes (Populated with location data needed by C# endpoints)
INSERT INTO Routes (RouteName, DepartureFrom, ArrivalAt, DepartureTime) 
VALUES  
('CAMPUS NORTH', 'Main Gate', 'North Residence', '08:30:00'),
('DOWNTOWN EXPRESS', 'Main Gate', 'Downtown Hub', '10:15:00'),
('MEDICAL CENTER SHUTTLE', 'South Gate', 'Medical Campus', '13:00:00');

-- Bookings 
INSERT INTO Bookings (StudentID, RouteID, BookingDate, Status) 
VALUES  
(10, 1, CURDATE(), 'Booked'),
(11, 2, CURDATE(), 'Boarded'),
(12, 3, CURDATE(), 'Cancelled');

-- Driver Applications
INSERT INTO DriverApplications (UserID, ContactNumber, VehicleMakeModel, RegistrationNumber, SeatingCapacity, VehicleColor, LicenseImagePath, RegistrationFilePath)
VALUES 
(6, '+1 (555) 902-3481', 'Toyota Camry 2022', 'CAL-992-TX', 4, 'Metallic Silver', '../assets/img/licenses/alex_license.png', '../assets/img/docs/alex_reg.png'),
(7, '+1 (555) 123-4567', 'Volkswagen Golf 2021', 'EC-332-PL', 4, 'Midnight Black', '../assets/img/licenses/emily_license.png', '../assets/img/docs/emily_reg.png'),
(8, '+1 (555) 765-4321', 'Ford Ranger 2020', 'GP-881-ZZ', 2, 'Oxford White', '../assets/img/licenses/lanele_license.png', '../assets/img/docs/lanele_reg.png'),
(9, '+1 (555) 987-6543', 'Hyundai i20 2023', 'KZN-004-WP', 4, 'Cherry Red', '../assets/img/licenses/vusi_license.png', '../assets/img/docs/vusi_reg.png');

-- Shuttles
INSERT INTO Shuttles (ShuttleName, LicensePlate, Capacity, Status) 
VALUES
('Blue Line Alpha', 'CR-99-WY-GP', 22, 'Active'),
('Campus Shuttle B', 'BZ-44-LL-GP', 15, 'Active'),
('West Campus Van', 'FX-88-TT-GP', 8, 'Maintenance');

-- ShuttleSchedules
INSERT INTO ShuttleSchedules (RouteID, ScheduleDate, DepartureTime, ShuttleID, DriverID)
VALUES 
(1, CURDATE(), '08:30:00', 1, 3), 
(2, CURDATE(), '10:15:00', 2, 4), 
(3, CURDATE(), '13:00:00', 1, 5);
-- 1. Drop it and recreate it to make sure it exists perfectly
DROP TABLE IF EXISTS Bookings;

CREATE TABLE Bookings (
    BookingID INT AUTO_INCREMENT PRIMARY KEY,
    StudentID INT NOT NULL,
    ScheduleID INT NOT NULL,                     
    BookingDate DATE NOT NULL,
    Status VARCHAR(20) DEFAULT 'Booked',
    FOREIGN KEY (StudentID) REFERENCES Users(UserID) ON DELETE CASCADE,
    FOREIGN KEY (ScheduleID) REFERENCES ShuttleSchedules(ScheduleID) ON DELETE CASCADE
);

-- 2. Insert with the exact matching columns and values (4 columns, 4 values)
INSERT INTO Bookings (StudentID, ScheduleID, BookingDate, Status) 
VALUES  
(10, 1, CURDATE(), 'Booked'), 
(11, 2, CURDATE(), 'Boarded'),
(12, 3, CURDATE(), 'Cancelled');


-- Verification Check Output
SHOW TABLES;
SELECT UserID, fName, lName, Role FROM Users;
SELECT RouteID, RouteName, DepartureFrom, ArrivalAt FROM Routes;
SELECT * FROM Bookings;