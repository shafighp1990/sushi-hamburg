-- Apply the owner's current zero-tax configuration to the live catalogue only.
-- Historical order, payment and document snapshots retain their original values.
UPDATE catalog
SET data = json_set(data, '$.taxRate', 0),
    version = version + 1,
    updated_at = CAST(strftime('%s', 'now') AS INTEGER) * 1000
WHERE json_extract(data, '$.taxRate') IS NOT 0;
