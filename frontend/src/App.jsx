import React, { useState, useEffect } from 'react';
import { ethers } from 'ethers';
import { supabase, registerPlayer, removeSession } from './supabase';
import PizzaABI from './abis/PizzaLogic.json';
import PizzaCoinABI from './abis/PizzaCoin.json';
import { burnerManager } from './utils/BurnerWallet';
import { Registration } from './components/Registration';
import { Lobby } from './components/Lobby';
import { GameRoom } from './components/GameRoom';
import SplashScreen from './components/SplashScreen';
import LoadingScreen from './components/LoadingScreen';
import MissionBriefing from './components/MissionBriefing';
import './App.css';

const CONTRACT_ADDRESS = "0x4ed7c70F96B99c776995fB64377f0d4aB3B0e1C1";
const RPC_URL = "http://127.0.0.1:8545";

function App() {
  // VIEW STATE: 'SPLASH' -> 'LOADING' -> 'CONTENT'
  const [appView, setAppView] = useState('SPLASH');
  const [gameState, setGameState] = useState("LOADING"); // LOADING, REGISTER, GAME
  const [activeRoomId, setActiveRoomId] = useState(null);
  const [slices, setSlices] = useState(Array(16).fill(null));
  const [burnerWallet, setBurnerWallet] = useState(null);
  const [contract, setContract] = useState(null);
  const [pzzaBalance, setPzzaBalance] = useState("0");
  const [balance, setBalance] = useState("0");
  const [isRegistering, setIsRegistering] = useState(false);
  const [showBriefing, setShowBriefing] = useState(false);

  const [isContractMissing, setIsContractMissing] = useState(false);

  // 1. Initialize Identity & Connection
  useEffect(() => {
    const init = async () => {
      try {
        // Load Identity
        const wallet = burnerManager.getWallet();
        setBurnerWallet(wallet);

        // Connect to Blockchain
        const provider = new ethers.JsonRpcProvider(RPC_URL);

        // Timeout check for provider connection
        try {
          await provider.getNetwork();
        } catch (e) {
          console.warn("Blockchain unreachable, treating as offline/register mode");
          setGameState("REGISTER");
          return;
        }

        const signer = wallet.connect(provider);
        const pizzaContract = new ethers.Contract(CONTRACT_ADDRESS, PizzaABI.abi, signer);
        setContract(pizzaContract);

        // Check if contract is actually deployed
        const code = await provider.getCode(CONTRACT_ADDRESS);
        if (code === "0x" || code === "0x0") {
          console.warn("CRITICAL: Game contract not found. In your ROOT PROJECT FOLDER, run: 'npx hardhat run scripts/deploy.js --network localhost'");
          setIsContractMissing(true);
        } else {
          setIsContractMissing(false);
        }

        // 3. AUTO-FUND (Books gas for the user transparently)
        if (RPC_URL.includes("127.0.0.1") || RPC_URL.includes("localhost")) {
          try {
            const bal = await provider.getBalance(wallet.address);
            if (bal < ethers.parseEther("0.05")) {
              console.log("[Identity] Low fuel, requesting subsidy from local node...");
              try {
                const adminSigner = await provider.getSigner(0);
                const tx = await adminSigner.sendTransaction({
                  to: wallet.address,
                  value: ethers.parseEther("1.0")
                });
                await tx.wait(); // Wait for mining so balance update is reflected
                console.log("[Identity] Fuel subsidy received.");
              } catch (e) {
                console.error("Auto-fund failed:", e);
              }
            }
          } catch (err) {
            console.warn("Local node funding check failed", err);
          }
        }

        // 4. Update Balance
        const updateBalance = async () => {
          try {
            const ethBal = await provider.getBalance(wallet.address);
            setBalance(ethers.formatEther(ethBal));
          } catch (err) {
            console.warn("Could not fetch balance", err);
          }
        };
        await updateBalance();

        // 5. Check Registration Status
        try {
          const isRegistered = await pizzaContract.registeredChefs(wallet.address);

          if (isRegistered) {
            setGameState("GAME");

            // FETCH PZZA BALANCE
            try {
              const coinAddress = await pizzaContract.pizzaCoin();
              const coinContract = new ethers.Contract(coinAddress, PizzaCoinABI.abi, signer);
              const pVal = await coinContract.balanceOf(wallet.address);
              setPzzaBalance(ethers.formatEther(pVal));
            } catch (e) {
              console.error("Coin fetch error", e);
            }

            fetchGameData(pizzaContract, wallet.address);
          } else {
            setGameState("REGISTER");
          }
        } catch (err) {
          console.error("Failed to check registration (Contract might be missing):", err);
          setGameState("REGISTER"); // Fallback to register if contract call fails
        }
      } catch (fatalError) {
        console.error("Fatal initialization error:", fatalError);
        setGameState("REGISTER"); // Absolute fallback to ensure app loads
      }
    };

    init();
  }, []);

  // DEV FAUCET (SUBSIDY)
  const dripFaucet = async (silent = false) => {
    try {
      const provider = new ethers.JsonRpcProvider(RPC_URL);
      const adminSigner = await provider.getSigner(0);
      const tx = await adminSigner.sendTransaction({
        to: burnerWallet.address,
        value: ethers.parseEther("1.0")
      });
      await tx.wait();

      // Update balance locally without full reload if silent
      const ethBal = await provider.getBalance(burnerWallet.address);
      setBalance(ethers.formatEther(ethBal));

      if (!silent) window.location.reload();
      return true;
    } catch (err) {
      if (!silent) alert("Fuel Subsidy Failed. Ensure local node is running.");
      return false;
    }
  };

  // 2. Fetch Data
  const fetchGameData = async (activeContract, userAddress) => {
    // Placeholder
  };

  // 3. Actions
  const handleRegister = async (username) => {
    // Check fuel and attempt auto-drip if low
    if (parseFloat(balance) < 0.001) {
      console.log("Fuel low, attempting emergency drip...");
      const success = await dripFaucet(true);
      if (!success) {
        alert("CRITICAL: Blockchain node unreachable at http://127.0.0.1:8545. \n\nPlease ensure your local node is running with: \n'npx hardhat node'");
        return;
      }
    }

    if (!contract) return;
    setIsRegistering(true);
    try {
      console.log("Registering as:", username);

      // Step 1: Register on blockchain (mints 10k $PZZA)
      const tx = await contract.registerChef(username);
      await tx.wait();
      console.log("✅ Blockchain registration complete");

      // Step 2: Smooth Transition (No reload)
      // Fetch initial balance so the HUD is populated immediately
      try {
        const coinAddress = await contract.pizzaCoin();
        const coinContract = new ethers.Contract(coinAddress, PizzaCoinABI.abi, contract.runner);
        const pVal = await coinContract.balanceOf(burnerWallet.address);
        setPzzaBalance(ethers.formatEther(pVal));
      } catch (e) {
        console.error("Post-reg balance fetch error", e);
      }

      setGameState("GAME");
    } catch (err) {
      console.error("Registration failed:", err);
      alert("Registration failed. Please try again.");
    } finally {
      setIsRegistering(false);
    }
  };

  const handleJoinRoom = (roomId) => {
    console.log("Joined Room:", roomId);
    setActiveRoomId(roomId);
  };

  const handleLeaveRoom = async () => {
    if (activeRoomId && burnerWallet) {
      try {
        await removeSession(burnerWallet.address, activeRoomId);
        console.log("✅ Session cleaned up");
      } catch (error) {
        console.warn("Failed to clean up session:", error);
      }
    }
    setActiveRoomId(null);
  };

  const refreshBalances = async () => {
    if (!contract || !burnerWallet) return;
    try {
      const coinAddress = await contract.pizzaCoin();
      const coinContract = new ethers.Contract(coinAddress, PizzaCoinABI.abi, contract.runner);
      const pVal = await coinContract.balanceOf(burnerWallet.address);
      setPzzaBalance(ethers.formatEther(pVal));
    } catch (e) {
      console.error("Coin fetch error", e);
    }
  };

  // 4. Render
  if (appView === 'SPLASH') {
    return <SplashScreen onComplete={() => setAppView('LOADING')} />;
  }

  if (appView === 'LOADING') {
    return (
      <LoadingScreen
        isReady={gameState !== "LOADING"}
        onComplete={() => setAppView('CONTENT')}
      />
    );
  }

  // Fallback if somehow still loading but passed loading screen (shouldn't happen with new logic but safe to keep)
  if (gameState === "LOADING") return null;

  if (gameState === "REGISTER") {
    return (
      <>
        <Registration
          onRegister={handleRegister}
          isRegistering={isRegistering}
          walletAddress={burnerWallet?.address}
          isContractMissing={isContractMissing}
        />
        <div style={{ textAlign: 'center', marginTop: '30px', fontFamily: 'monospace' }}>
          <p style={{ color: parseFloat(balance) > 0 ? '#0f0' : '#f00', marginBottom: '10px', fontSize: '12px' }}>
            NODE CONNECTION: {parseFloat(balance) > 0 ? 'STABLE' : 'ESTABLISHING...'}
          </p>
          {parseFloat(balance) <= 0 && (
            <button onClick={() => dripFaucet()} style={{
              background: '#222', color: '#0f0', border: '1px solid #0f0', padding: '10px 20px', cursor: 'pointer'
            }}>MANUAL UPLINK INITIALIZATION</button>
          )}
        </div>
      </>
    );
  }

  return (
    <div className="container">
      {/* HEADER */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
        <h1>🍕 FRANCHISE WARS</h1>
        <button onClick={() => setShowBriefing(true)} style={{ background: 'transparent', border: '1px solid #0f0', color: '#0f0', cursor: 'pointer', padding: '5px 10px' }}>
          MISSION INFO
        </button>
      </div>

      {/* HUD */}
      <div className="dashboard">
        <div className="stat-box">
          <p className="label">AGENT IDENTITY</p>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <p className="value" title={burnerWallet?.address}>
              {burnerWallet?.address?.substring(0, 10)}...
            </p>
            <button className="btn-small" onClick={() => { navigator.clipboard.writeText(burnerWallet?.address); alert("Copied!"); }}>COPY</button>
          </div>
          <p style={{ fontSize: '10px', color: '#555', marginTop: '5px' }}>
            UPLINK CREDIT: {parseFloat(balance).toFixed(4)}
          </p>
        </div>

        <div className="stat-box" style={{ marginLeft: '20px', borderColor: '#FFD700' }}>
          <p className="label" style={{ color: '#FFD700' }}>WAR CHEST</p>
          <p className="value" style={{ color: '#FFD700', fontSize: '24px' }}>
            {parseInt(pzzaBalance).toLocaleString()} $PZZA
          </p>
        </div>

        <div className="stat-box" style={{ marginLeft: '20px' }}>
          <p className="label">STATUS</p>
          <p className="value" style={{ color: '#4CAF50' }}>
            {activeRoomId ? `INFILTRATING: ${activeRoomId}` : "LOBBY"}
          </p>
        </div>
      </div>

      {/* CONTENT AREA */}
      <div className="content-area" style={{ marginTop: '20px' }}>
        {!activeRoomId ? (
          <Lobby contract={contract} onJoinRoom={handleJoinRoom} walletAddress={burnerWallet?.address} />
        ) : (
          <GameRoom
            contract={contract}
            roomId={activeRoomId}
            walletAddress={burnerWallet?.address}
            onLeaveRoom={handleLeaveRoom}
            onSliceBought={refreshBalances}
          />
        )}
      </div>

      {showBriefing && <MissionBriefing onClose={() => setShowBriefing(false)} />}
    </div>
  );
}

export default App;