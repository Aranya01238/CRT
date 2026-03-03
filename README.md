# MongoDB Auto Sync Backend

## Setup

1. npm install
2. Create .env file from .env.example
3. Add Mongo URI and Apps Script URL
4. npm start

This server:

- Saves registrations to MongoDB
- Automatically syncs to Google Sheets on create/update/delete via MongoDB change streams
- Runs one full resync on startup (`type: "resync"`)

Google Apps Script webhook payloads used:

- `type: "resync"` with `data: []`
- `type: "upsert"` with `data: { ...registration }`
- `type: "delete"` with `email: "..."`
