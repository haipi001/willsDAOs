// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "@openzeppelin/contracts/token/ERC721/extensions/ERC721URIStorage.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
/**
 * @title WillsNFT
 * @dev A decentralized will management system using NFTs to represent wills
 * Features:
 * - NFT representation of wills
 * - IPFS integration for metadata storage
 * - Access control for will ownership
 * - Execution triggering mechanism
 * - Emergency functions for will management
 */
contract WillsNFT is ERC721, ERC721URIStorage, Ownable, ReentrancyGuard {
    uint256 private _tokenIdCounter;
    
    // Events
    event WillCreated(uint256 indexed tokenId, address indexed creator, string ipfsHash);
    event WillExecuted(uint256 indexed tokenId, address indexed executor, uint256 timestamp);
    event WillUpdated(uint256 indexed tokenId, string newIpfsHash);
    event ExecutorUpdated(uint256 indexed tokenId, address indexed newExecutor);
    event EmergencyUpdated(uint256 indexed tokenId, uint256 newEmergencyDelay);
    
    // Structs
    struct WillData {
        string ipfsHash;           // IPFS hash containing encrypted will data
        address creator;           // Original creator of the will
        address executor;          // Designated executor
        uint256 createdAt;         // Creation timestamp
        uint256 lastUpdateAt;      // Last update timestamp
        uint256 emergencyDelay;    // Delay period before emergency execution (in seconds)
        bool isExecuted;           // Whether the will has been executed
        mapping(address => bool) authorizedViewers; // Authorized viewers
    }
    
    // State variables
    mapping(uint256 => WillData) private _wills;
    mapping(address => uint256[]) private _userWills; // User to their created wills
    mapping(address => bool) private _authorizedContracts; // Contracts authorized to execute wills
    
    // Constants
    uint256 public constant MIN_EMERGENCY_DELAY = 30 days;
    uint256 public constant MAX_EMERGENCY_DELAY = 365 days;
    
    constructor(
        string memory name,
        string memory symbol
    ) ERC721(name, symbol) Ownable(msg.sender) {}
    
    /**
     * @dev Create a new will NFT
     * @param _ipfsHash IPFS hash containing the encrypted will data
     * @param _executor Address of the designated executor
     * @param _emergencyDelay Emergency delay period in seconds
     * @return tokenId The ID of the newly created will NFT
     */
    function createWill(
        string memory _ipfsHash,
        address _executor,
        uint256 _emergencyDelay
    ) external nonReentrant returns (uint256) {
        require(bytes(_ipfsHash).length > 0, "IPFS hash cannot be empty");
        require(_executor != address(0), "Executor cannot be zero address");
        require(_executor != msg.sender, "Cannot set self as executor");
        require(
            _emergencyDelay >= MIN_EMERGENCY_DELAY && _emergencyDelay <= MAX_EMERGENCY_DELAY,
            "Invalid emergency delay period"
        );
        
        uint256 tokenId = _tokenIdCounter;
        _tokenIdCounter++;
        
        // Mint the NFT to the creator
        _safeMint(msg.sender, tokenId);
        
        // Set the token URI to IPFS hash
        _setTokenURI(tokenId, _ipfsHash);
        
        // Initialize will data
        WillData storage willData = _wills[tokenId];
        willData.ipfsHash = _ipfsHash;
        willData.creator = msg.sender;
        willData.executor = _executor;
        willData.createdAt = block.timestamp;
        willData.lastUpdateAt = block.timestamp;
        willData.emergencyDelay = _emergencyDelay;
        willData.isExecuted = false;
        
        // Add to user's will list
        _userWills[msg.sender].push(tokenId);
        
        emit WillCreated(tokenId, msg.sender, _ipfsHash);
        
        return tokenId;
    }
    
    /**
     * @dev Update an existing will's content
     * @param tokenId The ID of the will to update
     * @param _newIpfsHash New IPFS hash with updated will data
     */
    function updateWill(uint256 tokenId, string memory _newIpfsHash) external {
        require(_ownerExists(tokenId), "Will does not exist");
        require(ownerOf(tokenId) == msg.sender, "Only owner can update will");
        require(!_wills[tokenId].isExecuted, "Cannot update executed will");
        require(bytes(_newIpfsHash).length > 0, "IPFS hash cannot be empty");
        
        _wills[tokenId].ipfsHash = _newIpfsHash;
        _wills[tokenId].lastUpdateAt = block.timestamp;
        _setTokenURI(tokenId, _newIpfsHash);
        
        emit WillUpdated(tokenId, _newIpfsHash);
    }
    
    /**
     * @dev Update the executor for a will
     * @param tokenId The ID of the will
     * @param _newExecutor New executor address
     */
    function updateExecutor(uint256 tokenId, address _newExecutor) external {
        require(_ownerExists(tokenId), "Will does not exist");
        require(ownerOf(tokenId) == msg.sender, "Only owner can update executor");
        require(!_wills[tokenId].isExecuted, "Cannot update executed will");
        require(_newExecutor != address(0), "Executor cannot be zero address");
        require(_newExecutor != msg.sender, "Cannot set self as executor");
        
        _wills[tokenId].executor = _newExecutor;
        _wills[tokenId].lastUpdateAt = block.timestamp;
        
        emit ExecutorUpdated(tokenId, _newExecutor);
    }
    
    /**
     * @dev Update emergency delay for a will
     * @param tokenId The ID of the will
     * @param _newEmergencyDelay New emergency delay period
     */
    function updateEmergencyDelay(uint256 tokenId, uint256 _newEmergencyDelay) external {
        require(_ownerExists(tokenId), "Will does not exist");
        require(ownerOf(tokenId) == msg.sender, "Only owner can update emergency delay");
        require(!_wills[tokenId].isExecuted, "Cannot update executed will");
        require(
            _newEmergencyDelay >= MIN_EMERGENCY_DELAY && _newEmergencyDelay <= MAX_EMERGENCY_DELAY,
            "Invalid emergency delay period"
        );
        
        _wills[tokenId].emergencyDelay = _newEmergencyDelay;
        _wills[tokenId].lastUpdateAt = block.timestamp;
        
        emit EmergencyUpdated(tokenId, _newEmergencyDelay);
    }
    
    /**
     * @dev Execute a will (can only be called by designated executor)
     * @param tokenId The ID of the will to execute
     */
    function executeWill(uint256 tokenId) external {
        require(_ownerExists(tokenId), "Will does not exist");
        require(_wills[tokenId].executor == msg.sender, "Only executor can execute will");
        require(!_wills[tokenId].isExecuted, "Will already executed");
        
        _wills[tokenId].isExecuted = true;
        
        emit WillExecuted(tokenId, msg.sender, block.timestamp);
    }
    
    /**
     * @dev Emergency execution after delay period (anyone can call)
     * @param tokenId The ID of the will to execute
     */
    function emergencyExecuteWill(uint256 tokenId) external {
        require(_ownerExists(tokenId), "Will does not exist");
        require(!_wills[tokenId].isExecuted, "Will already executed");
        require(
            block.timestamp >= _wills[tokenId].lastUpdateAt + _wills[tokenId].emergencyDelay,
            "Emergency delay period not met"
        );
        
        _wills[tokenId].isExecuted = true;
        
        emit WillExecuted(tokenId, msg.sender, block.timestamp);
    }
    
    /**
     * @dev Authorize an address to view will details
     * @param tokenId The ID of the will
     * @param viewer Address to authorize
     */
    function authorizeViewer(uint256 tokenId, address viewer) external {
        require(_ownerExists(tokenId), "Will does not exist");
        require(ownerOf(tokenId) == msg.sender, "Only owner can authorize viewers");
        require(viewer != address(0), "Cannot authorize zero address");
        
        _wills[tokenId].authorizedViewers[viewer] = true;
    }
    
    /**
     * @dev Revoke viewing authorization
     * @param tokenId The ID of the will
     * @param viewer Address to revoke authorization from
     */
    function revokeViewer(uint256 tokenId, address viewer) external {
        require(_ownerExists(tokenId), "Will does not exist");
        require(ownerOf(tokenId) == msg.sender, "Only owner can revoke viewers");
        
        _wills[tokenId].authorizedViewers[viewer] = false;
    }
    
    // View functions
    
    /**
     * @dev Get will data for authorized viewers
     * @param tokenId The ID of the will
     * @return ipfsHash IPFS hash of the will
     * @return creator Address of the will creator
     * @return executor Address of the designated executor
     * @return createdAt Timestamp when the will was created
     * @return lastUpdateAt Timestamp when the will was last updated
     * @return emergencyDelay Emergency delay period in seconds
     * @return isExecuted Whether the will has been executed
     */
    function getWillData(uint256 tokenId) external view returns (
        string memory ipfsHash,
        address creator,
        address executor,
        uint256 createdAt,
        uint256 lastUpdateAt,
        uint256 emergencyDelay,
        bool isExecuted
    ) {
        require(_ownerExists(tokenId), "Will does not exist");
        require(
            ownerOf(tokenId) == msg.sender || 
            _wills[tokenId].executor == msg.sender ||
            _wills[tokenId].authorizedViewers[msg.sender],
            "Not authorized to view this will"
        );
        
        WillData storage willData = _wills[tokenId];
        return (
            willData.ipfsHash,
            willData.creator,
            willData.executor,
            willData.createdAt,
            willData.lastUpdateAt,
            willData.emergencyDelay,
            willData.isExecuted
        );
    }
    
    /**
     * @dev Check if an address is authorized to view a will
     * @param tokenId The ID of the will
     * @param viewer Address to check
     * @return bool Whether the address is authorized
     */
    function isAuthorizedViewer(uint256 tokenId, address viewer) external view returns (bool) {
        require(_ownerExists(tokenId), "Will does not exist");
        return _wills[tokenId].authorizedViewers[viewer];
    }
    
    /**
     * @dev Get all wills created by a user
     * @param user Address of the user
     * @return Array of will token IDs
     */
    function getUserWills(address user) external view returns (uint256[] memory) {
        return _userWills[user];
    }
    
    /**
     * @dev Get the next token ID that will be minted
     * @return The next token ID
     */
    function getNextTokenId() external view returns (uint256) {
        return _tokenIdCounter;
    }
    
    /**
     * @dev Check if a token exists
     * @param tokenId The ID of the token to check
     * @return bool Whether the token exists
     */
    function exists(uint256 tokenId) external view returns (bool) {
        return _ownerExists(tokenId);
    }
    
    /**
     * @dev Get the executor of a will (public access for validation)
     * @param tokenId The ID of the will
     * @return executor Address of the will executor
     */
    function getExecutor(uint256 tokenId) external view returns (address) {
        require(_ownerExists(tokenId), "Will does not exist");
        return _wills[tokenId].executor;
    }
    
    /**
     * @dev Check if a will has been executed (public access)
     * @param tokenId The ID of the will
     * @return Whether the will has been executed
     */
    function getIsExecuted(uint256 tokenId) external view returns (bool) {
        require(_ownerExists(tokenId), "Will does not exist");
        return _wills[tokenId].isExecuted;
    }
    
    /**
     * @dev Check if emergency execution is available for a will
     * @param tokenId The ID of the will
     * @return bool Whether emergency execution is available
     */
    function canEmergencyExecute(uint256 tokenId) external view returns (bool) {
        if (!_ownerExists(tokenId) || _wills[tokenId].isExecuted) {
            return false;
        }
        return block.timestamp >= _wills[tokenId].lastUpdateAt + _wills[tokenId].emergencyDelay;
    }
    
    /**
     * @dev Authorize a contract to execute wills (only owner)
     * @param contractAddress Address of the contract to authorize
     */
    function authorizeContract(address contractAddress) external onlyOwner {
        require(contractAddress != address(0), "Cannot authorize zero address");
        _authorizedContracts[contractAddress] = true;
    }
    
    /**
     * @dev Revoke contract authorization (only owner)
     * @param contractAddress Address of the contract to revoke
     */
    function revokeContract(address contractAddress) external onlyOwner {
        _authorizedContracts[contractAddress] = false;
    }
    
    /**
     * @dev Execute will by authorized contract
     * @param tokenId The ID of the will to execute
     * @param executor The address that initiated the execution
     */
    function executeWillByContract(uint256 tokenId, address executor) external {
        require(_ownerExists(tokenId), "Will does not exist");
        require(_authorizedContracts[msg.sender], "Contract not authorized");
        require(_wills[tokenId].executor == executor, "Invalid executor");
        require(!_wills[tokenId].isExecuted, "Will already executed");
        
        _wills[tokenId].isExecuted = true;
        
        emit WillExecuted(tokenId, executor, block.timestamp);
    }
    
    /**
     * @dev Emergency execute will by authorized contract
     * @param tokenId The ID of the will to execute
     * @param executor The address that initiated the emergency execution
     */
    function emergencyExecuteWillByContract(uint256 tokenId, address executor) external {
        require(_ownerExists(tokenId), "Will does not exist");
        require(_authorizedContracts[msg.sender], "Contract not authorized");
        require(!_wills[tokenId].isExecuted, "Will already executed");
        require(
            block.timestamp >= _wills[tokenId].lastUpdateAt + _wills[tokenId].emergencyDelay,
            "Emergency delay period not met"
        );
        
        _wills[tokenId].isExecuted = true;
        
        emit WillExecuted(tokenId, executor, block.timestamp);
    }
    
    // Internal functions
    
    function _ownerExists(uint256 tokenId) internal view returns (bool) {
        return _ownerOf(tokenId) != address(0);
    }
    
    // Override functions
    
    function tokenURI(uint256 tokenId) public view override(ERC721, ERC721URIStorage) returns (string memory) {
        return super.tokenURI(tokenId);
    }
    
    function supportsInterface(bytes4 interfaceId) public view override(ERC721, ERC721URIStorage) returns (bool) {
        return super.supportsInterface(interfaceId);
    }
    
    function _update(address to, uint256 tokenId, address auth) internal override(ERC721) returns (address) {
        return super._update(to, tokenId, auth);
    }
    
    function _increaseBalance(address account, uint128 value) internal override(ERC721) {
        super._increaseBalance(account, value);
    }
}