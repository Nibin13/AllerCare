-- 1. Create the Database
CREATE DATABASE IF NOT EXISTS allercare;
USE allercare;

-- 2. Create the Users Table (for Login/Register)
CREATE TABLE IF NOT EXISTS users (
    id INT AUTO_INCREMENT PRIMARY KEY,
    email VARCHAR(100) UNIQUE NOT NULL,
    password VARCHAR(255) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 3. Create the Analysis History Table (to show past results on Dashboard)
CREATE TABLE IF NOT EXISTS analysis_history (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    category ENUM('food', 'skincare', 'medicine', 'image') NOT NULL,
    input_data TEXT NOT NULL,       -- Stores the ingredients or text analyzed
    result_text VARCHAR(255),       -- Stores "Allergen Detected" or "Safe"
    risk_level VARCHAR(20),         -- Stores "High" or "Low"
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- 4. Create the User Preferences Table (Optional: for personalized allergies)
CREATE TABLE IF NOT EXISTS user_preferences (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    specific_allergy VARCHAR(100) NOT NULL, -- e.g., 'Peanuts'
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);
ALTER TABLE users ADD COLUMN name VARCHAR(100) NOT NULL;