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

  initContract: function() {
    $.getJSON("Storage.json", function(storage) {
      // Instantiate a new truffle contract from the artifact
      App.contracts.Storage = TruffleContract(storage);
      // Connect provider to interact with contract
      App.contracts.Storage.setProvider(App.web3Provider);

      App.listenForEvents();
      console.log("Init Contract")
      return App.render();
    });
  },

  // Listen for events emitted from the contract
  listenForEvents: function() {
    console.log("Listening")
    App.contracts.Storage.deployed().then(function(instance) {
      // Restart Chrome if you are unable to receive this event
      // This is a known issue with Metamask
      // https://github.com/MetaMask/metamask-extension/issues/2393
      instance.addHostEvent({}, {
        fromBlock: 0,
        toBlock: 'latest'
      }).watch(function(error, event) {
        console.log("event triggered", event)
        // Reload when a new vote is recorded
        App.render();
      });
    });
  },

  render: function() {
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
    App.contracts.Storage.deployed().then(function(instance) {
      storageInstance = instance;
      return storageInstance.hostCount();
    }).then(function(hostCount) {
      hostCount = hostCount.toNumber()
      console.log("Host Count: ", hostCount)

      var candidatesResults = $("#candidatesResults");
      candidatesResults.empty();

      var candidatesSelect = $('#candidatesSelect');
      candidatesSelect.empty();

      for (var i = 0; i < hostCount; i++) {
        storageInstance.hosts(i).then(function(candidate) {
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
      return storageInstance.isHost(App.account);
    }).then(function(isHost){
      if (isHost) {
        $('form').hide();
      }
      loader.hide();
      content.show();
    }).catch(function(error) {
      console.warn(error);
    });
  },

  addHost: function() {
    var name = document.getElementById("name").value;
    var port = document.getElementById("port").value;
    var ip = document.getElementById("ip").value;
    var diskspace = document.getElementById("diskspace").value;
    App.contracts.Storage.deployed().then(function(instance) {
      return instance.addHost(name, parseInt(port), ip, parseInt(diskspace), { from: App.account });
    }).then(function(result) {
      // Wait for votes to update
      $("#content").hide();
      $("#loader").show();
    }).catch(function(err) {
      console.error(err);
    });
  },

  selectHost: function() {
    var candidateId = $('#candidatesSelect').val();
    App.contracts.Storage.deployed().then(function(instance) {
      return instance.storeInHost(candidateId, { from: App.account });
    }).then(function(result) {
      // Wait for votes to update
      $("#content").hide();
      $("#loader").show();
    }).catch(function(err) {
      console.error(err);
    });
  }
};

$(function() {
  $(window).load(function() {
    App.init();
  });
});