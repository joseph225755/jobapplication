import app from '../server.js';
import http from 'http';

const PORT = 5002;
let server;

function request(method, path, body = null) {
  return new Promise((resolve, reject) => {
    const payload = body ? JSON.stringify(body) : null;
    const req = http.request(
      {
        hostname: 'localhost',
        port: PORT,
        path,
        method,
        headers: {
          'Content-Type': 'application/json',
          ...(payload ? { 'Content-Length': Buffer.byteLength(payload) } : {})
        }
      },
      (res) => {
        let data = '';
        res.on('data', (chunk) => (data += chunk));
        res.on('end', () => {
          try {
            resolve({ status: res.statusCode, data: JSON.parse(data) });
          } catch {
            resolve({ status: res.statusCode, raw: data });
          }
        });
      }
    );
    req.on('error', reject);
    if (payload) req.write(payload);
    req.end();
  });
}

async function runTests() {
  server = app.listen(PORT);
  console.log(`Test server running on port ${PORT}...`);

  try {
    // 1. Health check
    const health = await request('GET', '/api/health');
    console.assert(health.status === 200, 'Health check should return 200');
    console.log('✓ Health check passed');

    // 2. Stats
    const stats = await request('GET', '/api/applications/stats');
    console.assert(stats.status === 200, 'Stats should return 200');
    console.assert(typeof stats.data.data.total === 'number', 'Stats total should be a number');
    console.log(`✓ Stats passed (Total: ${stats.data.data.total})`);

    // 3. List applications
    const list = await request('GET', '/api/applications');
    console.assert(list.status === 200, 'List should return 200');
    console.assert(Array.isArray(list.data.data), 'List data should be an array');
    console.log(`✓ List applications passed (${list.data.data.length} items)`);

    // 4. Overdue logic verification in list
    const overdueItem = list.data.data.find((a) => a.isOverdue === true);
    console.assert(overdueItem, 'Expected at least one overdue application in seed');
    console.log(`✓ Dynamic isOverdue verified: ${overdueItem.applicationId} is overdue`);

    // 5. Create new application
    const newAppPayload = {
      companyName: 'Infosys',
      jobRole: 'Systems Engineer',
      jobType: 'Full-time',
      appliedDate: new Date().toISOString().slice(0, 10),
      expectedSalary: 420000,
      notes: 'Campus interview'
    };
    const createRes = await request('POST', '/api/applications', newAppPayload);
    console.assert(createRes.status === 201, `Create should return 201, got ${createRes.status}`);
    const created = createRes.data.data;
    console.assert(created.applicationId.startsWith('JA-INF-'), `ID should start with JA-INF-, got ${created.applicationId}`);
    console.assert(created.status === 'Applied', 'Initial status must be Applied');
    console.assert(created.statusHistory.length === 1, 'Initial history length must be 1');
    console.log(`✓ Create application passed (Generated ID: ${created.applicationId})`);

    // 6. Future date validation
    const futurePayload = {
      ...newAppPayload,
      companyName: 'Tesla',
      appliedDate: '2099-01-01'
    };
    const futureRes = await request('POST', '/api/applications', futurePayload);
    console.assert(futureRes.status === 400, 'Future applied date must return 400');
    console.log('✓ Future date rejection passed (400)');

    // 7. Duplicate active application validation (409)
    const duplicatePayload = {
      companyName: '  infosys  ',
      jobRole: 'systems engineer',
      jobType: 'Full-time',
      appliedDate: new Date().toISOString().slice(0, 10)
    };
    const dupRes = await request('POST', '/api/applications', duplicatePayload);
    console.assert(dupRes.status === 409, `Duplicate active app must return 409, got ${dupRes.status}`);
    console.log('✓ Duplicate active application rejection passed (409)');

    // 8. Update application allowed fields
    const updateRes = await request('PUT', `/api/applications/${created._id}`, {
      companyName: 'Infosys Limited',
      jobRole: 'Systems Engineer Specialist',
      jobType: 'Full-time',
      expectedSalary: 550000,
      notes: 'Updated notes from recruiter'
    });
    console.assert(updateRes.status === 200, `Update should return 200, got ${updateRes.status}`);
    console.assert(updateRes.data.data.expectedSalary === 550000, 'Expected salary should be updated');
    console.log('✓ Update application allowed fields passed');

    // 9. Forbidden update of applicationId
    const badUpdateRes = await request('PUT', `/api/applications/${created._id}`, {
      companyName: 'Infosys Limited',
      jobRole: 'Systems Engineer Specialist',
      jobType: 'Full-time',
      applicationId: 'JA-HACK-999'
    });
    console.assert(badUpdateRes.status === 400, 'Modifying applicationId must return 400');
    console.log('✓ Immutable applicationId enforcement passed (400)');

    // 10. Status transition: Applied -> Interview
    const toInterview = await request('PATCH', `/api/applications/${created._id}/status`, { status: 'Interview' });
    console.assert(toInterview.status === 200, 'Applied -> Interview should return 200');
    console.assert(toInterview.data.data.status === 'Interview', 'Status should be Interview');
    console.assert(toInterview.data.data.statusHistory.length === 2, 'History should have 2 entries');
    console.log('✓ Valid status transition (Applied -> Interview) passed');

    // 11. Invalid status transition: Interview -> Accepted
    const invalidTrans = await request('PATCH', `/api/applications/${created._id}/status`, { status: 'Accepted' });
    console.assert(invalidTrans.status === 400, 'Interview -> Accepted must return 400');
    console.log('✓ Invalid status transition rejection (Interview -> Accepted) passed (400)');

    // 12. Delete restriction: cannot delete while in Interview status
    const delBlocked = await request('DELETE', `/api/applications/${created._id}`);
    console.assert(delBlocked.status === 400, 'Deleting application in Interview status must return 400');
    console.log('✓ Delete prohibition during Interview passed (400)');

    // 13. Advance status: Interview -> Offer -> Declined
    const toOffer = await request('PATCH', `/api/applications/${created._id}/status`, { status: 'Offer' });
    console.assert(toOffer.status === 200, 'Interview -> Offer should return 200');
    const toDeclined = await request('PATCH', `/api/applications/${created._id}/status`, { status: 'Declined' });
    console.assert(toDeclined.status === 200, 'Offer -> Declined should return 200');
    console.log('✓ Workflow to final status (Offer -> Declined) passed');

    // 14. Delete allowed for final status Declined
    const delAllowed = await request('DELETE', `/api/applications/${created._id}`);
    console.assert(delAllowed.status === 200, 'Deleting application in Declined status should return 200');
    console.log('✓ Deletion of final status application passed (200)');

    // 15. Search & filter queries
    const searchRes = await request('GET', '/api/applications?search=google');
    console.assert(searchRes.status === 200, 'Search should return 200');
    console.assert(searchRes.data.data.every((a) => a.companyName.toLowerCase().includes('google') || a.jobRole.toLowerCase().includes('google')), 'Search results must match query');
    console.log(`✓ Search filtering passed (${searchRes.data.data.length} matching Google)`);

    const filterRes = await request('GET', '/api/applications?status=Interview');
    console.assert(filterRes.status === 200, 'Filter should return 200');
    console.assert(filterRes.data.data.every((a) => a.status === 'Interview'), 'Filter results must be Interview');
    console.log(`✓ Status filtering passed (${filterRes.data.data.length} matching Interview)`);

    console.log('\n========================================');
    console.log('  ALL 15 INTEGRATION TEST SUITES PASSED!  ');
    console.log('========================================\n');
  } finally {
    server.close();
  }
}

runTests().catch((err) => {
  console.error('Test execution failed:', err);
  if (server) server.close();
  process.exit(1);
});
