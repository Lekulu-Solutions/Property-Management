import {
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  onSnapshot,
  query,
  serverTimestamp,
  setDoc,
  updateDoc,
  where,
  writeBatch,
} from 'firebase/firestore';
import {
  createBlankMonthGroceries,
  createBlankMonthWater,
  DEFAULT_GROCERY_ITEMS,
  DEFAULT_WATER_MONTH1_ITEMS,
  DEFAULT_WATER_MONTH2_ITEMS,
  DEFAULT_WATER_RATE,
  ensureMonthlyGroceries,
  ensureMonthlyWater,
  ETHIOPIAN_MONTHS,
  EthiopianMonth,
  GroceryItem,
  LedgerEntry,
  PropertyExpenseRow,
  SplitType,
  TenantRentalRow,
  WaterRecordItem,
  WorkbookState,
} from '../data/initialLedgerData';
import {
  db,
  handleFirestoreError,
  OperationType,
} from '../firebase';

const ID_REGEX = /^[a-zA-Z0-9_-]+$/;

export function getWorkbookDocId(uid: string, yearEC: string): string {
  const cleanYear = String(yearEC || '2019 EC').trim().replace(/\s+/g, '_');
  if (cleanYear === '2019_EC') {
    return uid;
  }
  return `${uid}_${cleanYear}`;
}

function sanitizeId(rawId: string, fallbackPrefix = 'item'): string {
  const cleaned = String(rawId || '')
    .replace(/[^a-zA-Z0-9_-]/g, '_')
    .slice(0, 128);
  if (!cleaned || !ID_REGEX.test(cleaned)) {
    return `${fallbackPrefix}_${Date.now()}`;
  }
  return cleaned;
}

function sanitizeString(val: unknown, maxLen: number, fallback = '-'): string {
  const trimmed = String(val ?? '').trim();
  const nonEmpty = trimmed.length > 0 ? trimmed : fallback;
  return nonEmpty.slice(0, maxLen);
}

function sanitizeAmount(val: unknown): number {
  const num = Number(val);
  if (isNaN(num) || !isFinite(num)) return 0;
  return Math.min(Math.max(0, Math.round(num * 100) / 100), 1000000000);
}

function sanitizeRatio(val: unknown): number {
  const num = Number(val);
  if (isNaN(num) || !isFinite(num)) return 0.5;
  return Math.min(Math.max(0, num), 1);
}

function monthlyMapToFields(monthly: Record<EthiopianMonth, number>) {
  return {
    m_meskerem: sanitizeAmount(monthly['መስከረም']),
    m_tikimt: sanitizeAmount(monthly['ጥቅምት']),
    m_hidar: sanitizeAmount(monthly['ኅዳር']),
    m_tahsas: sanitizeAmount(monthly['ታኅሣሥ']),
    m_tir: sanitizeAmount(monthly['ጥር']),
    m_yekatit: sanitizeAmount(monthly['የካቲት']),
    m_megabit: sanitizeAmount(monthly['መጋቢት']),
    m_miyazya: sanitizeAmount(monthly['ሚያዝያ']),
    m_ginbot: sanitizeAmount(monthly['ግንቦት']),
    m_sene: sanitizeAmount(monthly['ሰኔ']),
    m_hamle: sanitizeAmount(monthly['ሐምሌ']),
    m_nehase: sanitizeAmount(monthly['ነሐሴ']),
  };
}

function fieldsToMonthlyMap(data: Record<string, unknown>): Record<EthiopianMonth, number> {
  return {
    'መስከረም': sanitizeAmount(data.m_meskerem),
    'ጥቅምት': sanitizeAmount(data.m_tikimt),
    'ኅዳር': sanitizeAmount(data.m_hidar),
    'ታኅሣሥ': sanitizeAmount(data.m_tahsas),
    'ጥር': sanitizeAmount(data.m_tir),
    'የካቲት': sanitizeAmount(data.m_yekatit),
    'መጋቢት': sanitizeAmount(data.m_megabit),
    'ሚያዝያ': sanitizeAmount(data.m_miyazya),
    'ግንቦት': sanitizeAmount(data.m_ginbot),
    'ሰኔ': sanitizeAmount(data.m_sene),
    'ሐምሌ': sanitizeAmount(data.m_hamle),
    'ነሐሴ': sanitizeAmount(data.m_nehase),
  };
}

const MONTH_TO_FIELD_KEY: Record<EthiopianMonth, string> = {
  'መስከረም': 'm_meskerem',
  'ጥቅምት': 'm_tikimt',
  'ኅዳር': 'm_hidar',
  'ታኅሣሥ': 'm_tahsas',
  'ጥር': 'm_tir',
  'የካቲት': 'm_yekatit',
  'መጋቢት': 'm_megabit',
  'ሚያዝያ': 'm_miyazya',
  'ግንቦት': 'm_ginbot',
  'ሰኔ': 'm_sene',
  'ሐምሌ': 'm_hamle',
  'ነሐሴ': 'm_nehase',
};

const FIELD_KEY_TO_MONTH: Record<string, EthiopianMonth> = {
  m_meskerem: 'መስከረም',
  m_tikimt: 'ጥቅምት',
  m_hidar: 'ኅዳር',
  m_tahsas: 'ታኅሣሥ',
  m_tir: 'ጥር',
  m_yekatit: 'የካቲት',
  m_megabit: 'መጋቢት',
  m_miyazya: 'ሚያዝያ',
  m_ginbot: 'ግንቦት',
  m_sene: 'ሰኔ',
  m_hamle: 'ሐምሌ',
  m_nehase: 'ነሐሴ',
};

function getGroceryDocIdForMonth(month: EthiopianMonth, rawId: string, fallbackIdx = 1): string {
  const cleanBase = sanitizeId(rawId.replace(/^m_[a-z]+__/, ''), `g_${fallbackIdx}`);
  if (month === 'ጥቅምት') {
    return cleanBase;
  }
  const monthPrefix = MONTH_TO_FIELD_KEY[month] || 'm_tikimt';
  return sanitizeId(`${monthPrefix}__${cleanBase}`, `${monthPrefix}__g_${fallbackIdx}`);
}

function parseGroceryDocId(docId: string): { month: EthiopianMonth; itemId: string } {
  const match = docId.match(/^(m_[a-z]+)__(.+)$/);
  if (match && FIELD_KEY_TO_MONTH[match[1]]) {
    return {
      month: FIELD_KEY_TO_MONTH[match[1]],
      itemId: match[2],
    };
  }
  return {
    month: 'ጥቅምት',
    itemId: docId,
  };
}

function sanitizeSignedAmount(val: unknown): number {
  const num = Number(val);
  if (isNaN(num) || !isFinite(num)) return 0;
  return Math.min(Math.max(-1000000000, Math.round(num * 100) / 100), 1000000000);
}

function getWaterDocIdForMonth(month: EthiopianMonth, rawId: string, fallbackIdx = 1): string {
  const cleanBase = sanitizeId(rawId.replace(/^m_[a-z]+__/, ''), `w_${fallbackIdx}`);
  const monthPrefix = MONTH_TO_FIELD_KEY[month] || 'm_meskerem';
  return sanitizeId(`${monthPrefix}__${cleanBase}`, `${monthPrefix}__w_${fallbackIdx}`);
}

