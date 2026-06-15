CREATE TABLE IF NOT EXISTS trip_days (
  id VARCHAR(150) PRIMARY KEY,
  trip_code VARCHAR(50) NOT NULL DEFAULT 'europa-2026',
  date_label VARCHAR(20) NOT NULL,
  sort_order INT NOT NULL,
  data_json JSON NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY uq_trip_days_order (trip_code, sort_order),
  KEY idx_trip_days_trip (trip_code)
);

CREATE TABLE IF NOT EXISTS trip_cities (
  id VARCHAR(150) PRIMARY KEY,
  trip_code VARCHAR(50) NOT NULL DEFAULT 'europa-2026',
  data_json JSON NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  KEY idx_trip_cities_trip (trip_code)
);

CREATE TABLE IF NOT EXISTS trip_documents (
  id VARCHAR(150) PRIMARY KEY,
  trip_code VARCHAR(50) NOT NULL DEFAULT 'europa-2026',
  doc_type VARCHAR(50) NOT NULL,
  data_json JSON NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  KEY idx_trip_documents_type (trip_code, doc_type)
);

CREATE TABLE IF NOT EXISTS trip_day_backups (
  id BIGINT AUTO_INCREMENT PRIMARY KEY,
  trip_code VARCHAR(50) NOT NULL DEFAULT 'europa-2026',
  day_id VARCHAR(150) NOT NULL,
  previous_json JSON NOT NULL,
  reason VARCHAR(120) NULL,
  changed_by VARCHAR(80) NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  KEY idx_trip_day_backups_day (trip_code, day_id, created_at)
);

CREATE TABLE IF NOT EXISTS trip_uploads (
  id VARCHAR(150) PRIMARY KEY,
  trip_code VARCHAR(50) NOT NULL DEFAULT 'europa-2026',
  day_id VARCHAR(150) NULL,
  activity_id VARCHAR(150) NULL,
  original_name VARCHAR(255) NOT NULL,
  stored_name VARCHAR(255) NOT NULL,
  mime_type VARCHAR(120) NOT NULL,
  size_bytes INT NOT NULL,
  public_path VARCHAR(500) NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  KEY idx_trip_uploads_activity (trip_code, day_id, activity_id)
);
