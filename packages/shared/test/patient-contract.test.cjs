const test = require("node:test");
const assert = require("node:assert/strict");

const {
  AddressType,
  AddressUse,
  PatientIdentifierType,
  PatientNameUse,
  PatientRelationshipCode,
  TelecomSystem,
  TelecomUse,
  VerificationStatus,
} = require("../dist");

test("exports platform-neutral structured patient vocabularies", () => {
  assert.deepEqual(Object.values(PatientIdentifierType), [
    "NIK",
    "MOTHER_NIK",
    "PASSPORT",
    "FAMILY_CARD",
    "OTHER",
  ]);
  assert.deepEqual(Object.values(PatientNameUse), [
    "OFFICIAL",
    "PREFERRED",
    "ALIAS",
    "OLD",
  ]);
  assert.equal(VerificationStatus.VERIFIED, "VERIFIED");
  assert.equal(TelecomSystem.PHONE, "PHONE");
  assert.equal(TelecomUse.MOBILE, "MOBILE");
  assert.equal(AddressUse.HOME, "HOME");
  assert.equal(AddressType.BOTH, "BOTH");
  assert.equal(PatientRelationshipCode.GUARDIAN, "GUARDIAN");
});

test("core patient vocabulary does not introduce an external platform name", () => {
  const values = [
    PatientIdentifierType,
    PatientNameUse,
    VerificationStatus,
    TelecomSystem,
    TelecomUse,
    AddressUse,
    AddressType,
    PatientRelationshipCode,
  ].flatMap((entry) => Object.values(entry));

  assert.equal(
    values.some((value) => /satusehat|fhir/i.test(value)),
    false,
  );
});
