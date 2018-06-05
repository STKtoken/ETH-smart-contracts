const STKChannel = artifacts.require('./STKChannel.sol');
const Web3 = require('web3'); 
const ethUtil = require('ethereumjs-util');
const assertRevert = require('./helpers/assertRevert');
const zeppelin = require("./helpers/zeppelin")
const indexes = require('./helpers/channelDataIndexes');
const closingHelper = require('./helpers/channelClosingHelper')

contract("STKChannelClosing", accounts =>
{
    if (typeof web3 !== 'undefined') {
        web3 = new Web3(web3.currentProvider);
    } else {
        // set the provider you want from Web3.providers
        web3 = new Web3(new Web3.providers.HttpProvider("http://localhost:8545"));
    }
    const userAddress = accounts[0]
    const stackAddress = accounts[1]
    const gas = 1000000; 
    const nonChannelPart = Buffer.from('c88b703fb08cbea894b6aeff5a544fb92e78a18e19814cd85da83b71f772aa6c', 'hex')
    const signersPk = Buffer.from('ee15654fe40e9666ed0f952747067dec94d23fe30d1b2e3fd2fcd2523d3a5331', 'hex')
    
    it('Should deposit 0.5 eth into the ETH-Payment Channel',async()=> {
        const channel = await STKChannel.deployed();
        web3.eth.sendTransaction({from: userAddress, to: channel.address, value: web3.toWei(0.5, "ether"), gasPrice: gas});
        const balance = web3.eth.getBalance(channel.address); 
        
        assert.equal(balance,web3.toWei(0.5, "ether"),'the deposited values are not equal');
    })

        
    
})


