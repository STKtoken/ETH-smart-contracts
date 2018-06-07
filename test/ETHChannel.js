var ETHChannel = artifacts.require('./ETHChannel.sol');
const assertRevert = require('./helpers/assertRevert');
var indexes = require('./helpers/ChannelDataIndexes');
contract("ETHChannel",(accounts,done)=>
{
    it("STK Channel is deployed ", function()
    {
        return ETHChannel.deployed().then(done).catch(done);
    });
    
    it("Should have STK channel user account as the first account",async() =>
    {
        const channel = await ETHChannel.deployed();
        const data  = await channel.channelData_.call();
        const address = data[indexes.USER_ADDRESS];
        
        assert.equal(address.toString(),accounts[0],'accounts are not equal');
    })
    
    it('Should have second account as Recipient account',async() =>
    {
        const channel = await ETHChannel.deployed();
        const data  = await channel.channelData_.call();
        const address  = data[indexes.RECIPIENT_ADDRESS];
        
        assert.equal(address.toString(),accounts[1],'accounts are not equal');
    })
    
    it('Should have Channel expiry time as 10',async() =>
    {
        const channel = await ETHChannel.deployed();
        const data  = await channel.channelData_.call();
        const timeout = data[indexes.TIMEOUT];
        
        assert.equal(timeout.valueOf(),10,'values are not equal');
    });
    
    it('Should Deposit 3 eth to the eth-channel',async() =>
    {
        const channel = await ETHChannel.deployed();
        const data  = await channel.channelData_.call();
        
        
        const transaction = {from: data[indexes.USER_ADDRESS], to: channel.address, value: web3.toWei(3, "ether")}
        web3.eth.sendTransaction(transaction); 
        
        const balance = await web3.eth.getBalance(channel.address);
        
        assert.equal(balance.valueOf(),web3.toWei(3, "ether"),'the deposited values are not equal');
    });
    
    it('Should close the channel without a signature',async () =>
    {
        const channel = await ETHChannel.deployed();
        await channel.closeWithoutSignature();
        const data = await channel.channelData_.call();
        const block = data[indexes.CLOSED_BLOCK];
        
        assert.isAbove(block.valueOf(),0,'closed block is not greater than zero');
    });
    
});