function parseWaterDocId(docId: string): { month: EthiopianMonth; itemId: string } {
  const match = docId.match(/^(m_[a-z]+)__(.+)$/);
  if (match && FIELD_KEY_TO_MONTH[match[1]]) {
    return {
      month: FIELD_KEY_TO_MONTH[match[1]],
      itemId: match[2],
    };
  }
  return {
    month: 'መስከረም',
    itemId: docId,
  };
}

const seededWorkbooksCache = new Set<string>();

interface PendingDocWrite {
  timer: ReturnType<typeof setTimeout>;
  execute: () => Promise<void>;
}

const pendingWritesMap = new Map<string, PendingDocWrite>();
const DEBOUNCE_WRITE_MS = 850;

function scheduleDebouncedDocUpdate(
  key: string,
  execute: () => Promise<void>,
  delayMs = DEBOUNCE_WRITE_MS
): Promise<void> {
  const existing = pendingWritesMap.get(key);
  if (existing) {
    clearTimeout(existing.timer);
  }
  return new Promise((resolve, reject) => {
    const timer = setTimeout(async () => {
      pendingWritesMap.delete(key);
      try {
        await execute();
        resolve();
      } catch (err) {
        reject(err);
      }
    }, delayMs);

    pendingWritesMap.set(key, {
      timer,
      execute: async () => {
        clearTimeout(timer);
        pendingWritesMap.delete(key);
        await execute();
      },
    });
  });
}

export async function flushPendingFirestoreWrites(): Promise<void> {
  const entries = Array.from(pendingWritesMap.values());
  pendingWritesMap.clear();
  await Promise.allSettled(entries.map((item) => item.execute()));
}

/**
 * Ensures the master `/workbooks/{wbId}` document exists for the selected year; if not, seeds it and all 4 subcollections.
 */
export async function ensureAndSeedWorkbookInFirestore(
  uid: string,
  yearEC: string,
  initialState: WorkbookState
): Promise<void> {
  const wbId = getWorkbookDocId(uid, yearEC);
  if (seededWorkbooksCache.has(wbId)) {
    return;
  }
  const wbPath = `workbooks/${wbId}`;
  const wbRef = doc(db, 'workbooks', wbId);

  try {
    const snap = await getDoc(wbRef);
    if (!snap.exists()) {
      await uploadFullWorkbookToFirestore(uid, yearEC, initialState, false);
    } else {
      // Ensure waterRecords subcollection is seeded if workbook was created before Water feature
      const waterSubPath = `workbooks/${wbId}/waterRecords`;
      const waterSnap = await getDocs(
        query(collection(db, waterSubPath), where('ownerId', '==', uid))
      );
      if (waterSnap.empty) {
        const monthlyWaterMap = ensureMonthlyWater(initialState);
        const ratePerUnit =
          Number(initialState.waterRatePerUnit) > 0
            ? Number(initialState.waterRatePerUnit)
            : DEFAULT_WATER_RATE;
        const wBatch = writeBatch(db);
        (['መስከረም', 'ጥቅምት'] as EthiopianMonth[]).forEach((mId) => {
          const items = monthlyWaterMap[mId] || [];
          items.forEach((w, idx) => {
            const docId = getWaterDocIdForMonth(mId, w.id, idx + 1);
            const ref = doc(db, 'workbooks', wbId, 'waterRecords', docId);
            const hasOverride = w.depositOverride !== undefined && w.depositOverride !== null;
            wBatch.set(ref, {
              ownerId: uid,
              workbookId: wbId,
              itemIndex: Math.min(Math.max(1, w.index || idx + 1), 10000),
              name: sanitizeString(w.name, 120, 'ተጠቃሚ'),
              nameEn: sanitizeString(w.nameEn || w.name, 120, 'Member'),
              week1: sanitizeAmount(w.week1),
              week2: sanitizeAmount(w.week2),
              week3: sanitizeAmount(w.week3),
              week4: sanitizeAmount(w.week4),
              amountPaid: sanitizeAmount(w.amountPaid),
              ratePerUnit: sanitizeAmount(ratePerUnit),
              depositOverride: hasOverride ? sanitizeSignedAmount(w.depositOverride) : 0,
              hasDepositOverride: Boolean(hasOverride),
              createdAt: serverTimestamp(),
              updatedAt: serverTimestamp(),
            });
          });
        });
        await wBatch.commit();
      }
    }
    seededWorkbooksCache.add(wbId);
  } catch (error) {
    handleFirestoreError(error, OperationType.GET, wbPath);
  }
}

/**
 * Full replacement/seed of `/workbooks/{wbId}` and its subcollections (`tenants`, `propertyExpenses`, `ledgerEntries`, `groceries`, `waterRecords`).
 */
