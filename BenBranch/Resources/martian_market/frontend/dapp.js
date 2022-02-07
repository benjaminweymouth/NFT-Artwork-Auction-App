// @TODO: Update this address to match your deployed ArtworkMarket contract!
// const contractAddress = "0x7a377fAd8c7dB341e662c93A79d0B0319DD3DaE8";
const contractAddress = "0xC18897E17f2496e167C3E0b153111644C23cfc6e";


const dApp = {
  ethEnabled: function() {
    // If the browser has an Ethereum provider (MetaMask) installed
    if (window.ethereum) {
      window.web3 = new Web3(window.ethereum);
      window.ethereum.enable();
      return true;
    }
    return false;
  },

  //async function enable asynchronous, promise-based behavior to be written in a cleaner style
  collectVars: async function() {
    // get land tokens
    this.tokens = [];
    this.totalSupply = await this.artContract.methods.totalSupply().call();

    // fetch json metadata from IPFS (name, description, image, etc)
    const fetchMetadata = (reference_uri) => fetch(`https://gateway.pinata.cloud/ipfs/${reference_uri.replace("ipfs://", "")}`, { mode: "cors" }).then((resp) => resp.json());

    for (let i = 1; i <= this.totalSupply; i++) {
      try {
        const token_uri = await this.artContract.methods.tokenURI(i).call();
        console.log('token uri', token_uri)
        const token_json = await fetchMetadata(token_uri);
        console.log('token json', token_json)
        this.tokens.push({
          tokenId: i,
          highestBid: Number(await this.artContract.methods.highestBid(i).call()),
          auctionEnded: Boolean(await this.artContract.methods.auctionEnded(i).call()),
          pendingReturn: Number(await this.artContract.methods.pendingReturn(i, this.accounts[0]).call()),
          auction: new window.web3.eth.Contract(
            this.auctionJson,
            await this.artContract.methods.auctions(i).call(),
            { defaultAccount: this.accounts[0] }
          ),
          owner: await this.artContract.methods.ownerOf(i).call(),
          ...token_json
        });
      } catch (e) {
        console.log(JSON.stringify(e));
      }
    }
  },
  setAdmin: async function() {
    // if account selected in MetaMask is the same as owner then admin will show
    if (this.isAdmin) {
      $(".dapp-admin").show();
    } else {
      $(".dapp-admin").hide();
    }
  },
  updateUI: async function() {
    console.log("updating UI");
    // refresh variables
    await this.collectVars();
 
    $("#dapp-tokens").html("");
    this.tokens.forEach((token) => {
      try {
        let endAuction = `<a token-id="${token.tokenId}" class="dapp-admin" style="display:none;" href="#" onclick="dApp.endAuction(event)">End Auction</a>`;
        let highestBidder = `Highest Bidder: ${token.highestBidder}`;
        let highestBid = `  ${token.highestBid}`;
        let auctionStatus = `auctionStatus : ${token.auctionStatus}`;
        console.log('highestBidder', highestBidder)
        
         
        let bid = `<a token-id="${token.tokenId}" href="#" onclick="dApp.bid(event);">Bid</a>`;
        let owner = `Final Artwork Owner: ${token.owner}`;
        console.log('owner', owner)
        let withdraw = `<a token-id="${token.tokenId}" href="#" onclick="dApp.withdraw(event)">Withdraw</a>`
        let pendingWithdraw = `Balance: ${token.pendingReturn} wei`;
          $("#dapp-tokens").append(
            `<div class="col m6">
              <div class="card">
                <div class="card-image">
                  <img id="dapp-image" src="https://gateway.pinata.cloud/ipfs/${token.image.replace("ipfs://", "")}">
                  <span id="dapp-name" class="card-title">${token.name}</span>
                </div>
                <div class="card-action">
                  <input type="number" min="${token.highestBid + 1}" name="dapp-wei" value="${token.highestBid + 1}" ${token.auctionEnded ? 'disabled' : ''}>
                  <input type="number" min="${token.highestBid + 1}" name="dapp-wei" value="${token.highestBid }" ${token.auctionEnded ? 'disabled' : ''}>
                  ${token.auctionEnded ? owner : bid}
                  ${token.pendingReturn > 0 ? withdraw : ''}
                  ${token.pendingReturn > 0 ? pendingWithdraw : ''}
                  ${this.isAdmin && !token.auctionEnded ? endAuction : ''}
                </div>
              </div>
            </div>`
          );

          $("#dapp-auc-details").append(
            `    <div class="card blue darken-">
            <div class="card-content white-text">
              <div class="well">
                  <div>
                      <legend class="btn btn-secondary float-left">Auction Details</legend>
                  </div>
                  <div>
                      <ul id='transfers'>
             <p class=" text-left">Auction End: </p> <text id="auction_end"></text> 
            <li><label class="lead white-text float-left">Auction Highest Bid: ${token.auctionEnded ? highestBid : null} </label> <text id="HighestBid"></text></li>
            <li><label class="lead white-text float-left">My Bid: </label> <text id="MyBid"></text></li>
            <li><label class="lead white-text float-left">Auction Highest Bider: </label> <text id="HighestBidder"></text></li>
            <li><label class="lead white-text float-left">Auction Status: </label> <text id="STATE"></text></li>					
            </ul>
                        </div>							 					 				  
                  <div>
              </div>   
             </div>   
            </div> 
              <div class="card">
              
              
            </div>`
          );
      } catch (e) {
        alert(JSON.stringify(e));
      }
    });

    // hide or show admin functions based on contract ownership
    this.setAdmin();
  },
  bid: async function(event) {
    const tokenId = $(event.target).attr("token-id");
    const wei = Number($(event.target).prev().val());
    await this.artContract.methods.bid(tokenId).send({from: this.accounts[0], value: wei}).on("receipt", async (receipt) => {
      M.toast({ html: "Transaction Mined! Refreshing UI..." });
      await this.updateUI();
    });
  },
  endAuction: async function(event) {
    const tokenId = $(event.target).attr("token-id");
    await this.artContract.methods.endAuction(tokenId).send({from: this.accounts[0]}).on("receipt", async (receipt) => {
      M.toast({ html: "Transaction Mined! Refreshing UI..." });
      await this.updateUI();
    });
  },
  withdraw: async function(event) {
    const tokenId = $(event.target).attr("token-id") - 1;
    await this.tokens[tokenId].auction.methods.withdraw().send({from: this.accounts[0]}).on("receipt", async (receipt) => {
      M.toast({ html: "Transaction Mined! Refreshing UI..." });
      await this.updateUI();
    });
  },
  registerArt: async function() {
    const name = $("#dapp-register-name").val();
    const image = document.querySelector('input[type="file"]');

    const pinata_api_key = $("#dapp-pinata-api-key").val();
    const pinata_secret_api_key = $("#dapp-pinata-secret-api-key").val();

    if (!pinata_api_key || !pinata_secret_api_key || !name || !image) {
      M.toast({ html: "Please fill out then entire form!" });
      return;
    }

    const image_data = new FormData();
    image_data.append("file", image.files[0]);
    image_data.append("pinataOptions", JSON.stringify({cidVersion: 1}));

    try {
      M.toast({ html: "Uploading Image to IPFS via Pinata..." });
      const image_upload_response = await fetch("https://api.pinata.cloud/pinning/pinFileToIPFS", {
        method: "POST",
        mode: "cors",
        headers: {
          pinata_api_key,
          pinata_secret_api_key
        },
        body: image_data,
      });

      const image_hash = await image_upload_response.json();
      const image_uri = `ipfs://${image_hash.IpfsHash}`;

      M.toast({ html: `Success. Image located at ${image_uri}.` });
      M.toast({ html: "Uploading JSON..." });

      
      const reference_json = JSON.stringify({
        pinataContent: { name, image: image_uri },
        pinataOptions: {cidVersion: 1}
      });

      const json_upload_response = await fetch("https://api.pinata.cloud/pinning/pinJSONToIPFS", {
        method: "POST",
        mode: "cors",
        headers: {
          "Content-Type": "application/json",
          pinata_api_key,
          pinata_secret_api_key
        },
        body: reference_json
      });

      const reference_hash = await json_upload_response.json();
      const reference_uri = `ipfs://${reference_hash.IpfsHash}`;

      M.toast({ html: `Success. Reference URI located at ${reference_uri}.` });
      M.toast({ html: "Sending to blockchain..." });

      await this.artContract.methods.registerArt(reference_uri).send({from: this.accounts[0]}).on("receipt", async (receipt) => {
        M.toast({ html: "Transaction Mined! Refreshing UI..." });
        $("#dapp-register-name").val("");
        $("#dapp-register-image").val("");
        await this.updateUI();
      });

    } catch (e) {
      alert("ERROR:", JSON.stringify(e));
    }
  },
  main: async function() {
    // Initialize web3
    if (!this.ethEnabled()) {
      alert("Please install MetaMask to use this dApp!");
    }

    this.accounts = await window.web3.eth.getAccounts();
    this.contractAddress = contractAddress;

    this.artJson = await (await fetch("./ArtworkMarket.json")).json();
    this.auctionJson = await (await fetch("./ArtworkAuction.json")).json();

    this.artContract = new window.web3.eth.Contract(
      this.artJson,
      this.contractAddress,
      { defaultAccount: this.accounts[0] }
    );
    console.log("Contract object", this.artContract);

    this.isAdmin = this.accounts[0] == await this.artContract.methods.owner().call();

    await this.updateUI();
  }
};

dApp.main();
