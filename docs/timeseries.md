# Time-series Strategy

## Why partitioning
Telemetry volume is high (1000+ metrics/sec). Range partitioning on event time
allows fast inserts and query pruning for time-range scans.

## Granularity choice: weekly
We chose weekly partitions to balance:
- Fewer partitions to manage compared to daily
- Good pruning for common time-range queries
- Lower index bloat per partition

If daily granularity is needed later, it can be introduced with a follow-up
migration and a new partition creation policy.

## Partitioning approach
- Parent table: telemetry_raw partitioned by RANGE (ts)
- Default partition: telemetry_raw_default
- Naming: telemetry_raw_YYYYMMDD (partition start date)

## Creating partitions
Use the helper function:
- public.create_telemetry_partition(start_ts, end_ts)

Example:
- select public.create_telemetry_partition('2026-04-02', '2026-04-09');

## Query patterns and indexes
Recommended queries:
- Latest per device:
  - where device_id = ? order by ts desc limit ?
  - uses (device_id, ts desc)
- Time range per session:
  - where session_id = ? and ts between ...
  - uses (session_id, ts desc)
- Time range scan:
  - where ts between ...
  - uses (ts desc) and partition pruning

## Retention strategy (Phase 4)
Drop old partitions to enforce retention:
- drop table public.telemetry_raw_YYYYMMDD;

## Optional alternative (not required)
TimescaleDB can provide automated chunking and policies, but is not used here to
keep local Supabase setup simple and portable.
