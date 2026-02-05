# Supabase Setup Guide for PZZA PARTY

This guide will walk you through setting up Supabase for your PZZA PARTY game.

## Step 1: Create a Supabase Project

1. Go to [supabase.com](https://supabase.com) and sign up/login
2. Click "New Project"
3. Fill in:
   - **Project Name**: `pzza-party` (or any name you prefer)
   - **Database Password**: Choose a strong password (save this!)
   - **Region**: Choose the closest region to you
4. Click "Create new project" and wait ~2 minutes for setup

## Step 2: Run the Database Schema

1. In your Supabase dashboard, click "SQL Editor" in the left sidebar
2. Click "New Query"
3. Copy the contents of `supabase/schema.sql` from this project
4. Paste into the SQL editor
5. Click "Run" (or press Cmd/Ctrl + Enter)
6. You should see: "Success. No rows returned"

## Step 3: Run the Database Functions

1. Still in the SQL Editor, click "New Query"
2. Copy the contents of `supabase/functions.sql` from this project
3. Paste into the SQL editor
4. Click "Run"
5. You should see: "Success. No rows returned"

## Step 4: Get Your API Keys

1. Click "Project Settings" (gear icon) in the left sidebar
2. Click "API" in the settings menu
3. You'll see two important values:
   - **Project URL**: Something like `https://xxxxx.supabase.co`
   - **anon public key**: A long string starting with `eyJ...`

## Step 5: Configure Environment Variables

### Backend Configuration

1. Copy `.env.example` to `.env`:
   ```bash
   cp .env.example .env
   ```

2. Edit `.env` and add your Supabase credentials:
   ```bash
   SUPABASE_URL=https://xxxxx.supabase.co
   SUPABASE_ANON_KEY=eyJhbGc...your-key-here
   RPC_URL=http://127.0.0.1:8545
   ```

### Frontend Configuration

1. Copy `frontend/.env.example` to `frontend/.env`:
   ```bash
   cp frontend/.env.example frontend/.env
   ```

2. Edit `frontend/.env` and add your Supabase credentials:
   ```bash
   VITE_SUPABASE_URL=https://xxxxx.supabase.co
   VITE_SUPABASE_ANON_KEY=eyJhbGc...your-key-here
   ```

## Step 6: Verify the Setup

1. In your Supabase dashboard, click "Table Editor"
2. You should see three tables:
   - `players`
   - `rooms`
   - `active_sessions`
3. All tables should be empty (for now)

## Step 7: Start the Event Listener

The event listener syncs blockchain events to Supabase in real-time.

```bash
# Install dependencies (if not already done)
npm install

# Start the event listener
npm run listener
```

You should see:
```
╔════════════════════════════════════════════════════════╗
║   PZZA PARTY - Blockchain Event Listener Service      ║
╚════════════════════════════════════════════════════════╝

🔗 Connecting to blockchain...
✅ Connected to blockchain
📜 Contract loaded at 0xe7f1725E7734CE288F8367e1Bb143E90bb3F0512
✅ Connected to Supabase
```

## Troubleshooting

### "Failed to connect to Supabase"
- Check that your `SUPABASE_URL` and `SUPABASE_ANON_KEY` are correct
- Make sure there are no extra spaces or quotes in your `.env` file

### "Failed to connect to blockchain"
- Make sure your local Hardhat node is running: `npx hardhat node`
- Check that `RPC_URL` is set to `http://127.0.0.1:8545`

### "Tables not found"
- Make sure you ran both `schema.sql` and `functions.sql` in the SQL Editor
- Check the "Table Editor" to verify tables exist

## Next Steps

Once Supabase is configured:

1. **Start your local blockchain**: `npx hardhat node`
2. **Deploy contracts**: `npx hardhat run scripts/deploy.js --network localhost`
3. **Start the event listener**: `npm run listener` (in a separate terminal)
4. **Start the frontend**: `cd frontend && npm run dev`

Your game will now use the hybrid architecture:
- 🔗 **Blockchain** for financial truth ($PZZA, slice ownership)
- ⚡ **Supabase** for real-time UX (lobby updates, player profiles)
