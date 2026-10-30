export type EthiopianMonth =
  | 'መስከረም'
  | 'ጥቅምት'
  | 'ኅዳር'
  | 'ታኅሣሥ'
  | 'ጥር'
  | 'የካቲት'
  | 'መጋቢት'
  | 'ሚያዝያ'
  | 'ግንቦት'
  | 'ሰኔ'
  | 'ሐምሌ'
  | 'ነሐሴ';

export const ETHIOPIAN_MONTHS: { id: EthiopianMonth; labelAm: string; labelEn: string }[] = [
  { id: 'መስከረም', labelAm: 'መስከረም', labelEn: 'Meskerem (Sep/Oct)' },
  { id: 'ጥቅምት', labelAm: 'ጥቅምት', labelEn: 'Tikimt (Oct/Nov)' },
  { id: 'ኅዳር', labelAm: 'ኅዳር', labelEn: 'Hidar (Nov/Dec)' },
  { id: 'ታኅሣሥ', labelAm: 'ታኅሣሥ', labelEn: 'Tahsas (Dec/Jan)' },
  { id: 'ጥር', labelAm: 'ጥር', labelEn: 'Tir (Jan/Feb)' },
  { id: 'የካቲት', labelAm: 'የካቲት', labelEn: 'Yekatit (Feb/Mar)' },
  { id: 'መጋቢት', labelAm: 'መጋቢት', labelEn: 'Megabit (Mar/Apr)' },
  { id: 'ሚያዝያ', labelAm: 'ሚያዝያ', labelEn: 'Miyazya (Apr/May)' },
  { id: 'ግንቦት', labelAm: 'ግንቦት', labelEn: 'Ginbot (May/Jun)' },
  { id: 'ሰኔ', labelAm: 'ሰኔ', labelEn: 'Sene (Jun/Jul)' },
  { id: 'ሐምሌ', labelAm: 'ሐምሌ', labelEn: 'Hamle (Jul/Aug)' },
  { id: 'ነሐሴ', labelAm: 'ነሐሴ', labelEn: 'Nehase (Aug/Sep)' },
];

export type SplitType = '50_50' | '100_MESFIN' | '100_ZEWDNESH' | 'CUSTOM_RATIO';

export interface ShareRuleConfig {
  id: string;
  code: string;
  labelAm: string;
  labelEn: string;
  splitType: SplitType;
  mesfinRatio: number; // 0 to 1
  zewdneshRatio: number; // 0 to 1
  appliesTo: 'BOTH' | 'INCOME' | 'EXPENSE';
  isSystemDefault?: boolean;
}

export const DEFAULT_SHARE_RULES: ShareRuleConfig[] = [
  {
    id: 'rule-50-50',
    code: '50_50',
    labelAm: '50% መስፍን / 50% ዘውድነሽ',
    labelEn: 'Equal Split (50% Mesfin / 50% Zewdnesh)',
    splitType: '50_50',
    mesfinRatio: 0.5,
    zewdneshRatio: 0.5,
    appliesTo: 'BOTH',
    isSystemDefault: true,
  },
  {
    id: 'rule-100-mesfin',
    code: '100_MESFIN',
    labelAm: '100% መስፍን',
    labelEn: '100% Mesfin Allocation',
    splitType: '100_MESFIN',
    mesfinRatio: 1.0,
    zewdneshRatio: 0.0,
    appliesTo: 'BOTH',
    isSystemDefault: true,
  },
  {
    id: 'rule-100-zewdnesh',
    code: '100_ZEWDNESH',
    labelAm: '100% ዘውድነሽ',
    labelEn: '100% Zewdnesh Allocation',
    splitType: '100_ZEWDNESH',
    mesfinRatio: 0.0,
    zewdneshRatio: 1.0,
    appliesTo: 'BOTH',
    isSystemDefault: true,
  },
  {
    id: 'rule-20-80-elec',
    code: 'CUSTOM_20_80',
    labelAm: 'መስፍን (-200) / ዘውድነሽ (-800)',
    labelEn: 'Electricity Utility Split (20% Mesfin / 80% Zewdnesh)',
    splitType: 'CUSTOM_RATIO',
    mesfinRatio: 0.2,
    zewdneshRatio: 0.8,
    appliesTo: 'EXPENSE',
    isSystemDefault: true,
  },
];

export interface TenantRentalRow {
  id: string;
  tenantName: string;
  tenantNameEn: string;
  description: string;
  splitLabel: string;
  splitType: SplitType;
  mesfinRatio: number; // 0 to 1
  zewdneshRatio: number; // 0 to 1
  monthlyAmounts: Record<EthiopianMonth, number>;
}

export interface PropertyExpenseRow {
  id: string;
  expenseType: string;
  expenseTypeEn: string;
  description: string;
  splitLabel: string;
  splitType: SplitType;
  mesfinRatio: number; // 0 to 1
  zewdneshRatio: number; // 0 to 1
  monthlyAmounts: Record<EthiopianMonth, number>;
}

export interface LedgerEntry {
  id: string;
  dateOrMonth: string;
  description: string;
  category: string;
  amount: number;
  isPlaceholder?: boolean;
}

