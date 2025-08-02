const { 
  time,
  loadFixture,
} = require("@nomicfoundation/hardhat-toolbox/network-helpers");
const { anyValue } = require("@nomicfoundation/hardhat-chai-matchers/withArgs");
const { expect } = require("chai");

describe("WillExecutor", function () {
  // We define fixtures to reuse the same setup in every test.
  async function deployContractsFixture() {
    const [owner, executor, beneficiary1, beneficiary2, feeRecipient, other] = await hre.ethers.getSigners();

    // Deploy WillsNFT first
    const WillsNFT = await hre.ethers.getContractFactory("WillsNFT");
    const willsNFT = await WillsNFT.deploy("WillsDAO NFT", "WDAO");

    // Deploy WillExecutor
    const WillExecutor = await hre.ethers.getContractFactory("WillExecutor");
    const willExecutor = await WillExecutor.deploy(await willsNFT.getAddress(), feeRecipient.address);

    // Deploy a mock ERC20 token for testing
    const MockERC20 = await hre.ethers.getContractFactory("MockERC20");
    const mockToken = await MockERC20.deploy("Mock Token", "MTK", 18);

    return { 
      willsNFT, 
      willExecutor, 
      mockToken,
      owner, 
      executor, 
      beneficiary1, 
      beneficiary2, 
      feeRecipient, 
      other 
    };
  }

  async function createWillFixture() {
    const [owner, executor, beneficiary1, beneficiary2, feeRecipient, other] = await hre.ethers.getSigners();

    // Deploy WillsNFT first
    const WillsNFT = await hre.ethers.getContractFactory("WillsNFT");
    const willsNFT = await WillsNFT.deploy("WillsDAO NFT", "WDAO");

    // Deploy WillExecutor
    const WillExecutor = await hre.ethers.getContractFactory("WillExecutor");
    const willExecutor = await WillExecutor.deploy(await willsNFT.getAddress(), feeRecipient.address);

    // Deploy a mock ERC20 token for testing
    const MockERC20 = await hre.ethers.getContractFactory("MockERC20");
    const mockToken = await MockERC20.deploy("Mock Token", "MTK", 18);
    
    const ipfsHash = "QmTestHash123";
    const emergencyDelay = 30 * 24 * 60 * 60; // 30 days

    await willsNFT.createWill(ipfsHash, executor.address, emergencyDelay);
    
    // Authorize the WillExecutor contract to execute wills
    await willsNFT.authorizeContract(await willExecutor.getAddress());
    
    return { 
      willsNFT, 
      willExecutor, 
      mockToken,
      owner, 
      executor, 
      beneficiary1, 
      beneficiary2, 
      feeRecipient, 
      other,
      tokenId: 0, 
      ipfsHash, 
      emergencyDelay 
    };
  }

  // First, let's create a simple MockERC20 contract for testing
  before(async function () {
    // Create MockERC20.sol contract file for testing
    const mockERC20Contract = `
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";

contract MockERC20 is ERC20 {
    constructor(
        string memory name,
        string memory symbol,
        uint8 decimals
    ) ERC20(name, symbol) {
        _mint(msg.sender, 1000000 * 10**decimals);
    }
    
    function mint(address to, uint256 amount) external {
        _mint(to, amount);
    }
}`;
    
    const fs = require('fs');
    fs.writeFileSync('contracts/MockERC20.sol', mockERC20Contract);
    
    // Recompile contracts
    await hre.run("compile");
  });

  describe("Deployment", function () {
    it("Should set the correct WillsNFT address", async function () {
      const { willsNFT, willExecutor } = await loadFixture(deployContractsFixture);

      expect(await willExecutor.willsNFT()).to.equal(await willsNFT.getAddress());
    });

    it("Should set the correct fee recipient", async function () {
      const { willExecutor, feeRecipient } = await loadFixture(deployContractsFixture);

      expect(await willExecutor.feeRecipient()).to.equal(feeRecipient.address);
    });

    it("Should set the right owner", async function () {
      const { willExecutor, owner } = await loadFixture(deployContractsFixture);

      expect(await willExecutor.owner()).to.equal(owner.address);
    });

    it("Should reject zero address for WillsNFT", async function () {
      const [, , , , feeRecipient] = await hre.ethers.getSigners();
      const WillExecutor = await hre.ethers.getContractFactory("WillExecutor");
      
      await expect(WillExecutor.deploy(hre.ethers.ZeroAddress, feeRecipient.address))
        .to.be.revertedWith("WillsNFT address cannot be zero");
    });

    it("Should reject zero address for fee recipient", async function () {
      const { willsNFT } = await loadFixture(deployContractsFixture);
      const WillExecutor = await hre.ethers.getContractFactory("WillExecutor");
      
      await expect(WillExecutor.deploy(await willsNFT.getAddress(), hre.ethers.ZeroAddress))
        .to.be.revertedWith("Fee recipient cannot be zero");
    });
  });

  describe("ETH Distribution", function () {
    it("Should execute ETH distribution successfully", async function () {
      const { willExecutor, executor, beneficiary1, beneficiary2, tokenId } = await loadFixture(createWillFixture);

      // Send ETH to executor contract
      const distributionAmount = hre.ethers.parseEther("1.0");
      const fee = distributionAmount * 100n / 10000n; // 1% fee
      const totalRequired = distributionAmount + fee;

      await executor.sendTransaction({
        to: await willExecutor.getAddress(),
        value: totalRequired
      });

      const instructions = {
        ethDistributions: [
          { beneficiary: beneficiary1.address, amount: distributionAmount }
        ],
        erc20Distributions: [],
        erc721Distributions: [],
        instructionHash: hre.ethers.keccak256(hre.ethers.toUtf8Bytes("test"))
      };

      const initialBalance = await hre.ethers.provider.getBalance(beneficiary1.address);

      await expect(willExecutor.connect(executor).executeWill(tokenId, instructions))
        .to.emit(willExecutor, "WillExecutionStarted")
        .withArgs(tokenId, executor.address)
        .to.emit(willExecutor, "ETHDistributed")
        .withArgs(tokenId, beneficiary1.address, distributionAmount)
        .to.emit(willExecutor, "ExecutionCompleted")
        .withArgs(tokenId, anyValue);

      const finalBalance = await hre.ethers.provider.getBalance(beneficiary1.address);
      expect(finalBalance - initialBalance).to.equal(distributionAmount);
    });

    it("Should handle multiple ETH distributions", async function () {
      const { willExecutor, executor, beneficiary1, beneficiary2, tokenId } = await loadFixture(createWillFixture);

      const amount1 = hre.ethers.parseEther("0.5");
      const amount2 = hre.ethers.parseEther("0.3");
      const totalDistribution = amount1 + amount2;
      const fee = totalDistribution * 100n / 10000n; // 1% fee
      const totalRequired = totalDistribution + fee;

      await executor.sendTransaction({
        to: await willExecutor.getAddress(),
        value: totalRequired
      });

      const instructions = {
        ethDistributions: [
          { beneficiary: beneficiary1.address, amount: amount1 },
          { beneficiary: beneficiary2.address, amount: amount2 }
        ],
        erc20Distributions: [],
        erc721Distributions: [],
        instructionHash: hre.ethers.keccak256(hre.ethers.toUtf8Bytes("test"))
      };

      const initialBalance1 = await hre.ethers.provider.getBalance(beneficiary1.address);
      const initialBalance2 = await hre.ethers.provider.getBalance(beneficiary2.address);

      await willExecutor.connect(executor).executeWill(tokenId, instructions);

      const finalBalance1 = await hre.ethers.provider.getBalance(beneficiary1.address);
      const finalBalance2 = await hre.ethers.provider.getBalance(beneficiary2.address);

      expect(finalBalance1 - initialBalance1).to.equal(amount1);
      expect(finalBalance2 - initialBalance2).to.equal(amount2);
    });

    it("Should revert if insufficient ETH balance", async function () {
      const { willExecutor, executor, beneficiary1, tokenId } = await loadFixture(createWillFixture);

      const instructions = {
        ethDistributions: [
          { beneficiary: beneficiary1.address, amount: hre.ethers.parseEther("1.0") }
        ],
        erc20Distributions: [],
        erc721Distributions: [],
        instructionHash: hre.ethers.keccak256(hre.ethers.toUtf8Bytes("test"))
      };

      await expect(willExecutor.connect(executor).executeWill(tokenId, instructions))
        .to.be.reverted;
    });
  });

  describe("ERC20 Distribution", function () {
    it("Should execute ERC20 distribution successfully", async function () {
      const { willExecutor, mockToken, executor, beneficiary1, tokenId } = await loadFixture(createWillFixture);

      // Transfer tokens to executor contract
      const distributionAmount = hre.ethers.parseEther("100");
      await mockToken.transfer(await willExecutor.getAddress(), distributionAmount * 2n); // Extra for fees

      const instructions = {
        ethDistributions: [],
        erc20Distributions: [
          { 
            beneficiary: beneficiary1.address, 
            tokenContract: await mockToken.getAddress(), 
            amount: distributionAmount 
          }
        ],
        erc721Distributions: [],
        instructionHash: hre.ethers.keccak256(hre.ethers.toUtf8Bytes("test"))
      };

      const fee = distributionAmount * 100n / 10000n; // 1% fee
      const netAmount = distributionAmount - fee;

      await expect(willExecutor.connect(executor).executeWill(tokenId, instructions))
        .to.emit(willExecutor, "ERC20Distributed")
        .withArgs(tokenId, beneficiary1.address, await mockToken.getAddress(), netAmount);

      expect(await mockToken.balanceOf(beneficiary1.address)).to.equal(netAmount);
    });

    it("Should revert if insufficient token balance", async function () {
      const { willExecutor, mockToken, executor, beneficiary1, tokenId } = await loadFixture(createWillFixture);

      const instructions = {
        ethDistributions: [],
        erc20Distributions: [
          { 
            beneficiary: beneficiary1.address, 
            tokenContract: await mockToken.getAddress(), 
            amount: hre.ethers.parseEther("100") 
          }
        ],
        erc721Distributions: [],
        instructionHash: hre.ethers.keccak256(hre.ethers.toUtf8Bytes("test"))
      };

      await expect(willExecutor.connect(executor).executeWill(tokenId, instructions))
        .to.be.reverted;
    });
  });

  describe("Access Control", function () {
    it("Should only allow designated executor to execute", async function () {
      const { willExecutor, other, tokenId } = await loadFixture(createWillFixture);

      const instructions = {
        ethDistributions: [],
        erc20Distributions: [],
        erc721Distributions: [],
        instructionHash: hre.ethers.keccak256(hre.ethers.toUtf8Bytes("test"))
      };

      await expect(willExecutor.connect(other).executeWill(tokenId, instructions))
        .to.be.revertedWith("Only designated executor can execute");
    });

    it("Should reject execution of already executed will", async function () {
      const { willExecutor, executor, tokenId } = await loadFixture(createWillFixture);

      const instructions = {
        ethDistributions: [],
        erc20Distributions: [],
        erc721Distributions: [],
        instructionHash: hre.ethers.keccak256(hre.ethers.toUtf8Bytes("test"))
      };

      // Execute once
      await willExecutor.connect(executor).executeWill(tokenId, instructions);

      // Try to execute again
      await expect(willExecutor.connect(executor).executeWill(tokenId, instructions))
        .to.be.revertedWith("Will already executed");
    });

    it("Should reject invalid token ID", async function () {
      const { willExecutor, executor } = await loadFixture(createWillFixture);

      const instructions = {
        ethDistributions: [],
        erc20Distributions: [],
        erc721Distributions: [],
        instructionHash: hre.ethers.keccak256(hre.ethers.toUtf8Bytes("test"))
      };

      await expect(willExecutor.connect(executor).executeWill(999, instructions))
        .to.be.revertedWith("Invalid token ID");
    });
  });

  describe("Emergency Execution", function () {
    it("Should allow emergency execution after delay", async function () {
      const { willExecutor, willsNFT, other, tokenId, emergencyDelay } = await loadFixture(createWillFixture);

      // Fast forward time past emergency delay
      await time.increase(emergencyDelay + 1);

      const instructions = {
        ethDistributions: [],
        erc20Distributions: [],
        erc721Distributions: [],
        instructionHash: hre.ethers.keccak256(hre.ethers.toUtf8Bytes("test"))
      };

      await expect(willExecutor.connect(other).emergencyExecuteWill(tokenId, instructions))
        .to.emit(willExecutor, "WillExecutionStarted")
        .withArgs(tokenId, other.address)
        .to.emit(willExecutor, "ExecutionCompleted")
        .withArgs(tokenId, anyValue);

      // Check that the will is marked as executed in the NFT contract
      const willData = await willsNFT.getWillData(tokenId);
      expect(willData.isExecuted).to.equal(true);
    });

    it("Should reject early emergency execution", async function () {
      const { willExecutor, other, tokenId } = await loadFixture(createWillFixture);

      const instructions = {
        ethDistributions: [],
        erc20Distributions: [],
        erc721Distributions: [],
        instructionHash: hre.ethers.keccak256(hre.ethers.toUtf8Bytes("test"))
      };

      await expect(willExecutor.connect(other).emergencyExecuteWill(tokenId, instructions))
        .to.be.revertedWith("Emergency execution not available");
    });
  });

  describe("Execution Status", function () {
    it("Should track execution status correctly", async function () {
      const { willExecutor, executor, tokenId } = await loadFixture(createWillFixture);

      // Initial status
      let status = await willExecutor.getExecutionStatus(tokenId);
      expect(status.isExecuted).to.equal(false);
      expect(status.isInitiated).to.equal(false);

      const instructions = {
        ethDistributions: [],
        erc20Distributions: [],
        erc721Distributions: [],
        instructionHash: hre.ethers.keccak256(hre.ethers.toUtf8Bytes("test"))
      };

      // Execute will
      await willExecutor.connect(executor).executeWill(tokenId, instructions);

      // Status after execution
      status = await willExecutor.getExecutionStatus(tokenId);
      expect(status.isExecuted).to.equal(true);
      expect(status.isInitiated).to.equal(true);
      expect(status.executor).to.equal(executor.address);
    });

    it("Should check canExecuteWill correctly", async function () {
      const { willExecutor, executor, tokenId } = await loadFixture(createWillFixture);

      // Should be able to execute initially
      expect(await willExecutor.canExecuteWill(tokenId)).to.equal(true);

      const instructions = {
        ethDistributions: [],
        erc20Distributions: [],
        erc721Distributions: [],
        instructionHash: hre.ethers.keccak256(hre.ethers.toUtf8Bytes("test"))
      };

      // Execute will
      await willExecutor.connect(executor).executeWill(tokenId, instructions);

      // Should not be able to execute after completion
      expect(await willExecutor.canExecuteWill(tokenId)).to.equal(false);

      // Should return false for invalid token ID
      expect(await willExecutor.canExecuteWill(999)).to.equal(false);
    });
  });

  describe("Admin Functions", function () {
    it("Should allow owner to set execution fee percentage", async function () {
      const { willExecutor, owner } = await loadFixture(deployContractsFixture);

      await willExecutor.connect(owner).setExecutionFeePercentage(200); // 2%
      expect(await willExecutor.executionFeePercentage()).to.equal(200);
    });

    it("Should reject fee percentage above maximum", async function () {
      const { willExecutor, owner } = await loadFixture(deployContractsFixture);

      await expect(willExecutor.connect(owner).setExecutionFeePercentage(600)) // 6% > 5% max
        .to.be.revertedWith("Fee percentage too high");
    });

    it("Should allow owner to set fee recipient", async function () {
      const { willExecutor, owner, other } = await loadFixture(deployContractsFixture);

      await willExecutor.connect(owner).setFeeRecipient(other.address);
      expect(await willExecutor.feeRecipient()).to.equal(other.address);
    });

    it("Should reject zero address fee recipient", async function () {
      const { willExecutor, owner } = await loadFixture(deployContractsFixture);

      await expect(willExecutor.connect(owner).setFeeRecipient(hre.ethers.ZeroAddress))
        .to.be.revertedWith("Fee recipient cannot be zero address");
    });

    it("Should reject non-owner access to admin functions", async function () {
      const { willExecutor, other } = await loadFixture(deployContractsFixture);

      await expect(willExecutor.connect(other).setExecutionFeePercentage(200))
        .to.be.reverted; // Should revert due to onlyOwner modifier

      await expect(willExecutor.connect(other).setFeeRecipient(other.address))
        .to.be.reverted; // Should revert due to onlyOwner modifier
    });
  });

  describe("Emergency Functions", function () {
    it("Should allow owner to withdraw balance", async function () {
      const { willExecutor, owner } = await loadFixture(deployContractsFixture);

      // Send ETH to contract
      const amount = hre.ethers.parseEther("1.0");
      await owner.sendTransaction({
        to: await willExecutor.getAddress(),
        value: amount
      });

      const initialBalance = await hre.ethers.provider.getBalance(owner.address);
      const tx = await willExecutor.connect(owner).withdrawBalance();
      const receipt = await tx.wait();
      const gasUsed = receipt.gasUsed * receipt.gasPrice;
      const finalBalance = await hre.ethers.provider.getBalance(owner.address);

      expect(finalBalance + gasUsed - initialBalance).to.equal(amount);
    });

    it("Should reject withdrawal with no balance", async function () {
      const { willExecutor, owner } = await loadFixture(deployContractsFixture);

      await expect(willExecutor.connect(owner).withdrawBalance())
        .to.be.revertedWith("No balance to withdraw");
    });

    it("Should allow emergency token recovery", async function () {
      const { willExecutor, mockToken, owner } = await loadFixture(deployContractsFixture);

      // Transfer tokens to contract
      const amount = hre.ethers.parseEther("100");
      await mockToken.transfer(await willExecutor.getAddress(), amount);

      await willExecutor.connect(owner).emergencyTokenRecovery(await mockToken.getAddress(), amount);
      expect(await mockToken.balanceOf(owner.address)).to.be.above(0);
    });
  });
});