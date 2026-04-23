-- Collier Legacy Vault: Seed Vault Categories
-- Migration 0002

-- PERSONAL tier categories
INSERT OR IGNORE INTO vault_categories (id, name, icon, sort_order, access_tier) VALUES
  (lower(hex(randomblob(16))), 'Personal Identification', '📋', 1, 'PERSONAL'),
  (lower(hex(randomblob(16))), 'Emergency Contacts', '📞', 2, 'PERSONAL'),
  (lower(hex(randomblob(16))), 'Legal Documents', '⚖️', 3, 'PERSONAL'),
  (lower(hex(randomblob(16))), 'Financial Accounts', '🏦', 4, 'PERSONAL'),
  (lower(hex(randomblob(16))), 'Insurance Policies', '🛡️', 5, 'PERSONAL'),
  (lower(hex(randomblob(16))), 'Property & Assets', '🏠', 6, 'PERSONAL'),
  (lower(hex(randomblob(16))), 'Debts & Liabilities', '💳', 7, 'PERSONAL'),
  (lower(hex(randomblob(16))), 'Digital Assets & Passwords', '🔐', 8, 'PERSONAL'),
  (lower(hex(randomblob(16))), 'Tax Information', '📊', 9, 'PERSONAL'),
  (lower(hex(randomblob(16))), 'Funeral & Burial Wishes', '⚱️', 10, 'PERSONAL'),
  (lower(hex(randomblob(16))), 'Monthly Bills & Subscriptions', '📅', 11, 'PERSONAL'),
  (lower(hex(randomblob(16))), 'Phone & Device Access', '📱', 12, 'PERSONAL');

-- FULL tier categories (business)
INSERT OR IGNORE INTO vault_categories (id, name, icon, sort_order, access_tier) VALUES
  (lower(hex(randomblob(16))), 'MTCL Business Overview', '🏢', 13, 'FULL'),
  (lower(hex(randomblob(16))), 'Business Succession Plan', '📝', 14, 'FULL'),
  (lower(hex(randomblob(16))), 'Business Financial Accounts', '🏦', 15, 'FULL'),
  (lower(hex(randomblob(16))), 'Business Insurance', '🛡️', 16, 'FULL'),
  (lower(hex(randomblob(16))), 'Client Database Access', '👥', 17, 'FULL'),
  (lower(hex(randomblob(16))), 'Vehicle Fleet & GPS', '🚛', 18, 'FULL'),
  (lower(hex(randomblob(16))), 'Vendor Accounts', '🏪', 19, 'FULL'),
  (lower(hex(randomblob(16))), 'Website & Hosting', '🌐', 20, 'FULL'),
  (lower(hex(randomblob(16))), 'Technology Infrastructure', '🖥️', 21, 'FULL'),
  (lower(hex(randomblob(16))), 'Haven Lighting', '💡', 22, 'FULL'),
  (lower(hex(randomblob(16))), 'ServiceVault Pro', '🔒', 23, 'FULL');
