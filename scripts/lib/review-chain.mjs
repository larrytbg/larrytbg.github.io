export function requireExactIdSet(label, expectedIds, actualItems) {
  const actualIds = actualItems.map((item) => item?.id);
  if (actualIds.some((id) => typeof id !== "string" || !id)) {
    throw new Error(`${label} contains an invalid ID`);
  }
  if (new Set(actualIds).size !== actualIds.length) {
    throw new Error(`${label} contains a duplicate ID`);
  }
  const expected = [...new Set(expectedIds)].sort();
  const actual = [...actualIds].sort();
  if (expected.length !== expectedIds.length) {
    throw new Error(`${label} expected set contains a duplicate ID`);
  }
  if (expected.length !== actual.length || expected.some((id, index) => id !== actual[index])) {
    throw new Error(`${label} ID set mismatch`);
  }
}
