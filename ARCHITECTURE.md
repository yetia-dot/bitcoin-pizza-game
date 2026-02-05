# PZZA PARTY - Hybrid Blockchain-Supabase Architecture

## Overview

This project uses a **hybrid architecture** combining blockchain and Supabase:

- **Blockchain (Ethereum/Hardhat)**: Source of truth for financial operations
  - $PZZA token balances
  - Slice ownership
  - Room creation and ownership
  - Prevents double-claiming exploits

- **Supabase (PostgreSQL + Real-time)**: Speed layer for UX
  - Real-time lobby updates (no polling!)
  - Player profiles and session management
  - IP-based Sybil attack prevention
  - Graceful fallback if unavailable

## Architecture Diagram

```
┌─────────────────┐
│   Frontend      │
│   (React)       │
└────────┬────────┘
         │
    ┌────┴────┐
    │         │
    ▼         ▼
┌─────────┐ ┌──────────┐
│Blockchain│ │ Supabase │
│(Truth)   │ │ (Speed)  │
└─────────┘ └──────────┘
    │            ▲
    │            │
    └────────────┘
    Event Listener
    (Auto-sync)
```

## Key Components

### 1. Smart Contracts (`/contracts`)
- `PizzaLogic.sol`: Game logic (registration, rooms, slices)
- `PizzaCoin.sol`: ERC20 token ($PZZA)
- `PizzaStorage.sol`: Data structures

### 2. Event Listener (`/utils/eventListener.js`)
- Listens to blockchain events
- Syncs data to Supabase automatically
- Runs as background service: `npm run listener`

### 3. Supabase Database (`/supabase`)
- **Tables**: `players`, `rooms`, `active_sessions`
- **Functions**: Atomic operations for race condition prevention
- **RLS Policies**: Row-level security for public access

### 4. Frontend (`/frontend/src`)
- `App.jsx`: Main app with registration flow
- `Lobby.jsx`: Real-time room browser with Supabase subscriptions
- `supabase.js`: Helper functions for DB operations

## Data Flow Examples

### Player Registration
1. User submits username → Frontend
2. Frontend calls `contract.registerChef(username)` → Blockchain
3. Contract mints 10,000 $PZZA → Blockchain
4. Frontend calls `registerPlayer(address, username)` → Supabase
5. Event listener detects transaction → Syncs to Supabase (backup)

### Room Creation
1. User creates room → Frontend
2. Frontend calls `contract.createRoom(name, isPrivate, password)` → Blockchain
3. Contract emits `RoomCreated` event → Blockchain
4. Event listener catches event → Inserts into Supabase `rooms` table
5. Supabase real-time subscription → Updates all connected clients instantly

### Joining a Room
1. User clicks "Enter Parlor" → Frontend
2. Frontend checks `active_sessions` for same IP → Supabase (Sybil check)
3. If clear, frontend calls `createSession(address, roomId)` → Supabase
4. User enters room → Frontend updates UI

## Security Features

### Anti-Double-Claim (Blockchain)
- `registeredChefs[address]` mapping prevents re-registration
- Even if user clears cache and generates new wallet, they pay gas to register
- Smart contract is the ultimate authority

### Anti-Sybil (Supabase)
- `active_sessions` table tracks IP addresses per room
- Prevents same person from joining a room with multiple browsers
- Disabled in dev mode (`localhost`)

### Graceful Degradation
- If Supabase is down, app falls back to blockchain polling
- Slower but still functional
- Blockchain remains source of truth

## Running the Full Stack

### 1. Start Local Blockchain
```bash
npx hardhat node
```

### 2. Deploy Contracts
```bash
npx hardhat run scripts/deploy.js --network localhost
```

### 3. Configure Supabase
Follow instructions in `SUPABASE_SETUP.md`

### 4. Start Event Listener
```bash
npm run listener
```

### 5. Start Frontend
```bash
cd frontend
npm run dev
```

## Environment Variables

### Backend (`.env`)
```bash
SUPABASE_URL=https://xxxxx.supabase.co
SUPABASE_ANON_KEY=your-anon-key
RPC_URL=http://127.0.0.1:8545
CONTRACT_ADDRESS=0xe7f1725E7734CE288F8367e1Bb143E90bb3F0512
```

### Frontend (`frontend/.env`)
```bash
VITE_SUPABASE_URL=https://xxxxx.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key
```

## Troubleshooting

### Lobby not updating in real-time
- Check that event listener is running: `npm run listener`
- Verify Supabase connection in browser console
- Look for "🟢 REAL-TIME MODE" indicator in lobby

### Registration not syncing to Supabase
- Check browser console for Supabase errors
- Verify environment variables are set correctly
- Registration will still work (blockchain is source of truth)

### "Another agent from your network" error
- This is the Sybil prevention working correctly
- You're trying to join a room you're already in (different browser/tab)
- Leave the room in the other session first

## Development vs Production

### Development Mode
- Sybil checks disabled (all IPs are `127.0.0.1`)
- Event listener syncs from local blockchain
- Auto-funding enabled for burner wallets

### Production Mode
- Sybil checks active (uses real IP addresses)
- Event listener syncs from mainnet/testnet
- Users pay their own gas fees

## Further Reading

- [Supabase Documentation](https://supabase.com/docs)
- [Hardhat Documentation](https://hardhat.org/docs)
- [Ethers.js Documentation](https://docs.ethers.org/)
