# Trucking Logistics → System Implementation

Source: Figures 3.1–3.3.

| As-is step | Role | System screen | Server Action | Status transition |
|---|---|---|---|---|
| Plan Route & Assign Truck/Driver | Dispatcher | `/logistics/dispatch` | `createTrip()` | `— → dispatched` |
| Generate Digital Trip Ticket | Dispatcher | `/logistics/dispatch` | part of `createTrip()` | — |
| Driver Departs Warehouse | Driver | `/logistics/trips/[id]` | `startTrip()` | `dispatched → en_route` |
| Arrive at Client Site | Driver | `/logistics/trips/[id]` | `arriveAtSite()` | — |
| Delivery Confirmed? | Driver / Client | `/logistics/trips/[id]/confirm` | `confirmDelivery()` / `reportIssue()` | `en_route → delivered` or `→ delivery_failed` |
| Report Issue & Reschedule Trip | Dispatcher | `/logistics/dispatch` | `rescheduleTrip()` | `delivery_failed → rescheduled`, **spawns a new trip row** |
| Capture Delivery Confirmation | Driver / Client | `/logistics/trips/[id]/confirm` | part of `confirmDelivery()` | — |
| Update Trip & Maintenance Log | Fleet Supervisor | `/logistics/trucks/[id]` | `closeTrip()` | `delivered → closed` |
| Truck Due for Maintenance? | Fleet Supervisor | `/logistics/trucks/[id]` | part of `closeTrip()` | writes to `maintenance_schedule` if due |
| Schedule Fleet Maintenance | Fleet Supervisor | `/logistics/trucks/[id]` | `scheduleMaintenance()` | — |

## Notes for implementation

- The document is explicit that a rescheduled trip is **"a new trip instance,"** not a
  resumed one — `rescheduleTrip()` should insert a new `trips` row referencing the failed
  one via `rescheduled_from_trip_id`, not mutate the original. This preserves the full
  history of failed attempts per order.
- This process has four lanes and the most handoffs of the four (per the doc's own
  observation) — this is the best candidate for realtime UI updates (Supabase Realtime
  subscriptions on `trips`) so Dispatcher, Driver, and Fleet Supervisor all see status
  changes live instead of polling or refreshing.
- `confirmDelivery()` should accept an optional signature/photo upload to Supabase Storage
  under `delivery-confirmations/{trip_id}.jpg`, standing in for the "Signed Confirmation"
  document flowing back from the Client/Recipient lane in the BPMN diagram.
