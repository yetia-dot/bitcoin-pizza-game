import hre from "hardhat";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function main() {
  console.log("Starting deployment to localhost...");

  // 1. Deploy Pizza Coins
  const PizzaCoin = await hre.ethers.getContractFactory("PizzaCoin");
  const pizzaCoin = await PizzaCoin.deploy();
  await pizzaCoin.waitForDeployment();
  const coinAddress = await pizzaCoin.getAddress();
  console.log(`Pizza Coin deployed to: ${coinAddress}`);

  // 2. Deploy the Logic contract
  const Pizza = await hre.ethers.getContractFactory("PizzaLogic");
  const pizza = await Pizza.deploy();
  await pizza.waitForDeployment();
  const pizzaAddress = await pizza.getAddress();
  console.log(`Pizza Logic deployed to: ${pizzaAddress}`);

  // 3. Initialize & Wire up
  console.log("Initializing...");
  await pizza.initialize(coinAddress);

  // 4. Transfer ownership
  console.log("Transferring Coin ownership to Game Logic...");
  await pizzaCoin.transferOwnership(pizzaAddress);

  // 5. AUTO-UPDATE FRONTEND
  console.log("Updating frontend configuration...");
  try {
    const appPath = path.join(__dirname, "../frontend/src/App.jsx");
    let appContent = fs.readFileSync(appPath, "utf8");
    appContent = appContent.replace(/const CONTRACT_ADDRESS = "0x[a-fA-F0-9]+";/, `const CONTRACT_ADDRESS = "${pizzaAddress}";`);
    fs.writeFileSync(appPath, appContent);
    console.log(`✅ Updated App.jsx with ${pizzaAddress}`);

    const envPath = path.join(__dirname, "../.env");
    if (fs.existsSync(envPath)) {
      let envContent = fs.readFileSync(envPath, "utf8");
      envContent = envContent.replace(/CONTRACT_ADDRESS=0x[a-fA-F0-9]+/, `CONTRACT_ADDRESS=${pizzaAddress}`);
      fs.writeFileSync(envPath, envContent);
      console.log(`✅ Updated .env with ${pizzaAddress}`);
    }

    // 6. SYNC ABIs TO FRONTEND
    console.log("Synchronizing ABIs to frontend...");
    const abiSourceDir = path.join(__dirname, "../artifacts/contracts");
    const abiDestDir = path.join(__dirname, "../frontend/src/abis");

    if (!fs.existsSync(abiDestDir)) fs.mkdirSync(abiDestDir, { recursive: true });

    const syncAbi = (contractName, fileName) => {
      const src = path.join(abiSourceDir, `${contractName}.sol/${contractName}.json`);
      const dest = path.join(abiDestDir, fileName);
      if (fs.existsSync(src)) {
        fs.copyFileSync(src, dest);
        console.log(`   ✅ Synced ${fileName}`);
      }
    };

    syncAbi("PizzaLogic", "PizzaLogic.json");
    syncAbi("PizzaCoin", "PizzaCoin.json");

  } catch (e) {
    console.warn("⚠️  Could not auto-update frontend files:", e.message);
  }

  console.log("Success! Game initialized and frontend synchronized.");
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});