export async function uploadFullWorkbookToFirestore(
  uid: string,
  yearEC: string,
  state: WorkbookState,
  clearExisting = true
): Promise<void> {
  const wbId = getWorkbookDocId(uid, yearEC);
  const wbPath = `workbooks/${wbId}`;
  const wbRef = doc(db, 'workbooks', wbId);

  let wbExists = false;
  try {
    const existingSnap = await getDoc(wbRef);
    wbExists = existingSnap.exists();
  } catch (error) {
    handleFirestoreError(error, OperationType.GET, wbPath);
  }

  // Optionally clear existing subcollection documents before writing fresh state
  if (clearExisting && wbExists) {
    const subcols = ['tenants', 'propertyExpenses', 'ledgerEntries', 'groceries', 'waterRecords'];
    for (const sub of subcols) {
      const subPath = `workbooks/${wbId}/${sub}`;
      try {
        const q = query(collection(db, subPath), where('ownerId', '==', uid));
        const snap = await getDocs(q);
        if (!snap.empty) {
          const delBatch = writeBatch(db);
          snap.docs.forEach((d) => delBatch.delete(d.ref));
          await delBatch.commit();
        }
      } catch (error) {
        handleFirestoreError(error, OperationType.DELETE, subPath);
      }
    }
  }

  // Write master workbook doc first so it exists in Firestore
  try {
    if (!wbExists) {
      await setDoc(wbRef, {
        ownerId: uid,
        yearEC: sanitizeString(yearEC, 40, '2019 EC'),
        sourceFileName: sanitizeString(state.sourceFileName, 120, 'Rental_Property_Expense.xlsx'),
        lastUpdated: sanitizeString(state.lastUpdated, 80, `ጥቅምት ${yearEC}`),
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
    } else {
      await updateDoc(wbRef, {
        yearEC: sanitizeString(yearEC, 40, '2019 EC'),
        sourceFileName: sanitizeString(state.sourceFileName, 120, 'Rental_Property_Expense.xlsx'),
        lastUpdated: sanitizeString(state.lastUpdated, 80, `ጥቅምት ${yearEC}`),
        updatedAt: serverTimestamp(),
      });
    }
  } catch (error) {
    handleFirestoreError(error, wbExists ? OperationType.UPDATE : OperationType.CREATE, wbPath);
  }

  // Batch write all subcollection items
  const batchPath = `workbooks/${wbId}/subcollections`;
  try {
    const batch = writeBatch(db);

    state.tenants.forEach((t, idx) => {
      const docId = sanitizeId(t.id, `t_${idx + 1}`);
      const ref = doc(db, 'workbooks', wbId, 'tenants', docId);
      batch.set(ref, {
        ownerId: uid,
        workbookId: wbId,
        tenantName: sanitizeString(t.tenantName, 100, 'ተከራይ'),
        tenantNameEn: sanitizeString(t.tenantNameEn || t.tenantName, 100, 'Tenant'),
        description: sanitizeString(t.description, 160, 'የመኖሪያ ቤት ኪራይ'),
        splitLabel: sanitizeString(t.splitLabel, 100, '50% መስፍን / 50% ዘውድነሽ'),
        splitType: t.splitType,
        mesfinRatio: sanitizeRatio(t.mesfinRatio),
        zewdneshRatio: sanitizeRatio(t.zewdneshRatio),
        ...monthlyMapToFields(t.monthlyAmounts),
        sortOrder: idx,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
    });

    state.propertyExpenses.forEach((e, idx) => {
      const docId = sanitizeId(e.id, `exp_${idx + 1}`);
      const ref = doc(db, 'workbooks', wbId, 'propertyExpenses', docId);
      batch.set(ref, {
        ownerId: uid,
        workbookId: wbId,
        expenseType: sanitizeString(e.expenseType, 100, 'ወጪ'),
        expenseTypeEn: sanitizeString(e.expenseTypeEn || e.expenseType, 100, 'Expense'),
        description: sanitizeString(e.description, 160, 'ወርሃዊ ወጪ'),
        splitLabel: sanitizeString(e.splitLabel, 100, 'የጋራ (50% - 50%)'),
        splitType: e.splitType,
        mesfinRatio: sanitizeRatio(e.mesfinRatio),
        zewdneshRatio: sanitizeRatio(e.zewdneshRatio),
        ...monthlyMapToFields(e.monthlyAmounts),
        sortOrder: idx,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
    });

    const ledgerTypes: (
      | 'mesfinIncome'
      | 'mesfinExpenses'
      | 'zewdneshDeposits'
      | 'zewdneshExpenses'
    )[] = ['mesfinIncome', 'mesfinExpenses', 'zewdneshDeposits', 'zewdneshExpenses'];

    ledgerTypes.forEach((lType) => {
      state[lType].forEach((entry, idx) => {
        const docId = sanitizeId(entry.id, `${lType}_${idx + 1}`);
        const ref = doc(db, 'workbooks', wbId, 'ledgerEntries', docId);
        batch.set(ref, {
          ownerId: uid,
          workbookId: wbId,
          ledgerType: lType,
          dateOrMonth: sanitizeString(entry.dateOrMonth, 80, 'ቀን'),
          description: sanitizeString(entry.description, 200, 'ዝርዝር'),
          category: sanitizeString(entry.category, 100, 'መዝገብ'),
          amount: sanitizeAmount(entry.amount),
          isPlaceholder: Boolean(entry.isPlaceholder),
          sortOrder: idx,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        });
      });
    });

    const monthlyGroceriesMap = ensureMonthlyGroceries(state);
    ETHIOPIAN_MONTHS.forEach((m) => {
      const monthItems = monthlyGroceriesMap[m.id] || [];
      const hasActivityOrTikimt =
        m.id === 'ጥቅምት' ||
        monthItems.some((item) => item.purchased || (Number(item.price) || 0) > 0) ||
        monthItems.length !== DEFAULT_GROCERY_ITEMS.length;

      if (!hasActivityOrTikimt) return;

      monthItems.forEach((g, idx) => {
        const docId = getGroceryDocIdForMonth(m.id, g.id, idx + 1);
        const ref = doc(db, 'workbooks', wbId, 'groceries', docId);
        batch.set(ref, {
          ownerId: uid,
          workbookId: wbId,
          itemIndex: Math.min(Math.max(1, g.index || idx + 1), 10000),
          name: sanitizeString(g.name, 120, 'ዕቃ'),
          nameEn: sanitizeString(g.nameEn || g.name, 120, 'Item'),
          category: sanitizeString(g.category, 100, 'መሰረታዊ ፍጆታ'),
          unit: sanitizeString(g.unit, 60, 'ኪሎግራም'),
          price: sanitizeAmount(g.price),
          purchased: Boolean(g.purchased),
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        });
      });
    });

    const monthlyWaterMap = ensureMonthlyWater(state);
    const ratePerUnit =
      Number(state.waterRatePerUnit) > 0 ? Number(state.waterRatePerUnit) : DEFAULT_WATER_RATE;
    ETHIOPIAN_MONTHS.forEach((m) => {
      const monthWaterItems = monthlyWaterMap[m.id] || [];
      const hasWaterActivity =
        m.id === 'መስከረም' ||
        m.id === 'ጥቅምት' ||
        monthWaterItems.some(
          (w) =>
            (Number(w.week1) || 0) > 0 ||
            (Number(w.week2) || 0) > 0 ||
            (Number(w.week3) || 0) > 0 ||
            (Number(w.week4) || 0) > 0 ||
            (Number(w.amountPaid) || 0) > 0 ||
            (w.depositOverride !== undefined && w.depositOverride !== null)
        ) ||
        monthWaterItems.length !== DEFAULT_WATER_MONTH1_ITEMS.length;

      if (!hasWaterActivity) return;

      monthWaterItems.forEach((w, idx) => {
        const docId = getWaterDocIdForMonth(m.id, w.id, idx + 1);
        const ref = doc(db, 'workbooks', wbId, 'waterRecords', docId);
        const hasOverride = w.depositOverride !== undefined && w.depositOverride !== null;
        batch.set(ref, {
          ownerId: uid,
          workbookId: wbId,
          itemIndex: Math.min(Math.max(1, w.index || idx + 1), 10000),
          name: sanitizeString(w.name, 120, 'ተጠቃሚ'),
          nameEn: sanitizeString(w.nameEn || w.name, 120, 'Member'),
          week1: sanitizeAmount(w.week1),
          week2: sanitizeAmount(w.week2),
          week3: sanitizeAmount(w.week3),
          week4: sanitizeAmount(w.week4),
          amountPaid: sanitizeAmount(w.amountPaid),
          ratePerUnit: sanitizeAmount(ratePerUnit),
          depositOverride: hasOverride ? sanitizeSignedAmount(w.depositOverride) : 0,
          hasDepositOverride: Boolean(hasOverride),
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        });
      });
    });

    await batch.commit();
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, batchPath);
  }
}

/**
 * Subscribes to live Firestore updates for `/workbooks/{wbId}` and all 4 subcollections.
 */
export function subscribeToWorkbook(
  uid: string,
  yearEC: string,
  onUpdate: (partial: Partial<WorkbookState>) => void
): () => void {
  const wbId = getWorkbookDocId(uid, yearEC);
  const unsubs: (() => void)[] = [];
  const lastFingerprints: Record<string, string> = {};

  const emitIfChanged = (channel: string, payload: Partial<WorkbookState>) => {
    const serialized = JSON.stringify(payload);
    if (lastFingerprints[channel] === serialized) {
      return;
    }
    lastFingerprints[channel] = serialized;
    onUpdate(payload);
  };

  // 1. Master workbook doc
  const wbPath = `workbooks/${wbId}`;
  unsubs.push(
    onSnapshot(
      doc(db, 'workbooks', wbId),
      (snap) => {
        if (snap.metadata.hasPendingWrites) return;
        if (snap.exists()) {
          const data = snap.data();
          emitIfChanged('master', {
            yearEC: String(data.yearEC || yearEC),
            sourceFileName: String(data.sourceFileName || 'Rental_Property_Expense.xlsx'),
            lastUpdated: String(data.lastUpdated || `ጥቅምት ${yearEC}`),
          });
        }
      },
      (err) => handleFirestoreError(err, OperationType.GET, wbPath)
    )
  );

  // 2. Tenants subcollection
  const tenantsPath = `workbooks/${wbId}/tenants`;
  unsubs.push(
    onSnapshot(
      query(collection(db, tenantsPath), where('ownerId', '==', uid)),
      (snap) => {
        if (snap.metadata.hasPendingWrites || snap.empty) return;
        const rows = snap.docs
          .map((d) => {
            const data = d.data();
            return {
              sortOrder: Number(data.sortOrder ?? 0),
              tenant: {
                id: d.id,
                tenantName: String(data.tenantName || ''),
                tenantNameEn: String(data.tenantNameEn || data.tenantName || ''),
                description: String(data.description || ''),
                splitLabel: String(data.splitLabel || ''),
                splitType: (data.splitType as SplitType) || '50_50',
                mesfinRatio: Number(data.mesfinRatio ?? 0.5),
                zewdneshRatio: Number(data.zewdneshRatio ?? 0.5),
                monthlyAmounts: fieldsToMonthlyMap(data),
              } satisfies TenantRentalRow,
            };
          })
          .sort((a, b) => a.sortOrder - b.sortOrder)
          .map((x) => x.tenant);
        emitIfChanged('tenants', { tenants: rows });
      },
      (err) => handleFirestoreError(err, OperationType.LIST, tenantsPath)
    )
  );

  // 3. PropertyExpenses subcollection
  const expPath = `workbooks/${wbId}/propertyExpenses`;
  unsubs.push(
    onSnapshot(
      query(collection(db, expPath), where('ownerId', '==', uid)),
      (snap) => {
        if (snap.metadata.hasPendingWrites || snap.empty) return;
        const rows = snap.docs
          .map((d) => {
            const data = d.data();
            return {
              sortOrder: Number(data.sortOrder ?? 0),
              expense: {
                id: d.id,
                expenseType: String(data.expenseType || ''),
                expenseTypeEn: String(data.expenseTypeEn || data.expenseType || ''),
                description: String(data.description || ''),
                splitLabel: String(data.splitLabel || ''),
                splitType: (data.splitType as SplitType) || '50_50',
                mesfinRatio: Number(data.mesfinRatio ?? 0.5),
                zewdneshRatio: Number(data.zewdneshRatio ?? 0.5),
                monthlyAmounts: fieldsToMonthlyMap(data),
              } satisfies PropertyExpenseRow,
            };
          })
          .sort((a, b) => a.sortOrder - b.sortOrder)
          .map((x) => x.expense);
        emitIfChanged('propertyExpenses', { propertyExpenses: rows });
      },
      (err) => handleFirestoreError(err, OperationType.LIST, expPath)
    )
  );

  // 4. LedgerEntries subcollection
  const ledgerPath = `workbooks/${wbId}/ledgerEntries`;
  unsubs.push(
    onSnapshot(
      query(collection(db, ledgerPath), where('ownerId', '==', uid)),
      (snap) => {
        if (snap.metadata.hasPendingWrites || snap.empty) return;
        const mInc: { sort: number; item: LedgerEntry }[] = [];
        const mExp: { sort: number; item: LedgerEntry }[] = [];
        const zDep: { sort: number; item: LedgerEntry }[] = [];
        const zExp: { sort: number; item: LedgerEntry }[] = [];

        snap.docs.forEach((d) => {
          const data = d.data();
          const entry: LedgerEntry = {
            id: d.id,
            dateOrMonth: String(data.dateOrMonth || ''),
            description: String(data.description || ''),
            category: String(data.category || ''),
            amount: Number(data.amount ?? 0),
            isPlaceholder: Boolean(data.isPlaceholder),
          };
          const sort = Number(data.sortOrder ?? 0);
          if (data.ledgerType === 'mesfinIncome') mInc.push({ sort, item: entry });
          else if (data.ledgerType === 'mesfinExpenses') mExp.push({ sort, item: entry });
          else if (data.ledgerType === 'zewdneshDeposits') zDep.push({ sort, item: entry });
          else if (data.ledgerType === 'zewdneshExpenses') zExp.push({ sort, item: entry });
        });

        emitIfChanged('ledgerEntries', {
          mesfinIncome: mInc.sort((a, b) => a.sort - b.sort).map((x) => x.item),
          mesfinExpenses: mExp.sort((a, b) => a.sort - b.sort).map((x) => x.item),
          zewdneshDeposits: zDep.sort((a, b) => a.sort - b.sort).map((x) => x.item),
          zewdneshExpenses: zExp.sort((a, b) => a.sort - b.sort).map((x) => x.item),
        });
      },
      (err) => handleFirestoreError(err, OperationType.LIST, ledgerPath)
    )
  );

  // 5. Groceries subcollection (supports all 12 Ethiopian months via docId prefix)
  const grocPath = `workbooks/${wbId}/groceries`;
  unsubs.push(
    onSnapshot(
      query(collection(db, grocPath), where('ownerId', '==', uid)),
      (snap) => {
        if (snap.metadata.hasPendingWrites || snap.empty) return;
        const buckets: Partial<Record<EthiopianMonth, GroceryItem[]>> = {};

        snap.docs.forEach((d) => {
          const data = d.data();
          const { month, itemId } = parseGroceryDocId(d.id);
          if (!buckets[month]) {
            buckets[month] = [];
          }
          buckets[month]!.push({
            id: itemId,
            index: Number(data.itemIndex ?? 1),
            name: String(data.name || ''),
            nameEn: String(data.nameEn || data.name || ''),
            category: String(data.category || 'መሰረታዊ ፍጆታ'),
            unit: String(data.unit || 'ኪሎግራም'),
            price: Number(data.price ?? 0),
            purchased: Boolean(data.purchased),
          });
        });

        const tikimtList = (buckets['ጥቅምት'] || DEFAULT_GROCERY_ITEMS)
          .slice()
          .sort((a, b) => a.index - b.index);

        const monthlyGroceries = {} as Record<EthiopianMonth, GroceryItem[]>;
        ETHIOPIAN_MONTHS.forEach((m) => {
          const mRows = buckets[m.id];
          const baseBlank = createBlankMonthGroceries(tikimtList);
          if (mRows && mRows.length > 0) {
            if (m.id === 'ጥቅምት' || mRows.length >= baseBlank.length) {
              monthlyGroceries[m.id] = mRows.slice().sort((a, b) => a.index - b.index);
            } else {
              const byId = new Map(mRows.map((item) => [item.id, item]));
              monthlyGroceries[m.id] = baseBlank.map((item, idx) => {
                const found = byId.get(item.id);
                return found ? { ...found, index: idx + 1 } : { ...item, index: idx + 1 };
              });
            }
          } else {
            monthlyGroceries[m.id] = baseBlank;
          }
        });

        emitIfChanged('groceries', {
          groceries: monthlyGroceries['ጥቅምት'],
          monthlyGroceries,
        });
      },
      (err) => handleFirestoreError(err, OperationType.LIST, grocPath)
    )
  );

  // 6. WaterRecords subcollection (supports all 12 Ethiopian months via docId prefix)
  const waterPath = `workbooks/${wbId}/waterRecords`;
  unsubs.push(
    onSnapshot(
      query(collection(db, waterPath), where('ownerId', '==', uid)),
      (snap) => {
        if (snap.metadata.hasPendingWrites || snap.empty) return;
        const buckets: Partial<Record<EthiopianMonth, WaterRecordItem[]>> = {};
        let detectedRate = DEFAULT_WATER_RATE;

        snap.docs.forEach((d) => {
          const data = d.data();
          const { month, itemId } = parseWaterDocId(d.id);
          if (!buckets[month]) {
            buckets[month] = [];
          }
          if (Number(data.ratePerUnit) > 0) {
            detectedRate = Number(data.ratePerUnit);
          }
          const hasOverride = Boolean(data.hasDepositOverride);
          buckets[month]!.push({
            id: itemId,
            index: Number(data.itemIndex ?? 1),
            name: String(data.name || ''),
            nameEn: String(data.nameEn || data.name || ''),
            week1: Number(data.week1 ?? 0),
            week2: Number(data.week2 ?? 0),
            week3: Number(data.week3 ?? 0),
            week4: Number(data.week4 ?? 0),
            amountPaid: Number(data.amountPaid ?? 0),
            depositOverride: hasOverride ? Number(data.depositOverride ?? 0) : null,
          });
        });

        const meskeremList = (buckets['መስከረም'] || DEFAULT_WATER_MONTH1_ITEMS)
          .slice()
          .sort((a, b) => a.index - b.index);

        const monthlyWater = {} as Record<EthiopianMonth, WaterRecordItem[]>;
        ETHIOPIAN_MONTHS.forEach((m) => {
          const mRows = buckets[m.id];
          const defaultForMonth =
            m.id === 'ጥቅምት' && yearEC === '2019 EC'
              ? DEFAULT_WATER_MONTH2_ITEMS.slice()
              : createBlankMonthWater(meskeremList);
          if (mRows && mRows.length > 0) {
            if (m.id === 'መስከረም' || mRows.length >= defaultForMonth.length) {
              monthlyWater[m.id] = mRows.slice().sort((a, b) => a.index - b.index);
            } else {
              const byId = new Map(mRows.map((item) => [item.id, item]));
              monthlyWater[m.id] = defaultForMonth.map((item, idx) => {
                const found = byId.get(item.id);
                return found ? { ...found, index: idx + 1 } : { ...item, index: idx + 1 };
              });
            }
          } else {
            monthlyWater[m.id] = defaultForMonth;
          }
        });

        emitIfChanged('waterRecords', {
          waterRatePerUnit: detectedRate,
          waterRecords: monthlyWater['መስከረም'],
          monthlyWater,
        });
      },
      (err) => handleFirestoreError(err, OperationType.LIST, waterPath)
    )
  );

  return () => {
    unsubs.forEach((u) => u());
  };
}

// Granular Firestore mutation helpers

export async function fsUpdateTenantMonth(
  uid: string,
  yearEC: string,
  tenantId: string,
  month: EthiopianMonth,
  amount: number
) {
  const wbId = getWorkbookDocId(uid, yearEC);
  const safeId = sanitizeId(tenantId);
  const path = `workbooks/${wbId}/tenants/${safeId}`;
  const fieldKey = MONTH_TO_FIELD_KEY[month];
  return scheduleDebouncedDocUpdate(`${path}:${fieldKey}`, async () => {
    try {
      await updateDoc(doc(db, 'workbooks', wbId, 'tenants', safeId), {
        [fieldKey]: sanitizeAmount(amount),
        updatedAt: serverTimestamp(),
      });
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, path);
    }
  });
}

export async function fsUpdateTenantSplit(
  uid: string,
  yearEC: string,
  tenantId: string,
  splitType: SplitType,
  mesfinRatio: number,
  zewdneshRatio: number,
  splitLabel: string
) {
  const wbId = getWorkbookDocId(uid, yearEC);
  const safeId = sanitizeId(tenantId);
  const path = `workbooks/${wbId}/tenants/${safeId}`;
  try {
    await updateDoc(doc(db, 'workbooks', wbId, 'tenants', safeId), {
      splitType,
      mesfinRatio: sanitizeRatio(mesfinRatio),
      zewdneshRatio: sanitizeRatio(zewdneshRatio),
      splitLabel: sanitizeString(splitLabel, 100, '50% መስፍን / 50% ዘውድነሽ'),
      updatedAt: serverTimestamp(),
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, path);
  }
}

export async function fsCreateTenant(
  uid: string,
  yearEC: string,
  tenant: TenantRentalRow,
  sortOrder: number
) {
  const wbId = getWorkbookDocId(uid, yearEC);
  const safeId = sanitizeId(tenant.id);
  const path = `workbooks/${wbId}/tenants/${safeId}`;
  try {
    await setDoc(doc(db, 'workbooks', wbId, 'tenants', safeId), {
      ownerId: uid,
      workbookId: wbId,
      tenantName: sanitizeString(tenant.tenantName, 100, 'ተከራይ'),
      tenantNameEn: sanitizeString(tenant.tenantNameEn || tenant.tenantName, 100, 'Tenant'),
      description: sanitizeString(tenant.description, 160, 'የመኖሪያ ቤት ኪራይ'),
      splitLabel: sanitizeString(tenant.splitLabel, 100, '50% መስፍን / 50% ዘውድነሽ'),
      splitType: tenant.splitType,
      mesfinRatio: sanitizeRatio(tenant.mesfinRatio),
      zewdneshRatio: sanitizeRatio(tenant.zewdneshRatio),
      ...monthlyMapToFields(tenant.monthlyAmounts),
      sortOrder,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, path);
  }
}

export async function fsDeleteTenant(uid: string, yearEC: string, tenantId: string) {
  const wbId = getWorkbookDocId(uid, yearEC);
  const safeId = sanitizeId(tenantId);
  const path = `workbooks/${wbId}/tenants/${safeId}`;
  try {
    await deleteDoc(doc(db, 'workbooks', wbId, 'tenants', safeId));
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, path);
  }
}

export async function fsUpdateExpenseMonth(
  uid: string,
  yearEC: string,
  expenseId: string,
  month: EthiopianMonth,
  amount: number
) {
  const wbId = getWorkbookDocId(uid, yearEC);
  const safeId = sanitizeId(expenseId);
  const path = `workbooks/${wbId}/propertyExpenses/${safeId}`;
  const fieldKey = MONTH_TO_FIELD_KEY[month];
  return scheduleDebouncedDocUpdate(`${path}:${fieldKey}`, async () => {
    try {
      await updateDoc(doc(db, 'workbooks', wbId, 'propertyExpenses', safeId), {
        [fieldKey]: sanitizeAmount(amount),
        updatedAt: serverTimestamp(),
      });
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, path);
    }
  });
}

export async function fsUpdateExpenseSplit(
  uid: string,
  yearEC: string,
  expenseId: string,
  splitType: SplitType,
  mesfinRatio: number,
  zewdneshRatio: number,
  splitLabel: string
) {
  const wbId = getWorkbookDocId(uid, yearEC);
  const safeId = sanitizeId(expenseId);
  const path = `workbooks/${wbId}/propertyExpenses/${safeId}`;
  try {
    await updateDoc(doc(db, 'workbooks', wbId, 'propertyExpenses', safeId), {
      splitType,
      mesfinRatio: sanitizeRatio(mesfinRatio),
      zewdneshRatio: sanitizeRatio(zewdneshRatio),
      splitLabel: sanitizeString(splitLabel, 100, 'የጋራ (50% - 50%)'),
      updatedAt: serverTimestamp(),
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, path);
  }
}

export async function fsCreatePropertyExpense(
  uid: string,
  yearEC: string,
  exp: PropertyExpenseRow,
  sortOrder: number
) {
  const wbId = getWorkbookDocId(uid, yearEC);
  const safeId = sanitizeId(exp.id);
  const path = `workbooks/${wbId}/propertyExpenses/${safeId}`;
  try {
    await setDoc(doc(db, 'workbooks', wbId, 'propertyExpenses', safeId), {
      ownerId: uid,
      workbookId: wbId,
      expenseType: sanitizeString(exp.expenseType, 100, 'ወጪ'),
      expenseTypeEn: sanitizeString(exp.expenseTypeEn || exp.expenseType, 100, 'Expense'),
      description: sanitizeString(exp.description, 160, 'ወርሃዊ ወጪ'),
      splitLabel: sanitizeString(exp.splitLabel, 100, 'የጋራ (50% - 50%)'),
      splitType: exp.splitType,
      mesfinRatio: sanitizeRatio(exp.mesfinRatio),
      zewdneshRatio: sanitizeRatio(exp.zewdneshRatio),
      ...monthlyMapToFields(exp.monthlyAmounts),
      sortOrder,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, path);
  }
}

export async function fsDeletePropertyExpense(uid: string, yearEC: string, expenseId: string) {
  const wbId = getWorkbookDocId(uid, yearEC);
  const safeId = sanitizeId(expenseId);
  const path = `workbooks/${wbId}/propertyExpenses/${safeId}`;
  try {
    await deleteDoc(doc(db, 'workbooks', wbId, 'propertyExpenses', safeId));
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, path);
  }
}

export async function fsUpdateLedgerEntry(
  uid: string,
  yearEC: string,
  entryId: string,
  field: 'dateOrMonth' | 'description' | 'amount',
  value: string | number
) {
  const wbId = getWorkbookDocId(uid, yearEC);
  const safeId = sanitizeId(entryId);
  const path = `workbooks/${wbId}/ledgerEntries/${safeId}`;
  const updatePayload: Record<string, unknown> = {
    updatedAt: serverTimestamp(),
  };
  if (field === 'dateOrMonth') {
    updatePayload.dateOrMonth = sanitizeString(value, 80, 'ቀን');
  } else if (field === 'description') {
    updatePayload.description = sanitizeString(value, 200, 'ዝርዝር');
  } else if (field === 'amount') {
    const amt = sanitizeAmount(value);
    updatePayload.amount = amt;
    updatePayload.isPlaceholder = amt === 0;
  }

  return scheduleDebouncedDocUpdate(`${path}:${field}`, async () => {
    try {
      await updateDoc(doc(db, 'workbooks', wbId, 'ledgerEntries', safeId), updatePayload);
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, path);
    }
  });
}

export async function fsCreateLedgerEntry(
  uid: string,
  yearEC: string,
  ledgerType: 'mesfinIncome' | 'mesfinExpenses' | 'zewdneshDeposits' | 'zewdneshExpenses',
  entry: LedgerEntry,
  sortOrder: number
) {
  const wbId = getWorkbookDocId(uid, yearEC);
  const safeId = sanitizeId(entry.id);
  const path = `workbooks/${wbId}/ledgerEntries/${safeId}`;
  try {
    await setDoc(doc(db, 'workbooks', wbId, 'ledgerEntries', safeId), {
      ownerId: uid,
      workbookId: wbId,
      ledgerType,
      dateOrMonth: sanitizeString(entry.dateOrMonth, 80, 'ቀን'),
      description: sanitizeString(entry.description, 200, 'ዝርዝር'),
      category: sanitizeString(entry.category, 100, 'መዝገብ'),
      amount: sanitizeAmount(entry.amount),
      isPlaceholder: Boolean(entry.isPlaceholder),
      sortOrder,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, path);
  }
}

export async function fsDeleteLedgerEntry(uid: string, yearEC: string, entryId: string) {
  const wbId = getWorkbookDocId(uid, yearEC);
  const safeId = sanitizeId(entryId);
  const path = `workbooks/${wbId}/ledgerEntries/${safeId}`;
  try {
    await deleteDoc(doc(db, 'workbooks', wbId, 'ledgerEntries', safeId));
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, path);
  }
}

export async function fsUpdateGroceryItem(
  uid: string,
  yearEC: string,
  groceryId: string,
  field: 'name' | 'category' | 'unit' | 'price' | 'purchased',
  value: string | number | boolean,
  month: EthiopianMonth = 'ጥቅምት',
  fullItem?: GroceryItem
) {
  const wbId = getWorkbookDocId(uid, yearEC);
  const safeId = getGroceryDocIdForMonth(month, groceryId);
  const path = `workbooks/${wbId}/groceries/${safeId}`;
  const updatePayload: Record<string, unknown> = {
    updatedAt: serverTimestamp(),
  };

  if (field === 'name') {
    const cleanName = sanitizeString(value, 120, 'ዕቃ');
    updatePayload.name = cleanName;
    updatePayload.nameEn = cleanName;
  } else if (field === 'category') {
    updatePayload.category = sanitizeString(value, 100, 'መሰረታዊ ፍጆታ');
  } else if (field === 'unit') {
    updatePayload.unit = sanitizeString(value, 60, 'ኪሎግራም');
  } else if (field === 'price') {
    updatePayload.price = sanitizeAmount(value);
  } else if (field === 'purchased') {
    updatePayload.purchased = Boolean(value);
  }

  const delayMs = field === 'purchased' || field === 'category' ? 150 : DEBOUNCE_WRITE_MS;
  return scheduleDebouncedDocUpdate(
    `${path}:${field}`,
    async () => {
      const docRef = doc(db, 'workbooks', wbId, 'groceries', safeId);
      try {
        const snap = await getDoc(docRef);
        if (!snap.exists() && fullItem) {
          const mergedItem: GroceryItem = {
            ...fullItem,
            [field]: value,
          } as GroceryItem;
          await setDoc(docRef, {
            ownerId: uid,
            workbookId: wbId,
            itemIndex: Math.min(Math.max(1, mergedItem.index || 1), 10000),
            name: sanitizeString(mergedItem.name, 120, 'ዕቃ'),
            nameEn: sanitizeString(mergedItem.nameEn || mergedItem.name, 120, 'Item'),
            category: sanitizeString(mergedItem.category, 100, 'መሰረታዊ ፍጆታ'),
            unit: sanitizeString(mergedItem.unit, 60, 'ኪሎግራም'),
            price: sanitizeAmount(mergedItem.price),
            purchased: Boolean(mergedItem.purchased),
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp(),
          });
          return;
        }
        await updateDoc(docRef, updatePayload);
      } catch (error) {
        handleFirestoreError(error, OperationType.UPDATE, path);
      }
    },
    delayMs
  );
}

export async function fsCreateGroceryItem(
  uid: string,
  yearEC: string,
  item: GroceryItem,
  month: EthiopianMonth = 'ጥቅምት'
) {
  const wbId = getWorkbookDocId(uid, yearEC);
  const safeId = getGroceryDocIdForMonth(month, item.id, item.index || 1);
  const path = `workbooks/${wbId}/groceries/${safeId}`;
  try {
    const batch = writeBatch(db);
    const ref = doc(db, 'workbooks', wbId, 'groceries', safeId);
    batch.set(ref, {
      ownerId: uid,
      workbookId: wbId,
      itemIndex: Math.min(Math.max(1, item.index || 1), 10000),
      name: sanitizeString(item.name, 120, 'ዕቃ'),
      nameEn: sanitizeString(item.nameEn || item.name, 120, 'Item'),
      category: sanitizeString(item.category, 100, 'መሰረታዊ ፍጆታ'),
      unit: sanitizeString(item.unit, 60, 'ኪሎግራም'),
      price: sanitizeAmount(item.price),
      purchased: Boolean(item.purchased),
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });

    if (month !== 'ጥቅምት') {
      const tikimtDocId = getGroceryDocIdForMonth('ጥቅምት', item.id, item.index || 1);
      const tikimtRef = doc(db, 'workbooks', wbId, 'groceries', tikimtDocId);
      const tikimtSnap = await getDoc(tikimtRef);
      if (!tikimtSnap.exists()) {
        batch.set(tikimtRef, {
          ownerId: uid,
          workbookId: wbId,
          itemIndex: Math.min(Math.max(1, item.index || 1), 10000),
          name: sanitizeString(item.name, 120, 'ዕቃ'),
          nameEn: sanitizeString(item.nameEn || item.name, 120, 'Item'),
          category: sanitizeString(item.category, 100, 'መሰረታዊ ፍጆታ'),
          unit: sanitizeString(item.unit, 60, 'ኪሎግራም'),
          price: 0,
          purchased: false,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        });
      }
    }

    await batch.commit();
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, path);
  }
}

export async function fsDeleteGroceryItem(
  uid: string,
  yearEC: string,
  groceryId: string,
  month: EthiopianMonth = 'ጥቅምት'
) {
  const wbId = getWorkbookDocId(uid, yearEC);
  const safeId = getGroceryDocIdForMonth(month, groceryId);
  const path = `workbooks/${wbId}/groceries/${safeId}`;
  try {
    const docRef = doc(db, 'workbooks', wbId, 'groceries', safeId);
    const snap = await getDoc(docRef);
    if (snap.exists()) {
      await deleteDoc(docRef);
    }
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, path);
  }
}

export async function fsSaveMonthGroceriesBatch(
  uid: string,
  yearEC: string,
  month: EthiopianMonth,
  items: GroceryItem[]
) {
  const wbId = getWorkbookDocId(uid, yearEC);
  const grocPath = `workbooks/${wbId}/groceries`;
  try {
    const q = query(collection(db, grocPath), where('ownerId', '==', uid));
    const snap = await getDocs(q);
    const existingForMonth = new Set<string>();

    snap.docs.forEach((d) => {
      const parsed = parseGroceryDocId(d.id);
      if (parsed.month === month) {
        existingForMonth.add(d.id);
      }
    });

    const batch = writeBatch(db);
    const keptDocIds = new Set<string>();

    items.forEach((g, idx) => {
      const docId = getGroceryDocIdForMonth(month, g.id, idx + 1);
      keptDocIds.add(docId);
      const ref = doc(db, 'workbooks', wbId, 'groceries', docId);
      const fieldsPayload = {
        itemIndex: Math.min(Math.max(1, g.index || idx + 1), 10000),
        name: sanitizeString(g.name, 120, 'ዕቃ'),
        nameEn: sanitizeString(g.nameEn || g.name, 120, 'Item'),
        category: sanitizeString(g.category, 100, 'መሰረታዊ ፍጆታ'),
        unit: sanitizeString(g.unit, 60, 'ኪሎግራም'),
        price: sanitizeAmount(g.price),
        purchased: Boolean(g.purchased),
        updatedAt: serverTimestamp(),
      };

      if (existingForMonth.has(docId)) {
        batch.update(ref, fieldsPayload);
      } else {
        batch.set(ref, {
          ownerId: uid,
          workbookId: wbId,
          ...fieldsPayload,
          createdAt: serverTimestamp(),
        });
      }
    });

    existingForMonth.forEach((existingDocId) => {
      if (!keptDocIds.has(existingDocId)) {
        batch.delete(doc(db, 'workbooks', wbId, 'groceries', existingDocId));
      }
    });

    await batch.commit();
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, grocPath);
  }
}

export async function fsUpdateWaterRecord(
  uid: string,
  yearEC: string,
  waterId: string,
  field: 'name' | 'week1' | 'week2' | 'week3' | 'week4' | 'amountPaid' | 'depositOverride',
  value: string | number | null,
  month: EthiopianMonth = 'መስከረም',
  fullItem?: WaterRecordItem,
  ratePerUnit: number = DEFAULT_WATER_RATE
) {
  const wbId = getWorkbookDocId(uid, yearEC);
  const safeId = getWaterDocIdForMonth(month, waterId);
  const path = `workbooks/${wbId}/waterRecords/${safeId}`;
  const updatePayload: Record<string, unknown> = {
    ratePerUnit: sanitizeAmount(ratePerUnit),
    updatedAt: serverTimestamp(),
  };

  if (field === 'name') {
    const cleanName = sanitizeString(value, 120, 'ተጠቃሚ');
    updatePayload.name = cleanName;
    updatePayload.nameEn = cleanName;
  } else if (
    field === 'week1' ||
    field === 'week2' ||
    field === 'week3' ||
    field === 'week4' ||
    field === 'amountPaid'
  ) {
    updatePayload[field] = sanitizeAmount(value);
  } else if (field === 'depositOverride') {
    const hasOverride = value !== null && value !== undefined && String(value).trim() !== '';
    updatePayload.depositOverride = hasOverride ? sanitizeSignedAmount(value) : 0;
    updatePayload.hasDepositOverride = Boolean(hasOverride);
  }

  return scheduleDebouncedDocUpdate(`${path}:${field}`, async () => {
    const docRef = doc(db, 'workbooks', wbId, 'waterRecords', safeId);
    try {
      const snap = await getDoc(docRef);
      if (!snap.exists() && fullItem) {
        const mergedItem: WaterRecordItem = {
          ...fullItem,
          [field]: value,
        } as WaterRecordItem;
        const hasOverride =
          mergedItem.depositOverride !== undefined && mergedItem.depositOverride !== null;
        await setDoc(docRef, {
          ownerId: uid,
          workbookId: wbId,
          itemIndex: Math.min(Math.max(1, mergedItem.index || 1), 10000),
          name: sanitizeString(mergedItem.name, 120, 'ተጠቃሚ'),
          nameEn: sanitizeString(mergedItem.nameEn || mergedItem.name, 120, 'Member'),
          week1: sanitizeAmount(mergedItem.week1),
          week2: sanitizeAmount(mergedItem.week2),
          week3: sanitizeAmount(mergedItem.week3),
          week4: sanitizeAmount(mergedItem.week4),
          amountPaid: sanitizeAmount(mergedItem.amountPaid),
          ratePerUnit: sanitizeAmount(ratePerUnit),
          depositOverride: hasOverride ? sanitizeSignedAmount(mergedItem.depositOverride) : 0,
          hasDepositOverride: Boolean(hasOverride),
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        });
      } else if (snap.exists()) {
        await updateDoc(docRef, updatePayload);
      }

      if (field === 'name' && month !== 'መስከረም') {
        const meskeremId = getWaterDocIdForMonth('መስከረም', waterId);
        const meskeremRef = doc(db, 'workbooks', wbId, 'waterRecords', meskeremId);
        const mSnap = await getDoc(meskeremRef);
        if (mSnap.exists()) {
          const cleanName = sanitizeString(value, 120, 'ተጠቃሚ');
          await updateDoc(meskeremRef, {
            name: cleanName,
            nameEn: cleanName,
            updatedAt: serverTimestamp(),
          });
        }
      }
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, path);
    }
  });
}

