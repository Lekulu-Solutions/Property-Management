import React, { createContext, useContext, useEffect, useState } from 'react';
import { Globe } from 'lucide-react';

export type LanguageMode = 'AM' | 'EN' | 'BOTH';

const LANG_STORAGE_KEY = 'mesfin_zewdnesh_lang_mode_v2';

interface PhraseTranslation {
  am: string;
  en: string;
  both?: string;
}

/**
 * Complete system-wide dictionary mapping exact source strings (Amharic, English, or Bilingual)
 * to their 3-mode equivalents: Amharic only (am), English only (en), and Amharic + English (both).
 */
const EXACT_DICTIONARY: Record<string, PhraseTranslation> = {
  // Brand & App Titles
  'መስፍን እና ዘውድነሽ · የሂሳብ መዝገብ': {
    am: 'መስፍን እና ዘውድነሽ · የሂሳብ መዝገብ',
    en: 'Mesfin & Zewdnesh · Financial Ledger',
    both: 'መስፍን እና ዘውድነሽ · የሂሳብ መዝገብ (Mesfin & Zewdnesh Ledger)',
  },
  'መስፍን እና ዘውድነሽ — የሂሳብ መዝገብ ሲስተም': {
    am: 'መስፍን እና ዘውድነሽ — የሂሳብ መዝገብ ሲስተም',
    en: 'Mesfin & Zewdnesh — Financial Ledger System',
    both: 'መስፍን እና ዘውድነሽ — የሂሳብ መዝገብ ሲስተም (Financial Ledger System)',
  },
  'የኪራይ ገቢ፣ የወጪ ክፍፍል፣ የግል መዝገቦች እና የአስቤዛ መከታተያ።': {
    am: 'የኪራይ ገቢ፣ የወጪ ክፍፍል፣ የግል መዝገቦች እና የአስቤዛ መከታተያ።',
    en: 'Rental income, expense allocation, personal ledgers, and groceries tracker.',
    both: 'የኪራይ ገቢ፣ የወጪ ክፍፍል፣ የግል መዝገቦች እና የአስቤዛ መከታተያ (Rental, Expenses, Personal Ledgers & Groceries).',
  },
  'የሂሳብ መዝገብ በመጫን ላይ (Loading Financial Ledger...)': {
    am: 'የሂሳብ መዝገብ በመጫን ላይ...',
    en: 'Loading Financial Ledger...',
    both: 'የሂሳብ መዝገብ በመጫን ላይ (Loading Financial Ledger...)',
  },

  // Login Page
  'በGoogle ይግቡ': {
    am: 'በGoogle ይግቡ',
    en: 'Sign in with Google',
    both: 'በGoogle ይግቡ (Sign in with Google)',
  },
  'በGoogle መለያ ይግቡ (Sign in with Google)': {
    am: 'በGoogle መለያ ይግቡ',
    en: 'Sign in with Google',
    both: 'በGoogle መለያ ይግቡ (Sign in with Google)',
  },
  'በመግባት ላይ...': {
    am: 'በመግባት ላይ...',
    en: 'Signing in...',
    both: 'በመግባት ላይ... (Signing in...)',
  },
  'መግቢያ (Sign In)': {
    am: 'መግቢያ',
    en: 'Sign In',
    both: 'መግቢያ (Sign In)',
  },
  'ወደ ሲስተሙ ይግቡ': {
    am: 'ወደ ሲስተሙ ይግቡ',
    en: 'Sign in to the System',
    both: 'ወደ ሲስተሙ ይግቡ (Sign in to the System)',
  },
  'ወይም (Or)': {
    am: 'ወይም',
    en: 'Or',
    both: 'ወይም (Or)',
  },
  'በLocal Mode ይቀጥሉ (Offline Mode)': {
    am: 'ያለ ኢንተርኔት ይቀጥሉ',
    en: 'Continue in Offline / Local Mode',
    both: 'በLocal Mode ይቀጥሉ (Offline Mode)',
  },
  'የተጠበቀ የግል መዝገብ (Private Cloud Sync)': {
    am: 'የተጠበቀ የግል መዝገብ',
    en: 'Private Cloud Sync',
    both: 'የተጠበቀ የግል መዝገብ (Private Cloud Sync)',
  },
  'Cloud Sync': {
    am: 'የክላውድ ግንኙነት',
    en: 'Cloud Sync',
    both: 'የክላውድ ግንኙነት (Cloud Sync)',
  },
  'Excel & PDF ሪፖርት': {
    am: 'የExcel እና PDF ሪፖርት',
    en: 'Excel & PDF Reports',
    both: 'Excel & PDF ሪፖርት (Excel & PDF Reports)',
  },
  'የGoogle መግቢያ መስኮቱ ተዘግቷል። እባክዎ እንደገና ይሞክሩ።': {
    am: 'የGoogle መግቢያ መስኮቱ ተዘግቷል። እባክዎ እንደገና ይሞክሩ።',
    en: 'Google sign-in popup was closed. Please try again.',
    both: 'የGoogle መግቢያ መስኮቱ ተዘግቷል (Google sign-in popup closed. Please try again).',
  },
  'በGoogle መለያ መግባት አልተቻለም። እባክዎ እንደገና ይሞክሩ።': {
    am: 'በGoogle መለያ መግባት አልተቻለም። እባክዎ እንደገና ይሞክሩ።',
    en: 'Could not sign in with Google. Please try again.',
    both: 'በGoogle መለያ መግባት አልተቻለም (Could not sign in with Google. Please try again).',
  },

  // Navigation & Tabs
  'ትንታኔ እና ሪፖርት': {
    am: 'ትንታኔ እና ሪፖርት',
    en: 'Analytics & Reports',
    both: 'ትንታኔ እና ሪፖርት (Analytics)',
  },
  'የኪራይ እና ወጪ ክፍፍል': {
    am: 'የኪራይ እና ወጪ ክፍፍል',
    en: 'Rental & Expense Split',
    both: 'የኪራይ እና ወጪ ክፍፍል (Rental Split)',
  },
  'የመስፍን መዝገብ': {
    am: 'የመስፍን መዝገብ',
    en: "Mesfin's Ledger",
    both: 'የመስፍን መዝገብ (Mesfin)',
  },
  'የመስፍን የግል መዝገብ': {
    am: 'የመስፍን የግል መዝገብ',
    en: "Mesfin's Personal Ledger",
    both: 'የመስፍን የግል መዝገብ (Mesfin Personal Ledger)',
  },
  'የመስፍን መዝገብ (Blue)': {
    am: 'የመስፍን መዝገብ (ሰማያዊ)',
    en: "Mesfin's Ledger (Blue)",
    both: 'የመስፍን መዝገብ (Mesfin · Blue)',
  },
  'የዘውድነሽ መዝገብ': {
    am: 'የዘውድነሽ መዝገብ',
    en: "Zewdnesh's Ledger",
    both: 'የዘውድነሽ መዝገብ (Zewdnesh)',
  },
  'የዘውድነሽ የግል መዝገብ': {
    am: 'የዘውድነሽ የግል መዝገብ',
    en: "Zewdnesh's Personal Ledger",
    both: 'የዘውድነሽ የግል መዝገብ (Zewdnesh Personal Ledger)',
  },
  'የዘውድነሽ መዝገብ (Purple)': {
    am: 'የዘውድነሽ መዝገብ (ወይንጠጅ)',
    en: "Zewdnesh's Ledger (Purple)",
    both: 'የዘውድነሽ መዝገብ (Zewdnesh · Purple)',
  },
  'የአስቤዛ መከታተያ': {
    am: 'የአስቤዛ መከታተያ',
    en: 'Groceries Tracker',
    both: 'የአስቤዛ መከታተያ (Groceries)',
  },
  'ውሃ': {
    am: 'ውሃ',
    en: 'Water',
    both: 'ውሃ (Water)',
  },
  'Water': {
    am: 'ውሃ',
    en: 'Water',
    both: 'ውሃ (Water)',
  },
  'የውሃ ክፍያ መከታተያ': {
    am: 'የውሃ ክፍያ መከታተያ',
    en: 'Water',
    both: 'የውሃ ክፍያ (Water)',
  },
  'ቅንብሮች & እገዛ': {
    am: 'ቅንብሮች እና እገዛ',
    en: 'Settings & Help',
    both: 'ቅንብሮች & እገዛ (Settings & Help)',
  },
  'ትንታኔ': {
    am: 'ትንታኔ',
    en: 'Analytics',
    both: 'ትንታኔ / Analytics',
  },
  'ኪራይ ክፍፍል': {
    am: 'ኪራይ ክፍፍል',
    en: 'Rental Split',
    both: 'ኪራይ / Rental',
  },
  'መስፍን': {
    am: 'መስፍን',
    en: 'Mesfin',
    both: 'መስፍን (Mesfin)',
  },
  'ዘውድነሽ': {
    am: 'ዘውድነሽ',
    en: 'Zewdnesh',
    both: 'ዘውድነሽ (Zewdnesh)',
  },
  'አስቤዛ': {
    am: 'አስቤዛ',
    en: 'Groceries',
    both: 'አስቤዛ (Groceries)',
  },

  // Footer & Common Links
  'Google Sheets ማመሳከሪያ & የስሌት ሕጎች': {
    am: 'የGoogle Sheets ማመሳከሪያ እና የስሌት ሕጎች',
    en: 'Google Sheets Sync & Share Rules',
    both: 'Google Sheets ማመሳከሪያ & የስሌት ሕጎች (Sheets Sync & Rules)',
  },
  'Excel ሪፖርት አውርድ (.xlsx)': {
    am: 'የExcel ሪፖርት አውርድ (.xlsx)',
    en: 'Download Excel Report (.xlsx)',
    both: 'Excel ሪፖርት አውርድ (Download Excel .xlsx)',
  },
  '📱 የሞባይል መተግበሪያ አውርድ (Mobile App)': {
    am: '📱 የሞባይል መተግበሪያ አውርድ',
    en: '📱 Download Mobile App (.APK)',
    both: '📱 የሞባይል መተግበሪያ አውርድ (Mobile App)',
  },
  'PDF / ህትመት': {
    am: 'PDF እና ህትመት',
    en: 'PDF / Print Report',
    both: 'PDF / ህትመት (PDF & Print)',
  },
  'ኢንተርኔት ተቋርጧል (Offline Mode) — የሚያስገቡት መረጃ በስልክዎ ዳታቤዝ ተቀምጦ ኢንተርኔት ሲመለስ በራስ-ሰር ይመሳከራል።': {
    am: 'ኢንተርኔት ተቋርጧል — የሚያስገቡት መረጃ በስልክዎ ዳታቤዝ ተቀምጦ ኢንተርኔት ሲመለስ በራስ-ሰር ይመሳከራል።',
    en: 'Offline Mode — Changes are saved locally on your device and will auto-sync when internet is restored.',
    both: 'ኢንተርኔት ተቋርጧል (Offline Mode) — Changes are saved locally and auto-sync when online.',
  },

  // Ethiopian Months
  'መስከረም': { am: 'መስከረም', en: 'Meskerem (Sep/Oct)', both: 'መስከረም (Meskerem)' },
  'ጥቅምት': { am: 'ጥቅምት', en: 'Tikimt (Oct/Nov)', both: 'ጥቅምት (Tikimt)' },
  'ኅዳር': { am: 'ኅዳር', en: 'Hidar (Nov/Dec)', both: 'ኅዳር (Hidar)' },
  'ታኅሣሥ': { am: 'ታኅሣሥ', en: 'Tahsas (Dec/Jan)', both: 'ታኅሣሥ (Tahsas)' },
  'ጥር': { am: 'ጥር', en: 'Tir (Jan/Feb)', both: 'ጥር (Tir)' },
  'የካቲት': { am: 'የካቲት', en: 'Yekatit (Feb/Mar)', both: 'የካቲት (Yekatit)' },
  'መጋቢት': { am: 'መጋቢት', en: 'Megabit (Mar/Apr)', both: 'መጋቢት (Megabit)' },
  'ሚያዝያ': { am: 'ሚያዝያ', en: 'Miyazya (Apr/May)', both: 'ሚያዝያ (Miyazya)' },
  'ግንቦት': { am: 'ግንቦት', en: 'Ginbot (May/Jun)', both: 'ግንቦት (Ginbot)' },
  'ሰኔ': { am: 'ሰኔ', en: 'Sene (Jun/Jul)', both: 'ሰኔ (Sene)' },
  'ሐምሌ': { am: 'ሐምሌ', en: 'Hamle (Jul/Aug)', both: 'ሐምሌ (Hamle)' },
  'ነሐሴ': { am: 'ነሐሴ', en: 'Nehase (Aug/Sep)', both: 'ነሐሴ (Nehase)' },
  'ዓመታዊ ድምር (Annual Total)': {
    am: 'ዓመታዊ ድምር',
    en: 'Annual Total',
    both: 'ዓመታዊ ድምር (Annual Total)',
  },
  'ዓመታዊ ድምር (Annual)': {
    am: 'ዓመታዊ ድምር',
    en: 'Annual Total',
    both: 'ዓመታዊ ድምር (Annual)',
  },
  'ዓመታዊ ድምር': {
    am: 'ዓመታዊ ድምር',
    en: 'Annual Total',
    both: 'ዓመታዊ ድምር (Annual Total)',
  },

  // Tenants, Water Members & Expenses Data Terms
  'በቀለ': { am: 'በቀለ', en: 'Bekele', both: 'በቀለ (Bekele)' },
  'በላይነሽ': { am: 'በላይነሽ', en: 'Belaynesh', both: 'በላይነሽ (Belaynesh)' },
  'ልብነሽ': { am: 'ልብነሽ', en: 'Libnesh', both: 'ልብነሽ (Libnesh)' },
  'ጋዲሴ': { am: 'ጋዲሴ', en: 'Gadise', both: 'ጋዲሴ (Gadise)' },
  'ደስታ': { am: 'ደስታ', en: 'Desta', both: 'ደስታ (Desta)' },
  'ገነት': { am: 'ገነት', en: 'Genet', both: 'ገነት (Genet)' },
  'ቲጂ': { am: 'ቲጂ', en: 'TG', both: 'ቲጂ (TG)' },
  'ገዛህኝ': { am: 'ገዛህኝ', en: 'Gezahegn', both: 'ገዛህኝ (Gezahegn)' },
  'ለምለም': { am: 'ለምለም', en: 'Lemlem', both: 'ለምለም (Lemlem)' },
  'አስረስ': { am: 'አስረስ', en: 'Asres', both: 'አስረስ (Asres)' },
  'ወይንሸት': { am: 'ወይንሸት', en: 'Weynshet', both: 'ወይንሸት (Weynshet)' },
  'ተወልደ': { am: 'ተወልደ', en: 'Tewolde', both: 'ተወልደ (Tewolde)' },
  'የመኖሪያ ቤት ኪራይ': {
    am: 'የመኖሪያ ቤት ኪራይ',
    en: 'Residential Rent',
    both: 'የመኖሪያ ቤት ኪራይ (Residential Rent)',
  },
  'ጥበቃ': { am: 'ጥበቃ', en: 'Security Service', both: 'ጥበቃ (Security)' },
  'የጥበቃ አገልግሎት': {
    am: 'የጥበቃ አገልግሎት',
    en: 'Security Guard Service',
    both: 'የጥበቃ አገልግሎት (Security Service)',
  },
  'መብራት': { am: 'መብራት', en: 'Electricity Utility', both: 'መብራት (Electricity)' },
  'የኤሌክትሪክ ፍጆታ ክፍያ': {
    am: 'የኤሌክትሪክ ፍጆታ ክፍያ',
    en: 'Electricity Utility Bill',
    both: 'የኤሌክትሪክ ፍጆታ ክፍያ (Electricity Bill)',
  },
  'እቁብ': { am: 'እቁብ', en: 'Equb Contribution', both: 'እቁብ (Equb)' },
  'የእቁብ መዋጮ': {
    am: 'የእቁብ መዋጮ',
    en: 'Equb Savings Contribution',
    both: 'የእቁብ መዋጮ (Equb Contribution)',
  },
  'እድር': { am: 'እድር', en: 'Idir Contribution', both: 'እድር (Idir)' },
  'የእድር ተቀማጭ / መዋጮ': {
    am: 'የእድር ተቀማጭ / መዋጮ',
    en: 'Idir Community Contribution',
    both: 'የእድር ተቀማጭ / መዋጮ (Idir Contribution)',
  },
  'የአስቤዛ እና የፍጆታ እቃዎች': {
    am: 'የአስቤዛ እና የፍጆታ እቃዎች',
    en: 'Groceries & Household Supplies',
    both: 'የአስቤዛ እና የፍጆታ እቃዎች (Groceries & Supplies)',
  },
  'ዝናሽ': { am: 'ዝናሽ', en: 'Zinash Allocation', both: 'ዝናሽ (Zinash)' },
  'ልዩ ድልድል': { am: 'ልዩ ድልድል', en: 'Special Allocation', both: 'ልዩ ድልድል (Special Allocation)' },
  'ጥገና': { am: 'ጥገና', en: 'Property Maintenance', both: 'ጥገና (Maintenance)' },
  'የጥገና እና ክብካቤ ስራ': {
    am: 'የጥገና እና ክብካቤ ስራ',
    en: 'Repair & Maintenance Work',
    both: 'የጥገና እና ክብካቤ ስራ (Repair & Maintenance)',
  },
  'የኪራይ ግብር': { am: 'የኪራይ ግብር', en: 'Rental Income Tax', both: 'የኪራይ ግብር (Rental Tax)' },
  'የኪራይ ገቢ ግብር ክፍያ': {
    am: 'የኪራይ ገቢ ግብር ክፍያ',
    en: 'Rental Income Tax Payment',
    both: 'የኪራይ ገቢ ግብር ክፍያ (Rental Income Tax)',
  },
  'የመሬት ግብር': { am: 'የመሬት ግብር', en: 'Land & Tenure Tax', both: 'የመሬት ግብር (Land Tax)' },
  'የመሬት እና የይዞታ ግብር ክፍያ': {
    am: 'የመሬት እና የይዞታ ግብር ክፍያ',
    en: 'Land & Property Tenure Tax',
    both: 'የመሬት እና የይዞታ ግብር ክፍያ (Land Tax)',
  },
  'የውሃ ክፍያ': { am: 'የውሃ ክፍያ', en: 'Water Utility', both: 'የውሃ ክፍያ (Water Bill)' },
  'የውሃ እና የተለያዩ መገልገያዎች ክፍያ': {
    am: 'የውሃ እና የተለያዩ መገልገያዎች ክፍያ',
    en: 'Water & Utility Charges',
    both: 'የውሃ እና የተለያዩ መገልገያዎች ክፍያ (Water & Utilities)',
  },
  'የማዘጋጃ ቤት': { am: 'የማዘጋጃ ቤት', en: 'Municipality Fee', both: 'የማዘጋጃ ቤት (Municipality)' },
  'የማዘጋጃ ቤት እና የአካባቢ ክፍያዎች': {
    am: 'የማዘጋጃ ቤት እና የአካባቢ ክፍያዎች',
    en: 'Municipality & Local Fees',
    both: 'የማዘጋጃ ቤት እና የአካባቢ ክፍያዎች (Municipality Fees)',
  },

  // Split Labels
  '50% መስፍን / 50% ዘውድነሽ': {
    am: '50% መስፍን / 50% ዘውድነሽ',
    en: '50% Mesfin / 50% Zewdnesh',
    both: '50% መስፍን / 50% ዘውድነሽ (50/50)',
  },
  'የጋራ (50% - 50%)': {
    am: 'የጋራ (50% - 50%)',
    en: 'Shared (50% - 50%)',
    both: 'የጋራ / Shared (50% - 50%)',
  },
  '100% መስፍን': {
    am: '100% መስፍን',
    en: '100% Mesfin',
    both: '100% መስፍን (100% Mesfin)',
  },
  '100% ዘውድነሽ': {
    am: '100% ዘውድነሽ',
    en: '100% Zewdnesh',
    both: '100% ዘውድነሽ (100% Zewdnesh)',
  },
  'መስፍን (-200) / ዘውድነሽ (-800)': {
    am: 'መስፍን (-200) / ዘውድነሽ (-800)',
    en: 'Mesfin (-200) / Zewdnesh (-800)',
    both: 'መስፍን (-200) / ዘውድነሽ (-800) [20% / 80%]',
  },

  // Groceries Categories & Units
  'መሰረታዊ ፍጆታ': {
    am: 'መሰረታዊ ፍጆታ',
    en: 'Basic Consumables',
    both: 'መሰረታዊ ፍጆታ (Basic Consumables)',
  },
  'አትክልት': {
    am: 'አትክልት',
    en: 'Vegetables',
    both: 'አትክልት (Vegetables)',
  },
  'ጥራጥሬ': {
    am: 'ጥራጥሬ',
    en: 'Pulses & Legumes',
    both: 'ጥራጥሬ (Pulses & Legumes)',
  },
  'ቅመማቅመም': {
    am: 'ቅመማቅመም',
    en: 'Spices & Condiments',
    both: 'ቅመማቅመም (Spices)',
  },
  'እህልና እህላማ': {
    am: 'እህልና እህላማ',
    en: 'Grains & Cereals',
    both: 'እህልና እህላማ (Grains & Cereals)',
  },
  'የዱቄት ውጤቶች': {
    am: 'የዱቄት ውጤቶች',
    en: 'Pasta & Flour Products',
    both: 'የዱቄት ውጤቶች (Pasta & Flour)',
  },
  'የጓሮ እንክብካቤ': {
    am: 'የጓሮ እንክብካቤ',
    en: 'Garden Care',
    both: 'የጓሮ እንክብካቤ (Garden Care)',
  },
  'ተገዝቷል': {
    am: 'ተገዝቷል',
    en: 'Purchased',
    both: 'ተገዝቷል (Purchased)',
  },
  'አልተገዛም': {
    am: 'አልተገዛም',
    en: 'Pending',
    both: 'አልተገዛም (Pending)',
  },

  // Visual Analytics & Charts
  'RECHARTS VISUAL ANALYTICS ENGINE · የገቢ እና ወጪ ዳሽቦርድ': {
    am: 'የገቢ፣ ወጪ እና የሀብት ክፍፍል ቻርት ትንታኔ',
    en: 'VISUAL ANALYTICS ENGINE · FINANCIAL DASHBOARD',
    both: 'RECHARTS VISUAL ANALYTICS · የገቢ እና ወጪ ዳሽቦርድ',
  },
  'የገቢ፣ ወጪ እና የሀብት ክፍፍል ቻርት ትንታኔ': {
    am: 'የገቢ፣ ወጪ እና የሀብት ክፍፍል ቻርት ትንታኔ',
    en: 'Income, Expense & Partner Allocation Analytics',
    both: 'የገቢ፣ ወጪ እና የሀብት ክፍፍል ቻርት ትንታኔ (Visual Analytics)',
  },
  'ወር / ጊዜ:': {
    am: 'ወር / ጊዜ:',
    en: 'Period:',
    both: 'ወር / ጊዜ (Period):',
  },
  'ሪፖርት አትም (PDF)': {
    am: 'ሪፖርት አትም',
    en: 'Print Report (PDF)',
    both: 'ሪፖርት አትም (PDF)',
  },
  'ሪፖርት አትም': {
    am: 'ሪፖርት አትም',
    en: 'Print Report (PDF)',
    both: 'ሪፖርት አትም (PDF)',
  },
  'ወደ Excel': {
    am: 'ወደ Excel አውርድ',
    en: 'Export Excel (.xlsx)',
    both: 'ወደ Excel (.xlsx)',
  },
  'Excel (.xlsx)': {
    am: 'ወደ Excel አውርድ',
    en: 'Export Excel (.xlsx)',
    both: 'ወደ Excel (.xlsx)',
  },
  'የተጣራ ዓመታዊ የኪራይ ገቢ': {
    am: 'የተጣራ ዓመታዊ የኪራይ ገቢ',
    en: 'Net Annual Rental Income',
    both: 'የተጣራ ዓመታዊ የኪራይ ገቢ (Net Annual Rent)',
  },
  'ዝርዝር': {
    am: 'ዝርዝር',
    en: 'Details',
    both: 'ዝርዝር (Details)',
  },
  'ብር (ETB)': {
    am: 'ብር',
    en: 'ETB',
    both: 'ብር (ETB)',
  },
  'ብር': {
    am: 'ብር',
    en: 'ETB',
    both: 'ብር (ETB)',
  },
  'ትክክል': {
    am: 'ትክክል',
    en: 'Reconciled',
    both: 'ትክክል (Reconciled)',
  },
  'ትክክል (Reconciled)': {
    am: 'ትክክል',
    en: 'Reconciled',
    both: 'ትክክል (Reconciled)',
  },
  'ልዩነት': {
    am: 'ልዩነት',
    en: 'Variance',
    both: 'ልዩነት (Variance)',
  },
  'የአጋሮች የተጣራ ድርሻ ክፍፍል': {
    am: 'የአጋሮች የተጣራ ድርሻ ክፍፍል',
    en: 'Partner Net Share Split',
    both: 'የአጋሮች የተጣራ ድርሻ ክፍፍል (Partner Net Split)',
  },
  'መስፍን (Mesfin)': {
    am: 'መስፍን',
    en: 'Mesfin',
    both: 'መስፍን (Mesfin)',
  },
  'ዘውድነሽ (Zewdnesh)': {
    am: 'ዘውድነሽ',
    en: 'Zewdnesh',
    both: 'ዘውድነሽ (Zewdnesh)',
  },
  'የመስፍን የተጣራ ቀሪ ሂሳብ': {
    am: 'የመስፍን የተጣራ ቀሪ ሂሳብ',
    en: "Mesfin's Net Ledger Balance",
    both: 'የመስፍን የተጣራ ቀሪ ሂሳብ (Mesfin Net Balance)',
  },
  'የዘውድነሽ ቀሪ ተቀማጭ · አስቤዛ': {
    am: 'የዘውድነሽ ቀሪ ተቀማጭ · አስቤዛ',
    en: "Zewdnesh's Net Deposit · Groceries",
    both: 'የዘውድነሽ ቀሪ ተቀማጭ · አስቤዛ (Zewdnesh Net & Groceries)',
  },
  'መዝገብ': {
    am: 'መዝገብ',
    en: 'Ledger',
    both: 'መዝገብ (Ledger)',
  },
  'መዝገብ →': {
    am: 'መዝገብ →',
    en: 'Open Ledger →',
    both: 'መዝገብ (Ledger) →',
  },
  'ሙሉ መዝገብ →': {
    am: 'ሙሉ መዝገብ →',
    en: 'Full Ledger →',
    both: 'ሙሉ መዝገብ (Full Ledger) →',
  },
  'አስቤዛ ወጪ': {
    am: 'የአስቤዛ ወጪ',
    en: 'Groceries Spent',
    both: 'አስቤዛ ወጪ (Groceries Spent)',
  },
  'የቻርት ትንታኔ እይታ (Interactive Chart Focus):': {
    am: 'የቻርት ትንታኔ እይታ:',
    en: 'Interactive Chart Focus:',
    both: 'የቻርት ትንታኔ እይታ (Interactive Chart Focus):',
  },
  'ሁሉም ቻርቶች (All Analytics)': {
    am: 'ሁሉም ቻርቶች',
    en: 'All Analytics Charts',
    both: 'ሁሉም ቻርቶች (All Analytics)',
  },
  'የኪራይ እና ድርሻ (Rental & Waterfall)': {
    am: 'የኪራይ እና ድርሻ',
    en: 'Rental & Waterfall',
    both: 'የኪራይ እና ድርሻ (Rental & Waterfall)',
  },
  'መስፍን vs ዘውድነሽ (Radar & Ledgers)': {
    am: 'መስፍን እና ዘውድነሽ (ንጽጽር)',
    en: 'Mesfin vs Zewdnesh (Radar & Ledgers)',
    both: 'መስፍን vs ዘውድነሽ (Radar & Ledgers)',
  },
  'አስቤዛ እና ፍጆታ (Groceries & Treemap)': {
    am: 'አስቤዛ እና ፍጆታ',
    en: 'Groceries & Treemap',
    both: 'አስቤዛ እና ፍጆታ (Groceries & Treemap)',
  },
  'ወርሃዊ የቤት ኪራይ ገቢ በተከራይ እና የድርሻ ክፍፍል': {
    am: 'ወርሃዊ የቤት ኪራይ ገቢ በተከራይ እና የድርሻ ክፍፍል',
    en: 'Monthly Rental Income by Tenant & Partner Split',
    both: 'ወርሃዊ የቤት ኪራይ ገቢ በተከራይ (Rental Income by Tenant)',
  },
  'የድርሻ ቻርት (Pareto)': {
    am: 'የድርሻ ቻርት',
    en: 'Share Pareto',
    both: 'የድርሻ ቻርት (Pareto)',
  },
  'አግድም ንጽጽር': {
    am: 'አግድም ንጽጽር',
    en: 'Horizontal Rank',
    both: 'አግድም ንጽጽር (Horizontal)',
  },
  '12 ወራት ፍሰት': {
    am: 'የ12 ወራት ፍሰት',
    en: '12-Month Cashflow',
    both: '12 ወራት ፍሰት (12-Month Flow)',
  },
  '50% / 50% የጋራ': {
    am: '50% / 50% የጋራ',
    en: '50% / 50% Shared',
    both: '50% / 50% የጋራ (Shared)',
  },
  '100% መስፍን ብቻ': {
    am: '100% መስፍን ብቻ',
    en: '100% Mesfin Only',
    both: '100% መስፍን ብቻ (Mesfin Only)',
  },
  '100% ዘውድነሽ ብቻ': {
    am: '100% ዘውድነሽ ብቻ',
    en: '100% Zewdnesh Only',
    both: '100% ዘውድነሽ ብቻ (Zewdnesh Only)',
  },
  'የኪራይ ክፍፍል ሰንጠረዥ ክፈት →': {
    am: 'የኪራይ ክፍፍል ሰንጠረዥ ክፈት →',
    en: 'Open Rental Split Sheet →',
    both: 'የኪራይ ክፍፍል ሰንጠረዥ ክፈት (Open Sheet) →',
  },
  'የተጣራ ገቢ ምጣኔ እና የወጪ ተቀናሽ ትንታኔ': {
    am: 'የተጣራ ገቢ ምጣኔ እና የወጪ ተቀናሽ ትንታኔ',
    en: 'Net Income Allocation & Expense Deduction Analysis',
    both: 'የተጣራ ገቢ ምጣኔ እና የወጪ ተቀናሽ ትንታኔ (Net & Waterfall)',
  },
  'ከጠቅላላ ገቢ ወደ የተጣራ የአጋሮች ክፍፍል (Gross → Net Split)': {
    am: 'ከጠቅላላ ገቢ ወደ የተጣራ የአጋሮች ክፍፍል',
    en: 'From Gross Revenue to Net Partner Allocation (Gross → Net Split)',
    both: 'ከጠቅላላ ገቢ ወደ የተጣራ የአጋሮች ክፍፍል (Gross → Net Split)',
  },
  'የተቀነሱ ወርሃዊ የንብረት ወጪዎች (Active Property Expenses)': {
    am: 'የተቀነሱ ወርሃዊ የንብረት ወጪዎች',
    en: 'Active Monthly Property Expenses',
    both: 'የተቀነሱ ወርሃዊ የንብረት ወጪዎች (Active Property Expenses)',
  },
  'ወጪዎችን አስተካክል →': {
    am: 'ወጪዎችን አስተካክል →',
    en: 'Edit Expenses →',
    both: 'ወጪዎችን አስተካክል (Edit Expenses) →',
  },
  'ሉህ 2 · የመስፍን የግል መዝገብ (Mesfin · Blue)': {
    am: 'ሉህ 2 · የመስፍን የግል መዝገብ (ሰማያዊ)',
    en: 'Sheet 2 · Mesfin Personal Ledger (Blue)',
    both: 'ሉህ 2 · የመስፍን የግል መዝገብ (Mesfin · Blue)',
  },
  'የመስፍን ወርሃዊ የገቢ አዝማሚያ እና የወጪ ትንታኔ': {
    am: 'የመስፍን ወርሃዊ የገቢ አዝማሚያ እና የወጪ ትንታኔ',
    en: "Mesfin's Monthly Income Trend & Expense Analysis",
    both: 'የመስፍን ወርሃዊ የገቢ አዝማሚያ እና የወጪ ትንታኔ (Mesfin Trend)',
  },
  'የመስፍን የወጪ ዝርዝር': {
    am: 'የመስፍን የወጪ ዝርዝር',
    en: "Mesfin's Expense Breakdown",
    both: 'የመስፍን የወጪ ዝርዝር (Mesfin Expenses)',
  },
  'የመስፍን የተጣራ ቀሪ ሂሳብ (Net Available Balance)': {
    am: 'የመስፍን የተጣራ ቀሪ ሂሳብ',
    en: "Mesfin's Net Available Balance",
    both: 'የመስፍን የተጣራ ቀሪ ሂሳብ (Net Available Balance)',
  },
  'ሉህ 3 · የዘውድነሽ የግል መዝገብ (Zewdnesh · Purple)': {
    am: 'ሉህ 3 · የዘውድነሽ የግል መዝገብ (ወይንጠጅ)',
    en: 'Sheet 3 · Zewdnesh Personal Ledger (Purple)',
    both: 'ሉህ 3 · የዘውድነሽ የግል መዝገብ (Zewdnesh · Purple)',
  },
  'የዘውድነሽ ተቀማጭ አጠቃቀም እና የተከፋዮች ትንታኔ': {
    am: 'የዘውድነሽ ተቀማጭ አጠቃቀም እና የተከፋዮች ትንታኔ',
    en: "Zewdnesh's Deposit Utilization & Payee Analysis",
    both: 'የዘውድነሽ ተቀማጭ አጠቃቀም እና የተከፋዮች ትንታኔ (Zewdnesh Analysis)',
  },
  'ተከፋዮች (Bar)': {
    am: 'ተከፋዮች (ሰንጠረዥ)',
    en: 'Payees (Bar)',
    both: 'ተከፋዮች (Bar)',
  },
  'ምጣኔ (Donut)': {
    am: 'ምጣኔ (ክብ ቻርት)',
    en: 'Share (Donut)',
    both: 'ምጣኔ (Donut)',
  },
  'የመስፍን እና የዘውድነሽ 6-ዘርፍ የፋይናንስ ሚዛን ራዳር (Partner Financial Radar)': {
    am: 'የመስፍን እና የዘውድነሽ 6-ዘርፍ የፋይናንስ ሚዛን ራዳር',
    en: 'Mesfin & Zewdnesh 6-Axis Partner Financial Radar',
    both: 'የመስፍን እና የዘውድነሽ 6-ዘርፍ የፋይናንስ ሚዛን ራዳር (Partner Financial Radar)',
  },
  'የኪራይ ድርሻ፣ የግል ተቀማጭ፣ የቁጠባ ምጣኔ እና የ100% የግል ቤቶች ንጽጽር (Normalized 0–100 Scale)': {
    am: 'የኪራይ ድርሻ፣ የግል ተቀማጭ፣ የቁጠባ ምጣኔ እና የ100% የግል ቤቶች ንጽጽር (ከ0 እስከ 100 ልኬት)',
    en: 'Comparison of rental share, personal deposits, retention rate, and exclusive units (0–100 scale)',
    both: 'የኪራይ ድርሻ፣ የግል ተቀማጭ፣ የቁጠባ ምጣኔ እና የ100% የግል ቤቶች ንጽጽር (0–100 Scale)',
  },
  'የዓመታት የገቢ እና የግል ቀሪ ሂሳብ ንጽጽር (Multi-Year Trajectory)': {
    am: 'የዓመታት የገቢ እና የግል ቀሪ ሂሳብ ንጽጽር',
    en: 'Multi-Year Income & Personal Balance Trajectory',
    both: 'የዓመታት የገቢ እና የግል ቀሪ ሂሳብ ንጽጽር (Multi-Year Trajectory)',
  },
  'በተመዘገቡት የኢትዮጵያ ዓመታት (EC) መካከል ያለው የኪራይ እና የግል ቀሪ ሂሳብ ፍሰት': {
    am: 'በተመዘገቡት የኢትዮጵያ ዓመታት (ዓ.ም) መካከል ያለው የኪራይ እና የግል ቀሪ ሂሳብ ፍሰት',
    en: 'Rental and personal net balance trajectory across configured Ethiopian fiscal years (EC)',
    both: 'በተመዘገቡት የኢትዮጵያ ዓመታት (EC) መካከል ያለው የኪራይ እና የግል ቀሪ ሂሳብ ፍሰት',
  },
  'ዓመታትን አስተዳድር →': {
    am: 'ዓመታትን አስተዳድር →',
    en: 'Manage Years →',
    both: 'ዓመታትን አስተዳድር (Manage Years) →',
  },
  'የአስቤዛ እና የፍጆታ ዕቃዎች ግዢ ሁኔታ በምድብ (Groceries & Consumables Analytics)': {
    am: 'የአስቤዛ እና የፍጆታ ዕቃዎች ግዢ ሁኔታ በምድብ',
    en: 'Groceries & Consumables Purchase Status by Category',
    both: 'የአስቤዛ እና የፍጆታ ዕቃዎች ግዢ ሁኔታ በምድብ (Groceries Analytics)',
  },
  'ወጪ & አፈጻጸም (Composed)': {
    am: 'ወጪ እና አፈጻጸም',
    en: 'Spend & Completion',
    both: 'ወጪ & አፈጻጸም (Composed)',
  },
  'Treemap ካርታ': {
    am: 'የምድብ ካርታ',
    en: 'Category Treemap',
    both: 'Treemap ካርታ',
  },
  'Radial Gauge': {
    am: 'የክብ ልኬት',
    en: 'Radial Gauge',
    both: 'የክብ ልኬት (Radial Gauge)',
  },
  'የአስቤዛ ዝርዝር →': {
    am: 'የአስቤዛ ዝርዝር →',
    en: 'Groceries Sheet →',
    both: 'የአስቤዛ ዝርዝር (Groceries) →',
  },

  // RentalSplitSheet
  'የስሌት ሕጎች': {
    am: 'የስሌት ሕጎች',
    en: 'Share Rules',
    both: 'የስሌት ሕጎች (Rules)',
  },
  'ወደ መስፍን መዝገብ አመሳክር': {
    am: 'ወደ መስፍን መዝገብ አመሳክር',
    en: "Sync to Mesfin's Ledger",
    both: "ወደ መስፍን መዝገብ አመሳክር (Sync to Mesfin's Ledger)",
  },
  'ማጠቃለያ (Summary)': {
    am: 'ማጠቃለያ',
    en: 'Summary',
    both: 'ማጠቃለያ (Summary)',
  },
  'የካርድ እይታ (Cards)': {
    am: 'የካርድ እይታ',
    en: 'Card View',
    both: 'የካርድ እይታ (Cards)',
  },
  'ሙሉ ሰንጠረዥ (Full Table)': {
    am: 'ሙሉ ሰንጠረዥ',
    en: 'Full Table',
    both: 'ሙሉ ሰንጠረዥ (Full Table)',
  },
  'ጠቅላላ ገቢ (+)': {
    am: 'ጠቅላላ ገቢ (+)',
    en: 'Total Income (+)',
    both: 'ጠቅላላ ገቢ / Total Income (+)',
  },
  'ጠቅላላ ወጪ (-)': {
    am: 'ጠቅላላ ወጪ (-)',
    en: 'Total Expense (-)',
    both: 'ጠቅላላ ወጪ / Total Expense (-)',
  },
  'የመስፍን ድርሻ': {
    am: 'የመስፍን ድርሻ',
    en: "Mesfin's Share",
    both: 'የመስፍን ድርሻ (Mesfin Share)',
  },
  'የመስፍን ድርሻ (Blue)': {
    am: 'የመስፍን ድርሻ (ሰማያዊ)',
    en: "Mesfin's Share (Blue)",
    both: 'የመስፍን ድርሻ (Mesfin · Blue)',
  },
  'የዘውድነሽ ድርሻ': {
    am: 'የዘውድነሽ ድርሻ',
    en: "Zewdnesh's Share",
    both: 'የዘውድነሽ ድርሻ (Zewdnesh Share)',
  },
  'የዘውድነሽ ድርሻ (Purple)': {
    am: 'የዘውድነሽ ድርሻ (ወይንጠጅ)',
    en: "Zewdnesh's Share (Purple)",
    both: 'የዘውድነሽ ድርሻ (Zewdnesh · Purple)',
  },
  'የተጣራ ዓመታዊ': {
    am: 'የተጣራ ዓመታዊ',
    en: 'Net Annual',
    both: 'የተጣራ ዓመታዊ (Net Annual)',
  },
  'የተጣራ ዓመታዊ (+)': {
    am: 'የተጣራ ዓመታዊ (+)',
    en: 'Net Annual (+)',
    both: 'የተጣራ ዓመታዊ / Net Annual (+)',
  },
  'የኦዲት ሁኔታ': {
    am: 'የኦዲት ሁኔታ',
    en: 'Audit Status',
    both: 'የኦዲት ሁኔታ (Audit Status)',
  },
  'ሁኔታ': {
    am: 'ሁኔታ',
    en: 'Status',
    both: 'ሁኔታ (Status)',
  },
  'ወርሃዊ የቤት ኪራይ ገቢ': {
    am: 'ወርሃዊ የቤት ኪራይ ገቢ',
    en: 'Monthly Rental Income',
    both: 'ወርሃዊ የቤት ኪራይ ገቢ · Monthly Rental Income',
  },
  'ወርሃዊ የቤት ኪራይ ገቢ · Monthly Rental Income': {
    am: 'ወርሃዊ የቤት ኪራይ ገቢ',
    en: 'Monthly Rental Income',
    both: 'ወርሃዊ የቤት ኪራይ ገቢ · Monthly Rental Income',
  },
  'አዲስ ተከራይ ጨምር': {
    am: 'አዲስ ተከራይ ጨምር',
    en: 'Add New Tenant',
    both: 'አዲስ ተከራይ ጨምር (Add Tenant)',
  },
  'የተከራይ ስም': {
    am: 'የተከራይ ስም',
    en: 'Tenant Name',
    both: 'የተከራይ ስም (Tenant Name)',
  },
  'የክፍፍል ድርሻ': {
    am: 'የክፍፍል ድርሻ',
    en: 'Split Rule',
    both: 'የክፍፍል ድርሻ (Split Rule)',
  },
  'የክፍፍል ድርሻ (Split Rule)': {
    am: 'የክፍፍል ድርሻ',
    en: 'Split Rule',
    both: 'የክፍፍል ድርሻ (Split Rule)',
  },
  'መዝግብ': {
    am: 'መዝግብ',
    en: 'Save',
    both: 'መዝግብ (Save)',
  },
  'ሰርዝ': {
    am: 'ሰርዝ',
    en: 'Cancel',
    both: 'ሰርዝ (Cancel)',
  },
  'ተከራይ': {
    am: 'ተከራይ',
    en: 'Tenant',
    both: 'ተከራይ (Tenant)',
  },
  'ዓመታዊ ድምር (+)': {
    am: 'ዓመታዊ ድምር (+)',
    en: 'Annual Total (+)',
    both: 'ዓመታዊ ድምር / Annual (+)',
  },
  'መስፍን ዓመታዊ': {
    am: 'መስፍን ዓመታዊ',
    en: 'Mesfin Annual',
    both: 'መስፍን ዓመታዊ (Mesfin Annual)',
  },
  'ዘውድነሽ ዓመታዊ': {
    am: 'ዘውድነሽ ዓመታዊ',
    en: 'Zewdnesh Annual',
    both: 'ዘውድነሽ ዓመታዊ (Zewdnesh Annual)',
  },
  'ጠቅላላ ድምር': {
    am: 'ጠቅላላ ድምር',
    en: 'Grand Total',
    both: 'ጠቅላላ ድምር (Grand Total)',
  },
  '100% ጠቅላላ ድምር': {
    am: '100% ጠቅላላ ድምር',
    en: '100% Gross Total',
    both: '100% ጠቅላላ ድምር (100% Total)',
  },
  'የመስፍን ጠቅላላ ገቢ': {
    am: 'የመስፍን ጠቅላላ ገቢ',
    en: "Mesfin's Gross Income",
    both: 'የመስፍን ጠቅላላ ገቢ (Mesfin Gross)',
  },
  'የዘውድነሽ ጠቅላላ ገቢ': {
    am: 'የዘውድነሽ ጠቅላላ ገቢ',
    en: "Zewdnesh's Gross Income",
    both: 'የዘውድነሽ ጠቅላላ ገቢ (Zewdnesh Gross)',
  },
  'የአጋር ድርሻ (Blue)': {
    am: 'የአጋር ድርሻ (ሰማያዊ)',
    en: 'Partner Share (Blue)',
    both: 'የአጋር ድርሻ (Partner · Blue)',
  },
  'የአጋር ድርሻ (Purple)': {
    am: 'የአጋር ድርሻ (ወይንጠጅ)',
    en: 'Partner Share (Purple)',
    both: 'የአጋር ድርሻ (Partner · Purple)',
  },
  'ወጪዎች': {
    am: 'ወጪዎች',
    en: 'Property Expenses',
    both: 'ወጪዎች · Property Expenses',
  },
  'ወጪዎች · Property Expenses': {
    am: 'ወጪዎች',
    en: 'Property Expenses',
    both: 'ወጪዎች · Property Expenses',
  },
  'አዲስ የወጪ መስመር ጨምር': {
    am: 'አዲስ የወጪ መስመር ጨምር',
    en: 'Add Property Expense',
    both: 'አዲስ የወጪ መስመር ጨምር (Add Expense)',
  },
  'የወጪ አይነት': {
    am: 'የወጪ አይነት',
    en: 'Expense Type',
    both: 'የወጪ አይነት (Expense Type)',
  },
  'ጠቅላላ ወርሃዊ ወጪ': {
    am: 'ጠቅላላ ወርሃዊ ወጪ',
    en: 'Total Monthly Expense',
    both: 'ጠቅላላ ወርሃዊ ወጪ (Total Expense)',
  },
  'ጠቅላላ ወጪ': {
    am: 'ጠቅላላ ወጪ',
    en: 'Total Expense',
    both: 'ጠቅላላ ወጪ (Total Expense)',
  },
  'የተጣራ ገቢ እና የክፍፍል ማረጋገጫ': {
    am: 'የተጣራ ገቢ እና የክፍፍል ማረጋገጫ',
    en: 'Net Income & Partner Reconciliation',
    both: 'የተጣራ ገቢ እና የክፍፍል ማረጋገጫ · Net Income & Reconciliation',
  },
  'የተጣራ ገቢ እና የክፍፍል ማረጋገጫ · Net Income & Reconciliation': {
    am: 'የተጣራ ገቢ እና የክፍፍል ማረጋገጫ',
    en: 'Net Income & Partner Reconciliation',
    both: 'የተጣራ ገቢ እና የክፍፍል ማረጋገጫ · Net Income & Reconciliation',
  },
  'ርዕስ': { am: 'ርዕስ', en: 'Item', both: 'ርዕስ (Item)' },
  'ድርሻ': { am: 'ድርሻ', en: 'Allocation', both: 'ድርሻ (Allocation)' },
  'የተጣራ ወርሃዊ ገቢ': {
    am: 'የተጣራ ወርሃዊ ገቢ',
    en: 'Net Monthly Income',
    both: 'የተጣራ ወርሃዊ ገቢ (Net Monthly Income)',
  },
  'የተጣራ የገንዘብ ፍሰት': {
    am: 'የተጣራ የገንዘብ ፍሰት',
    en: 'Net Cashflow',
    both: 'የተጣራ የገንዘብ ፍሰት (Net Cashflow)',
  },
  'ጠቅላላ የተጣራ': {
    am: 'ጠቅላላ የተጣራ',
    en: 'Total Net',
    both: 'ጠቅላላ የተጣራ (Total Net)',
  },
  'የመስፍን የተጣራ ፍሰት': {
    am: 'የመስፍን የተጣራ ፍሰት',
    en: "Mesfin's Net Cashflow",
    both: 'የመስፍን የተጣራ ፍሰት (Mesfin Net)',
  },
  'የዘውድነሽ የተጣራ ፍሰት': {
    am: 'የዘውድነሽ የተጣራ ፍሰት',
    en: "Zewdnesh's Net Cashflow",
    both: 'የዘውድነሽ የተጣራ ፍሰት (Zewdnesh Net)',
  },
  'የተጣራ ድርሻ (Blue)': {
    am: 'የተጣራ ድርሻ (ሰማያዊ)',
    en: 'Net Share (Blue)',
    both: 'የተጣራ ድርሻ (Net · Blue)',
  },
  'የተጣራ ድርሻ (Purple)': {
    am: 'የተጣራ ድርሻ (ወይንጠጅ)',
    en: 'Net Share (Purple)',
    both: 'የተጣራ ድርሻ (Net · Purple)',
  },
  'ማረጋገጫ': {
    am: 'ማረጋገጫ',
    en: 'Reconciliation',
    both: 'ማረጋገጫ (Reconciliation)',
  },
  'የክፍፍል ማረጋገጫ': {
    am: 'የክፍፍል ማረጋገጫ',
    en: 'Split Audit Check',
    both: 'የክፍፍል ማረጋገጫ (Audit Check)',
  },
  'የተጣራ = መስፍን + ዘውድነሽ': {
    am: 'የተጣራ = መስፍን + ዘውድነሽ',
    en: 'Net = Mesfin + Zewdnesh',
    both: 'የተጣራ = መስፍን + ዘውድነሽ (Net = M + Z)',
  },
  'ምጣኔ': {
    am: 'ምጣኔ',
    en: 'Ratio %',
    both: 'ምጣኔ (Ratio %)',
  },
  'የባለቤቶች የተጣራ መቶኛ ክፍፍል': {
    am: 'የባለቤቶች የተጣራ መቶኛ ክፍፍል',
    en: 'Partner Net Percentage Split',
    both: 'የባለቤቶች የተጣራ መቶኛ ክፍፍል (Partner Net %)',
  },
  'የመስፍን % / የዘውድነሽ %': {
    am: 'የመስፍን % / የዘውድነሽ %',
    en: 'Mesfin % / Zewdnesh %',
    both: 'የመስፍን % / የዘውድነሽ % (M% / Z%)',
  },

  // PersonalLedgerSheet
  'ጠቅላላ ገቢ (Total Income)': {
    am: 'ጠቅላላ ገቢ',
    en: 'Total Income',
    both: 'ጠቅላላ ገቢ (Total Income)',
  },
  'ጠቅላላ ተቀማጭ (Total Deposit)': {
    am: 'ጠቅላላ ተቀማጭ',
    en: 'Total Deposit',
    both: 'ጠቅላላ ተቀማጭ (Total Deposit)',
  },
  'ጠቅላላ ወጪ (Total Expense)': {
    am: 'ጠቅላላ ወጪ',
    en: 'Total Expense',
    both: 'ጠቅላላ ወጪ (Total Expense)',
  },
  'የተጣራ ቀሪ ሂሳብ (Net Remaining Balance)': {
    am: 'የተጣራ ቀሪ ሂሳብ',
    en: 'Net Remaining Balance',
    both: 'የተጣራ ቀሪ ሂሳብ (Net Remaining Balance)',
  },
  'የሂሳብ ምጣኔ:': {
    am: 'የሂሳብ ምጣኔ:',
    en: 'Balance Utilization:',
    both: 'የሂሳብ ምጣኔ (Utilization):',
  },
  'የገቢ መዝገብ (የኪራይ እና ተጨማሪ ገቢዎች)': {
    am: 'የገቢ መዝገብ (የኪራይ እና ተጨማሪ ገቢዎች)',
    en: 'Income Ledger (Rental & Additional Incomes)',
    both: 'የገቢ መዝገብ (Income Ledger)',
  },
  'የተቀማጭ መዝገብ (የመጀመሪያ ተቀማጭ እና ተጨማሪ ገቢዎች)': {
    am: 'የተቀማጭ መዝገብ (የመጀመሪያ ተቀማጭ እና ተጨማሪ ገቢዎች)',
    en: 'Deposit Ledger (Initial & Additional Deposits)',
    both: 'የተቀማጭ መዝገብ (Deposit Ledger)',
  },
  'ገቢ ጨምር': {
    am: 'ገቢ ጨምር',
    en: 'Add Income',
    both: 'ገቢ ጨምር (Add Income)',
  },
  'ተቀማጭ ጨምር': {
    am: 'ተቀማጭ ጨምር',
    en: 'Add Deposit',
    both: 'ተቀማጭ ጨምር (Add Deposit)',
  },
  'ቀን / ወር': {
    am: 'ቀን / ወር',
    en: 'Date / Month',
    both: 'ቀን / ወር (Date / Month)',
  },
  'መጠን (ብር)': {
    am: 'መጠን (ብር)',
    en: 'Amount (ETB)',
    both: 'መጠን / Amount (ETB)',
  },
  'የገቢ አይነት / ዝርዝር': {
    am: 'የገቢ አይነት / ዝርዝር',
    en: 'Income Description',
    both: 'የገቢ አይነት / ዝርዝር (Description)',
  },
  'የተቀማጭ አይነት / ዝርዝር': {
    am: 'የተቀማጭ አይነት / ዝርዝር',
    en: 'Deposit Description',
    both: 'የተቀማጭ አይነት / ዝርዝር (Description)',
  },
  'መጠን (+ብር)': {
    am: 'መጠን (+ብር)',
    en: 'Amount (+ETB)',
    both: 'መጠን (+ብር / +ETB)',
  },
  'ድምር (ጠቅላላ ገቢ)': {
    am: 'ድምር (ጠቅላላ ገቢ)',
    en: 'Total Income',
    both: 'ድምር / Total Income',
  },
  'ድምር (ጠቅላላ ተቀማጭ)': {
    am: 'ድምር (ጠቅላላ ተቀማጭ)',
    en: 'Total Deposit',
    both: 'ድምር / Total Deposit',
  },
  'የወጪ መዝገብ (የግል ወጪዎች፣ ጥገና፣ ግብር እና ማውጣት)': {
    am: 'የወጪ መዝገብ (የግል ወጪዎች፣ ጥገና፣ ግብር እና ማውጣት)',
    en: 'Expense Ledger (Personal Expenses, Repairs, Tax & Withdrawals)',
    both: 'የወጪ መዝገብ (Expense Ledger)',
  },
  'ወጪ ጨምር': {
    am: 'ወጪ ጨምር',
    en: 'Add Expense',
    both: 'ወጪ ጨምር (Add Expense)',
  },
  'ቀን / ሁኔታ': {
    am: 'ቀን / ሁኔታ',
    en: 'Date / Status',
    both: 'ቀን / ሁኔታ (Date / Status)',
  },
  'የወጪ ዝርዝር': {
    am: 'የወጪ ዝርዝር',
    en: 'Expense Description',
    both: 'የወጪ ዝርዝር (Expense Description)',
  },
  'የወጪ አይነት / ዝርዝር': {
    am: 'የወጪ አይነት / ዝርዝር',
    en: 'Expense Description',
    both: 'የወጪ አይነት / ዝርዝር (Description)',
  },
  'መጠን (-ብር)': {
    am: 'መጠን (-ብር)',
    en: 'Amount (-ETB)',
    both: 'መጠን (-ብር / -ETB)',
  },
  'ድምር (ጠቅላላ ወጪ)': {
    am: 'ድምር (ጠቅላላ ወጪ)',
    en: 'Total Expense',
    both: 'ድምር / Total Expense',
  },

  // GroceriesTrackerSheet
  'የአስቤዛ እና የፍጆታ ዕቃዎች ወጪ መከታተያ': {
    am: 'የአስቤዛ እና የፍጆታ ዕቃዎች ወጪ መከታተያ',
    en: 'Groceries & Household Consumables Tracker',
    both: 'የአስቤዛ እና የፍጆታ ዕቃዎች ወጪ መከታተያ · Groceries & Consumables',
  },
  'የአስቤዛ እና የፍጆታ ዕቃዎች ወጪ መከታተያ · Groceries & Consumables': {
    am: 'የአስቤዛ እና የፍጆታ ዕቃዎች ወጪ መከታተያ',
    en: 'Groceries & Household Consumables Tracker',
    both: 'የአስቤዛ እና የፍጆታ ዕቃዎች ወጪ መከታተያ · Groceries & Consumables',
  },
  'አዲስ ዕቃ ጨምር': {
    am: 'አዲስ ዕቃ ጨምር',
    en: 'Add New Item',
    both: 'አዲስ ዕቃ ጨምር (Add Item)',
  },
  'ጠቅላላ የወጣ ወጪ (Total Spent)': {
    am: 'ጠቅላላ የወጣ ወጪ',
    en: 'Total Spent',
    both: 'ጠቅላላ የወጣ ወጪ (Total Spent)',
  },
  'ጠቅላላ የዕቃዎች ብዛት (Total Items)': {
    am: 'ጠቅላላ የዕቃዎች ብዛት',
    en: 'Total Items',
    both: 'ጠቅላላ የዕቃዎች ብዛት (Total Items)',
  },
  'ያልተገዙ / ቀሪ ዕቃዎች (Remaining)': {
    am: 'ያልተገዙ / ቀሪ ዕቃዎች',
    en: 'Remaining / Pending Items',
    both: 'ያልተገዙ / ቀሪ ዕቃዎች (Remaining)',
  },
  'ሁሉም ምድቦች (All Categories)': {
    am: 'ሁሉም ምድቦች',
    en: 'All Categories',
    both: 'ሁሉም ምድቦች (All Categories)',
  },
  'ተ.ቁ': { am: 'ተ.ቁ', en: '#', both: 'ተ.ቁ (#)' },
  'የዕቃው ዝርዝር': {
    am: 'የዕቃው ዝርዝር',
    en: 'Item Name',
    both: 'የዕቃው ዝርዝር (Item Name)',
  },
  'ምድብ': {
    am: 'ምድብ',
    en: 'Category',
    both: 'ምድብ (Category)',
  },
  'መለኪያ': {
    am: 'መለኪያ',
    en: 'Unit',
    both: 'መለኪያ (Unit)',
  },
  'ዋጋ (ብር)': {
    am: 'ዋጋ (ብር)',
    en: 'Price (ETB)',
    both: 'ዋጋ / Price (ETB)',
  },
  'መጠን / ዋጋ (ብር)': {
    am: 'መጠን / ዋጋ (ብር)',
    en: 'Price (ETB)',
    both: 'መጠን / ዋጋ (Price ETB)',
  },
  'የግዢ ሁኔታ': {
    am: 'የግዢ ሁኔታ',
    en: 'Purchase Status',
    both: 'የግዢ ሁኔታ (Status)',
  },
  'ጠቅላላ ድምር (Total Purchased Expenditure)': {
    am: 'ጠቅላላ ድምር (የተገዙ ዕቃዎች ወጪ)',
    en: 'Total Purchased Expenditure',
    both: 'ጠቅላላ ድምር (Total Purchased Expenditure)',
  },

  // SettingsAndBackupCenter
  'ቅንብሮች፣ ሕጎች፣ መጠባበቂያ እና የእገዛ ማዕከል': {
    am: 'ቅንብሮች፣ ሕጎች፣ መጠባበቂያ እና የእገዛ ማዕከል',
    en: 'Settings, Rules, Backup & Help Center',
    both: 'ቅንብሮች፣ ሕጎች፣ መጠባበቂያ እና የእገዛ ማዕከል (Settings & Backup)',
  },
  'መጠባበቂያ (Backup & Sync)': {
    am: 'መጠባበቂያ እና ማመሳከሪያ',
    en: 'Backup & Sync',
    both: 'መጠባበቂያ (Backup & Sync)',
  },
  'የስሌት ሕጎች (Rules)': {
    am: 'የስሌት ሕጎች',
    en: 'Share Rules',
    both: 'የስሌት ሕጎች (Rules)',
  },
  'የእገዛ ማዕከል (Help Center)': {
    am: 'የእገዛ ማዕከል',
    en: 'Help Center',
    both: 'የእገዛ ማዕከል (Help Center)',
  },
  'የክላውድ ግንኙነት:': {
    am: 'የክላውድ ግንኙነት:',
    en: 'Cloud Status:',
    both: 'የክላውድ ግንኙነት (Cloud):',
  },
  'Cloud አዘምን': {
    am: 'ክላውድ አዘምን',
    en: 'Sync Cloud',
    both: 'Cloud አዘምን (Sync Cloud)',
  },
  'ውጣ': {
    am: 'ውጣ',
    en: 'Sign Out',
    both: 'ውጣ (Sign Out)',
  },
  'Local Mode': {
    am: 'ያለ ኢንተርኔት (ሎካል)',
    en: 'Local Mode',
    both: 'ሎካል (Local Mode)',
  },
  'መግቢያ ገጽ': {
    am: 'መግቢያ ገጽ',
    en: 'Login Page',
    both: 'መግቢያ ገጽ (Login)',
  },
  'ንቁ ዓመት:': {
    am: 'ንቁ ዓመት:',
    en: 'Active Year:',
    both: 'ንቁ ዓመት (Year):',
  },
  'Android .APK አውርድ': {
    am: 'የአንድሮይድ .APK አውርድ',
    en: 'Download Android .APK',
    both: 'Android .APK አውርድ',
  },
  'ፋይል አስገባ / አውርድ': {
    am: 'ፋይል አስገባ / አውርድ',
    en: 'Import / Export File',
    both: 'ፋይል አስገባ / አውርድ (Import / Export)',
  },
  'የአንድሮይድ ስልክ መተግበሪያ (Android .APK)': {
    am: 'የአንድሮይድ ስልክ መተግበሪያ',
    en: 'Android Mobile Application (.APK)',
    both: 'የአንድሮይድ ስልክ መተግበሪያ (Android .APK)',
  },
  '1. APK አውርድ → 2. በስልክ ጫን (Install) → 3. ከክላውድ ጋር አመሳክር (Sync Cloud)': {
    am: '1. APK አውርድ → 2. በስልክ ጫን → 3. ከክላውድ ጋር አመሳክር',
    en: '1. Download APK → 2. Install on Phone → 3. Sync with Cloud',
    both: '1. APK አውርድ → 2. በስልክ ጫን (Install) → 3. ከክላውድ ጋር አመሳክር (Sync Cloud)',
  },
  'አማራጭ A · Option A': {
    am: 'አማራጭ ሀ',
    en: 'Option A',
    both: 'አማራጭ A · Option A',
  },
  'Google Sheets ቀጥታ ማመሳከሪያ (On-Demand Sync)': {
    am: 'የGoogle Sheets ቀጥታ ማመሳከሪያ',
    en: 'Google Sheets On-Demand Sync',
    both: 'Google Sheets ቀጥታ ማመሳከሪያ (On-Demand Sync)',
  },
  'የGoogle Workspace ግንኙነት ሁኔታ': {
    am: 'የGoogle Workspace ግንኙነት ሁኔታ',
    en: 'Google Workspace Connection Status',
    both: 'የGoogle Workspace ግንኙነት ሁኔታ (Workspace Status)',
  },
  'ከGoogle መለያ ጋር አልተገናኘም': {
    am: 'ከGoogle መለያ ጋር አልተገናኘም',
    en: 'Not connected to a Google Account',
    both: 'ከGoogle መለያ ጋር አልተገናኘም (Not Connected)',
  },
  'Google Sheets ፈቃድ አድስ': {
    am: 'የGoogle Sheets ፈቃድ አድስ',
    en: 'Refresh Google Sheets Access',
    both: 'Google Sheets ፈቃድ አድስ (Refresh Access)',
  },
  'Connect Google Sheets': {
    am: 'Google Sheets አገናኝ',
    en: 'Connect Google Sheets',
    both: 'Google Sheets አገናኝ (Connect Google Sheets)',
  },
  'የውጭ ተጠቃሚዎች ማንበብ ብቻ እንዲችሉ ቆልፍ (Read-Only Lock)': {
    am: 'የውጭ ተጠቃሚዎች ማንበብ ብቻ እንዲችሉ ቆልፍ',
    en: 'Lock external users to Read-Only access',
    both: 'የውጭ ተጠቃሚዎች ማንበብ ብቻ እንዲችሉ ቆልፍ (Read-Only Lock)',
  },
  'Google Sheet ክፈት': {
    am: 'Google Sheet ክፈት',
    en: 'Open Google Sheet',
    both: 'Google Sheet ክፈት (Open)',
  },
  'ወይም ነባር የGoogle Sheet URL / ID ያስገቡ (Optional Existing Sheet)': {
    am: 'ወይም ነባር የGoogle Sheet አድራሻ / መለያ ያስገቡ',
    en: 'Or enter an existing Google Sheet URL / ID (Optional)',
    both: 'ወይም ነባር የGoogle Sheet URL / ID ያስገቡ (Existing Sheet)',
  },
  'ወደዚህ Sheet አመሳክር': {
    am: 'ወደዚህ ሉህ አመሳክር',
    en: 'Sync to this Sheet',
    both: 'ወደዚህ Sheet አመሳክር (Sync)',
  },
  'በዚህ መተግበሪያ የተፈጠሩ የGoogle Sheets ፋይሎች:': {
    am: 'በዚህ መተግበሪያ የተፈጠሩ የGoogle Sheets ፋይሎች:',
    en: 'Google Sheets created by this app:',
    both: 'በዚህ መተግበሪያ የተፈጠሩ የGoogle Sheets ፋይሎች (App Sheets):',
  },
  'አዘምን (Sync)': {
    am: 'አዘምን',
    en: 'Sync',
    both: 'አዘምን (Sync)',
  },
  'አሁን ወደ Google Sheet አመሳክር (Instant Sync)': {
    am: 'አሁን ወደ Google Sheet አመሳክር',
    en: 'Instant Sync to Google Sheet',
    both: 'አሁን ወደ Google Sheet አመሳክር (Instant Sync)',
  },
  'አዲስ Google Sheet ፍጠር': {
    am: 'አዲስ Google Sheet ፍጠር',
    en: 'Create New Google Sheet',
    both: 'አዲስ Google Sheet ፍጠር (Create New)',
  },
  'Google Sheet ፍጠር እና አሁን አመሳክር (Create & Sync Locked Sheet)': {
    am: 'Google Sheet ፍጠር እና አሁን አመሳክር',
    en: 'Create & Sync Locked Google Sheet',
    both: 'Google Sheet ፍጠር እና አሁን አመሳክር (Create & Sync)',
  },
  'አማራጭ B · Option B': {
    am: 'አማራጭ ለ',
    en: 'Option B',
    both: 'አማራጭ B · Option B',
  },
  'የአካባቢ Excel (.xlsx) መጠባበቂያ ማውረጃ': {
    am: 'የአካባቢ Excel (.xlsx) መጠባበቂያ ማውረጃ',
    en: 'Local Excel (.xlsx) Backup & Export',
    both: 'የአካባቢ Excel (.xlsx) መጠባበቂያ ማውረጃ (Local Excel Export)',
  },
  'የExcel መጠባበቂያ ፋይል ስም (Target .xlsx File Name)': {
    am: 'የExcel መጠባበቂያ ፋይል ስም',
    en: 'Target Excel (.xlsx) File Name',
    both: 'የExcel መጠባበቂያ ፋይል ስም (Target .xlsx File Name)',
  },
  'አቃፊ ምረጥ እና Excel አስቀምጥ (Choose Folder & Save .xlsx)': {
    am: 'አቃፊ ምረጥ እና Excel አስቀምጥ',
    en: 'Choose Folder & Save Excel (.xlsx)',
    both: 'አቃፊ ምረጥ እና Excel አስቀምጥ (Choose Folder & Save .xlsx)',
  },
  'ቀጥታ አውርድ (Direct Download .xlsx)': {
    am: 'በቀጥታ አውርድ (.xlsx)',
    en: 'Direct Download (.xlsx)',
    both: 'ቀጥታ አውርድ (Direct Download .xlsx)',
  },
  'የሁሉም ዓመታት Excel አውርድ (.xlsx)': {
    am: 'የሁሉም ዓመታት Excel አውርድ (.xlsx)',
    en: 'Download Multi-Year Excel Archive (.xlsx)',
    both: 'የሁሉም ዓመታት Excel አውርድ (Multi-Year .xlsx)',
  },

  // MobileAppModal
  'የአንድሮይድ መተግበሪያ (.APK) መጫኛ ቅደም ተከተል': {
    am: 'የአንድሮይድ መተግበሪያ (.APK) መጫኛ ቅደም ተከተል',
    en: 'Android App (.APK) Installation Steps',
    both: 'የአንድሮይድ መተግበሪያ (.APK) መጫኛ ቅደም ተከተል (Install Steps)',
  },
  'ደረጃ 1፦ መተግበሪያውን በስልክ ላይ ለመጫን (How to Install)': {
    am: 'ደረጃ 1፦ መተግበሪያውን በስልክ ላይ ለመጫን',
    en: 'Step 1: How to Install on Your Phone',
    both: 'ደረጃ 1፦ መተግበሪያውን በስልክ ላይ ለመጫን (How to Install)',
  },
  '1. APK አውርድ (Download .APK)': {
    am: '1. APK አውርድ',
    en: '1. Download .APK',
    both: '1. APK አውርድ (Download .APK)',
  },
  'በማውረድ ላይ...': {
    am: 'በማውረድ ላይ...',
    en: 'Downloading...',
    both: 'በማውረድ ላይ... (Downloading...)',
  },
  'ወደ ስልክ ላክ (Send)': {
    am: 'ወደ ስልክ ላክ',
    en: 'Send to Phone',
    both: 'ወደ ስልክ ላክ (Send)',
  },
  'ደረጃ 2፦ ስልክን ከክላውድ ጋር ለማገናኘት (How to Sync Cloud)': {
    am: 'ደረጃ 2፦ ስልክን ከክላውድ ጋር ለማገናኘት',
    en: 'Step 2: How to Sync Phone with Cloud',
    both: 'ደረጃ 2፦ ስልክን ከክላውድ ጋር ለማገናኘት (How to Sync Cloud)',
  },
  '1. Copy Sync Key': {
    am: '1. የማመሳከሪያ ኮድ ቅዳ',
    en: '1. Copy Sync Key',
    both: '1. ኮድ ቅዳ (Copy Sync Key)',
  },
  'ተቀድቷል (Copied)': {
    am: 'ተቀድቷል',
    en: 'Copied',
    both: 'ተቀድቷል (Copied)',
  },
  '2. Link Cloud': {
    am: '2. ከክላውድ ጋር አገናኝ',
    en: '2. Link Cloud',
    both: '2. አገናኝ (Link Cloud)',
  },
  'ዝጋ (Done)': {
    am: 'ዝጋ',
    en: 'Done',
    both: 'ዝጋ (Done)',
  },
  'ዝጋ (Close)': {
    am: 'ዝጋ',
    en: 'Close',
    both: 'ዝጋ (Close)',
  },
};

