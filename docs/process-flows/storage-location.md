# Storage Location → System Implementation

Source: Figures 4.1–4.3.

| As-is step | Role | System screen | Server Action | Status transition |
|---|---|---|---|---|
| Check Existing Location Mapping | Warehouse Staff | `/warehouse/storage-locations` | `lookupLocation(item_id)` | — |
| Location Already Assigned? | Warehouse Staff | (inline result) | branch on `lookupLocation()` result | — |
| Assign New Storage Location/Bin | Warehouse Staff | `/warehouse/storage-locations/assign` | `assignLocation()` | creates `item_location_map` row |
| Map Item to Location in Storage Master | **System** | (automatic) | part of `assignLocation()` | — |
| Retrieve Assigned Bin Location | Warehouse Staff | (inline result) | part of `lookupLocation()` | — |
| Move Item & Record Location Reference | Warehouse Staff | `/warehouse/storage-locations/assign` | part of `assignLocation()` | — |
| Supervisor Audits Location Accuracy (Periodic) | Warehouse Supervisor | `/warehouse/storage-locations/audit` | `auditLocation()` | writes to `location_audits` |

## Notes for implementation

- No multi-step status machine is needed — this is a single lookup/assign decision, which
  matches the document's own observation that this process has the fewest handoffs of the
  four. Don't over-engineer this module with a state machine it doesn't need.
- Because this is a **supporting process to Warehouse Recording** (per the doc), the "Move
  Item & Record Location Reference" step should call the same underlying
  `item_location_map` update used when Warehouse Recording logs a put-away — don't build a
  second, parallel path for the same data.
- `auditLocation()` is periodic and read-heavy: a simple scheduled report (e.g. "bins not
  audited in 30 days") is more valuable here than a real-time feature.
