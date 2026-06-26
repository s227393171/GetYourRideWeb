DROP DATABASE IF EXISTS getyourride;
CREATE DATABASE getyourride;
USE getyourride;

CREATE TABLE Users (
    UserID INT AUTO_INCREMENT PRIMARY KEY,
    StudentNumber VARCHAR(20) NULL,
    FullName VARCHAR(100) NOT NULL,
    Email VARCHAR(100) NOT NULL UNIQUE,
    Password VARCHAR(100) NOT NULL,
    Role VARCHAR(20) NOT NULL,
    JoinDate DATE DEFAULT (CURDATE()),
    IsVerified TINYINT(1) DEFAULT 1,
    AverageRating DECIMAL(3,2) DEFAULT 5.00,
    TotalTrips INT DEFAULT 0,
    TotalRatingsCount INT DEFAULT 0
);

CREATE TABLE Routes (
    RouteID INT AUTO_INCREMENT PRIMARY KEY,
    RouteName VARCHAR(50) NOT NULL,
    DepartureTime TIME NOT NULL
);


CREATE TABLE Bookings (
    BookingID INT AUTO_INCREMENT PRIMARY KEY,
    StudentID INT NOT NULL,
    RouteID INT NOT NULL,
    BookingDate DATE NOT NULL,
    Status VARCHAR(20) DEFAULT 'Booked',
    FOREIGN KEY (StudentID) REFERENCES Users(UserID) ON DELETE CASCADE,
    FOREIGN KEY (RouteID) REFERENCES Routes(RouteID) ON DELETE CASCADE
);


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


CREATE TABLE Shuttles (
    ShuttleID INT AUTO_INCREMENT PRIMARY KEY,
    ShuttleName VARCHAR(50) NOT NULL,
    LicensePlate VARCHAR(20) NOT NULL UNIQUE,
    Capacity INT NOT NULL,
    Status VARCHAR(20) DEFAULT 'Active'
);


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



INSERT INTO Users (StudentNumber, FullName, Email, Password, Role, IsVerified, AverageRating, TotalTrips, TotalRatingsCount)
VALUES 
(NULL, 'Admin User', 'admin@getyourride.com', '1234', 'Admin', 1, 5.00, 0, 0),
(NULL, 'Shuttle Coordinator', 'coord@getyourride.com', '1234', 'Coordinator', 1, 5.00, 0, 0);


INSERT INTO Users (StudentNumber, FullName, Email, Password, Role, JoinDate, IsVerified, AverageRating, TotalTrips, TotalRatingsCount)
VALUES
('ID-99481', 'Nation Ntuli', 'driver@ride.com', '1234', 'driver', '2025-02-14', 1, 4.80, 142, 110),
('ID-22941', 'Jordan Henderson', 'jordan@ride.com', '1234', 'driver', '2025-01-10', 1, 4.90, 1240, 982),
('ID-88492', 'Marcus Chen', 'marcus@ride.com', '1234', 'driver', '2025-05-14', 1, 2.70, 310, 256); 


INSERT INTO Users (StudentNumber, FullName, Email, Password, Role, JoinDate, IsVerified, AverageRating, TotalTrips, TotalRatingsCount)
VALUES
('ID-99201', 'Alex Thompson', 'alex@ride.com', '1234', 'driver', '2026-06-21', 0, 5.00, 0, 0),
('ID-44310', 'Emily Blunt', 'emily@ride.com', '1234', 'driver', '2026-06-22', 0, 5.00, 0, 0),
('ID-45880', 'lanele Blunt', 'lanele@ride.com', '1234', 'driver', '2026-06-23', 0, 5.00, 0, 0),
('ID-44510', 'vusi Blunt', 'vusumzi@ride.com', '1234', 'driver', '2026-06-22', 0, 5.00, 0, 0);

INSERT INTO Users (StudentNumber, FullName, Email, Password, Role) 
VALUES  
('2267898997', 'Thabo Khumalo', 'thabo@ride.com', '1234', 'Student'),
('4567890', 'Jane Smith', 'jane@ride.com', '1234', 'Student'),
('473683768', 'Sipho Zulu', 'sipho@ride.com', '1234', 'Student');


INSERT INTO Routes (RouteName, DepartureTime) 
VALUES  
('CAMPUS NORTH', '08:30:00'),
('DOWNTOWN EXPRESS', '10:15:00'),
('MEDICAL CENTER SHUTTLE', '13:00:00');


INSERT INTO Bookings (StudentID, RouteID, BookingDate, Status) 
VALUES  
(10, 1, CURDATE(), 'Booked'),
(11, 2, CURDATE(), 'Boarded'),
(12, 3, CURDATE(), 'Cancelled');


INSERT INTO DriverApplications (UserID, ContactNumber, VehicleMakeModel, RegistrationNumber, SeatingCapacity, VehicleColor, LicenseImagePath, RegistrationFilePath)
VALUES 
(6, '+1 (555) 902-3481', 'Toyota Camry 2022', 'CAL-992-TX', 4, 'Metallic Silver', '../assets/img/licenses/alex_license.png', '../assets/img/docs/alex_reg.png'),
(7, '+1 (555) 123-4567', 'Volkswagen Golf 2021', 'EC-332-PL', 4, 'Midnight Black', '../assets/img/licenses/emily_license.png', '../assets/img/docs/emily_reg.png'),
(8, '+1 (555) 765-4321', 'Ford Ranger 2020', 'GP-881-ZZ', 2, 'Oxford White', '../assets/img/licenses/lanele_license.png', '../assets/img/docs/lanele_reg.png'),
(9, '+1 (555) 987-6543', 'Hyundai i20 2023', 'KZN-004-WP', 4, 'Cherry Red', '../assets/img/licenses/vusi_license.png', '../assets/img/docs/vusi_reg.png');


INSERT INTO Shuttles (ShuttleName, LicensePlate, Capacity, Status) 
VALUES
('Blue Line Alpha', 'CR-99-WY-GP', 22, 'Active'),
('Campus Shuttle B', 'BZ-44-LL-GP', 15, 'Active'),
('West Campus Van', 'FX-88-TT-GP', 8, 'Maintenance');


SELECT * FROM Users;
SELECT * FROM DriverApplications;
SELECT * FROM Routes;
SELECT * FROM Bookings;
SELECT * FROM Shuttles;
SELECT * FROM ShuttleSchedules;
SHOW TABLES;