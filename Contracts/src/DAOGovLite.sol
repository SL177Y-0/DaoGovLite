// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/extensions/ERC20Votes.sol";
import "@openzeppelin/contracts/utils/Counters.sol";

/**
 * @title DAOGovLite
 * @dev A simple DAO governance contract for proposal creation and voting
 */
contract DAOGovLite {
    using Counters for Counters.Counter;

    // Token used for voting
    ERC20Votes public governanceToken;
    
    // Proposal counter
    Counters.Counter private _proposalIdCounter;
    
    // Minimum amount of tokens required to create a proposal
    uint256 public constant PROPOSAL_THRESHOLD = 1000 * 10**18; // 1000 tokens
    
    // Proposal struct
    struct Proposal {
        address proposer;
        string title;
        string description;
        uint256 startTime;
        uint256 endTime;
        uint256 forVotes;
        uint256 againstVotes;
        bool executed;
        bool canceled;
        mapping(address => bool) hasVoted;
    }
    
    // Mapping of proposal ID to Proposal
    mapping(uint256 => Proposal) private _proposals;
    
    // Array of proposal IDs
    uint256[] private _proposalIds;
    
    // Events
    event ProposalCreated(
        uint256 indexed proposalId,
        address indexed proposer,
        string title,
        string description,
        uint256 startTime,
        uint256 endTime
    );
    
    event VoteCast(
        uint256 indexed proposalId,
        address indexed voter,
        bool support,
        uint256 votes
    );
    
    event ProposalExecuted(
        uint256 indexed proposalId,
        address indexed executor
    );
    
    event ProposalCanceled(
        uint256 indexed proposalId
    );
    
    /**
     * @dev Constructor
     * @param _governanceToken The token used for voting
     */
    constructor(address _governanceToken) {
        require(_governanceToken != address(0), "Invalid token address");
        governanceToken = ERC20Votes(_governanceToken);
        
        // Start proposal IDs at 1
        _proposalIdCounter.increment();
    }
    
    /**
     * @dev Creates a new proposal
     * @param title The title of the proposal
     * @param description The description of the proposal
     * @param duration The duration of the voting period in seconds
     * @return proposalId The ID of the created proposal
     */
    function createProposal(
        string calldata title,
        string calldata description,
        uint256 duration
    ) external returns (uint256) {
        require(
            governanceToken.balanceOf(msg.sender) >= PROPOSAL_THRESHOLD,
            "Insufficient tokens to create proposal"
        );
        require(bytes(title).length > 0, "Title cannot be empty");
        require(bytes(description).length > 0, "Description cannot be empty");
        require(duration > 0, "Duration must be positive");
        
        uint256 proposalId = _proposalIdCounter.current();
        
        Proposal storage proposal = _proposals[proposalId];
        proposal.proposer = msg.sender;
        proposal.title = title;
        proposal.description = description;
        proposal.startTime = block.timestamp;
        proposal.endTime = block.timestamp + duration;
        proposal.forVotes = 0;
        proposal.againstVotes = 0;
        proposal.executed = false;
        proposal.canceled = false;
        
        _proposalIds.push(proposalId);
        
        emit ProposalCreated(
            proposalId,
            msg.sender,
            title,
            description,
            proposal.startTime,
            proposal.endTime
        );
        
        _proposalIdCounter.increment();
        
        return proposalId;
    }
    
    /**
     * @dev Casts a vote on a proposal
     * @param proposalId The ID of the proposal
     * @param support Whether to support the proposal or not
     */
    function vote(uint256 proposalId, bool support) external {
        require(_proposalExists(proposalId), "Proposal does not exist");
        require(!_proposals[proposalId].hasVoted[msg.sender], "Already voted");
        require(block.timestamp <= _proposals[proposalId].endTime, "Voting period ended");
        require(!_proposals[proposalId].canceled, "Proposal canceled");
        require(!_proposals[proposalId].executed, "Proposal already executed");
        
        uint256 votes = governanceToken.balanceOf(msg.sender);
        require(votes > 0, "No voting power");
        
        Proposal storage proposal = _proposals[proposalId];
        
        if (support) {
            proposal.forVotes += votes;
        } else {
            proposal.againstVotes += votes;
        }
        
        proposal.hasVoted[msg.sender] = true;
        
        emit VoteCast(proposalId, msg.sender, support, votes);
    }
    
    /**
     * @dev Executes a proposal
     * @param proposalId The ID of the proposal to execute
     */
    function executeProposal(uint256 proposalId) external {
        require(_proposalExists(proposalId), "Proposal does not exist");
        require(!_proposals[proposalId].executed, "Proposal already executed");
        require(!_proposals[proposalId].canceled, "Proposal canceled");
        require(block.timestamp > _proposals[proposalId].endTime, "Voting period not ended");
        
        Proposal storage proposal = _proposals[proposalId];
        require(proposal.forVotes > proposal.againstVotes, "Proposal rejected");
        
        proposal.executed = true;
        
        emit ProposalExecuted(proposalId, msg.sender);
    }
    
    /**
     * @dev Cancels a proposal (only by proposer)
     * @param proposalId The ID of the proposal to cancel
     */
    function cancelProposal(uint256 proposalId) external {
        require(_proposalExists(proposalId), "Proposal does not exist");
        require(!_proposals[proposalId].executed, "Proposal already executed");
        require(!_proposals[proposalId].canceled, "Proposal already canceled");
        require(
            msg.sender == _proposals[proposalId].proposer,
            "Only proposer can cancel"
        );
        
        _proposals[proposalId].canceled = true;
        
        emit ProposalCanceled(proposalId);
    }
    
    /**
     * @dev Gets proposal details
     * @param proposalId The ID of the proposal
     * @return proposer The address of the proposer
     * @return title The title of the proposal
     * @return description The description of the proposal
     * @return startTime The start time of the proposal
     * @return endTime The end time of the proposal
     * @return forVotes The number of votes in favor
     * @return againstVotes The number of votes against
     * @return executed Whether the proposal has been executed
     * @return canceled Whether the proposal has been canceled
     */
    function getProposal(uint256 proposalId) external view returns (
        address proposer,
        string memory title,
        string memory description,
        uint256 startTime,
        uint256 endTime,
        uint256 forVotes,
        uint256 againstVotes,
        bool executed,
        bool canceled
    ) {
        require(_proposalExists(proposalId), "Proposal does not exist");
        
        Proposal storage proposal = _proposals[proposalId];
        
        return (
            proposal.proposer,
            proposal.title,
            proposal.description,
            proposal.startTime,
            proposal.endTime,
            proposal.forVotes,
            proposal.againstVotes,
            proposal.executed,
            proposal.canceled
        );
    }
    
    /**
     * @dev Gets list of all proposal IDs
     * @return Array of proposal IDs
     */
    function getProposals() external view returns (uint256[] memory) {
        return _proposalIds;
    }
    
    /**
     * @dev Gets proposal count
     * @return Current proposal count
     */
    function getProposalCount() external view returns (uint256) {
        return _proposalIdCounter.current() - 1;
    }
    
    /**
     * @dev Checks if a user has voted on a proposal
     * @param proposalId The ID of the proposal
     * @param voter The address of the voter
     * @return Whether the user has voted
     */
    function hasVoted(uint256 proposalId, address voter) external view returns (bool) {
        require(_proposalExists(proposalId), "Proposal does not exist");
        return _proposals[proposalId].hasVoted[voter];
    }
    
    /**
     * @dev Gets a user's voting power
     * @param voter The address of the voter
     * @return The voting power of the user
     */
    function getVotingPower(address voter) external view returns (uint256) {
        return governanceToken.balanceOf(voter);
    }
    
    /**
     * @dev Check if a proposal exists
     * @param proposalId The ID of the proposal
     * @return Whether the proposal exists
     */
    function _proposalExists(uint256 proposalId) internal view returns (bool) {
        return proposalId > 0 && proposalId < _proposalIdCounter.current();
    }
} 