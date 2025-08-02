const { 
  time,
  loadFixture,
} = require("@nomicfoundation/hardhat-toolbox/network-helpers");
const { anyValue } = require("@nomicfoundation/hardhat-chai-matchers/withArgs");
const { expect } = require("chai");

describe("WillsNFT", function () {
  // We define a fixture to reuse the same setup in every test.
  async function deployWillsNFTFixture() {
    const [owner, executor, otherAccount, beneficiary, authorizedViewer] = await hre.ethers.getSigners();

    const WillsNFT = await hre.ethers.getContractFactory("WillsNFT");
    const willsNFT = await WillsNFT.deploy("WillsDAO NFT", "WDAO");

    return { willsNFT, owner, executor, otherAccount, beneficiary, authorizedViewer };
  }

  describe("Deployment", function () {
    it("Should set the right name and symbol", async function () {
      const { willsNFT } = await loadFixture(deployWillsNFTFixture);

      expect(await willsNFT.name()).to.equal("WillsDAO NFT");
      expect(await willsNFT.symbol()).to.equal("WDAO");
    });

    it("Should set the deployer as owner", async function () {
      const { willsNFT, owner } = await loadFixture(deployWillsNFTFixture);

      expect(await willsNFT.owner()).to.equal(owner.address);
    });

    it("Should start with token counter at 0", async function () {
      const { willsNFT } = await loadFixture(deployWillsNFTFixture);

      expect(await willsNFT.getNextTokenId()).to.equal(0);
    });
  });

  describe("Will Creation", function () {
    const ipfsHash = "QmTestHash123";
    const emergencyDelay = 30 * 24 * 60 * 60; // 30 days in seconds

    it("Should create a will NFT successfully", async function () {
      const { willsNFT, owner, executor } = await loadFixture(deployWillsNFTFixture);

      await expect(willsNFT.createWill(ipfsHash, executor.address, emergencyDelay))
        .to.emit(willsNFT, "WillCreated")
        .withArgs(0, owner.address, ipfsHash);

      expect(await willsNFT.ownerOf(0)).to.equal(owner.address);
      expect(await willsNFT.getNextTokenId()).to.equal(1);
    });

    it("Should reject empty IPFS hash", async function () {
      const { willsNFT, executor } = await loadFixture(deployWillsNFTFixture);

      await expect(willsNFT.createWill("", executor.address, emergencyDelay))
        .to.be.revertedWith("IPFS hash cannot be empty");
    });

    it("Should reject zero address executor", async function () {
      const { willsNFT } = await loadFixture(deployWillsNFTFixture);

      await expect(willsNFT.createWill(ipfsHash, hre.ethers.ZeroAddress, emergencyDelay))
        .to.be.revertedWith("Executor cannot be zero address");
    });

    it("Should reject self as executor", async function () {
      const { willsNFT, owner } = await loadFixture(deployWillsNFTFixture);

      await expect(willsNFT.createWill(ipfsHash, owner.address, emergencyDelay))
        .to.be.revertedWith("Cannot set self as executor");
    });

    it("Should reject invalid emergency delay", async function () {
      const { willsNFT, executor } = await loadFixture(deployWillsNFTFixture);

      const shortDelay = 29 * 24 * 60 * 60; // 29 days - too short
      const longDelay = 366 * 24 * 60 * 60; // 366 days - too long

      await expect(willsNFT.createWill(ipfsHash, executor.address, shortDelay))
        .to.be.revertedWith("Invalid emergency delay period");

      await expect(willsNFT.createWill(ipfsHash, executor.address, longDelay))
        .to.be.revertedWith("Invalid emergency delay period");
    });

    it("Should store will data correctly", async function () {
      const { willsNFT, owner, executor } = await loadFixture(deployWillsNFTFixture);

      await willsNFT.createWill(ipfsHash, executor.address, emergencyDelay);

      const willData = await willsNFT.getWillData(0);
      expect(willData.ipfsHash).to.equal(ipfsHash);
      expect(willData.creator).to.equal(owner.address);
      expect(willData.executor).to.equal(executor.address);
      expect(willData.emergencyDelay).to.equal(emergencyDelay);
      expect(willData.isExecuted).to.equal(false);
    });

    it("Should add will to user's will list", async function () {
      const { willsNFT, owner, executor } = await loadFixture(deployWillsNFTFixture);

      await willsNFT.createWill(ipfsHash, executor.address, emergencyDelay);
      const userWills = await willsNFT.getUserWills(owner.address);

      expect(userWills.length).to.equal(1);
      expect(userWills[0]).to.equal(0);
    });
  });

  describe("Will Updates", function () {
    const ipfsHash = "QmTestHash123";
    const newIpfsHash = "QmNewHash456";
    const emergencyDelay = 30 * 24 * 60 * 60; // 30 days

    beforeEach(async function () {
      const { willsNFT, executor } = await loadFixture(deployWillsNFTFixture);
      await willsNFT.createWill(ipfsHash, executor.address, emergencyDelay);
    });

    it("Should update will content", async function () {
      const { willsNFT } = await loadFixture(deployWillsNFTFixture);
      await willsNFT.createWill(ipfsHash, (await hre.ethers.getSigners())[1].address, emergencyDelay);

      await expect(willsNFT.updateWill(0, newIpfsHash))
        .to.emit(willsNFT, "WillUpdated")
        .withArgs(0, newIpfsHash);

      const willData = await willsNFT.getWillData(0);
      expect(willData.ipfsHash).to.equal(newIpfsHash);
    });

    it("Should reject update with empty hash", async function () {
      const { willsNFT } = await loadFixture(deployWillsNFTFixture);
      await willsNFT.createWill(ipfsHash, (await hre.ethers.getSigners())[1].address, emergencyDelay);

      await expect(willsNFT.updateWill(0, ""))
        .to.be.revertedWith("IPFS hash cannot be empty");
    });

    it("Should reject update by non-owner", async function () {
      const { willsNFT, otherAccount } = await loadFixture(deployWillsNFTFixture);
      await willsNFT.createWill(ipfsHash, (await hre.ethers.getSigners())[1].address, emergencyDelay);

      await expect(willsNFT.connect(otherAccount).updateWill(0, newIpfsHash))
        .to.be.revertedWith("Only owner can update will");
    });

    it("Should update executor", async function () {
      const { willsNFT, otherAccount } = await loadFixture(deployWillsNFTFixture);
      await willsNFT.createWill(ipfsHash, (await hre.ethers.getSigners())[1].address, emergencyDelay);

      await expect(willsNFT.updateExecutor(0, otherAccount.address))
        .to.emit(willsNFT, "ExecutorUpdated")
        .withArgs(0, otherAccount.address);

      const willData = await willsNFT.getWillData(0);
      expect(willData.executor).to.equal(otherAccount.address);
    });

    it("Should update emergency delay", async function () {
      const { willsNFT } = await loadFixture(deployWillsNFTFixture);
      await willsNFT.createWill(ipfsHash, (await hre.ethers.getSigners())[1].address, emergencyDelay);

      const newDelay = 60 * 24 * 60 * 60; // 60 days

      await expect(willsNFT.updateEmergencyDelay(0, newDelay))
        .to.emit(willsNFT, "EmergencyUpdated")
        .withArgs(0, newDelay);

      const willData = await willsNFT.getWillData(0);
      expect(willData.emergencyDelay).to.equal(newDelay);
    });
  });

  describe("Will Execution", function () {
    const ipfsHash = "QmTestHash123";
    const emergencyDelay = 30 * 24 * 60 * 60; // 30 days

    beforeEach(async function () {
      const { willsNFT, executor } = await loadFixture(deployWillsNFTFixture);
      await willsNFT.createWill(ipfsHash, executor.address, emergencyDelay);
    });

    it("Should allow executor to execute will", async function () {
      const { willsNFT, executor } = await loadFixture(deployWillsNFTFixture);
      await willsNFT.createWill(ipfsHash, executor.address, emergencyDelay);

      await expect(willsNFT.connect(executor).executeWill(0))
        .to.emit(willsNFT, "WillExecuted")
        .withArgs(0, executor.address, anyValue);

      const willData = await willsNFT.getWillData(0);
      expect(willData.isExecuted).to.equal(true);
    });

    it("Should reject execution by non-executor", async function () {
      const { willsNFT, otherAccount } = await loadFixture(deployWillsNFTFixture);
      await willsNFT.createWill(ipfsHash, (await hre.ethers.getSigners())[1].address, emergencyDelay);

      await expect(willsNFT.connect(otherAccount).executeWill(0))
        .to.be.revertedWith("Only executor can execute will");
    });

    it("Should reject execution of already executed will", async function () {
      const { willsNFT, executor } = await loadFixture(deployWillsNFTFixture);
      await willsNFT.createWill(ipfsHash, executor.address, emergencyDelay);

      await willsNFT.connect(executor).executeWill(0);

      await expect(willsNFT.connect(executor).executeWill(0))
        .to.be.revertedWith("Will already executed");
    });

    it("Should allow emergency execution after delay", async function () {
      const { willsNFT, otherAccount } = await loadFixture(deployWillsNFTFixture);
      await willsNFT.createWill(ipfsHash, (await hre.ethers.getSigners())[1].address, emergencyDelay);

      // Fast forward time past emergency delay
      await time.increase(emergencyDelay + 1);

      await expect(willsNFT.connect(otherAccount).emergencyExecuteWill(0))
        .to.emit(willsNFT, "WillExecuted")
        .withArgs(0, otherAccount.address, anyValue);

      const willData = await willsNFT.getWillData(0);
      expect(willData.isExecuted).to.equal(true);
    });

    it("Should reject early emergency execution", async function () {
      const { willsNFT, otherAccount } = await loadFixture(deployWillsNFTFixture);
      await willsNFT.createWill(ipfsHash, (await hre.ethers.getSigners())[1].address, emergencyDelay);

      await expect(willsNFT.connect(otherAccount).emergencyExecuteWill(0))
        .to.be.revertedWith("Emergency delay period not met");
    });

    it("Should check canEmergencyExecute correctly", async function () {
      const { willsNFT } = await loadFixture(deployWillsNFTFixture);
      await willsNFT.createWill(ipfsHash, (await hre.ethers.getSigners())[1].address, emergencyDelay);

      expect(await willsNFT.canEmergencyExecute(0)).to.equal(false);

      // Fast forward time past emergency delay
      await time.increase(emergencyDelay + 1);

      expect(await willsNFT.canEmergencyExecute(0)).to.equal(true);
    });
  });

  describe("Access Control", function () {
    const ipfsHash = "QmTestHash123";
    const emergencyDelay = 30 * 24 * 60 * 60; // 30 days

    beforeEach(async function () {
      const { willsNFT, executor } = await loadFixture(deployWillsNFTFixture);
      await willsNFT.createWill(ipfsHash, executor.address, emergencyDelay);
    });

    it("Should authorize and revoke viewers", async function () {
      const { willsNFT, authorizedViewer } = await loadFixture(deployWillsNFTFixture);
      await willsNFT.createWill(ipfsHash, (await hre.ethers.getSigners())[1].address, emergencyDelay);

      // Authorize viewer
      await willsNFT.authorizeViewer(0, authorizedViewer.address);
      expect(await willsNFT.isAuthorizedViewer(0, authorizedViewer.address)).to.equal(true);

      // Authorized viewer should be able to get will data
      await expect(willsNFT.connect(authorizedViewer).getWillData(0)).to.not.be.reverted;

      // Revoke viewer
      await willsNFT.revokeViewer(0, authorizedViewer.address);
      expect(await willsNFT.isAuthorizedViewer(0, authorizedViewer.address)).to.equal(false);

      // Revoked viewer should not be able to get will data
      await expect(willsNFT.connect(authorizedViewer).getWillData(0))
        .to.be.revertedWith("Not authorized to view this will");
    });

    it("Should allow owner to view will data", async function () {
      const { willsNFT } = await loadFixture(deployWillsNFTFixture);
      await willsNFT.createWill(ipfsHash, (await hre.ethers.getSigners())[1].address, emergencyDelay);

      await expect(willsNFT.getWillData(0)).to.not.be.reverted;
    });

    it("Should allow executor to view will data", async function () {
      const { willsNFT, executor } = await loadFixture(deployWillsNFTFixture);
      await willsNFT.createWill(ipfsHash, executor.address, emergencyDelay);

      await expect(willsNFT.connect(executor).getWillData(0)).to.not.be.reverted;
    });

    it("Should reject unauthorized access to will data", async function () {
      const { willsNFT, otherAccount } = await loadFixture(deployWillsNFTFixture);
      await willsNFT.createWill(ipfsHash, (await hre.ethers.getSigners())[1].address, emergencyDelay);

      await expect(willsNFT.connect(otherAccount).getWillData(0))
        .to.be.revertedWith("Not authorized to view this will");
    });

    it("Should reject authorization of zero address", async function () {
      const { willsNFT } = await loadFixture(deployWillsNFTFixture);
      await willsNFT.createWill(ipfsHash, (await hre.ethers.getSigners())[1].address, emergencyDelay);

      await expect(willsNFT.authorizeViewer(0, hre.ethers.ZeroAddress))
        .to.be.revertedWith("Cannot authorize zero address");
    });
  });

  describe("NFT Functionality", function () {
    const ipfsHash = "QmTestHash123";
    const emergencyDelay = 30 * 24 * 60 * 60; // 30 days

    it("Should set correct token URI", async function () {
      const { willsNFT, executor } = await loadFixture(deployWillsNFTFixture);

      await willsNFT.createWill(ipfsHash, executor.address, emergencyDelay);
      expect(await willsNFT.tokenURI(0)).to.equal(ipfsHash);
    });

    it("Should support ERC721 interface", async function () {
      const { willsNFT } = await loadFixture(deployWillsNFTFixture);

      // ERC721 interface ID
      expect(await willsNFT.supportsInterface("0x80ac58cd")).to.equal(true);
    });

    it("Should handle multiple wills correctly", async function () {
      const { willsNFT, owner, executor, otherAccount } = await loadFixture(deployWillsNFTFixture);

      // Create multiple wills
      await willsNFT.createWill(ipfsHash + "1", executor.address, emergencyDelay);
      await willsNFT.createWill(ipfsHash + "2", executor.address, emergencyDelay);
      await willsNFT.connect(otherAccount).createWill(ipfsHash + "3", executor.address, emergencyDelay);

      expect(await willsNFT.getNextTokenId()).to.equal(3);

      const ownerWills = await willsNFT.getUserWills(owner.address);
      expect(ownerWills.length).to.equal(2);
      expect(ownerWills[0]).to.equal(0);
      expect(ownerWills[1]).to.equal(1);

      const otherWills = await willsNFT.getUserWills(otherAccount.address);
      expect(otherWills.length).to.equal(1);
      expect(otherWills[0]).to.equal(2);
    });
  });
});