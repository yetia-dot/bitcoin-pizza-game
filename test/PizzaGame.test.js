const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("Bitcoin Pizza Game", function () {
    let PizzaLogic, pizza, PizzaCoin, pizzaCoin;
    let owner, addr1, addr2;

    beforeEach(async function () {
        [owner, addr1, addr2] = await ethers.getSigners();

        // Deploy Coin
        PizzaCoin = await ethers.getContractFactory("PizzaCoin");
        pizzaCoin = await PizzaCoin.deploy();
        await pizzaCoin.waitForDeployment();

        // Deploy Logic
        PizzaLogic = await ethers.getContractFactory("PizzaLogic");
        pizza = await PizzaLogic.deploy();
        await pizza.waitForDeployment();

        // Initialize
        await pizza.initialize(await pizzaCoin.getAddress());
        await pizzaCoin.transferOwnership(await pizza.getAddress());
    });

    it("Should register a chef and mint bonus", async function () {
        await pizza.connect(addr1).registerChef("ChefMario");

        // Check registered
        expect(await pizza.registeredChefs(addr1.address)).to.be.true;
        expect(await pizza.chefNames(addr1.address)).to.equal("ChefMario");

        // Check Balance (10,000 PZZA)
        const balance = await pizzaCoin.balanceOf(addr1.address);
        // 10000 * 10^18
        const expected = ethers.parseUnits("10000", 18);
        expect(balance).to.equal(expected);
    });

    it("Should allow buying a slice with PZZA", async function () {
        // Register first to get coins
        await pizza.connect(addr1).registerChef("ChefLuigi");

        // Approve Game to spend coins
        const cost = ethers.parseUnits("100", 18);
        await pizzaCoin.connect(addr1).approve(await pizza.getAddress(), cost);

        // Buy Slice
        await pizza.connect(addr1).buySlice("ROOM1", 0);

        // Verify Ownership
        // Structs are returned as arrays/objects in ethers v6
        const slice = await pizza.roomSlices("ROOM1", 0);
        expect(slice.owner).to.equal(addr1.address);

        // Verify Balance Deducted
        const balance = await pizzaCoin.balanceOf(addr1.address);
        const expected = ethers.parseUnits("9900", 18); // 10000 - 100
        expect(balance).to.equal(expected);
    });
});
