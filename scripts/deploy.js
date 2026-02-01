const hre = require("hardhat");

async function main() {
  console.log("Starting deployment to Base Sepolia...");

  // 1. Deploy Pizza Coins
  const PizzaCoin = await hre.ethers.getContractFactory("PizzaCoin");
  const pizzaCoin = await PizzaCoin.deploy();
  await pizzaCoin.waitForDeployment();
  const coinAddress = await pizzaCoin.getAddress();
  console.log(`Pizza Coin deployed to: ${coinAddress}`);

  // 2. Deploy the Logic contract (which includes Storage)
  const Pizza = await hre.ethers.getContractFactory("PizzaLogic");
  const pizza = await Pizza.deploy();
  await pizza.waitForDeployment();
  const pizzaAddress = await pizza.getAddress();
  console.log(`Pizza Logic deployed to: ${pizzaAddress}`);

  // 3. Initialize & Wire up
  console.log("Initializing...");
  await pizza.initialize(coinAddress);

  // 4. Transfer ownership of the Coin to the Logic contract (so it can Mint)
  console.log("Transferring Coin ownership to Game Logic...");
  await pizzaCoin.transferOwnership(pizzaAddress);

  console.log("Success! Game initialized.");
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});