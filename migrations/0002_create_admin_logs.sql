CREATE TABLE IF NOT EXISTS admin_logs (
  id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
  type VARCHAR(50) NOT NULL,
  action VARCHAR(100) NOT NULL,
  admin_id VARCHAR,
  ip VARCHAR(45),
  user_agent TEXT,
  details TEXT,
  success VARCHAR(10) DEFAULT 'true',
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_admin_logs_type ON admin_logs(type);
CREATE INDEX IF NOT EXISTS idx_admin_logs_action ON admin_logs(action);
CREATE INDEX IF NOT EXISTS idx_admin_logs_created_at ON admin_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_admin_logs_success ON admin_logs(success);
