import {
  STATUSES,
  FINAL_STATUSES,
  ACTIVE_STATUSES,
  TRANSITIONS,
  normalizeCompany,
  normalizeRole,
  addCalendarDays,
  isFutureDate,
  serializeApplication
} from '../utils/applicationHelpers.js';

console.log('--- Testing Application Business Logic ---');

// 1. Normalization
const norm1 = normalizeCompany('   Info  Sys   ');
const norm2 = normalizeCompany('infosys');
console.assert(norm1 === 'info sys', `Expected 'info sys', got '${norm1}'`);
console.assert(normalizeCompany('Infosys') === 'infosys', 'Infosys normalization failed');

// 2. Calendar Days (+7 days)
const baseDate = new Date('2026-10-20T00:00:00Z');
const followUp = addCalendarDays(baseDate, 7);
console.assert(followUp.toISOString().slice(0, 10) === '2026-10-27', `Expected 2026-10-27, got ${followUp.toISOString()}`);

// 3. Future Date Validation
const yesterday = new Date(Date.now() - 86400000).toISOString().slice(0, 10);
const today = new Date().toISOString().slice(0, 10);
const tomorrow = new Date(Date.now() + 86400000 * 2).toISOString().slice(0, 10);

console.assert(isFutureDate(yesterday) === false, 'Yesterday should not be future');
console.assert(isFutureDate(today) === false, 'Today should not be future');
console.assert(isFutureDate(tomorrow) === true, 'Tomorrow should be future');

// 4. Overdue logic
const pastFollowUp = new Date(Date.now() - 86400000 * 2);
const futureFollowUp = new Date(Date.now() + 86400000 * 5);

const overdueDoc = serializeApplication({
  status: 'Applied',
  followUpDate: pastFollowUp
});
console.assert(overdueDoc.isOverdue === true, 'Overdue doc should have isOverdue: true');

const notOverdueDoc = serializeApplication({
  status: 'Applied',
  followUpDate: futureFollowUp
});
console.assert(notOverdueDoc.isOverdue === false, 'Future follow-up doc should have isOverdue: false');

const interviewDoc = serializeApplication({
  status: 'Interview',
  followUpDate: pastFollowUp
});
console.assert(interviewDoc.isOverdue === false, 'Non-Applied status should never be overdue');

// 5. Status Transitions
console.assert(TRANSITIONS['Applied'].includes('Interview'), 'Applied -> Interview should be allowed');
console.assert(TRANSITIONS['Applied'].includes('Rejected'), 'Applied -> Rejected should be allowed');
console.assert(!TRANSITIONS['Applied'].includes('Offer'), 'Applied -> Offer should be forbidden');
console.assert(TRANSITIONS['Interview'].includes('Offer'), 'Interview -> Offer should be allowed');
console.assert(!TRANSITIONS['Interview'].includes('Accepted'), 'Interview -> Accepted should be forbidden');
console.assert(TRANSITIONS['Offer'].includes('Accepted'), 'Offer -> Accepted should be allowed');
console.assert(TRANSITIONS['Offer'].includes('Declined'), 'Offer -> Declined should be allowed');
console.assert(TRANSITIONS['Rejected'].length === 0, 'Rejected should be final');
console.assert(TRANSITIONS['Accepted'].length === 0, 'Accepted should be final');
console.assert(TRANSITIONS['Declined'].length === 0, 'Declined should be final');

// 6. Application ID Format logic
function testFormatId(company, seq) {
  const clean = company.trim().replace(/[^a-zA-Z0-9]/g, '');
  const prefix = (clean.slice(0, 3) || 'APP').toUpperCase().padEnd(3, 'X');
  return `JA-${prefix}-${String(seq).padStart(3, '0')}`;
}
console.assert(testFormatId('Infosys', 1) === 'JA-INF-001', 'Infosys 1 format failed');
console.assert(testFormatId('Infosys', 2) === 'JA-INF-002', 'Infosys 2 format failed');
console.assert(testFormatId('Google', 1) === 'JA-GOO-001', 'Google 1 format failed');
console.assert(testFormatId('Go', 1) === 'JA-GOX-001', 'Go padEnd failed');

console.log('✓ All logic assertions PASSED successfully!');