export interface GroceryItem {
  id: string;
  index: number;
  name: string;
  nameEn: string;
  category: string;
  unit: string;
  price: number;
  purchased: boolean; // ተገዝቷል = true, አልተገዛም = false
}

export interface WaterRecordItem {
  id: string;
  index: number;
  name: string;
  nameEn: string;
  week1: number;
  week2: number;
  week3: number;
  week4: number;
  amountPaid: number;
  depositOverride?: number | null;
}

export const DEFAULT_WATER_RATE = 2;

export interface WorkbookState {
  yearEC: string;
  sourceFileName: string;
  lastUpdated: string;
  tenants: TenantRentalRow[];
  propertyExpenses: PropertyExpenseRow[];
  mesfinIncome: LedgerEntry[];
  mesfinExpenses: LedgerEntry[];
  zewdneshDeposits: LedgerEntry[];
  zewdneshExpenses: LedgerEntry[];
  groceries: GroceryItem[];
  monthlyGroceries?: Record<EthiopianMonth, GroceryItem[]>;
  waterRatePerUnit?: number;
  waterRecords?: WaterRecordItem[];
  monthlyWater?: Record<EthiopianMonth, WaterRecordItem[]>;
}

export const createMonthlyMap = (tikimtVal: number): Record<EthiopianMonth, number> => ({
  'መስከረም': 0,
  'ጥቅምት': tikimtVal,
  'ኅዳር': 0,
  'ታኅሣሥ': 0,
  'ጥር': 0,
  'የካቲት': 0,
  'መጋቢት': 0,
  'ሚያዝያ': 0,
  'ግንቦት': 0,
  'ሰኔ': 0,
  'ሐምሌ': 0,
  'ነሐሴ': 0,
});

export const DEFAULT_WATER_MONTH1_ITEMS: WaterRecordItem[] = [
  { id: 'w-1', index: 1, name: 'በላይነሽ', nameEn: 'Belaynesh', week1: 12, week2: 15, week3: 8, week4: 10, amountPaid: 100, depositOverride: 0 },
  { id: 'w-2', index: 2, name: 'ልብነሽ', nameEn: 'Libnesh', week1: 14, week2: 18, week3: 6, week4: 12, amountPaid: 120, depositOverride: 0 },
  { id: 'w-3', index: 3, name: 'ጋዲሴ', nameEn: 'Gadise', week1: 9, week2: 11, week3: 16, week4: 14, amountPaid: 115, depositOverride: 0 },
  { id: 'w-4', index: 4, name: 'ደስታ', nameEn: 'Desta', week1: 7, week2: 13, week3: 10, week4: 15, amountPaid: 95, depositOverride: 0 },
  { id: 'w-5', index: 5, name: 'ገነት', nameEn: 'Genet', week1: 20, week2: 5, week3: 15, week4: 10, amountPaid: 100, depositOverride: 0 },
  { id: 'w-6', index: 6, name: 'ቲጂ', nameEn: 'TG', week1: 8, week2: 12, week3: 14, week4: 6, amountPaid: 90, depositOverride: 0 },
  { id: 'w-7', index: 7, name: 'ለምለም', nameEn: 'Lemlem', week1: 11, week2: 9, week3: 17, week4: 13, amountPaid: 110, depositOverride: 0 },
  { id: 'w-8', index: 8, name: 'አስረስ', nameEn: 'Asres', week1: 15, week2: 7, week3: 11, week4: 9, amountPaid: 100, depositOverride: 0 },
  { id: 'w-9', index: 9, name: 'ወይንሸት', nameEn: 'Weynshet', week1: 6, week2: 14, week3: 10, week4: 8, amountPaid: 80, depositOverride: 0 },
  { id: 'w-10', index: 10, name: 'ተወልደ', nameEn: 'Tewolde', week1: 10, week2: 16, week3: 12, week4: 7, amountPaid: 100, depositOverride: 0 },
];

export const DEFAULT_WATER_MONTH2_ITEMS: WaterRecordItem[] = [
  { id: 'w-1', index: 1, name: 'በላይነሽ', nameEn: 'Belaynesh', week1: 10, week2: 14, week3: 6, week4: 15, amountPaid: 0, depositOverride: null },
  { id: 'w-2', index: 2, name: 'ልብነሽ', nameEn: 'Libnesh', week1: 8, week2: 12, week3: 11, week4: 9, amountPaid: 0, depositOverride: null },
  { id: 'w-3', index: 3, name: 'ጋዲሴ', nameEn: 'Gadise', week1: 15, week2: 7, week3: 13, week4: 10, amountPaid: 0, depositOverride: null },
  { id: 'w-4', index: 4, name: 'ደስታ', nameEn: 'Desta', week1: 11, week2: 16, week3: 8, week4: 12, amountPaid: 0, depositOverride: null },
  { id: 'w-5', index: 5, name: 'ገነት', nameEn: 'Genet', week1: 14, week2: 10, week3: 18, week4: 6, amountPaid: 0, depositOverride: null },
  { id: 'w-6', index: 6, name: 'ቲጂ', nameEn: 'TG', week1: 9, week2: 13, week3: 15, week4: 11, amountPaid: 0, depositOverride: null },
  { id: 'w-7', index: 7, name: 'ለምለም', nameEn: 'Lemlem', week1: 12, week2: 8, week3: 19, week4: 7, amountPaid: 0, depositOverride: null },
  { id: 'w-8', index: 8, name: 'አስረስ', nameEn: 'Asres', week1: 16, week2: 11, week3: 9, week4: 14, amountPaid: 0, depositOverride: null },
  { id: 'w-9', index: 9, name: 'ወይንሸት', nameEn: 'Weynshet', week1: 7, week2: 13, week3: 10, week4: 12, amountPaid: 0, depositOverride: null },
  { id: 'w-10', index: 10, name: 'ተወልደ', nameEn: 'Tewolde', week1: 18, week2: 14, week3: 5, week4: 13, amountPaid: 0, depositOverride: null },
];