/**
 * Word and token-level replacements when translating pure Amharic or mixed strings to English.
 */
const AM_TO_EN_PHRASES: [string, string][] = [
  ['መስፍን እና ዘውድነሽ — የኪራይ ንብረት፣ የግል ሂሳብ እና የአስቤዛ ወጪ መከታተያ', 'Mesfin & Zewdnesh — Property Rental, Personal Ledger & Groceries Tracker'],
  ['መስፍን እና ዘውድነሽ · የሂሳብ መዝገብ', 'Mesfin & Zewdnesh · Financial Ledger'],
  ['መስፍን እና ዘውድነሽ', 'Mesfin & Zewdnesh'],
  ['የመስፍን ገቢ እና ወጪ መዝገብ', "Mesfin's Income & Expense Ledger"],
  ['የዘውድነሽ ተቀማጭ እና ወጪ መዝገብ', "Zewdnesh's Deposit & Expense Ledger"],
  ['የኪራይ ንብረት እና የግል መዝገቦች ትንታኔ', 'Rental Property & Personal Ledgers Analytics'],
  ['የገቢ፣ ወጪ እና የንብረት ትንታኔ', 'Income, Expense & Property Analytics'],
  ['የኪራይ ንብረት እና ወጪ', 'Rental Property & Expenses'],
  ['የተጣራ ወርሃዊ ኪራይ', 'Net Monthly Rent'],
  ['የጥቅምት ኪራይ ድርሻን አዘምን', 'Sync Tikimt Rental Share'],
  ['የጥቅምት ድርሻን ወደ መስፍን መዝገብ አመሳክር', "Sync Tikimt Share to Mesfin's Ledger"],
  ['ወደ ወርሃዊ ወጪ ሰንጠረዥ አመሳክር', 'Sync to Monthly Expenses'],
  ['የአስቤዛ ወጪን', 'Groceries Expense'],
  ['ወደ ወርሃዊ ወጪ አስገባ', 'to Monthly Expenses'],
  ['የቤት ኪራይ ገቢ', 'Rental Income'],
  ['የመኖሪያ ቤት ኪራይ', 'Residential Rent'],
  ['የመጀመሪያ ተቀማጭ', 'Initial Deposit'],
  ['ተጨማሪ ተቀማጭ', 'Additional Deposit'],
  ['የግል ተቀማጭ / ገቢ', 'Personal Deposit / Income'],
  ['ተጨማሪ ገቢ', 'Additional Income'],
  ['ብር ወስዷል (ዳሽን)', 'Bank Withdrawal (Dashen)'],
  ['የሽንት ቤት ጥገና', 'Restroom Maintenance'],
  ['ግብር የአከራይ ተከራይ', 'Landlord Rental Tax'],
  ['ሽንት ቤት እና ግብር የአከራይ ተከራይ', 'Restroom Repair & Rental Tax'],
  ['የጎደለ ገንዘብ', 'Cash Shortfall Adjustment'],
  ['የመሬት ግብር', 'Land Tenure Tax'],
  ['የበርበሬ', 'Berbere Spice Purchase'],
  ['በሬ የደመቅ', 'Ox Purchase (Demeq)'],
  ['ብድር እና እቁብ', 'Loan & Equb Payment'],
  ['ጋሻው', 'Gashaw'],
  ['ገብርኤል', 'Gebriel'],
  ['የተከፈለ', 'Paid'],
  ['መነሻ', 'Initial'],
  ['ዘይት (5 ሊትር)', 'Cooking Oil (5L)'],
  ['ጨው', 'Salt'],
  ['ስኳር', 'Sugar'],
  ['ድፍን ምስር', 'Whole Lentils'],
  ['ክክ ምስር', 'Split Lentils'],
  ['አተር', 'Peas'],
  ['ድንች', 'Potatoes'],
  ['ሩዝ', 'Rice'],
  ['ፓስታ', 'Pasta'],
  ['መኮረኒ', 'Macaroni'],
  ['ሻይ ቅጠል', 'Tea Leaves'],
  ['ነጭ ሽንኩርት', 'Garlic'],
  ['ቀይ ሽንኩርት', 'Red Onion'],
  ['ቀይ ስር', 'Beetroot'],
  ['ካሮት', 'Carrots'],
  ['ጥቅል ጎመን', 'Cabbage'],
  ['ዱቄት', 'Flour'],
  ['የጓሮ ማዳበሪያ', 'Garden Fertilizer'],
  ['ቲማቲም', 'Tomatoes'],
  ['5 ሊትር', '5 Liters'],
  ['ሊትር', 'Liter'],
  ['ኪሎግራም', 'kg'],
  ['ፓኬት', 'Packet'],
  ['በቁጥር', 'Pcs'],
  ['የሂሳብ ዓመት', 'Fiscal Year'],
  ['ዓመታዊ ድምር', 'Annual Total'],
  ['ጠቅላላ ገቢ', 'Total Income'],
  ['ጠቅላላ ተቀማጭ', 'Total Deposit'],
  ['ጠቅላላ ወጪ', 'Total Expense'],
  ['የተጣራ ገቢ', 'Net Income'],
  ['የተጣራ ቀሪ ሂሳብ', 'Net Balance'],
  ['የመስፍን ድርሻ', "Mesfin's Share"],
  ['የዘውድነሽ ድርሻ', "Zewdnesh's Share"],
  ['መስፍን የተጣራ', 'Mesfin Net'],
  ['ዘውድነሽ የተጣራ', 'Zewdnesh Net'],
  ['ተከራዮች (አዲስ አበባ)', 'Tenants (Addis Ababa)'],
  ['ተከራዮች', 'Tenants'],
  ['ተከራይ', 'Tenant'],
  ['አዲስ አበባ', 'Addis Ababa'],
  ['መስከረም', 'Meskerem'],
  ['ጥቅምት', 'Tikimt'],
  ['ኅዳር', 'Hidar'],
  ['ታኅሣሥ', 'Tahsas'],
  ['ጥር', 'Tir'],
  ['የካቲት', 'Yekatit'],
  ['መጋቢት', 'Megabit'],
  ['ሚያዝያ', 'Miyazya'],
  ['ግንቦት', 'Ginbot'],
  ['ሰኔ', 'Sene'],
  ['ሐምሌ', 'Hamle'],
  ['ሀምሌ', 'Hamle'],
  ['ነሐሴ', 'Nehase'],
  ['ነሀሴ', 'Nehase'],
  ['መስፍን', 'Mesfin'],
  ['ዘውድነሽ', 'Zewdnesh'],
  ['ተገዝቷል', 'Purchased'],
  ['አልተገዛም', 'Pending'],
  ['ዕቃዎች', 'items'],
  ['ንቁ መዝገቦች', 'active entries'],
  ['ወደፊት የሚሞሉ', 'future placeholders'],
  ['የወጪ መዝገቦች', 'expense entries'],
  ['ጥቅም ላይ የዋለ', 'utilized'],
  ['ቀሪ ምጣኔ', 'Retention rate'],
  ['ሁሉም', 'All'],
  ['ድምር', 'Total'],
  ['ገቢ', 'Income'],
  ['ወጪ', 'Expense'],
  ['ተቀማጭ', 'Deposit'],
  ['ቀሪ', 'Remaining'],
  ['ትክክል', 'Reconciled'],
  ['ልዩነት', 'Variance'],
  ['ዓ.ም', 'EC'],
  ['ብር', 'ETB'],
];

