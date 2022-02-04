pragma solidity ^0.5.5;
import "https://github.com/OpenZeppelin/openzeppelin-contracts/blob/release-v2.5.0/contracts/token/ERC721/ERC721Full.sol";
import "https://github.com/OpenZeppelin/openzeppelin-contracts/blob/release-v2.5.0/contracts/ownership/Ownable.sol";
import "./ArtworkAuction.sol";
contract ArtworkMarket is ERC721Full, Ownable {
    constructor() ERC721Full("ArtworkMarket", "ART") public {}
    using Counters for Counters.Counter;
    Counters.Counter token_ids;
    address payable foundation_address = msg.sender;
    mapping(uint => ArtworkAuction) public auctions;
    modifier artRegistered(uint token_id) {
        require(_exists(token_id), "Art not registered!");
        _;
    }
    function registerArt(string memory uri) public payable onlyOwner {
        token_ids.increment();
        uint token_id = token_ids.current();
        _mint(foundation_address, token_id);
        _setTokenURI(token_id, uri);
        createAuction(token_id);
    }
    function createAuction(uint token_id) public onlyOwner {
        auctions[token_id] = new ArtworkAuction(foundation_address);
    }
    function endAuction(uint token_id) public onlyOwner artRegistered(token_id) {
        ArtworkAuction auction = auctions[token_id];
        auction.auctionEnd();
        safeTransferFrom(owner(), auction.highestBidder(), token_id);
    }
    function auctionEnded(uint token_id) public view returns(bool) {
        ArtworkAuction auction = auctions[token_id];
        return auction.ended();
    }
    function highestBid(uint token_id) public view artRegistered(token_id) returns(uint) {
        ArtworkAuction auction = auctions[token_id];
        return auction.highestBid();
    }
    function pendingReturn(uint token_id, address sender) public view artRegistered(token_id) returns(uint) {
        ArtworkAuction auction = auctions[token_id];
        return auction.pendingReturn(sender);
    }
    function bid(uint token_id) public payable artRegistered(token_id) {
        ArtworkAuction auction = auctions[token_id];
        auction.bid.value(msg.value)(msg.sender);
    }
}