export const createBlankMonthWater = (
  templateItems: WaterRecordItem[] = DEFAULT_WATER_MONTH1_ITEMS
): WaterRecordItem[] =>
  templateItems.map((item, idx) => ({
    id: item.id || `w-${idx + 1}`,
    index: idx + 1,
    name: item.name,
    nameEn: item.nameEn || item.name,
    week1: 0,
    week2: 0,
    week3: 0,
    week4: 0,
    amountPaid: 0,
    depositOverride: null,
  }));

export const createMonthlyWaterMap = (
  seedDefaultMonths = true,
  templateItems: WaterRecordItem[] = DEFAULT_WATER_MONTH1_ITEMS
): Record<EthiopianMonth, WaterRecordItem[]> => {
  const result = {} as Record<EthiopianMonth, WaterRecordItem[]>;
  ETHIOPIAN_MONTHS.forEach((m) => {
    if (seedDefaultMonths && m.id === 'መስከረም') {
      result[m.id] = DEFAULT_WATER_MONTH1_ITEMS.map((item, idx) => ({
        ...item,
        index: idx + 1,
      }));
    } else if (seedDefaultMonths && m.id === 'ጥቅምት') {
      result[m.id] = DEFAULT_WATER_MONTH2_ITEMS.map((item, idx) => ({
        ...item,
        index: idx + 1,
      }));
    } else {
      result[m.id] = createBlankMonthWater(templateItems);
    }
  });
  return result;
};

export const getWaterForMonth = (
  state: WorkbookState,
  month: EthiopianMonth
): WaterRecordItem[] => {
  if (
    state.monthlyWater &&
    Array.isArray(state.monthlyWater[month]) &&
    state.monthlyWater[month].length > 0
  ) {
    return state.monthlyWater[month];
  }
  const fallbackTemplate =
    Array.isArray(state.waterRecords) && state.waterRecords.length > 0
      ? state.waterRecords
      : DEFAULT_WATER_MONTH1_ITEMS;
  const isDefaultYear = !state.yearEC || state.yearEC === '2019 EC';
  if (isDefaultYear && month === 'መስከረም') {
    return DEFAULT_WATER_MONTH1_ITEMS.map((item, idx) => ({ ...item, index: idx + 1 }));
  }
  if (isDefaultYear && month === 'ጥቅምት') {
    return DEFAULT_WATER_MONTH2_ITEMS.map((item, idx) => ({ ...item, index: idx + 1 }));
  }
  return createBlankMonthWater(fallbackTemplate);
};

export const ensureMonthlyWater = (
  state: WorkbookState
): Record<EthiopianMonth, WaterRecordItem[]> => {
  const result = {} as Record<EthiopianMonth, WaterRecordItem[]>;
  ETHIOPIAN_MONTHS.forEach((m) => {
    result[m.id] = getWaterForMonth(state, m.id).map((item, idx) => ({
      ...item,
      index: idx + 1,
    }));
  });
  return result;
};

