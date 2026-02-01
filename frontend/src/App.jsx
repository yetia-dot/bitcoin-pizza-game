import React, { useState, useEffect } from 'react';
import { ethers } from 'ethers';
import { supabase } from './supabase';
import PizzaABI from './abis/PizzaLogic.json';
import PizzaCoinABI from './abis/PizzaCoin.json';
import { burnerManager } from './utils/BurnerWallet';
import { Registration } from './components/Registration';
import { Lobby } from './components/Lobby';
import './App.css';

const CONTRACT_ADDRESS = "0xB7f8BC63BbcaD18155201308C8f3540b07f84F5e";
const RPC_URL = "http://127.0.0.1:8545";

function App() {
  const [gameState, setGameState] = useState("LOADING"); // LOADING, REGISTER, GAME
  const [activeRoomId, setActiveRoomId] = useState(null);
  const [slices, setSlices] = useState(Array(16).fill(null));
  const [burnerWallet, setBurnerWallet] = useState(null);
  const [contract, setContract] = useState(null);
  const [pzzaBalance, setPzzaBalance] = useState("0");
  const [balance, setBalance] = useState("0");
  const [isRegistering, setIsRegistering] = useState(false);

  // 1. Initialize Identity & Connection
  useEffect(() => {
    const init = async () => {
      // Load Identity
      const wallet = burnerManager.getWallet();
      setBurnerWallet(wallet);

      // Connect to Blockchain
      const provider = new ethers.JsonRpcProvider(RPC_URL);
      const signer = wallet.connect(provider);
      const pizzaContract = new ethers.Contract(CONTRACT_ADDRESS, PizzaABI.abi, signer);
      setContract(pizzaContract);

      // 3. AUTO-FUND (Books gas for the user transparently)
      if (RPC_URL.includes("127.0.0.1") || RPC_URL.includes("localhost")) {
        const bal = await provider.getBalance(wallet.address);
        if (bal < ethers.parseEther("0.05")) {
          console.log("Creating localized gas subsidy...");
          try {
            const adminSigner = await provider.getSigner(0);
            await adminSigner.sendTransaction({
              to: wallet.address,
              value: ethers.parseEther("1.0")
            });
          } catch (e) {
            console.error("Auto-fund failed:", e);
          }
        }
      }

      // 4. Update ETH Balance
      const ethBal = await provider.getBalance(wallet.address);
      setBalance(ethers.formatEther(ethBal));

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
        console.error("Failed to check registration:", err);
        setGameState("REGISTER");
      }
    };

    init();
  }, []);

  // DEV FACUET
  const dripFaucet = async () => {
    try {
      const provider = new ethers.JsonRpcProvider(RPC_URL);
      const adminSigner = await provider.getSigner(0);
      const tx = await adminSigner.sendTransaction({
        to: burnerWallet.address,
        value: ethers.parseEther("1.0")
      });
      await tx.wait();
      window.location.reload();
    } catch (err) {
      alert("Faucet Failed.");
    }
  };

  // 2. Fetch Data
  const fetchGameData = async (activeContract, userAddress) => {
    // Placeholder
  };

  // 3. Actions
  const handleRegister = async (username) => {
    if (parseFloat(balance) < 0.001) {
      alert("Insufficient Funds! Use the DEV FAUCET first.");
      return;
    }

    if (!contract) return;
    setIsRegistering(true);
    try {
      console.log("Registering as:", username);
      const tx = await contract.registerChef(username);
      await tx.wait();
      window.location.reload();
    } catch (err) {
      console.error("Registration failed:", err);
    } finally {
      setIsRegistering(false);
    }
  };

  const handleJoinRoom = (roomId) => {
    console.log("Joined Room:", roomId);
    setActiveRoomId(roomId);
  };

  const handleLeaveRoom = () => {
    setActiveRoomId(null);
  };

  // 4. Render
  if (gameState === "LOADING") return <div className="container" style={{ paddingTop: '50px' }}><h1>INITIALIZING...</h1></div>;

  if (gameState === "REGISTER") {
    return (
      <>
        <Registration onRegister={handleRegister} isRegistering={isRegistering} />
        <div style={{ textAlign: 'center', marginTop: '30px' }}>
          <p style={{ color: parseFloat(balance) > 0 ? '#0f0' : '#f00', marginBottom: '10px' }}>
            ETH: {parseFloat(balance).toFixed(4)}
          </p>
          <button onClick={dripFaucet} disabled={parseFloat(balance) > 0.5} style={{
            background: '#222', color: '#0f0', border: '1px solid #0f0', padding: '10px 20px', cursor: 'pointer', opacity: parseFloat(balance) > 0.5 ? 0.5 : 1
          }}>DEV FAUCET</button>
        </div>
      </>
    );
  }

  return (
    <div className="container">
      <h1>🍕 Anonymous Pizza Game</h1>

      {/* HUD */}
      <div className="dashboard">
        <div className="stat-box">
          <p className="label">IDENTITY</p>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <p className="value" title={burnerWallet?.address}>
              {burnerWallet?.address.substring(0, 10)}...
            </p>
            <button className="btn-small" onClick={() => { navigator.clipboard.writeText(burnerWallet?.address); alert("Copied!"); }}>COPY</button>
          </div>
          <p style={{ fontSize: '10px', color: '#555', marginTop: '5px' }}>
            GAS: {parseFloat(balance).toFixed(4)}
          </p>
        </div>

        <div className="stat-box" style={{ marginLeft: '20px', borderColor: '#FFD700' }}>
          <p className="label" style={{ color: '#FFD700' }}>PZZA STASH</p>
          <p className="value" style={{ color: '#FFD700', fontSize: '24px' }}>
            {parseInt(pzzaBalance).toLocaleString()}
          </p>
        </div>

        <div className="stat-box" style={{ marginLeft: '20px' }}>
          <p className="label">STATUS</p>
          <p className="value" style={{ color: '#4CAF50' }}>
            {activeRoomId ? `IN: ${activeRoomId}` : "LOBBY"}
          </p>
        </div>
      </div>

      {/* CONTENT AREA */}
      <div className="content-area" style={{ marginTop: '20px' }}>
        {!activeRoomId ? (
          <Lobby contract={contract} onJoinRoom={handleJoinRoom} />
        ) : (
          <div className="grid-container">
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '10px' }}>
              <h2>PARLOR: {activeRoomId}</h2>
              <button onClick={handleLeaveRoom} style={{ background: '#333', color: '#fff', border: '1px solid #fff', cursor: 'pointer', padding: '5px 10px' }}>
                EXIT TO LOBBY
              </button>
            </div>

            <div className="grid">
              <div style={{
                gridColumn: '1 / -1',
                textAlign: 'center',
                padding: '50px',
                border: '2px dashed #444'
              }}>
                <h3>GAME GRID FOR {activeRoomId} GOES HERE</h3>
                <p>Grid Size: Dynamic based on Level</p>
                <p>(Phase 3 Implementation)</p>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default App;