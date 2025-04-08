const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("DAOGovLite", function () {
  let DAOGovLite, GovernanceToken;
  let daoGovLite, governanceToken;
  let owner, addr1, addr2;

  beforeEach(async function () {
    // Get signers
    [owner, addr1, addr2] = await ethers.getSigners();
    
    // Deploy GovernanceToken
    GovernanceToken = await ethers.getContractFactory("GovernanceToken");
    governanceToken = await GovernanceToken.deploy("VoteVerse Token", "VOTE");
    await governanceToken.deployed();
    
    // Deploy DAOGovLite
    DAOGovLite = await ethers.getContractFactory("DAOGovLite");
    daoGovLite = await DAOGovLite.deploy(governanceToken.address);
    await daoGovLite.deployed();
    
    // Mint tokens to users for testing
    await governanceToken.mint(addr1.address, ethers.utils.parseEther("5000"));
    await governanceToken.mint(addr2.address, ethers.utils.parseEther("3000"));
  });

  describe("Deployment", function () {
    it("Should set the correct governance token", async function () {
      expect(await daoGovLite.governanceToken()).to.equal(governanceToken.address);
    });
  });

  describe("Proposal Creation", function () {
    it("Should create a new proposal", async function () {
      // Create a proposal
      const tx = await daoGovLite.connect(addr1).createProposal(
        "Test Proposal",
        "This is a test proposal description",
        86400 // 1 day in seconds
      );
      
      // Get proposal ID from event
      const receipt = await tx.wait();
      const event = receipt.events.find(e => e.event === 'ProposalCreated');
      const proposalId = event.args.proposalId.toNumber();
      
      // Check proposal was created
      const proposal = await daoGovLite.getProposal(proposalId);
      expect(proposal.title).to.equal("Test Proposal");
      expect(proposal.description).to.equal("This is a test proposal description");
      expect(proposal.proposer).to.equal(addr1.address);
    });

    it("Should revert if the user has insufficient tokens", async function () {
      // Create a new wallet with 0 tokens
      const randomWallet = ethers.Wallet.createRandom().connect(ethers.provider);
      
      // Try to create a proposal
      await expect(daoGovLite.connect(randomWallet).createProposal(
        "Invalid Proposal",
        "This should fail",
        86400
      )).to.be.revertedWith("Insufficient tokens to create proposal");
    });
  });

  describe("Voting", function () {
    let proposalId;
    
    beforeEach(async function () {
      // Create a proposal first
      const tx = await daoGovLite.connect(addr1).createProposal(
        "Voting Test Proposal",
        "This is a proposal for testing voting",
        86400 // 1 day
      );
      
      // Get proposal ID
      const receipt = await tx.wait();
      const event = receipt.events.find(e => e.event === 'ProposalCreated');
      proposalId = event.args.proposalId.toNumber();
    });
    
    it("Should allow a user to vote on a proposal", async function () {
      // Vote on the proposal
      await daoGovLite.connect(addr2).vote(proposalId, true);
      
      // Check that the vote was counted
      const proposal = await daoGovLite.getProposal(proposalId);
      expect(proposal.forVotes).to.equal(ethers.utils.parseEther("3000"));
      
      // Check that the user has voted
      expect(await daoGovLite.hasVoted(proposalId, addr2.address)).to.be.true;
    });
    
    it("Should prevent a user from voting twice", async function () {
      // Vote once
      await daoGovLite.connect(addr2).vote(proposalId, true);
      
      // Try to vote again
      await expect(daoGovLite.connect(addr2).vote(proposalId, false))
        .to.be.revertedWith("Already voted");
    });
  });

  describe("Proposal Execution", function () {
    let proposalId;
    
    beforeEach(async function () {
      // Create a proposal
      const tx = await daoGovLite.connect(addr1).createProposal(
        "Execution Test Proposal",
        "This is a proposal for testing execution",
        1 // 1 second duration for testing
      );
      
      // Get proposal ID
      const receipt = await tx.wait();
      const event = receipt.events.find(e => e.event === 'ProposalCreated');
      proposalId = event.args.proposalId.toNumber();
      
      // Vote in favor
      await daoGovLite.connect(addr1).vote(proposalId, true);
      
      // Wait for voting period to end
      await new Promise(r => setTimeout(r, 1000));
    });
    
    it("Should execute a successful proposal", async function () {
      // Execute the proposal
      await daoGovLite.connect(owner).executeProposal(proposalId);
      
      // Check that the proposal was executed
      const proposal = await daoGovLite.getProposal(proposalId);
      expect(proposal.executed).to.be.true;
    });
    
    it("Should prevent executing a proposal twice", async function () {
      // Execute once
      await daoGovLite.connect(owner).executeProposal(proposalId);
      
      // Try to execute again
      await expect(daoGovLite.connect(owner).executeProposal(proposalId))
        .to.be.revertedWith("Proposal already executed");
    });
  });
}); 