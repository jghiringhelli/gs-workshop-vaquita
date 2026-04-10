# Seed Data (Initial Load)

This project includes an executable script to create an initial realistic dataset for local development.

## What it loads

- 6 users with realistic names and emails
- 1 active tanda with participants, started lifecycle, contributions (including late contribution), and one round advanced
- 1 forming tanda with participants
- 1 cancelled tanda example

## How to run

```bash
npm run seed
```

The seed script resets existing data before inserting the new sample dataset.

## Script location

- `scripts/seed.ts`

## Notes

- Uses current environment config (`DATABASE_URL`, `MAX_PARTICIPANTS`, `LATE_PENALTY_PERCENT`)
- Requires database access as configured for your local environment
- Intended for local/dev usage