export async function fsCreateWaterRecord(
  uid: string,
  yearEC: string,
  item: WaterRecordItem,
  month: EthiopianMonth = 'መስከረም',
  ratePerUnit: number = DEFAULT_WATER_RATE
) {
  const wbId = getWorkbookDocId(uid, yearEC);
  const safeId = getWaterDocIdForMonth(month, item.id, item.index || 1);
  const path = `workbooks/${wbId}/waterRecords/${safeId}`;
  const hasOverride = item.depositOverride !== undefined && item.depositOverride !== null;
  try {
    const batch = writeBatch(db);
    const ref = doc(db, 'workbooks', wbId, 'waterRecords', safeId);
    batch.set(ref, {
      ownerId: uid,
      workbookId: wbId,
      itemIndex: Math.min(Math.max(1, item.index || 1), 10000),
      name: sanitizeString(item.name, 120, 'ተጠቃሚ'),
      nameEn: sanitizeString(item.nameEn || item.name, 120, 'Member'),
      week1: sanitizeAmount(item.week1),
      week2: sanitizeAmount(item.week2),
      week3: sanitizeAmount(item.week3),
      week4: sanitizeAmount(item.week4),
      amountPaid: sanitizeAmount(item.amountPaid),
      ratePerUnit: sanitizeAmount(ratePerUnit),
      depositOverride: hasOverride ? sanitizeSignedAmount(item.depositOverride) : 0,
      hasDepositOverride: Boolean(hasOverride),
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });

    if (month !== 'መስከረም') {
      const meskeremDocId = getWaterDocIdForMonth('መስከረም', item.id, item.index || 1);
      const meskeremRef = doc(db, 'workbooks', wbId, 'waterRecords', meskeremDocId);
      const meskeremSnap = await getDoc(meskeremRef);
      if (!meskeremSnap.exists()) {
        batch.set(meskeremRef, {
          ownerId: uid,
          workbookId: wbId,
          itemIndex: Math.min(Math.max(1, item.index || 1), 10000),
          name: sanitizeString(item.name, 120, 'ተጠቃሚ'),
          nameEn: sanitizeString(item.nameEn || item.name, 120, 'Member'),
          week1: 0,
          week2: 0,
          week3: 0,
          week4: 0,
          amountPaid: 0,
          ratePerUnit: sanitizeAmount(ratePerUnit),
          depositOverride: 0,
          hasDepositOverride: false,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        });
      }
    }

    await batch.commit();
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, path);
  }
}

