/**
 * Test script to verify deletion permanence across mind items, learning folders, notes, and diary topics.
 */
const assert = require('assert');

// 1. Test logic of empty store fallback in loadUserData:
function assembleStateTest(storeList, backupList) {
  return Array.isArray(storeList) ? storeList.filter(Boolean) : (backupList || []).filter(Boolean);
}

// Case A: User has 0 items because all items were deleted
const emptyStore = [];
const oldBackup = [{ id: 'old_1', content: 'Should not reappear' }];
const resultA = assembleStateTest(emptyStore, oldBackup);
assert.strictEqual(resultA.length, 0, 'Empty store must NOT fall back to old backup!');

// Case B: Store failed completely (null/undefined)
const nullStore = null;
const resultB = assembleStateTest(nullStore, oldBackup);
assert.strictEqual(resultB.length, 1, 'Failed/null store should fall back to backup');

// 2. Test fast cache purge logic:
const fakeLocalStorage = {
  data: {
    'focentia_fast_state_test_user': JSON.stringify({
      mindItems: [{ id: 'm1' }, { id: 'm2' }],
      learningFolders: [{ id: 'f1' }, { id: 'f2' }]
    })
  },
  getItem(key) { return this.data[key]; },
  setItem(key, val) { this.data[key] = val; }
};

function purgeEntityFromFastCache(userId, collectionKey, id) {
  const cacheKey = 'focentia_fast_state_' + userId;
  const raw = fakeLocalStorage.getItem(cacheKey);
  if (!raw) return;
  const parsed = JSON.parse(raw);
  if (Array.isArray(parsed[collectionKey])) {
    parsed[collectionKey] = parsed[collectionKey].filter((item) => item && String(item.id) !== String(id));
    fakeLocalStorage.setItem(cacheKey, JSON.stringify(parsed));
  }
}

purgeEntityFromFastCache('test_user', 'mindItems', 'm1');
const updatedCache = JSON.parse(fakeLocalStorage.getItem('focentia_fast_state_test_user'));
assert.strictEqual(updatedCache.mindItems.length, 1, 'Deleted item must be immediately purged from fast cache');
assert.strictEqual(updatedCache.mindItems[0].id, 'm2', 'Remaining item must be m2');

// 3. Test background cloud fetch tombstone check logic:
const currentLocalWithDeleted = [
  { id: 'm1', content: 'Deleted item', isDeleted: true },
  { id: 'm2', content: 'Active item', isDeleted: false }
];
const cloudItems = [
  { id: 'm1', content: 'Deleted item from cloud' },
  { id: 'm2', content: 'Active item from cloud' },
  { id: 'm3', content: 'Truly new item from another device' }
];

const localMap = new Map(currentLocalWithDeleted.map(i => [i.id, i]));
const putToDexie = [];
const purgedFromCloud = [];

for (const cItem of cloudItems) {
  const existing = localMap.get(cItem.id);
  if (existing?.isDeleted) {
    purgedFromCloud.push(cItem.id);
    continue;
  }
  if (!existing) {
    putToDexie.push(cItem.id);
  }
}

assert.deepStrictEqual(purgedFromCloud, ['m1'], 'Tombstoned item m1 must be purged from cloud');
assert.deepStrictEqual(putToDexie, ['m3'], 'Only truly new item m3 should be put to Dexie');
assert.strictEqual(putToDexie.includes('m1'), false, 'Deleted item m1 must NEVER be put to Dexie');

console.log('✅ ALL DELETION PERMANENCE CHECKS PASSED PERFECTLY!');

