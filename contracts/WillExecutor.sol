// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC721/IERC721.sol";
import "./WillsNFT.sol";

/**
 * @title WillExecutor
 * @dev Contract for executing wills and distributing assets according to will instructions
 * Features:
 * - Asset distribution (ETH, ERC20, ERC721)
 * - Multi-beneficiary support
 * - Execution status tracking
 * - Security checks and validations
 */
contract WillExecutor is Ownable, ReentrancyGuard {
    // Events
    event WillExecutionStarted(uint256 indexed tokenId, address indexed executor);
    event ETHDistributed(uint256 indexed tokenId, address indexed beneficiary, uint256 amount);
    event ERC20Distributed(uint256 indexed tokenId, address indexed beneficiary, address indexed token, uint256 amount);
    event ERC721Distributed(uint256 indexed tokenId, address indexed beneficiary, address indexed token, uint256 tokenId_);
    event ExecutionCompleted(uint256 indexed tokenId, uint256 timestamp);
    event ExecutionFailed(uint256 indexed tokenId, string reason);
    
    // Structs
    struct ETHDistribution {
        address beneficiary;
        uint256 amount;
    }
    
    struct ERC20Distribution {
        address beneficiary;
        address tokenContract;
        uint256 amount;
    }
    
    struct ERC721Distribution {
        address beneficiary;
        address tokenContract;
        uint256 tokenId;
    }
    
    struct ExecutionInstruction {
        ETHDistribution[] ethDistributions;
        ERC20Distribution[] erc20Distributions;
        ERC721Distribution[] erc721Distributions;
        bytes32 instructionHash; // Hash of the instruction for verification
    }
    
    struct ExecutionStatus {
        bool isExecuted;
        bool isInitiated;
        uint256 executionTimestamp;
        address executor;
        string failureReason;
    }
    
    // State variables
    WillsNFT public immutable willsNFT;
    mapping(uint256 => ExecutionStatus) public executionStatuses;
    mapping(uint256 => bytes32) public instructionHashes; // tokenId => instruction hash
    
    // Fee structure
    uint256 public executionFeePercentage = 100; // 1% (100 basis points)
    uint256 public constant MAX_FEE_PERCENTAGE = 500; // 5% maximum fee
    address public feeRecipient;
    
    modifier onlyWillExecutor(uint256 tokenId) {
        require(msg.sender == willsNFT.getExecutor(tokenId), "Only designated executor can execute");
        require(!willsNFT.getIsExecuted(tokenId), "Will already executed");
        _;
    }
    
    modifier validTokenId(uint256 tokenId) {
        require(willsNFT.exists(tokenId), "Invalid token ID");
        _;
    }
    
    constructor(
        address _willsNFTAddress,
        address _feeRecipient
    ) Ownable(msg.sender) {
        require(_willsNFTAddress != address(0), "WillsNFT address cannot be zero");
        require(_feeRecipient != address(0), "Fee recipient cannot be zero");
        
        willsNFT = WillsNFT(_willsNFTAddress);
        feeRecipient = _feeRecipient;
    }
    
    /**
     * @dev Execute a will with given instructions
     * @param tokenId The ID of the will to execute
     * @param instructions Execution instructions containing asset distributions
     */
    function executeWill(
        uint256 tokenId,
        ExecutionInstruction memory instructions
    ) external nonReentrant validTokenId(tokenId) onlyWillExecutor(tokenId) {
        require(!executionStatuses[tokenId].isExecuted, "Will already executed");
        require(!executionStatuses[tokenId].isInitiated, "Execution already initiated");
        
        // Mark execution as initiated
        executionStatuses[tokenId].isInitiated = true;
        executionStatuses[tokenId].executor = msg.sender;
        
        emit WillExecutionStarted(tokenId, msg.sender);
        
        try this._executeDistributions(tokenId, instructions) {
            // Mark will as executed in the NFT contract
            willsNFT.executeWillByContract(tokenId, msg.sender);
            
            // Update execution status
            executionStatuses[tokenId].isExecuted = true;
            executionStatuses[tokenId].executionTimestamp = block.timestamp;
            
            emit ExecutionCompleted(tokenId, block.timestamp);
        } catch Error(string memory reason) {
            executionStatuses[tokenId].isInitiated = false;
            executionStatuses[tokenId].failureReason = reason;
            emit ExecutionFailed(tokenId, reason);
            revert(string(abi.encodePacked("Execution failed: ", reason)));
        } catch {
            executionStatuses[tokenId].isInitiated = false;
            executionStatuses[tokenId].failureReason = "Unknown execution error";
            emit ExecutionFailed(tokenId, "Unknown execution error");
            revert("Execution failed with unknown error");
        }
    }
    
    /**
     * @dev Internal function to execute all distributions
     * @param tokenId The ID of the will
     * @param instructions Execution instructions
     */
    function _executeDistributions(
        uint256 tokenId,
        ExecutionInstruction memory instructions
    ) external {
        require(msg.sender == address(this), "Only self-callable");
        
        // Execute ETH distributions
        _distributeETH(tokenId, instructions.ethDistributions);
        
        // Execute ERC20 distributions
        _distributeERC20(tokenId, instructions.erc20Distributions);
        
        // Execute ERC721 distributions
        _distributeERC721(tokenId, instructions.erc721Distributions);
    }
    
    /**
     * @dev Distribute ETH to beneficiaries
     * @param tokenId The ID of the will
     * @param distributions Array of ETH distributions
     */
    function _distributeETH(
        uint256 tokenId,
        ETHDistribution[] memory distributions
    ) internal {
        uint256 totalDistribution = 0;
        
        // Calculate total distribution amount
        for (uint256 i = 0; i < distributions.length; i++) {
            totalDistribution += distributions[i].amount;
        }
        
        if (totalDistribution == 0) return;
        
        // Calculate fee
        uint256 fee = (totalDistribution * executionFeePercentage) / 10000;
        uint256 requiredBalance = totalDistribution + fee;
        
        require(address(this).balance >= requiredBalance, "Insufficient ETH balance");
        
        // Distribute to beneficiaries
        for (uint256 i = 0; i < distributions.length; i++) {
            address payable beneficiary = payable(distributions[i].beneficiary);
            uint256 amount = distributions[i].amount;
            
            require(beneficiary != address(0), "Invalid beneficiary address");
            require(amount > 0, "Invalid distribution amount");
            
            beneficiary.transfer(amount);
            emit ETHDistributed(tokenId, beneficiary, amount);
        }
        
        // Transfer fee
        if (fee > 0) {
            payable(feeRecipient).transfer(fee);
        }
    }
    
    /**
     * @dev Distribute ERC20 tokens to beneficiaries
     * @param tokenId The ID of the will
     * @param distributions Array of ERC20 distributions
     */
    function _distributeERC20(
        uint256 tokenId,
        ERC20Distribution[] memory distributions
    ) internal {
        for (uint256 i = 0; i < distributions.length; i++) {
            ERC20Distribution memory dist = distributions[i];
            
            require(dist.beneficiary != address(0), "Invalid beneficiary address");
            require(dist.tokenContract != address(0), "Invalid token contract");
            require(dist.amount > 0, "Invalid distribution amount");
            
            IERC20 token = IERC20(dist.tokenContract);
            uint256 balance = token.balanceOf(address(this));
            
            require(balance >= dist.amount, "Insufficient token balance");
            
            // Calculate fee
            uint256 fee = (dist.amount * executionFeePercentage) / 10000;
            uint256 netAmount = dist.amount - fee;
            
            // Transfer to beneficiary
            require(token.transfer(dist.beneficiary, netAmount), "Token transfer failed");
            
            // Transfer fee
            if (fee > 0) {
                require(token.transfer(feeRecipient, fee), "Fee transfer failed");
            }
            
            emit ERC20Distributed(tokenId, dist.beneficiary, dist.tokenContract, netAmount);
        }
    }
    
    /**
     * @dev Distribute ERC721 tokens to beneficiaries
     * @param tokenId The ID of the will
     * @param distributions Array of ERC721 distributions
     */
    function _distributeERC721(
        uint256 tokenId,
        ERC721Distribution[] memory distributions
    ) internal {
        for (uint256 i = 0; i < distributions.length; i++) {
            ERC721Distribution memory dist = distributions[i];
            
            require(dist.beneficiary != address(0), "Invalid beneficiary address");
            require(dist.tokenContract != address(0), "Invalid token contract");
            
            IERC721 nftToken = IERC721(dist.tokenContract);
            
            require(nftToken.ownerOf(dist.tokenId) == address(this), "NFT not owned by executor");
            
            nftToken.safeTransferFrom(address(this), dist.beneficiary, dist.tokenId);
            emit ERC721Distributed(tokenId, dist.beneficiary, dist.tokenContract, dist.tokenId);
        }
    }
    
    /**
     * @dev Emergency execution after delay period
     * @param tokenId The ID of the will
     * @param instructions Execution instructions
     */
    function emergencyExecuteWill(
        uint256 tokenId,
        ExecutionInstruction memory instructions
    ) external nonReentrant validTokenId(tokenId) {
        require(willsNFT.canEmergencyExecute(tokenId), "Emergency execution not available");
        require(!executionStatuses[tokenId].isExecuted, "Will already executed");
        require(!executionStatuses[tokenId].isInitiated, "Execution already initiated");
        
        // Mark execution as initiated
        executionStatuses[tokenId].isInitiated = true;
        executionStatuses[tokenId].executor = msg.sender;
        
        emit WillExecutionStarted(tokenId, msg.sender);
        
        try this._executeDistributions(tokenId, instructions) {
            // Mark will as executed in the NFT contract
            willsNFT.emergencyExecuteWillByContract(tokenId, msg.sender);
            
            // Update execution status
            executionStatuses[tokenId].isExecuted = true;
            executionStatuses[tokenId].executionTimestamp = block.timestamp;
            
            emit ExecutionCompleted(tokenId, block.timestamp);
        } catch Error(string memory reason) {
            executionStatuses[tokenId].isInitiated = false;
            executionStatuses[tokenId].failureReason = reason;
            emit ExecutionFailed(tokenId, reason);
            revert(string(abi.encodePacked("Emergency execution failed: ", reason)));
        } catch {
            executionStatuses[tokenId].isInitiated = false;
            executionStatuses[tokenId].failureReason = "Unknown execution error";
            emit ExecutionFailed(tokenId, "Unknown execution error");
            revert("Emergency execution failed with unknown error");
        }
    }
    
    // Admin functions
    
    /**
     * @dev Set execution fee percentage (only owner)
     * @param _feePercentage New fee percentage in basis points
     */
    function setExecutionFeePercentage(uint256 _feePercentage) external onlyOwner {
        require(_feePercentage <= MAX_FEE_PERCENTAGE, "Fee percentage too high");
        executionFeePercentage = _feePercentage;
    }
    
    /**
     * @dev Set fee recipient address (only owner)
     * @param _feeRecipient New fee recipient address
     */
    function setFeeRecipient(address _feeRecipient) external onlyOwner {
        require(_feeRecipient != address(0), "Fee recipient cannot be zero address");
        feeRecipient = _feeRecipient;
    }
    
    // View functions
    
    /**
     * @dev Get execution status for a will
     * @param tokenId The ID of the will
     * @return ExecutionStatus struct
     */
    function getExecutionStatus(uint256 tokenId) external view returns (ExecutionStatus memory) {
        return executionStatuses[tokenId];
    }
    
    /**
     * @dev Check if a will can be executed
     * @param tokenId The ID of the will
     * @return bool Whether the will can be executed
     */
    function canExecuteWill(uint256 tokenId) external view returns (bool) {
        if (!willsNFT.exists(tokenId)) {
            return false;
        }
        
        bool isExecuted = willsNFT.getIsExecuted(tokenId);
        return !isExecuted && !executionStatuses[tokenId].isExecuted && !executionStatuses[tokenId].isInitiated;
    }
    
    // Fallback function to receive ETH
    receive() external payable {}
    
    /**
     * @dev Withdraw contract balance (only owner)
     */
    function withdrawBalance() external onlyOwner {
        uint256 balance = address(this).balance;
        require(balance > 0, "No balance to withdraw");
        payable(owner()).transfer(balance);
    }
    
    /**
     * @dev Emergency token recovery (only owner)
     * @param token Token contract address
     * @param amount Amount to recover
     */
    function emergencyTokenRecovery(address token, uint256 amount) external onlyOwner {
        require(token != address(0), "Invalid token address");
        IERC20(token).transfer(owner(), amount);
    }
}