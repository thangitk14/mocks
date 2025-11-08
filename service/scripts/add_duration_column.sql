-- Migration script to add duration column to api_logs table
-- Run this if the table already exists

ALTER TABLE api_logs 
ADD COLUMN IF NOT EXISTS duration INT NULL AFTER response_body;

