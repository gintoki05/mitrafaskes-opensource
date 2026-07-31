const test = require('node:test');
const assert = require('node:assert/strict');

const {
  AccessPermission,
  DEFAULT_ROUTE_BY_ROLE,
  UserRole,
  evaluateAccess,
  hasPermission,
} = require('../dist');

test('login is public while protected permissions require a session', () => {
  assert.equal(hasPermission(null, AccessPermission.LOGIN), true);
  assert.deepEqual(evaluateAccess(null, AccessPermission.PATIENT_READ), {
    allowed: false,
    code: 'UNAUTHENTICATED',
    statusCode: 401,
  });
});

test('every phase-one role has an explicit landing route', () => {
  assert.equal(DEFAULT_ROUTE_BY_ROLE[UserRole.PERAWAT], '/pendaftaran');
  assert.equal(DEFAULT_ROUTE_BY_ROLE[UserRole.DOKTER], '/rme');
  assert.equal(DEFAULT_ROUTE_BY_ROLE[UserRole.ADMIN], '/satusehat');
});

test('registration officer can manage registration and queue intake only', () => {
  assert.equal(
    hasPermission(UserRole.PERAWAT, AccessPermission.PATIENT_WRITE),
    true,
  );
  assert.equal(
    hasPermission(UserRole.PERAWAT, AccessPermission.QUEUE_CREATE),
    true,
  );
  assert.equal(
    hasPermission(UserRole.PERAWAT, AccessPermission.RME_WRITE_DRAFT),
    false,
  );
});

test('doctor can perform consultation but cannot change patient identity', () => {
  assert.equal(
    hasPermission(UserRole.DOKTER, AccessPermission.RME_WRITE_DRAFT),
    true,
  );
  assert.equal(
    hasPermission(UserRole.DOKTER, AccessPermission.RME_FINALIZE),
    true,
  );
  assert.equal(
    hasPermission(UserRole.DOKTER, AccessPermission.PATIENT_WRITE),
    false,
  );
});

test('admin can operate sync safely but cannot author clinical records', () => {
  assert.equal(
    hasPermission(UserRole.ADMIN, AccessPermission.SYNC_RETRY),
    true,
  );
  assert.equal(
    hasPermission(UserRole.ADMIN, AccessPermission.SYNC_PAYLOAD_READ),
    true,
  );
  assert.equal(
    hasPermission(UserRole.ADMIN, AccessPermission.RME_FINALIZE),
    false,
  );
});

test('authenticated access outside the role matrix is forbidden', () => {
  assert.deepEqual(
    evaluateAccess(UserRole.DOKTER, AccessPermission.SYNC_RETRY),
    {
      allowed: false,
      code: 'FORBIDDEN',
      statusCode: 403,
    },
  );
});