const EN_TO_AM_PHRASES: [string, string][] = [
  ['Syncing...', 'በማመሳከር ላይ...'],
  ['Synced', 'ተመሳክሯል'],
  ['Local Mode', 'ያለ ኢንተርኔት (ሎካል)'],
  ['Active', 'ንቁ'],
  ['Read-Only Locked', 'ለንባብ ብቻ የተቆለፈ'],
  ['Source (.ZIP)', 'ምንጭ ኮድ (.ZIP)'],
  ['Donut', 'ክብ ቻርት'],
  ['Waterfall', 'የፍሰት ቻርት'],
];

const hasEthiopic = (s: string) => /[\u1200-\u137F]/.test(s);
const hasLatin = (s: string) => /[A-Za-z]/.test(s);

/**
 * Translates any string into the target LanguageMode ('AM' | 'EN' | 'BOTH').
 */
export function translateTextForMode(raw: string, mode: LanguageMode): string {
  if (!raw) return raw;
  const trimmed = raw.trim();
  if (!trimmed) return raw;

  const leadingSpace = raw.match(/^\s*/)?.[0] || '';
  const trailingSpace = raw.match(/\s*$/)?.[0] || '';

  // 1. Check exact dictionary match
  const exact = EXACT_DICTIONARY[trimmed];
  if (exact) {
    const out =
      mode === 'AM'
        ? exact.am
        : mode === 'EN'
        ? exact.en
        : exact.both || `${exact.am} (${exact.en})`;
    return `${leadingSpace}${out}${trailingSpace}`;
  }

  // 2. Check if string has bilingual parenthetical pattern: "Amharic Text (English Text)"
  const parenMatch = trimmed.match(/^(.+?)\s*\(([^()]+)\)$/);
  if (parenMatch) {
    const left = parenMatch[1].trim();
    const right = parenMatch[2].trim();
    if (hasEthiopic(left) && hasLatin(right) && !hasEthiopic(right)) {
      if (mode === 'AM') {
        return `${leadingSpace}${left}${trailingSpace}`;
      }
      if (mode === 'EN') {
        // If right is just a color or short tag like "Blue" or "Purple", translate left too
        if (/^(Blue|Purple|Optional|Cards|Full Table|Bar|Donut|Pareto)$/i.test(right)) {
          let enLeft = left;
          for (const [amP, enP] of AM_TO_EN_PHRASES) {
            if (enLeft.includes(amP)) {
              enLeft = enLeft.split(amP).join(enP);
            }
          }
          return `${leadingSpace}${enLeft} (${right})${trailingSpace}`;
        }
        return `${leadingSpace}${right}${trailingSpace}`;
      }
      return `${leadingSpace}${trimmed}${trailingSpace}`;
    }
  }

  // 3. Check if string has bilingual middot pattern: "Amharic Text · English Text"
  if (trimmed.includes(' · ')) {
    const parts = trimmed.split(' · ');
    if (parts.length === 2 && hasEthiopic(parts[0]) && hasLatin(parts[1]) && !hasEthiopic(parts[1])) {
      if (mode === 'AM') {
        return `${leadingSpace}${parts[0].trim()}${trailingSpace}`;
      }
      if (mode === 'EN') {
        return `${leadingSpace}${parts[1].trim()}${trailingSpace}`;
      }
      return `${leadingSpace}${trimmed}${trailingSpace}`;
    }
  }

  // 4. Mode-specific phrase replacements for dynamic strings
  if (mode === 'AM') {
    let result = trimmed;
    // Strip inline English parentheticals where preceded by Ethiopic text
    result = result.replace(/([\u1200-\u137F0-9%]+)\s*\(([A-Za-z][A-Za-z0-9\s/&.,·'-]*)\)/g, '$1');
    for (const [enP, amP] of EN_TO_AM_PHRASES) {
      if (result.includes(enP)) {
        result = result.split(enP).join(amP);
      }
    }
    return `${leadingSpace}${result.trim()}${trailingSpace}`;
  }

  if (mode === 'EN') {
    let result = trimmed;
    // Replace "Amharic (English)" inline segments with "English"
    result = result.replace(
      /[\u1200-\u137F][\u1200-\u137F\s፣፡።/&-]*\(([A-Za-z][A-Za-z0-9\s/&.,·'-]*)\)/g,
      '$1'
    );
    for (const [amP, enP] of AM_TO_EN_PHRASES) {
      if (result.includes(amP)) {
        result = result.split(amP).join(enP);
      }
    }
    return `${leadingSpace}${result.trim()}${trailingSpace}`;
  }

  // mode === 'BOTH'
  return raw;
}

interface LanguageContextValue {
  langMode: LanguageMode;
  setLangMode: (mode: LanguageMode) => void;
  bilingual: boolean;
  tr: (am: string, en: string, bothCustom?: string) => string;
  formatDual: (am: string, en?: string) => string;
}

const LanguageContext = createContext<LanguageContextValue>({
  langMode: 'AM',
  setLangMode: () => {},
  bilingual: false,
  tr: (am) => am,
  formatDual: (am) => am,
});

export const useLanguage = () => useContext(LanguageContext);

interface TrackedTextNode extends Text {
  __mzOrigText?: string;
  __mzLastRendered?: string;
}

/**
 * Synchronizes all text nodes and translatable attributes under `root` to `langMode`.
 */
function applyDomTranslation(root: Node, langMode: LanguageMode) {
  if (typeof document === 'undefined') return;

  const walkNode = (node: Node) => {
    if (node.nodeType === Node.ELEMENT_NODE) {
      const el = node as HTMLElement;
      if (
        el.tagName === 'SCRIPT' ||
        el.tagName === 'STYLE' ||
        el.getAttribute('data-no-auto-translate') === 'true'
      ) {
        return;
      }

      // Translate placeholder, title, aria-label attributes
      for (const attr of ['placeholder', 'title', 'aria-label']) {
        const val = el.getAttribute(attr);
        if (val) {
          const origAttr = `data-mz-orig-${attr}`;
          const lastAttr = `data-mz-last-${attr}`;
          let origVal = el.getAttribute(origAttr);
          const lastVal = el.getAttribute(lastAttr);
          if (!origVal || val !== lastVal) {
            origVal = val;
            el.setAttribute(origAttr, origVal);
          }
          const translatedAttr = translateTextForMode(origVal, langMode);
          if (translatedAttr !== val) {
            el.setAttribute(lastAttr, translatedAttr);
            el.setAttribute(attr, translatedAttr);
          } else {
            el.setAttribute(lastAttr, val);
          }
        }
      }

      const children = el.childNodes;
      for (let i = 0; i < children.length; i++) {
        walkNode(children[i]);
      }
    } else if (node.nodeType === Node.TEXT_NODE) {
      const tNode = node as TrackedTextNode;
      const parent = tNode.parentElement;
      if (
        !parent ||
        parent.tagName === 'SCRIPT' ||
        parent.tagName === 'STYLE' ||
        parent.closest('[data-no-auto-translate="true"]')
      ) {
        return;
      }

      const currentVal = tNode.nodeValue || '';
      if (!currentVal.trim()) return;

      if (tNode.__mzOrigText === undefined || currentVal !== tNode.__mzLastRendered) {
        tNode.__mzOrigText = currentVal;
      }

      const nextVal = translateTextForMode(tNode.__mzOrigText, langMode);
      tNode.__mzLastRendered = nextVal;
      if (currentVal !== nextVal) {
        tNode.nodeValue = nextVal;
      }
    }
  };

  walkNode(root);
}

export const LanguageProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  // Default option is 'AM' (Amharic only) as requested by the user
  const [langMode, setLangModeState] = useState<LanguageMode>(() => {
    try {
      const saved = localStorage.getItem(LANG_STORAGE_KEY);
      if (saved === 'AM' || saved === 'EN' || saved === 'BOTH') {
        return saved;
      }
    } catch {
      // ignore
    }
    return 'AM';
  });

  const setLangMode = (mode: LanguageMode) => {
    setLangModeState(mode);
    try {
      localStorage.setItem(LANG_STORAGE_KEY, mode);
    } catch {
      // ignore
    }
  };

  const tr = (am: string, en: string, bothCustom?: string): string => {
    if (langMode === 'AM') return am;
    if (langMode === 'EN') return en;
    return bothCustom || `${am} (${en})`;
  };

  const formatDual = (am: string, en?: string): string => {
    const cleanAm = (am || '').trim();
    const cleanEn = (en || '').trim();
    if (!cleanEn || cleanEn === cleanAm) {
      return translateTextForMode(cleanAm, langMode);
    }
    if (langMode === 'AM') return cleanAm;
    if (langMode === 'EN') return cleanEn;
    return `${cleanAm} (${cleanEn})`;
  };

  useEffect(() => {
    if (typeof document === 'undefined') return;
    document.documentElement.lang = langMode === 'EN' ? 'en' : 'am';

    let isApplying = false;
    const runPass = () => {
      if (isApplying) return;
      isApplying = true;
      try {
        applyDomTranslation(document.body, langMode);
      } finally {
        isApplying = false;
      }
    };

    runPass();

    const observer = new MutationObserver(() => {
      runPass();
    });

    observer.observe(document.body, {
      childList: true,
      subtree: true,
      characterData: true,
    });

    return () => observer.disconnect();
  }, [langMode]);

  return (
    <LanguageContext.Provider
      value={{
        langMode,
        setLangMode,
        bilingual: langMode === 'BOTH',
        tr,
        formatDual,
      }}
    >
      {children}
    </LanguageContext.Provider>
  );
};

interface LanguageSelectorProps {
  variant?: 'select' | 'segmented';
  className?: string;
}

/**
 * 3-Option Language Switcher:
 * 1. አማርኛ ብቻ (Amharic only - Default)
 * 2. English
 * 3. አማርኛ + English
 */
export const LanguageSelector: React.FC<LanguageSelectorProps> = ({
  variant = 'select',
  className = '',
}) => {
  const { langMode, setLangMode } = useLanguage();

  if (variant === 'segmented') {
    return (
      <div
        data-no-auto-translate="true"
        className={`inline-flex items-center gap-1 p-1 bg-slate-100 border border-slate-200 rounded-md text-xs ${className}`}
      >
        <button
          type="button"
          onClick={() => setLangMode('AM')}
          className={`px-2.5 py-1 rounded font-semibold transition-colors cursor-pointer whitespace-nowrap ${
            langMode === 'AM'
              ? 'bg-slate-900 text-white shadow-2xs'
              : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          አማርኛ ብቻ
        </button>
        <button
          type="button"
          onClick={() => setLangMode('EN')}
          className={`px-2.5 py-1 rounded font-semibold transition-colors cursor-pointer whitespace-nowrap ${
            langMode === 'EN'
              ? 'bg-slate-900 text-white shadow-2xs'
              : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          English
        </button>
        <button
          type="button"
          onClick={() => setLangMode('BOTH')}
          className={`px-2.5 py-1 rounded font-semibold transition-colors cursor-pointer whitespace-nowrap ${
            langMode === 'BOTH'
              ? 'bg-slate-900 text-white shadow-2xs'
              : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          አማርኛ + English
        </button>
      </div>
    );
  }

  return (
    <div
      data-no-auto-translate="true"
      className={`inline-flex items-center gap-1.5 bg-slate-50 border border-slate-200 rounded-md px-2 sm:px-2.5 py-1.5 min-h-[38px] sm:min-h-0 ${className}`}
    >
      <Globe className="w-3.5 h-3.5 text-emerald-700 shrink-0" />
      <select
        value={langMode}
        onChange={(e) => setLangMode(e.target.value as LanguageMode)}
        aria-label="Language Mode"
        className="bg-transparent text-xs font-semibold text-slate-800 focus:outline-none cursor-pointer"
      >
        <option value="AM">አማርኛ ብቻ</option>
        <option value="EN">English</option>
        <option value="BOTH">አማርኛ + English</option>
      </select>
    </div>
  );
};