export async function fsDeleteWaterRecord(
  uid: string,
  yearEC: string,
  waterId: string,
  month: EthiopianMonth = 'መስከረም'
) {
  const wbId = getWorkbookDocId(uid, yearEC);
  const safeId = getWaterDocIdForMonth(month, waterId);
  const path = `workbooks/${wbId}/waterRecords/${safeId}`;
  const cleanTargetId = sanitizeId(waterId.replace(/^m_[a-z]+__/, ''), 'w_1');
  try {
    const q = query(
      collection(db, `workbooks/${wbId}/waterRecords`),
      where('ownerId', '==', uid)
    );
    const snap = await getDocs(q);
    const batch = writeBatch(db);
    let hasDeletes = false;
    snap.docs.forEach((d) => {
      const parsed = parseWaterDocId(d.id);
      if (parsed.itemId === cleanTargetId || d.id === safeId) {
        batch.delete(d.ref);
        hasDeletes = true;
      }
    });
    if (hasDeletes) {
      await batch.commit();
    }
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, path);
  }
}

export async function fsSaveMonthWaterBatch(
  uid: string,
  yearEC: string,
  month: EthiopianMonth,
  items: WaterRecordItem[],
  ratePerUnit: number = DEFAULT_WATER_RATE
) {
  const wbId = getWorkbookDocId(uid, yearEC);
  const waterPath = `workbooks/${wbId}/waterRecords`;
  try {
    const q = query(collection(db, waterPath), where('ownerId', '==', uid));
    const snap = await getDocs(q);
    const existingForMonth = new Set<string>();

    snap.docs.forEach((d) => {
      const parsed = parseWaterDocId(d.id);
      if (parsed.month === month) {
        existingForMonth.add(d.id);
      }
    });

    const batch = writeBatch(db);
    const keptDocIds = new Set<string>();

    items.forEach((w, idx) => {
      const docId = getWaterDocIdForMonth(month, w.id, idx + 1);
      keptDocIds.add(docId);
      const ref = doc(db, 'workbooks', wbId, 'waterRecords', docId);
      const hasOverride = w.depositOverride !== undefined && w.depositOverride !== null;
      const fieldsPayload = {
        itemIndex: Math.min(Math.max(1, w.index || idx + 1), 10000),
        name: sanitizeString(w.name, 120, 'ተጠቃሚ'),
        nameEn: sanitizeString(w.nameEn || w.name, 120, 'Member'),
        week1: sanitizeAmount(w.week1),
        week2: sanitizeAmount(w.week2),
        week3: sanitizeAmount(w.week3),
        week4: sanitizeAmount(w.week4),
        amountPaid: sanitizeAmount(w.amountPaid),
        ratePerUnit: sanitizeAmount(ratePerUnit),
        depositOverride: hasOverride ? sanitizeSignedAmount(w.depositOverride) : 0,
        hasDepositOverride: Boolean(hasOverride),
        updatedAt: serverTimestamp(),
      };

      if (existingForMonth.has(docId)) {
        batch.update(ref, fieldsPayload);
      } else {
        batch.set(ref, {
          ownerId: uid,
          workbookId: wbId,
          ...fieldsPayload,
          createdAt: serverTimestamp(),
        });
      }
    });

    existingForMonth.forEach((existingDocId) => {
      if (!keptDocIds.has(existingDocId)) {
        batch.delete(doc(db, 'workbooks', wbId, 'waterRecords', existingDocId));
      }
    });

    await batch.commit();
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, waterPath);
  }
}
