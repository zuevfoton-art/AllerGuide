import { describe, expect, it } from 'vitest';
import { resolveSosEmergencyBar } from './sos-service';
import type { EmergencyContact } from '@allerguide/core';

const contact: EmergencyContact = {
  id: 1,
  profileId: 4,
  name: 'Анна',
  phone: '+79001234567',
  relation: 'relative',
};

describe('resolveSosEmergencyBar', () => {
  it('keeps the emergency number without a profile and hides the contact', () => {
    const bar = resolveSosEmergencyBar({
      profileId: null,
      emergencyNumber: '112',
      firstContact: contact,
    });

    expect(bar.emergencyNumber).toBe('112');
    expect(bar.firstContact).toBeNull();
  });

  it('falls back to 103 when the stored number is empty', () => {
    const bar = resolveSosEmergencyBar({
      profileId: null,
      emergencyNumber: '   ',
    });

    expect(bar.emergencyNumber).toBe('103');
    expect(bar.firstContact).toBeNull();
  });

  it('passes through the first contact when a profile is selected', () => {
    const bar = resolveSosEmergencyBar({
      profileId: 4,
      emergencyNumber: '103',
      firstContact: contact,
    });

    expect(bar.emergencyNumber).toBe('103');
    expect(bar.firstContact).toEqual(contact);
  });
});
