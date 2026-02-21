import "@nomicfoundation/hardhat-toolbox";
import "dotenv/config";

export default {
  solidity: "0.8.20",
  networks: {
    localhost: {
      url: "http://127.0.0.1:8545",
    },
    base_sepolia: {
      url: "https://sepolia.base.org",
      // Only try to use the key if it exists and is the right length
      accounts: (process.env.PRIVATE_KEY && process.env.PRIVATE_KEY.length >= 64)
        ? [process.env.PRIVATE_KEY]
        : []
    }
  }
};