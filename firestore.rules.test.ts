/**
 * Firestore Security Rules Test Suite (Dirty Dozen Verification)
 * Verifies that all 12 adversarial payloads in security_spec.md return PERMISSION_DENIED.
 */

export interface SecurityTestCase {
  id: number;
  name: string;
  collectionPath: string;
  operation: 'create' | 'update' | 'get' | 'list' | 'delete';
  auth: { uid: string; email: string; email_verified: boolean } | null;
  payload?: Record<string, unknown>;
  expectedResult: 'PERMISSION_DENIED';
}

export const DIRTY_DOZEN_TESTS: SecurityTestCase[] = [
  {
    id: 1,
    name: 'Unverified Email Spoof on Workbook Create',
    collectionPath: '/workbooks/user_1',
    operation: 'create',
    auth: { uid: 'user_1', email: 'tewolde1574@gmail.com', email_verified: false },
    payload: {
      ownerId: 'user_1',
      yearEC: '2019 EC',
      sourceFileName: 'Rental.xlsx',
      lastUpdated: 'Tikimt 2019',
      createdAt: 'SERVER_TIMESTAMP',
      updatedAt: 'SERVER_TIMESTAMP',
    },
    expectedResult: 'PERMISSION_DENIED',
  },
  {
    id: 2,
    name: 'Cross-User Workbook Hijack',
    collectionPath: '/workbooks/user_1',
    operation: 'create',
    auth: { uid: 'user_2', email: 'attacker@example.com', email_verified: true },
    payload: {
      ownerId: 'user_1',
      yearEC: '2019 EC',
      sourceFileName: 'Rental.xlsx',
      lastUpdated: 'Tikimt 2019',
      createdAt: 'SERVER_TIMESTAMP',
      updatedAt: 'SERVER_TIMESTAMP',
    },
    expectedResult: 'PERMISSION_DENIED',
  },
  {
    id: 3,
    name: 'Shadow Field Injection on Workbook',
    collectionPath: '/workbooks/user_1',
    operation: 'create',
    auth: { uid: 'user_1', email: 'tewolde1574@gmail.com', email_verified: true },
    payload: {
      ownerId: 'user_1',
      yearEC: '2019 EC',
      sourceFileName: 'Rental.xlsx',
      lastUpdated: 'Tikimt 2019',
      isAdmin: true,
      createdAt: 'SERVER_TIMESTAMP',
      updatedAt: 'SERVER_TIMESTAMP',
    },
    expectedResult: 'PERMISSION_DENIED',
  },
  {
    id: 4,
    name: 'Orphaned Tenant Write Without Parent Workbook',
    collectionPath: '/workbooks/missing_wb/tenants/t_1',
    operation: 'create',
    auth: { uid: 'user_1', email: 'tewolde1574@gmail.com', email_verified: true },
    payload: {
      ownerId: 'user_1',
      workbookId: 'missing_wb',
      tenantName: 'በቀለ',
    },
    expectedResult: 'PERMISSION_DENIED',
  },
  {
    id: 5,
    name: 'ID Poisoning Attack on Tenant Path',
    collectionPath: '/workbooks/user_1/tenants/bad$id!@#',
    operation: 'create',
    auth: { uid: 'user_1', email: 'tewolde1574@gmail.com', email_verified: true },
    payload: {
      ownerId: 'user_1',
      workbookId: 'user_1',
    },
    expectedResult: 'PERMISSION_DENIED',
  },
  {
    id: 6,
    name: 'String Buffer Overflow on Tenant Name',
    collectionPath: '/workbooks/user_1/tenants/t_1',
    operation: 'create',
    auth: { uid: 'user_1', email: 'tewolde1574@gmail.com', email_verified: true },
    payload: {
      ownerId: 'user_1',
      workbookId: 'user_1',
      tenantName: 'A'.repeat(500),
    },
    expectedResult: 'PERMISSION_DENIED',
  },
  {
    id: 7,
    name: 'Partner Split Ratio Out of Bounds',
    collectionPath: '/workbooks/user_1/tenants/t_1',
    operation: 'create',
    auth: { uid: 'user_1', email: 'tewolde1574@gmail.com', email_verified: true },
    payload: {
      ownerId: 'user_1',
      workbookId: 'user_1',
      mesfinRatio: 1.5,
      zewdneshRatio: -0.5,
    },
    expectedResult: 'PERMISSION_DENIED',
  },
  {
    id: 8,
    name: 'Immutable Field Tampering on Update (ownerId / createdAt)',
    collectionPath: '/workbooks/user_1/tenants/t_1',
    operation: 'update',
    auth: { uid: 'user_1', email: 'tewolde1574@gmail.com', email_verified: true },
    payload: {
      ownerId: 'user_2',
    },
    expectedResult: 'PERMISSION_DENIED',
  },
  {
    id: 9,
    name: 'Client Timestamp Forgery on Update',
    collectionPath: '/workbooks/user_1/groceries/g_1',
    operation: 'update',
    auth: { uid: 'user_1', email: 'tewolde1574@gmail.com', email_verified: true },
    payload: {
      price: 2500,
      updatedAt: '2020-01-01T00:00:00Z',
    },
    expectedResult: 'PERMISSION_DENIED',
  },
  {
    id: 10,
    name: 'Invalid Enum Value on LedgerEntry ledgerType',
    collectionPath: '/workbooks/user_1/ledgerEntries/le_1',
    operation: 'create',
    auth: { uid: 'user_1', email: 'tewolde1574@gmail.com', email_verified: true },
    payload: {
      ownerId: 'user_1',
      workbookId: 'user_1',
      ledgerType: 'unauthorizedLedger',
    },
    expectedResult: 'PERMISSION_DENIED',
  },
  {
    id: 11,
    name: 'Value Poisoning on Grocery Price Update',
    collectionPath: '/workbooks/user_1/groceries/g_1',
    operation: 'update',
    auth: { uid: 'user_1', email: 'tewolde1574@gmail.com', email_verified: true },
    payload: {
      price: '2000_STRING_POISON',
    },
    expectedResult: 'PERMISSION_DENIED',
  },
  {
    id: 12,
    name: 'Unauthorized Cross-User List Query Scraping',
    collectionPath: '/workbooks/user_1/ledgerEntries',
    operation: 'list',
    auth: { uid: 'user_2', email: 'attacker@example.com', email_verified: true },
    expectedResult: 'PERMISSION_DENIED',
  },
];
