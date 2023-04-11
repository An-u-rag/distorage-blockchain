
App = {
    data: '',
    genhash: [],
    web3Provider: null,
    socket: null,
    crytpo: null,
    contracts: {},
    auditContracts: [],
    storageAddress: null,
    account: '0x0',
    isHost: false,
    currentAuditDataId: null,
    curAuditInstance: null,
  
    init: function() {
      console.log("Init web3")
      return App.initWeb3();
    },
  
    initWeb3: async function() {
      // TODO: refactor conditional
      
      if (window.ethereum) {
        App.web3Provider = window.ethereum;
        try {
          // Request account access
          console.log("Metamask capture")
          await window.ethereum.enable();
        } catch (error) {
          // User denied account access...
          console.error("User denied account access")
        }
      }
      // Legacy dapp browsers...
      else if (window.web3) {
        console.log("Metamask Capture 2")
        App.web3Provider = window.web3.currentProvider;
      }
      // If no injected web3 instance is detected, fall back to Ganache
      else {
        console.log("Local Capture")
        App.web3Provider = new Web3.providers.HttpProvider('http://localhost:7545');
      }
      web3 = new Web3(App.web3Provider);
      App.crypto = window.crypto || window.msCrypto;
      
      // Socket initiation
      App.socket = io({ autoConnect: false });

      return App.initContract();
    },
  
    initContract: async function() {
      const storage = await $.getJSON("Storage.json") 
        // Instantiate a new truffle contract from the artifact
        // App.contracts.Storage = TruffleContract(storage);
      const id = await web3.eth.net.getId()
      console.log("netwrok id: ", id)
      const deployedNetwork = storage.networks[id];
      // console.log(storage)
      App.storageAddress = deployedNetwork.address
      App.contracts.Storage = new web3.eth.Contract(storage.abi, deployedNetwork.address, {data: storage.bytecode});
      App.contracts.Storage.setProvider(App.web3Provider);
            
      // Connect provider to interact with contract
      App.listenForEvents();
      console.log("Init Contract")

      App.render()
    },
  
    // Listen for events emitted from the contract
    listenForEvents: async function() {
      console.log("Listening")
      const instance = App.contracts.Storage

      App.socket.on("connect_error", (err) => {
        if (err.message === "invalid address") {
          console.log("Recheck metamask address, invalid socket connection")
        }
      });

      App.socket.on("confirm storage", ( {from, confirm} ) => {
        // Transfer the eth to host address on confirmed storage
        if (confirm === true){
          instance.methods.confirmStorage(from, web3.utils.toWei('2', 'ether')).send( {from: App.account} )
          .on("receipt", (receipt) => {
            console.log("Contract transferred funds to host and self destructed")
            App.render()
          })
        }
      })

      // Listen for host confirmation for audit contract initialization
      App.socket.on("confirm audit sequence start", async ({from, confirm}) => {
        // Call audit function from smart contract to get hash from host
        let auditContractObj = null
        for (let i = 0; i < App.auditContracts.length; i++){
          if(App.auditContracts[i].dataId == App.currentAuditDataId){
            auditContractObj = App.auditContracts[i]
            App.curAuditInstance = new web3.eth.Contract(auditContractObj.abi, auditContractObj.auditAddress)
            console.log("reached", auditContractObj.auditAddress)
          }
        }
        let genHash = auditContractObj.genhash
        let salt = auditContractObj.salt
        let hostaddress = auditContractObj.hostaddress
        let dataId = auditContractObj.dataId
        // Call initiate audit with genhash, salt and hostaddress
        App.curAuditInstance.methods.initiateAudit(genHash, salt, hostaddress, dataId).send({ from: App.account, value: web3.utils.toWei('1', 'ether') })
        .on("receipt", (receipt) => {
          console.log("initiate audit", receipt)
        })

        // Listen for Audit success or failure
        App.curAuditInstance.events.AuditSuccess({
          fromBlock:'latest',
          toBlock: 'latest',
        })
        .on('data', (event) => {
          console.log("Audit Success", event.returnValues.hostGenHash)
        })
        .on('error', (err) => {
          console.log("Audit Success Error: ", err)
        })

        App.curAuditInstance.events.AuditFailure({
          fromBlock:'latest',
          toBlock: 'latest',
        })
        .on('data', (event) => {
          console.log("Audit Failure", event.returnValues.hostGenHash)
        })
        .on('error', (err) => {
          console.log("Audit Failure Error: ", err)
        })

        
      })

      instance.events.initiateStorageEvent({
        fromBlock: 'latest',
        toBlock: 'latest'
      })
      .on('data', async function(event){
          console.log("Event Listener: ", event);
          const balance = await web3.eth.getBalance(App.storageAddress)
          console.log("Balance of Contract: ", web3.utils.fromWei(balance))

          // Initiate socket event to transfer data to host
          App.socket.emit("initiate storage", {
            file: App.data,
            to: event.returnValues.hostId,
            dataId: event.returnValues.dataId,
            salt: event.returnValues.salty
          });

      })
      .on('error', console.error);
      
    },
  
    render: async function() {
      console.log("Render Entered")
      var storageInstance;
      var loader = $("#loader");
      var content = $("#content");
  
      loader.show();
      content.hide();
  
      // Load account data
      web3.eth.getCoinbase(function(err, account) {
        if (err === null) {
          App.account = account;
          $("#accountAddress").html("Your Account: " + account);
          // Manually call conenct event for socket
          console.log("Curr: ", account)
          App.socket.auth = { address: account };
          App.socket.connect();
        }
      });
  
      // Load contract data
      storageInstance = App.contracts.Storage;
      hostCount = await storageInstance.methods.hostCount().call() // Check
      hostCount = parseInt(hostCount)
      overallDataCount = await storageInstance.methods.dataCount().call()
      console.log("Data Count: ", overallDataCount)
  
      var candidatesResults = $("#candidatesResults");
      candidatesResults.empty();
  
      var candidatesSelect = $('#candidatesSelect');
      candidatesSelect.empty();
  
      for (var i = 0; i < hostCount; i++) {
        storageInstance.methods.hosts(i).call().then(function(candidate) {
          var id = candidate[0];
          var name = candidate[4];
          var diskSpace = candidate[5];
  
          // Render candidate Result
          var candidateTemplate = "<tr><th>" + id + "</th><td>" + name + "</td><td>" + diskSpace + "</td></tr>"
          candidatesResults.append(candidateTemplate);
  
          // Render candidate ballot option
          var candidateOption = "<option value='" + id + "' >" + id + "</ option>"
          candidatesSelect.append(candidateOption);
        });
      }

      clientDataCount = await storageInstance.methods.clientDataCount(App.account).call() // returns number of data client has stored on blockchain

      if (clientDataCount > 0){

        var dataResults = $("#dataResults");
        dataResults.empty();
    
        for (var i = 0; i < clientDataCount; i++) {
          dataId = await storageInstance.methods.getClientData(App.account, i).call() // returns unique dataid for each client data stored on-chain
          // console.log("Data Gen Hash: ", dataHash)
          storageInstance.methods.datas(dataId).call().then(function(candidate) {
            var genHash = candidate[0];
            var hostid = candidate[2];
    
            // Render candidate Result
            var candidateTemplate = "<tr><th>" + genHash + "</th><td>" + hostid + "</td><td>" + '<button type="button" class="btn" name="ping" onclick="App.auditHost('+ i +')">Audit</button>' + "</td></tr>"
            dataResults.append(candidateTemplate);
          });
        }
      }


      isHost = await storageInstance.methods.isHost(App.account).call(); // check
      if (isHost) {
        $('form').hide();
      }
      loader.hide();
      content.show();
    },
  
    selectHost: async function() {
      App.data = $('#data').val()
      var candidateId = $('#candidatesSelect').val();

      // Check Null data or cadnidate id

      const instance = App.contracts.Storage;
      // hash 
      //const salty = App.crypto.randomUUID();
      const salty = Math.floor(Math.random() * 100)
      console.log("salt", salty)

      const genHash = web3.utils.soliditySha3(App.data, salty);
      const size = App.data.length;
      const interval = 60;
      instance.methods.initiateStorage(candidateId, genHash, size, interval, salty).send({ from: App.account, value: web3.utils.toWei('2', 'ether') }, (error, hash) => {
        console.log("Callback: ", hash);
        // Loader displayed until transaction processed
        // Listen for emit event from contract
        $("#content").hide();
        $("#loader").show();
      })
      // .on('confirmation', function(confirmationNumber, receipt) {
      //   // Loader displayed until transaction processed
      //   // Listen for emit event from contract
      //   $("#content").hide();
      //   $("#loader").show();
      //   console.log("Confirm: ", receipt)
      //   console.log("Balance of Contract: ", web3.utils.fromWei(balance))

      //   // App.render();
      // })
      .on('error', function(err, receipt) {
        console.error("Error: " ,err);
      });
    },

    auditHost: async function(index){
      storageInstance = App.contracts.Storage;
      index = parseInt(index) - 1
      // Create a audit.sol instance
      const audit = await $.getJSON("Audit.json") 
      var auditContract = new web3.eth.Contract(audit.abi);
      auditContract.setProvider(App.web3Provider);

      App.Audit = auditContract

      auditContract.deploy({data: audit.bytecode}).send( {from: App.account} )
      .on("confirmation", async (confirm, auditInstance) => {
        if (confirm === 1){
          // Get host address
          let dataHash = await storageInstance.methods.getClientData(App.account, index).call()
          let genHash = null
          let clientaddress = null
          let hostaddress = null
          let auditInterval = null
          let datasize = null
          let salt = null
          let dataId = null
          storageInstance.methods.datas(dataHash).call().then(async function(candidate) {
            genHash = candidate[0];
            clientaddress = candidate[1];
            hostaddress = candidate[2];
            auditInterval = candidate[3];
            datasize = candidate[4];
            salt = candidate[5];
            dataId = candidate[6];

            // Send host the contract address via sockets
            let auditAddress = auditInstance.contractAddress;

            // Push Audit object to App.auditContracts and continue in lsiten for events for confirm event
            let auditContractObject = {
              abi: audit.abi,
              auditAddress: auditAddress,
              hostaddress: hostaddress,
              dataId: dataId,
              salt: salt,
              genhash: genHash,
              interval: auditInterval
            }
            App.auditContracts.push(auditContractObject)

            // Set current data id for audit
            App.currentAuditDataId = dataId

            App.socket.emit("audit sequence start", {
              to: hostaddress,
              from: clientaddress,
              abi: audit.abi,
              auditAddress: auditAddress
            });

            console.log(auditInstance)
          })
        }
      })      
    }
  };
  
  $(function() {
    $(window).load(function() {
      App.init();
    });
  });