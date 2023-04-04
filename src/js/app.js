
App = {
  web3Provider: null,
  contracts: {},
  account: '0x0',
  isHost: false,

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

    return App.initContract();
  },

  initContract: async function() {
    const storage = await $.getJSON("Storage.json")
      // Instantiate a new truffle contract from the artifact
      // App.contracts.Storage = TruffleContract(storage);
    const id = await web3.eth.net.getId()
    const deployedNetwork = storage.networks[id];
    // console.log(storage)
    App.contracts.Storage = new web3.eth.Contract(storage.abi, deployedNetwork.address, {data: storage.bytecode});
    App.contracts.Storage.setProvider(App.web3Provider);
          
    // Connect provider to interact with contract
    App.listenForEvents();
    console.log("Init Contract")
    return App.render();
  },

  // Listen for events emitted from the contract
  listenForEvents: async function() {
    console.log("Listening")
    const instance = App.contracts.Storage

    instance.events.addHostEvent({
      fromBlock: 0,
      toBlock: 'latest'
    })
    .on('data', function(event){
        console.log(event); // same results as the optional callback above
        App.render();
    })
    .on('error', console.error);

    // instance.getPastEvents('addHostEvent', {fromBlock: 0, toBlock: 'latest'}, (error, events) => {
    //   console.log(content);
    //   console.log("event triggered", events)
    //   App.render();
    // })
    // console.log(instance)
    // instance.addHostEvent({}, {
    //   fromBlock: 0,
    //   toBlock: 'latest'
    // }).watch('data', function(error, event) {
    //   console.log("event triggered", event)
    //   // Reload when a new vote is recorded
    //   App.render();
    // });
    
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
      }
    });

    // Load contract data
    storageInstance = App.contracts.Storage;
    hostCount = await storageInstance.methods.hostCount().call() // Check
    hostCount = parseInt(hostCount)
    console.log("Host Count: ", hostCount)

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

        // // Render candidate ballot option
        var candidateOption = "<option value='" + id + "' >" + id + "</ option>"
        candidatesSelect.append(candidateOption);
      });
    }
    isHost = await storageInstance.methods.isHost(App.account).call(); // check
    if (isHost) {
      $('form').hide();
    }
    loader.hide();
    content.show();
  },

  addHost: async function() {
    var name = document.getElementById("name").value;
    var port = document.getElementById("port").value;
    var ip = document.getElementById("ip").value;
    var diskspace = document.getElementById("diskspace").value;

    // Calculate locHash using name + port + ip
    locHash = web3.utils.soliditySha3(name, port, ip)
    console.log(locHash)
    
    const instance = App.contracts.Storage
    instance.methods.addHost(name, parseInt(port), ip, locHash, parseInt(diskspace)).send({ from: App.account }).then(function(result) {
      // Wait for votes to updates
      $("#content").hide();
      $("#loader").show();
    }).catch(function(err) {
      console.error(err);
    });
  },

  // selectHost: function() {
  //   var candidateId = $('#candidatesSelect').val();
  //   App.contracts.Storage.deploy().then(function(instance) {
  //     // hash 
  //     return instance.storeInHost(candidateId, { from: App.account });
  //   }).then(function(result) {
  //     // Wait for votes to update
  //     $("#content").hide();
  //     $("#loader").show();
  //   }).catch(function(err) {
  //     console.error(err);
  //   });
  // }
};

$(function() {
  $(window).load(function() {
    App.init();
  });
});