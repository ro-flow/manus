import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock storage
vi.mock('./storage', () => ({
  storagePut: vi.fn().mockResolvedValue({
    key: 'backups/db-backup-test.json',
    url: 'https://s3.example.com/backups/db-backup-test.json',
  }),
}));

// Mock notification
vi.mock('./_core/notification', () => ({
  notifyOwner: vi.fn().mockResolvedValue(true),
}));

// Mock db
const mockSelect = vi.fn();
const mockFrom = vi.fn();
vi.mock('./db', () => ({
  getDb: vi.fn().mockResolvedValue({
    select: () => ({
      from: () => Promise.resolve([
        { id: 1, name: 'Test User' },
        { id: 2, name: 'Test User 2' },
      ]),
    }),
  }),
}));

import { createDatabaseBackup } from './services/backup';
import { storagePut } from './storage';
import { notifyOwner } from './_core/notification';

describe('Database Backup Service', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should create a backup successfully', async () => {
    const result = await createDatabaseBackup();
    
    expect(result.success).toBe(true);
    expect(result.tableCount).toBeGreaterThan(0);
    expect(result.totalRows).toBeGreaterThan(0);
    expect(result.s3Url).toBeDefined();
    expect(result.s3Key).toBeDefined();
    expect(result.sizeBytes).toBeGreaterThan(0);
    expect(result.duration).toBeGreaterThanOrEqual(0);
  });

  it('should upload backup to S3', async () => {
    await createDatabaseBackup();
    
    expect(storagePut).toHaveBeenCalledTimes(1);
    const [key, data, contentType] = (storagePut as any).mock.calls[0];
    expect(key).toMatch(/^backups\/db-backup-/);
    expect(contentType).toBe('application/json');
    
    // Verify the backup data is valid JSON
    const parsed = JSON.parse(data.toString());
    expect(parsed.metadata).toBeDefined();
    expect(parsed.metadata.tableCount).toBeGreaterThan(0);
    expect(parsed.data).toBeDefined();
  });

  it('should send success notification to owner', async () => {
    await createDatabaseBackup();
    
    expect(notifyOwner).toHaveBeenCalledTimes(1);
    const [payload] = (notifyOwner as any).mock.calls[0];
    expect(payload.title).toContain('Succesvol');
    expect(payload.content).toContain('rijen');
  });

  it('should include metadata in backup', async () => {
    await createDatabaseBackup();
    
    const [, data] = (storagePut as any).mock.calls[0];
    const parsed = JSON.parse(data.toString());
    
    expect(parsed.metadata.version).toBe('1.0');
    expect(parsed.metadata.timestamp).toBeDefined();
    expect(parsed.metadata.tables).toBeInstanceOf(Array);
    expect(parsed.metadata.tables.length).toBeGreaterThan(0);
  });

  it('should handle database connection failure', async () => {
    const { getDb } = await import('./db');
    (getDb as any).mockResolvedValueOnce(null);
    
    const result = await createDatabaseBackup();
    
    expect(result.success).toBe(false);
    expect(result.error).toContain('Database connection not available');
  });
});
