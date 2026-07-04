import { describe, expect, it, vi, beforeEach } from 'vitest';
import { deleteAppUser } from '../services/app-user-service';

const deleteMock = vi.fn().mockResolvedValue(undefined);

vi.mock('../db', () => ({
  db: {
    delete: vi.fn(() => ({
      where: deleteMock,
    })),
  },
}));

vi.mock('../db/app-schema', () => ({
  appUsers: { id: 'id' },
  syncBackups: { userId: 'userId' },
}));

describe('deleteAppUser', () => {
  beforeEach(() => {
    deleteMock.mockClear();
  });

  it('deletes sync backups before user', async () => {
    await deleteAppUser(42);
    expect(deleteMock).toHaveBeenCalledTimes(2);
  });
});
