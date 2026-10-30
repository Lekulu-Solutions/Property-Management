# Security Specification (`security_spec.md`)

## 1. Data Invariants

1. **Master Gate & Relational Ownership**:
   - Every `/workbooks/{workbookId}` document must have `workbookId == request.auth.uid` and `ownerId == request.auth.uid`.
   - Every subcollection document (`tenants`, `propertyExpenses`, `ledgerEntries`, `groceries`) under `/workbooks/{workbookId}` cannot exist unless `/workbooks/{workbookId}` exists and belongs to `request.auth.uid` (`get(/databases/$(database)/documents/workbooks/$(workbookId)).data.ownerId == request.auth.uid`), and the subcollection document's `ownerId == request.auth.uid` and `workbookId == workbookId`.
2. **Verified Identity**:
   - All reads and writes require an authenticated user (`request.auth != null`) with a verified email (`request.auth.token.email_verified == true`).
3. **Strict Schema & Anti-Update-Gap**:
   - Every `create` and `update` must pass `isValidWorkbook`, `isValidTenantRental`, `isValidPropertyExpense`, `isValidLedgerEntry`, or `isValidGroceryItem`.
   - Updates must enforce immutability on `ownerId`, `workbookId`, and `createdAt`, and validate `updatedAt == request.time`.
   - Updates must restrict modified fields via `incoming().diff(existing()).affectedKeys().hasOnly(...)`.
4. **Secure List Queries**:
   - Every `allow list` rule explicitly enforces `resource.data.ownerId == request.auth.uid` without calling `get()` or `exists()` inside `list`.

---

## 2. The "Dirty Dozen" Payloads

1. **Payload 1 (Unverified Email Spoof)**: Authenticated user with `email_verified: false` attempting to create `/workbooks/user_1`.
2. **Payload 2 (Cross-User WorkbookHijack)**: User `user_2` creating `/workbooks/user_1` with `ownerId: "user_1"`.
3. **Payload 3 (Shadow Field Injection on Workbook)**: User `user_1` creating `/workbooks/user_1` with an extra field `"isAdmin": true`.
4. **Payload 4 (Orphaned Tenant Write)**: User `user_1` creating `/workbooks/nonexistent_wb/tenants/t1` where parent workbook does not exist.
5. **Payload 5 (ID Poisoning Attack)**: User `user_1` creating `/workbooks/user_1/tenants/invalid$id!@#` with illegal characters.
6. **Payload 6 (String Buffer Overflow / Denial of Wallet)**: User `user_1` setting `tenantName` to a 5,000-character string (exceeding `maxLength: 100`).
7. **Payload 7 (Ratio Out-of-Bounds)**: User `user_1` creating a `TenantRental` with `mesfinRatio: 1.5` or `zewdneshRatio: -0.5`.
8. **Payload 8 (Immutable Field Tampering on Update)**: User `user_1` updating `ownerId` or `createdAt` on `/workbooks/user_1/tenants/t1`.
9. **Payload 9 (Client Timestamp Forgery)**: User `user_1` creating or updating a document with a past or future `updatedAt` timestamp (`updatedAt != request.time`).
10. **Payload 10 (Invalid Enum Value on LedgerEntry)**: User `user_1` creating a `LedgerEntry` with `ledgerType: "hackedLedger"`.
11. **Payload 11 (Value Poisoning on Update)**: User `user_1` updating `price` in `groceries/g1` to a string `"2000"` instead of a non-negative `number`.
12. **Payload 12 (Unauthorized List Scraping)**: User `user_2` executing a `list` query on `/workbooks/user_1/ledgerEntries` without `ownerId == user_2`.
