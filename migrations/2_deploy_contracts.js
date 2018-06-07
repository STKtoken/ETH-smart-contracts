var STKChannel = artifacts.require("./STKChannel.sol");
var SafeMathLib = artifacts.require("./SafeMathLib.sol");
var STKChannelLibrary = artifacts.require('./STKChannelLibrary.sol');

var fs = require('fs');
var addressFile = './deployedAddress.json';
var file = require(addressFile);

module.exports = function(deployer, network, accounts)
{
  
  if(network === "development") {
    deployer.deploy(SafeMathLib).then(function()
    {
      return deployer.link(SafeMathLib,STKChannelLibrary).then(function()
      {
        return deployer.deploy(STKChannelLibrary).then(function()
        {
            return deployer.link(STKChannelLibrary,STKChannel).then(function()
            {
              return deployer.deploy(STKChannel, web3.eth.accounts[0], web3.eth.accounts[2], 10, {from: web3.eth.accounts[1]}).then(function(){
                  fs.writeFile(addressFile, JSON.stringify(file), function (err) {
                  file.STKChannelAddress = STKChannel.address;
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
      return deployer.link(SafeMathLib,STKChannelLibrary).then(function()
      {
        return deployer.deploy(STKChannelLibrary).then(function()
        {
        });
      });
    });
  }
}
