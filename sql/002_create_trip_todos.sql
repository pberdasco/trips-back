CREATE TABLE IF NOT EXISTS trip_todos (
  id VARCHAR(150) PRIMARY KEY,
  trip_code VARCHAR(50) NOT NULL DEFAULT 'europa-2026',
  text VARCHAR(1000) NOT NULL,
  due_date VARCHAR(20) NULL,
  status ENUM('pending', 'done') NOT NULL DEFAULT 'pending',
  scope VARCHAR(30) NOT NULL DEFAULT 'global',
  visible_for JSON NULL,
  notes JSON NULL,
  created_by VARCHAR(80) NULL,
  updated_by VARCHAR(80) NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  KEY idx_trip_todos_trip_status (trip_code, status),
  KEY idx_trip_todos_due_date (trip_code, due_date)
);