export const DEFAULT_GROCERY_ITEMS: GroceryItem[] = [
  { id: 'g-1', index: 1, name: 'ዘይት (5 ሊትር)', nameEn: 'Cooking Oil (5L)', category: 'መሰረታዊ ፍጆታ', unit: '5 ሊትር', price: 2000, purchased: true },
  { id: 'g-2', index: 2, name: 'ጨው', nameEn: 'Salt', category: 'ቅመማቅመም', unit: 'ፓኬት', price: 70, purchased: true },
  { id: 'g-3', index: 3, name: 'ስኳር', nameEn: 'Sugar', category: 'መሰረታዊ ፍጆታ', unit: 'ኪሎግራም', price: 530, purchased: true },
  { id: 'g-4', index: 4, name: 'ድፍን ምስር', nameEn: 'Whole Lentils', category: 'ጥራጥሬ', unit: 'ኪሎግራም', price: 0, purchased: false },
  { id: 'g-5', index: 5, name: 'ክክ ምስር', nameEn: 'Split Lentils', category: 'ጥራጥሬ', unit: 'ኪሎግራም', price: 0, purchased: false },
  { id: 'g-6', index: 6, name: 'አተር', nameEn: 'Peas', category: 'ጥራጥሬ', unit: 'ኪሎግራም', price: 0, purchased: false },
  { id: 'g-7', index: 7, name: 'ድንች', nameEn: 'Potatoes', category: 'አትክልት', unit: 'ኪሎግራም', price: 65, purchased: true },
  { id: 'g-8', index: 8, name: 'ሩዝ', nameEn: 'Rice', category: 'እህልና እህላማ', unit: 'ኪሎግራም', price: 0, purchased: false },
  { id: 'g-9', index: 9, name: 'ፓስታ', nameEn: 'Pasta', category: 'የዱቄት ውጤቶች', unit: 'ፓኬት', price: 0, purchased: false },
  { id: 'g-10', index: 10, name: 'መኮረኒ', nameEn: 'Macaroni', category: 'የዱቄት ውጤቶች', unit: 'ፓኬት', price: 0, purchased: false },
  { id: 'g-11', index: 11, name: 'ሻይ ቅጠል', nameEn: 'Tea Leaves', category: 'መሰረታዊ ፍጆታ', unit: 'ፓኬት', price: 0, purchased: false },
  { id: 'g-12', index: 12, name: 'ነጭ ሽንኩርት', nameEn: 'Garlic', category: 'አትክልት', unit: 'ኪሎግራም', price: 0, purchased: false },
  { id: 'g-13', index: 13, name: 'ቀይ ሽንኩርት', nameEn: 'Red Onion', category: 'አትክልት', unit: 'ኪሎግራም', price: 0, purchased: false },
  { id: 'g-14', index: 14, name: 'ቀይ ስር', nameEn: 'Beetroot', category: 'አትክልት', unit: 'ኪሎግራም', price: 0, purchased: false },
  { id: 'g-15', index: 15, name: 'ካሮት', nameEn: 'Carrots', category: 'አትክልት', unit: 'ኪሎግራም', price: 0, purchased: false },
  { id: 'g-16', index: 16, name: 'ጥቅል ጎመን', nameEn: 'Cabbage', category: 'አትክልት', unit: 'በቁጥር', price: 0, purchased: false },
  { id: 'g-17', index: 17, name: 'ዱቄት', nameEn: 'Flour', category: 'እህልና እህላማ', unit: 'ኪሎግራም', price: 0, purchased: false },
  { id: 'g-18', index: 18, name: 'የጓሮ ማዳበሪያ', nameEn: 'Garden Fertilizer', category: 'የጓሮ እንክብካቤ', unit: 'ኪሎግራም', price: 0, purchased: false },
  { id: 'g-19', index: 19, name: 'ቲማቲም', nameEn: 'Tomatoes', category: 'አትክልት', unit: 'ኪሎግራም', price: 0, purchased: false },
];

export const createBlankMonthGroceries = (
  templateItems: GroceryItem[] = DEFAULT_GROCERY_ITEMS
): GroceryItem[] =>
  templateItems.map((item, idx) => ({
    ...item,
    id: item.id || `g-${idx + 1}`,
    index: idx + 1,
    price: 0,
    purchased: false,
  }));

export const createMonthlyGroceriesMap = (
  tikimtItems: GroceryItem[] = DEFAULT_GROCERY_ITEMS,
  activeMonth: EthiopianMonth | null = 'ጥቅምት'
): Record<EthiopianMonth, GroceryItem[]> => {
  const result = {} as Record<EthiopianMonth, GroceryItem[]>;
  ETHIOPIAN_MONTHS.forEach((m) => {
    if (activeMonth && m.id === activeMonth) {
      result[m.id] = tikimtItems.map((item, idx) => ({
        ...item,
        index: idx + 1,
      }));
    } else {
      result[m.id] = createBlankMonthGroceries(tikimtItems);
    }
  });
  return result;
};

export const getGroceriesForMonth = (
  state: WorkbookState,
  month: EthiopianMonth
): GroceryItem[] => {
  if (
    state.monthlyGroceries &&
    Array.isArray(state.monthlyGroceries[month]) &&
    state.monthlyGroceries[month].length > 0
  ) {
    return state.monthlyGroceries[month];
  }
  const fallbackTemplate =
    Array.isArray(state.groceries) && state.groceries.length > 0
      ? state.groceries
      : DEFAULT_GROCERY_ITEMS;
  if (month === 'ጥቅምት') {
    return fallbackTemplate;
  }
  return createBlankMonthGroceries(fallbackTemplate);
};

export const ensureMonthlyGroceries = (
  state: WorkbookState
): Record<EthiopianMonth, GroceryItem[]> => {
  const result = {} as Record<EthiopianMonth, GroceryItem[]>;
  ETHIOPIAN_MONTHS.forEach((m) => {
    result[m.id] = getGroceriesForMonth(state, m.id).map((item, idx) => ({
      ...item,
      index: idx + 1,
    }));
  });
  return result;
};

