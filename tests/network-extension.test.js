import { expect, test } from 'bun:test';
import { crmOrigin, profileUrl } from '../chrome-extension/network-capture/validation.js';

test('capture accepts only explicit HTTPS CRM origins', () => {
  expect(crmOrigin('https://crm.example.com/')).toBe('https://crm.example.com');
  for (const value of ['http://crm.example.com', 'https://user:secret@crm.example.com', 'https://crm.example.com/api', 'https://crm.example.com?token=secret', 'https://www.linkedin.com', 'https://127.0.0.1', 'https://localhost']) {
    expect(() => crmOrigin(value)).toThrow();
  }
});

test('capture accepts active LinkedIn profile URLs without tracking data', () => {
  expect(profileUrl('https://linkedin.com/in/alice/?trk=test#section')).toBe('https://www.linkedin.com/in/alice');
  for (const value of ['http://linkedin.com/in/alice', 'https://linkedin.com.evil.test/in/alice', 'https://www.linkedin.com/feed', 'https://secret@linkedin.com/in/alice', 'javascript:alert(1)']) {
    expect(() => profileUrl(value)).toThrow();
  }
});
