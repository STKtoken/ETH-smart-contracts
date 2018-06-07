var ETHChannel = artifacts.require("./ETHChannel.sol");
var SafeMathLib = artifacts.require("./SafeMathLib.sol");
var ETHChannelLibrary = artifacts.require('./ETHChannelLibrary.sol');

var fs = require('fs');
var addressFile = './deployedAddress.json';
var file = require(addressFile);

module.exports = function(deployer, network, accounts)
{
  
  if(network === "development") {
    deployer.deploy(SafeMathLib).then(function()
    {
      return deployer.link(SafeMathLib,ETHChannelLibrary).then(function()
      {
        return deployer.deploy(ETHChannelLibrary).then(function()
        {
            return deployer.link(ETHChannelLibrary,ETHChannel).then(function()
            {
              return deployer.deploy(ETHChannel, web3.eth.accounts[0], web3.eth.accounts[2], 10, {from: web3.eth.accounts[1]}).then(function(){
                  fs.writeFile(addressFile, JSON.stringify(file), function (err) {
                  file.ETHChannelAddress = ETHChannel.address;
                  if (err) return console.log(err);
                  console.log('writing to ' + addressFile);
                });
              })
            });
        });
      });
    });
  } else {
    deployer.deploy(SafeMathLib).then(function()
    {
      return deployer.link(SafeMathLib,ETHChannelLibrary).then(function()
      {
        return deployer.deploy(ETHChannelLibrary).then(function()
        {
        });
      });
    });
  }
}