export const INITIAL_WORKBOOK_STATE: WorkbookState = {
  yearEC: '2019 EC',
  sourceFileName: 'Rental_Property_Expense_683e5269.xlsx',
  lastUpdated: 'ጥቅምት 2019 EC',
  tenants: [
    {
      id: 't-1',
      tenantName: 'በቀለ',
      tenantNameEn: 'Bekele',
      description: 'የመኖሪያ ቤት ኪራይ',
      splitLabel: '50% መስፍን / 50% ዘውድነሽ',
      splitType: '50_50',
      mesfinRatio: 0.5,
      zewdneshRatio: 0.5,
      monthlyAmounts: createMonthlyMap(7000),
    },
    {
      id: 't-2',
      tenantName: 'ልብነሽ',
      tenantNameEn: 'Libnesh',
      description: 'የመኖሪያ ቤት ኪራይ',
      splitLabel: '50% መስፍን / 50% ዘውድነሽ',
      splitType: '50_50',
      mesfinRatio: 0.5,
      zewdneshRatio: 0.5,
      monthlyAmounts: createMonthlyMap(7000),
    },
    {
      id: 't-3',
      tenantName: 'ጋዲሴ',
      tenantNameEn: 'Gadise',
      description: 'የመኖሪያ ቤት ኪራይ',
      splitLabel: '50% መስፍን / 50% ዘውድነሽ',
      splitType: '50_50',
      mesfinRatio: 0.5,
      zewdneshRatio: 0.5,
      monthlyAmounts: createMonthlyMap(2000),
    },
    {
      id: 't-4',
      tenantName: 'ደስታ',
      tenantNameEn: 'Desta',
      description: 'የመኖሪያ ቤት ኪራይ',
      splitLabel: '100% መስፍን',
      splitType: '100_MESFIN',
      mesfinRatio: 1.0,
      zewdneshRatio: 0.0,
      monthlyAmounts: createMonthlyMap(4000),
    },
    {
      id: 't-5',
      tenantName: 'ገነት',
      tenantNameEn: 'Genet',
      description: 'የመኖሪያ ቤት ኪራይ',
      splitLabel: '100% መስፍን',
      splitType: '100_MESFIN',
      mesfinRatio: 1.0,
      zewdneshRatio: 0.0,
      monthlyAmounts: createMonthlyMap(4000),
    },
    {
      id: 't-6',
      tenantName: 'ገዛህኝ',
      tenantNameEn: 'Gezahegn',
      description: 'የመኖሪያ ቤት ኪራይ',
      splitLabel: '100% መስፍን',
      splitType: '100_MESFIN',
      mesfinRatio: 1.0,
      zewdneshRatio: 0.0,
      monthlyAmounts: createMonthlyMap(11000),
    },
    {
      id: 't-7',
      tenantName: 'ለምለም',
      tenantNameEn: 'Lemlem',
      description: 'የመኖሪያ ቤት ኪራይ',
      splitLabel: '100% ዘውድነሽ',
      splitType: '100_ZEWDNESH',
      mesfinRatio: 0.0,
      zewdneshRatio: 1.0,
      monthlyAmounts: createMonthlyMap(5000),
    },
    {
      id: 't-8',
      tenantName: 'አስረስ',
      tenantNameEn: 'Asres',
      description: 'የመኖሪያ ቤት ኪራይ',
      splitLabel: '100% ዘውድነሽ',
      splitType: '100_ZEWDNESH',
      mesfinRatio: 0.0,
      zewdneshRatio: 1.0,
      monthlyAmounts: createMonthlyMap(1300),
    },
    {
      id: 't-9',
      tenantName: 'ወይንሸት',
      tenantNameEn: 'Weynshet',
      description: 'የመኖሪያ ቤት ኪራይ',
      splitLabel: '100% ዘውድነሽ',
      splitType: '100_ZEWDNESH',
      mesfinRatio: 0.0,
      zewdneshRatio: 1.0,
      monthlyAmounts: createMonthlyMap(1000),
    },
  ],
  propertyExpenses: [
    {
      id: 'exp-1',
      expenseType: 'ጥበቃ',
      expenseTypeEn: 'Security Service',
      description: 'የጥበቃ አገልግሎት',
      splitLabel: 'የጋራ (50% - 50%)',
      splitType: '50_50',
      mesfinRatio: 0.5,
      zewdneshRatio: 0.5,
      monthlyAmounts: createMonthlyMap(400),
    },
    {
      id: 'exp-2',
      expenseType: 'መብራት',
      expenseTypeEn: 'Electricity Utility',
      description: 'የኤሌክትሪክ ፍጆታ ክፍያ',
      splitLabel: 'መስፍን (-200) / ዘውድነሽ (-800)',
      splitType: 'CUSTOM_RATIO',
      mesfinRatio: 0.2,
      zewdneshRatio: 0.8,
      monthlyAmounts: createMonthlyMap(1000),
    },
    {
      id: 'exp-3',
      expenseType: 'እቁብ',
      expenseTypeEn: 'Equb Contribution',
      description: 'የእቁብ መዋጮ',
      splitLabel: '100% ዘውድነሽ',
      splitType: '100_ZEWDNESH',
      mesfinRatio: 0.0,
      zewdneshRatio: 1.0,
      monthlyAmounts: createMonthlyMap(0),
    },
    {
      id: 'exp-4',
      expenseType: 'እድር',
      expenseTypeEn: 'Idir Contribution',
      description: 'የእድር ተቀማጭ / መዋጮ',
      splitLabel: '100% ዘውድነሽ',
      splitType: '100_ZEWDNESH',
      mesfinRatio: 0.0,
      zewdneshRatio: 1.0,
      monthlyAmounts: createMonthlyMap(400),
    },
    {
      id: 'exp-5',
      expenseType: 'አስቤዛ',
      expenseTypeEn: 'Groceries & Supplies',
      description: 'የአስቤዛ እና የፍጆታ እቃዎች',
      splitLabel: '100% ዘውድነሽ',
      splitType: '100_ZEWDNESH',
      mesfinRatio: 0.0,
      zewdneshRatio: 1.0,
      monthlyAmounts: createMonthlyMap(0),
    },
    {
      id: 'exp-6',
      expenseType: 'ዝናሽ',
      expenseTypeEn: 'Zinash Special Allocation',
      description: 'ልዩ ድልድል',
      splitLabel: '100% ዘውድነሽ',
      splitType: '100_ZEWDNESH',
      mesfinRatio: 0.0,
      zewdneshRatio: 1.0,
      monthlyAmounts: createMonthlyMap(0),
    },
    {
      id: 'exp-7',
      expenseType: 'ጥገና',
      expenseTypeEn: 'Property Maintenance',
      description: 'የጥገና እና ክብካቤ ስራ',
      splitLabel: 'የጋራ (50% - 50%)',
      splitType: '50_50',
      mesfinRatio: 0.5,
      zewdneshRatio: 0.5,
      monthlyAmounts: createMonthlyMap(0),
    },
    {
      id: 'exp-8',
      expenseType: 'የኪራይ ግብር',
      expenseTypeEn: 'Rental Income Tax',
      description: 'የኪራይ ገቢ ግብር ክፍያ',
      splitLabel: 'የጋራ (50% - 50%)',
      splitType: '50_50',
      mesfinRatio: 0.5,
      zewdneshRatio: 0.5,
      monthlyAmounts: createMonthlyMap(0),
    },
    {
      id: 'exp-9',
      expenseType: 'የመሬት ግብር',
      expenseTypeEn: 'Land & Tenure Tax',
      description: 'የመሬት እና የይዞታ ግብር ክፍያ',
      splitLabel: 'የጋራ (50% - 50%)',
      splitType: '50_50',
      mesfinRatio: 0.5,
      zewdneshRatio: 0.5,
      monthlyAmounts: createMonthlyMap(0),
    },
    {
      id: 'exp-10',
      expenseType: 'የውሃ ክፍያ',
      expenseTypeEn: 'Water Utility',
      description: 'የውሃ እና የተለያዩ መገልገያዎች ክፍያ',
      splitLabel: 'የጋራ (50% - 50%)',
      splitType: '50_50',
      mesfinRatio: 0.5,
      zewdneshRatio: 0.5,
      monthlyAmounts: createMonthlyMap(0),
    },
    {
      id: 'exp-11',
      expenseType: 'የማዘጋጃ ቤት',
      expenseTypeEn: 'Municipality Fee',
      description: 'የማዘጋጃ ቤት እና የአካባቢ ክፍያዎች',
      splitLabel: 'የጋራ (50% - 50%)',
      splitType: '50_50',
      mesfinRatio: 0.5,
      zewdneshRatio: 0.5,
      monthlyAmounts: createMonthlyMap(0),
    },
  ],
  mesfinIncome: [
    {
      id: 'mi-1',
      dateOrMonth: 'ሀምሌ 2018',
      description: 'የቤት ኪራይ ገቢ',
      category: 'የቤት ኪራይ',
      amount: 31515,
    },
    {
      id: 'mi-2',
      dateOrMonth: 'ነሀሴ 2018',
      description: 'የቤት ኪራይ ገቢ',
      category: 'የቤት ኪራይ',
      amount: 22450,
    },
    {
      id: 'mi-3',
      dateOrMonth: 'መስከረም 2019',
      description: 'የቤት ኪራይ ገቢ',
      category: 'የቤት ኪራይ',
      amount: 22450,
    },
    {
      id: 'mi-4',
      dateOrMonth: 'ጥቅምት 2019',
      description: 'የቤት ኪራይ ገቢ',
      category: 'የቤት ኪራይ',
      amount: 26600,
    },
    {
      id: 'mi-5',
      dateOrMonth: 'ኅዳር 2019',
      description: 'የቤት ኪራይ ገቢ',
      category: 'የቤት ኪራይ',
      amount: 0,
      isPlaceholder: true,
    },
    {
      id: 'mi-6',
      dateOrMonth: 'ታኅሣሥ 2019',
      description: 'የቤት ኪራይ ገቢ',
      category: 'የቤት ኪራይ',
      amount: 0,
      isPlaceholder: true,
    },
    {
      id: 'mi-7',
      dateOrMonth: 'ጥር 2019',
      description: 'የቤት ኪራይ ገቢ',
      category: 'የቤት ኪራይ',
      amount: 0,
      isPlaceholder: true,
    },
    {
      id: 'mi-8',
      dateOrMonth: 'ተጨማሪ ገቢ',
      description: 'የግል ተቀማጭ / ገቢ',
      category: 'ተጨማሪ ገቢ',
      amount: 0,
      isPlaceholder: true,
    },
  ],
  mesfinExpenses: [
    {
      id: 'me-1',
      dateOrMonth: 'ነሀሴ 2018',
      description: 'ብር ወስዷል (ዳሽን)',
      category: 'ባንክ ወጪ / ማውጣት',
      amount: 22450,
    },
    {
      id: 'me-2',
      dateOrMonth: 'ነሀሴ 2018',
      description: 'የሽንት ቤት ጥገና',
      category: 'ጥገና',
      amount: 1750,
    },
    {
      id: 'me-3',
      dateOrMonth: 'ነሀሴ 2018',
      description: 'ግብር የአከራይ ተከራይ',
      category: 'ግብር',
      amount: 4600,
    },
  ],
  zewdneshDeposits: [
    {
      id: 'zd-1',
      dateOrMonth: 'መነሻ',
      description: 'የመጀመሪያ ተቀማጭ',
      category: 'መነሻ ተቀማጭ',
      amount: 100000,
    },
  ],
  zewdneshExpenses: [
    {
      id: 'ze-1',
      dateOrMonth: 'የተከፈለ',
      description: 'የጎደለ ገንዘብ',
      category: 'ልዩ ወጪ / ማስተካከያ',
      amount: 8700,
    },
    {
      id: 'ze-2',
      dateOrMonth: 'የተከፈለ',
      description: 'የመሬት ግብር',
      category: 'ግብር እና ታክስ',
      amount: 10935,
    },
    {
      id: 'ze-3',
      dateOrMonth: 'የተከፈለ',
      description: 'የበርበሬ',
      category: 'የቤት ፍጆታ',
      amount: 5300,
    },
    {
      id: 'ze-4',
      dateOrMonth: 'የተከፈለ',
      description: 'ጋሻው',
      category: 'ክፍያ (ጋሻው)',
      amount: 10000,
    },
    {
      id: 'ze-5',
      dateOrMonth: 'የተከፈለ',
      description: 'በሬ የደመቅ',
      category: 'ልዩ ወጪ / ግዢ',
      amount: 5000,
    },
    {
      id: 'ze-6',
      dateOrMonth: 'የተከፈለ',
      description: 'ጋሻው',
      category: 'ክፍያ (ጋሻው)',
      amount: 12000,
    },
    {
      id: 'ze-7',
      dateOrMonth: 'የተከፈለ',
      description: 'ብድር እና እቁብ',
      category: 'ብድር እና እቁብ',
      amount: 4000,
    },
    {
      id: 'ze-8',
      dateOrMonth: 'የተከፈለ',
      description: 'ሽንት ቤት እና ግብር የአከራይ ተከራይ',
      category: 'ግብር እና ጥገና',
      amount: 6350,
    },
    {
      id: 'ze-9',
      dateOrMonth: 'የተከፈለ',
      description: 'ጋሻው',
      category: 'ክፍያ (ጋሻው)',
      amount: 8000,
    },
    {
      id: 'ze-10',
      dateOrMonth: 'የተከፈለ',
      description: 'ገብርኤል',
      category: 'ክፍያ (ገብርኤል)',
      amount: 8000,
    },
    {
      id: 'ze-11',
      dateOrMonth: 'የተከፈለ',
      description: 'ጋሻው',
      category: 'ክፍያ (ጋሻው)',
      amount: 10000,
    },
  ],
  groceries: DEFAULT_GROCERY_ITEMS,
  monthlyGroceries: createMonthlyGroceriesMap(DEFAULT_GROCERY_ITEMS, 'ጥቅምት'),
  waterRatePerUnit: DEFAULT_WATER_RATE,
  waterRecords: DEFAULT_WATER_MONTH1_ITEMS,
  monthlyWater: createMonthlyWaterMap(true, DEFAULT_WATER_MONTH1_ITEMS),
};

