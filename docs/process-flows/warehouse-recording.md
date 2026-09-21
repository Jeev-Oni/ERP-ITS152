# Warehouse Recording → System Implementation

Source: Figures 2.1–2.3.

| As-is step | Role | System screen | Server Action | Status transition |
|---|---|---|---|---|
| Movement Type? (Receipt/Issue) | Warehouse Staff | `/warehouse/stock-movements/new` | UI branch, same form | — |
| Receive Raw Materials from Supplier | Warehouse Staff | `/warehouse/stock-movements/new` | `recordMovement({type: 'receipt'})` | `pending → logged` |
| Pick Item for Outbound Order | Warehouse Staff | `/warehouse/stock-movements/new` | `recordMovement({type: 'issue'})` | `pending → logged` |
| Log Movement in Digital Stock Ledger | Warehouse Staff / Inv. Clerk | (automatic) | part of `recordMovement()` | — |
| Update Balance on Item/SKU Master | **System** | (automatic, DB trigger) | Postgres trigger on `stock_ledger` insert | — |
| Entry Matches Physical Count? | Warehouse Supervisor | `/warehouse/stock-movements/[id]/verify` | `verifyMovement()` | `logged → matched` or `→ discrepancy` |
| Investigate & Correct Discrepancy | Warehouse Supervisor | `/warehouse/stock-movements/[id]/discrepancy` | `resolveDiscrepancy()` | `discrepancy → investigating → matched` |
| Supervisor Verifies & Closes Audit Trail | Warehouse Supervisor | (automatic on `matched`) | part of `verifyMovement()` | `matched → verified` |

## Notes for implementation

- The doc explicitly calls out the ledger update as a **System task**, separate from the
  human tasks around it — implement this as a Postgres trigger (`AFTER INSERT ON
  stock_movements`) that writes to `stock_ledger` and updates `items.current_balance`,
  **not** as application code. This guarantees the balance can never drift out of sync with
  logged movements, even if a Server Action fails partway through.
- Both receipt and issue paths converge on the same `recordMovement()` action — keep the
  branch only in the UI (which fields are shown) and pass `movement_type` as a parameter,
  rather than writing two separate actions.
