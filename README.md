# Lekulu Property Management (ሌኩሉ የቤቶች አስተዳደር)

A bilingual (English / አማርኛ) real estate management web application and financial matrix dashboard built with **React**, **Vite**, and **Firebase**, modeled after real property portfolio data in Addis Ababa and Hawassa (2019 E.C.).

🌐 **Live Application:** [https://property-management-3750b.web.app](https://property-management-3750b.web.app)

---

## 🚀 Features

- **Dashboard & KPIs:** Real-time metrics for net income, gross rent, occupancy rates, and partner distribution shares (Mesfin 63.8% / Zewdnesh 36.2%).
- **Monthly Rental Income & Tenants (`/rents`):**
  - Interactive tenant schedule tracking all residential and commercial units (*Bekele, Libnesh, Gadise, Desta, Genet, Gezahegn, Lemlem, Asres, Weynshet*).
  - 12-Month Ethiopian Fiscal Calendar bar (*መስከረም, ጥቅምት, ኅዳር, ታኅሣሥ, ጥር, የካቲት, መጋቢት, ሚያዝያ, ግንቦት, ሰኔ, ሐምሌ, ነሐሴ*).
  - Spread-sheet matrix comparing tenant rental collections across the entire year.
  - Payment tracking with toggleable Paid/Pending status and tenant addition modal.
- **Partner Account Ledgers:** Individual financial histories and running balances for Mesfin and Zewdnesh.
- **Expense & Grocery Tracker:** Operational costs, utility bills (electricity, water, guard/security), and household items.
- **Distribution Calculator:** Cross-checked audit formulas for calculating partner net payouts based on agreed allocation percentages.
- **Firebase Authentication & Firestore:** Configured with cloud persistence and 1-click demo access.
- **Bilingual Interface:** One-click toggle between **English** and **አማርኛ**.

---

## 🛠️ Tech Stack

- **Frontend:** React 19, Vite 8, React Router DOM 7
- **Styling:** Modern dark-mode vanilla CSS with glassmorphism and HSL gradients
- **Icons & Visuals:** Lucide React, Recharts data visualization
- **Backend & Database:** Firebase Authentication, Cloud Firestore
- **Hosting:** Firebase Hosting

---

## 💻 Local Development

1. Navigate to the app directory:
   ```bash
   cd app
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Start local development server:
   ```bash
   npm run dev
   ```
   Open [http://localhost:5173](http://localhost:5173) in your browser.

4. Build for production:
   ```bash
   npm run build
   ```

5. Deploy to Firebase:
   ```bash
   firebase deploy --only hosting
   ```