export const AVAILABLE_YEARS = [
  '2017 EC',
  '2018 EC',
  '2019 EC',
  '2020 EC',
  '2021 EC',
  '2022 EC',
] as const;

export type YearInitMode = 'TEMPLATE_RENTS' | 'ZERO_AMOUNTS' | 'CLONE_SOURCE';

export function createWorkbookForYear(
  yearEC: string,
  sourceWorkbook?: WorkbookState,
  initMode: YearInitMode = 'TEMPLATE_RENTS'
): WorkbookState {
  if (yearEC === '2019 EC' && !sourceWorkbook) {
    return JSON.parse(JSON.stringify(INITIAL_WORKBOOK_STATE));
  }

  const yrNum = yearEC.replace(/\s*EC$/i, '').trim();
  const base: WorkbookState = JSON.parse(
    JSON.stringify(sourceWorkbook || INITIAL_WORKBOOK_STATE)
  );
  base.yearEC = yearEC;
  base.lastUpdated = `መስከረም ${yearEC}`;
  base.waterRatePerUnit = Number(base.waterRatePerUnit) > 0 ? Number(base.waterRatePerUnit) : DEFAULT_WATER_RATE;

  if (initMode === 'CLONE_SOURCE' && sourceWorkbook) {
    base.monthlyGroceries = ensureMonthlyGroceries(base);
    base.monthlyWater = ensureMonthlyWater(base);
    return base;
  }

  const templateGroceries =
    base.groceries && base.groceries.length > 0 ? base.groceries : DEFAULT_GROCERY_ITEMS;
  const templateWater =
    base.waterRecords && base.waterRecords.length > 0
      ? base.waterRecords
      : DEFAULT_WATER_MONTH1_ITEMS;

  if (initMode === 'ZERO_AMOUNTS') {
    base.tenants = base.tenants.map((t) => ({
      ...t,
      monthlyAmounts: createMonthlyMap(0),
    }));
    base.propertyExpenses = base.propertyExpenses.map((e) => ({
      ...e,
      monthlyAmounts: createMonthlyMap(0),
    }));
    base.mesfinIncome = [
      {
        id: `mi-${yrNum}-1`,
        dateOrMonth: `መስከረም ${yrNum}`,
        description: 'የቤት ኪራይ ገቢ',
        category: 'የቤት ኪራይ',
        amount: 0,
        isPlaceholder: true,
      },
      {
        id: `mi-${yrNum}-2`,
        dateOrMonth: `ጥቅምት ${yrNum}`,
        description: 'የቤት ኪራይ ገቢ',
        category: 'የቤት ኪራይ',
        amount: 0,
        isPlaceholder: true,
      },
    ];
    base.mesfinExpenses = [];
    base.zewdneshExpenses = [];
    base.groceries = createBlankMonthGroceries(templateGroceries);
    base.monthlyGroceries = createMonthlyGroceriesMap(base.groceries, null);
    base.waterRecords = createBlankMonthWater(templateWater);
    base.monthlyWater = createMonthlyWaterMap(false, base.waterRecords);
    return base;
  }

  if (yearEC === '2018 EC' && !sourceWorkbook) {
    base.tenants = base.tenants.map((t) => ({
      ...t,
      monthlyAmounts: {
        ...createMonthlyMap(0),
        'ሐምሌ': t.monthlyAmounts['ጥቅምት'],
        'ነሐሴ': t.monthlyAmounts['ጥቅምት'],
      },
    }));
    base.propertyExpenses = base.propertyExpenses.map((e) => ({
      ...e,
      monthlyAmounts: {
        ...createMonthlyMap(0),
        'ሐምሌ': e.monthlyAmounts['ጥቅምት'],
        'ነሐሴ': e.monthlyAmounts['ጥቅምት'],
      },
    }));
    base.mesfinIncome = [
      {
        id: 'mi-2018-1',
        dateOrMonth: 'ሀምሌ 2018',
        description: 'የቤት ኪራይ ገቢ',
        category: 'የቤት ኪራይ',
        amount: 31515,
      },
      {
        id: 'mi-2018-2',
        dateOrMonth: 'ነሀሴ 2018',
        description: 'የቤት ኪራይ ገቢ',
        category: 'የቤት ኪራይ',
        amount: 22450,
      },
    ];
    base.mesfinExpenses = [
      {
        id: 'me-2018-1',
        dateOrMonth: 'ነሀሴ 2018',
        description: 'ብር ወስዷል (ዳሽን)',
        category: 'ባንክ ወጪ / ማውጣት',
        amount: 22450,
      },
      {
        id: 'me-2018-2',
        dateOrMonth: 'ነሀሴ 2018',
        description: 'የሽንት ቤት ጥገና',
        category: 'ጥገና',
        amount: 1750,
      },
      {
        id: 'me-2018-3',
        dateOrMonth: 'ነሀሴ 2018',
        description: 'ግብር የአከራይ ተከራይ',
        category: 'ግብር',
        amount: 4600,
      },
    ];
    base.groceries = createBlankMonthGroceries(templateGroceries);
    base.monthlyGroceries = createMonthlyGroceriesMap(DEFAULT_GROCERY_ITEMS, 'ሐምሌ');
    base.waterRecords = createBlankMonthWater(templateWater);
    base.monthlyWater = createMonthlyWaterMap(false, base.waterRecords);
    return base;
  }

  base.tenants = base.tenants.map((t) => ({
    ...t,
    monthlyAmounts: createMonthlyMap(t.monthlyAmounts['ጥቅምት']),
  }));
  base.propertyExpenses = base.propertyExpenses.map((e) => ({
    ...e,
    monthlyAmounts: createMonthlyMap(e.monthlyAmounts['ጥቅምት']),
  }));
  base.mesfinIncome = [
    {
      id: `mi-${yrNum}-1`,
      dateOrMonth: `መስከረም ${yrNum}`,
      description: 'የቤት ኪራይ ገቢ',
      category: 'የቤት ኪራይ',
      amount: 0,
      isPlaceholder: true,
    },
    {
      id: `mi-${yrNum}-2`,
      dateOrMonth: `ጥቅምት ${yrNum}`,
      description: 'የቤት ኪራይ ገቢ',
      category: 'የቤት ኪራይ',
      amount: 26600,
    },
  ];
  base.mesfinExpenses = [];
  base.groceries = createBlankMonthGroceries(templateGroceries);
  base.monthlyGroceries = createMonthlyGroceriesMap(base.groceries, null);
  base.waterRecords = createBlankMonthWater(templateWater);
  base.monthlyWater = createMonthlyWaterMap(false, base.waterRecords);
  return base;
}
