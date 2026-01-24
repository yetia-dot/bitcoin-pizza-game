const hre = require("hardhat");

async function main() {
  console.log("Starting deployment to Base Sepolia...");

  // Deploy the Logic contract (which includes Storage)
  const Pizza = await hre.ethers.getContractFactory("PizzaLogic");
  const pizza = await Pizza.deploy();

  await pizza.waitForDeployment();

  const address = await pizza.getAddress();
  console.log(`Success! Pizza Game deployed to: ${address}`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});