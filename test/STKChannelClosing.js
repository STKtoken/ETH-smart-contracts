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

    
    it('Should fail when user tries to  close the channel with a valid signature but amount is above the deposited amount',async()=>
    {
        const nonce = 1;
        const amount = parseInt(web3.toWei(1, "ether"));
        const channel = await STKChannel.deployed();
        const cryptoParams = closingHelper.getClosingParameters(nonce,amount,STKChannel.address,signersPk);
        try
        {
            gasRecord += channel.close.estimateGas(nonce,amount,cryptoParams.v,cryptoParams.r,cryptoParams.s);

            await channel.close(nonce,amount,cryptoParams.v,cryptoParams.r,cryptoParams.s)
            assert.fail('The amount should have caused an exception to be thrown');
        }
        catch(error)
        {
            assertRevert(error);
        }
    })    
    
    it('Should fail when user tries to close the channel with a self signed signature',async()=>
    {
        const nonce = 1;
        const amount = parseInt(web3.toWei(0,"ether")); 
        const cryptoParams = closingHelper.getClosingParameters(nonce,amount,STKChannel.address,signersPk);
        const channel = await STKChannel.deployed();
        try
        {
            gasRecord += channel.close.estimateGas(nonce,amount,cryptoParams.v,cryptoParams.r,cryptoParams.s)
            
            await channel.close(nonce,amount,cryptoParams.v,cryptoParams.r,cryptoParams.s)
            assert.fail('The signature should have caused an exception to be thrown');
        }
        catch(error)
        {
            assertRevert(error);
        }
    })    
    
    it('Should fail when non-channel participant tries to close the channel with a valid signature',async()=>
    {
        const nonce = 1;
        const amount = parseInt(web3.toWei(2, "ether"));
        const cryptoParams = closingHelper.getClosingParameters(nonce,amount,STKChannel.address,nonChannelPart);
        const channel = await STKChannel.deployed();
        try
        {
            await channel.close(nonce,amount,cryptoParams.v,cryptoParams.r,cryptoParams.s,{from:accounts[3]});
            assert.fail('The sender should have caused an exception to be thrown');
        }
        catch(error)
        {
            assertRevert(error);
        }
    })    
    
    it('Should fail when user tries to close channel with a signature signed by someone else (invalid signature)',async()=>
    {
        const nonce = 1;
        const amount = parseInt(web3.toWei(1, "ether"));
        const cryptoParams = closingHelper.getClosingParameters(nonce,amount,STKChannel.address,nonChannelPart);
        const channel = await STKChannel.deployed();
        try
        {
            await channel.close(nonce,amount,cryptoParams.v,cryptoParams.r,cryptoParams.s)
            assert.fail('The signature should have caused an exception to be thrown');
        }
        catch(error)
        {
            assertRevert(error);
        }
    })    
    
    it('Should allow user to close the channel with a valid signature',async()=>
    {
        const nonce = 1;
        var amount = parseInt(web3.toWei(0, "ether"));
        console.log("amount: " + amount) 
        const cryptoParams = closingHelper.getClosingParameters(nonce,amount,STKChannel.address,signersPk);
        
        const channel = await STKChannel.deployed();
        
        const cost = await  channel.close.estimateGas(nonce,amount,cryptoParams.v,cryptoParams.r,cryptoParams.s, {from:stackAddress});
        console.log('estimated gas cost of closing the channel: ' + cost );
        
        await channel.close(nonce,amount,cryptoParams.v,cryptoParams.r,cryptoParams.s, {from:stackAddress});

        const data  = await channel.channelData_.call();

        const block = data[indexes.CLOSED_BLOCK];
        const address = data[indexes.CLOSING_ADDRESS];

        assert.isAbove(block.valueOf(),0,'The closed block should not be zero or below')
        assert.equal(address, stackAddress,'the closing address should be set if the channel has been closed');     
    })
    
    it('Should fail when Channel recipient contests the closing of the channel but the amount is above the deposited amount',async()=>
    {
        const nonce = 2 ;
        const amount = parseInt(web3.toWei(5, "ether"));
        const cryptoParams = closingHelper.getClosingParameters(nonce,amount,STKChannel.address,signersPk);
        const address = STKChannel.address ;
        const channel = await STKChannel.deployed();
        try
        {
            await channel.updateClosedChannel(nonce,amount,cryptoParams.v,cryptoParams.r,cryptoParams.s,{from:stackAddress});
            assert.fail('This should have thrown due to incorrect amount ');
        }
        catch(error)
        {
            assertRevert(error);
        }
    })
    
    it('Should allow channel recipient to contest the closing of the channel ',async()=>
    {
        const nonce = 2 ;
        const amount = parseInt(web3.toWei(0, "ether"));
        const cryptoParams = closingHelper.getClosingParameters(nonce,amount,STKChannel.address,signersPk);
        const channel = await STKChannel.deployed();
        
        const cost  = await channel.updateClosedChannel.estimateGas(nonce,amount,cryptoParams.v,cryptoParams.r,cryptoParams.s,{from:stackAddress});
        console.log('estimated gas cost of contesting the channel after closing: ' + cost );
        
        await channel.updateClosedChannel(nonce,amount,cryptoParams.v,cryptoParams.r,cryptoParams.s,{from:stackAddress});

        const data  = await channel.channelData_.call();
        const newAmount = data[indexes.AMOUNT_OWED];
        assert.equal(amount,newAmount,'Amount should be updated');
        const newNonce = data[indexes.CLOSED_NONCE];
        assert.equal(nonce,newNonce,'Nonce should be updated');
    })    
    
    it('Should not be able to close the channel after it has already been closed',async()=>
    {
        const channel = await STKChannel.deployed();
        try
        {
            await channel.closeWithoutSignature();
            assert.fail('Closing should have thrown an error');
        }
        catch(error)
        {
            assertRevert(error);
        }
    })    

    it('Should not be able to update the channel once closed as closing address',async() =>
    {
        const nonce = 3;
        var amount = parseInt(web3.toWei(3, "ether")); 
        const cryptoParams = closingHelper.getClosingParameters(nonce,amount,STKChannel.address,signersPk);
        
        const channel = await STKChannel.deployed();
        try
        {
            await channel.updateClosedChannel(nonce,amount,cryptoParams.v,cryptoParams.r,cryptoParams.s,{from: stackAddress});
            assert.fail('Updating channel should have thrown');
        }
        catch(error)
        {
            assertRevert(error);
        }
    }) 
    
    it('Should not be able to update channel with lower nonce value ',async()=>
    {
        const nonce = 1 ;
        var amount = parseInt(web3.toWei(3, "ether")); 
        const cryptoParams = closingHelper.getClosingParameters(nonce,amount,STKChannel.address,signersPk);
        const channel = await STKChannel.deployed();
        try
        {
            await channel.updateClosedChannel(nonce,amount,cryptoParams.v,cryptoParams.r,cryptoParams.s,{from: stackAddress});
            assert.fail('The channel should not have updated');
        }
        catch(error)
        {
            assertRevert(error);
        }
    })

    it('Should be able to update the state of the channel with a higher nonce as non-closing address',async()=>
    {
        const nonce = 4;
        const amount = parseInt(web3.toWei(0.2, "ether")); 
        const cryptoParams = closingHelper.getClosingParameters(nonce,amount,STKChannel.address,signersPk);
        const channel = await STKChannel.deployed();
        
        await channel.updateClosedChannel(nonce,amount,cryptoParams.v,cryptoParams.r,cryptoParams.s,{from: stackAddress});
        const data  = await channel.channelData_.call();
        const newAmount = data[indexes.AMOUNT_OWED];
        
        assert.equal(amount,newAmount,'Amount should be updated');
        const newNonce = data[indexes.CLOSED_NONCE];
        assert.equal(nonce,newNonce,'Nonce should be updated');
    })      

    it('Should fail when we try to settle the address before the time period is expired',async()=>
    {
        const address = STKChannel.address ;
        const channel = await STKChannel.deployed();
        try
        {
            await channel.settle();
            assert.fail('This should have thrown');
        }
        catch(error)
        {
            assertRevert(error);
        }
    })        
    
<<<<<<< Updated upstream:test/STKChannelClosing.js
=======
    it('Should transfer funds to user once channel has settled',async()=>
    {
        var gasUsed = 0; 
        const channel = await STKChannel.deployed();
        const data  = await channel.channelData_.call();
        const blocksToWait = data[indexes.TIMEOUT];
        const returnBalance = true;
        console.log('waiting for '+ blocksToWait.valueOf() + ' blocks');
        
        for(i = 0;i<blocksToWait;i++)
        {
            var transaction = {from:web3.eth.accounts[5],to:web3.eth.accounts[6],gasPrice:100000000,value:web3.toWei(0.5, "ether")};
            web3.eth.sendTransaction(transaction);
        }
        const channelDeposit = await web3.eth.getBalance(channel.address);
        const oldStackBalance = await web3.eth.getBalance(stackAddress);
        const oldUserBalance = await web3.eth.getBalance(userAddress);
        const amountToBeTransferred = data[indexes.AMOUNT_OWED];
        const cost = await channel.settle.estimateGas(returnBalance);
        console.log('estimated gas cost of settling the channel: ' + cost );
        
        var settleHash = await channel.settle(true, {from: stackAddress, gasPrice: 1000000});
        var gasUsed = settleHash['receipt']['cumulativeGasUsed']; 
        
        const newUserBalance = await web3.eth.getBalance(userAddress);
        const newStackBalance = await web3.eth.getBalance(stackAddress);
        
        const expectedStackBal = parseInt(oldStackBalance.valueOf()) + parseInt(amountToBeTransferred.valueOf() - 1000000*gasUsed); 

        web3.eth.getBalance(stackAddress, function (error, result) {
            if (error) {
                assert.equal(false, true, "test failed to get updated amount in stack address"); 
                assertRevert(error); 
            } else {
                assert.equal(parseInt(result.valueOf()), parseInt(expectedStackBal.valueOf()), 'The stack account value should be credited');                        
                
            }
        })                
                
        const expectedUserBal = parseInt(oldUserBalance.valueOf()) + parseInt(channelDeposit.valueOf()) - parseInt(amountToBeTransferred.valueOf());       
        
        assert.equal(parseInt(newUserBalance.valueOf()),parseInt(expectedUserBal.valueOf()),'The User address should get back the unused eth');
    })
    
    it('Should be able to reset the state of the channel after settling',async()=>
    {
        const channel = await STKChannel.deployed();
        const data  = await channel.channelData_.call();
        
        const closingAddress = data[indexes.CLOSING_ADDRESS];
        const amountOwed = data[indexes.AMOUNT_OWED];
        const openedBlock = data[indexes.OPENED_BLOCK];
        const closedBlock = data[indexes.CLOSED_BLOCK];
        const closedNounce = data[indexes.CLOSED_NONCE];
        
        const currentBlockNumber = web3.eth.blockNumber;
        
        assert.equal(closingAddress.toString(),'0x0000000000000000000000000000000000000000','closing address are not equal');
        assert.equal(amountOwed.valueOf(),0,'The amount owned should be zero')
        assert.equal(openedBlock.valueOf(),currentBlockNumber,'opened block are not equal');
        assert.equal(closedBlock.valueOf(),0,'The closed block should be zero')
        assert.equal(closedNounce.valueOf(),0,'The closed nounce should be zero')
        
    })
    
    it('Should be able to have ETH remain in the channel after settling',async()=>
    {
        const channel = await STKChannel.deployed();
        
        transaction = {from: userAddress, to: channel.address, value: web3.toWei(0.2, "ether")}
        web3.eth.sendTransaction(transaction); 
        
        const balance = await web3.eth.getBalance(channel.address);
        
        const nonce = 5;
        const amount = parseInt(web3.toWei(0.1, "ether"));
        const cryptoParams = closingHelper.getClosingParameters(nonce,amount,STKChannel.address,signersPk);
        const cost = await  channel.close.estimateGas(nonce,amount,cryptoParams.v,cryptoParams.r,cryptoParams.s, {from:stackAddress});
        await channel.close(nonce,amount,cryptoParams.v,cryptoParams.r,cryptoParams.s, {from:stackAddress});
        const data  = await channel.channelData_.call();
        
        const blocksToWait = data[indexes.TIMEOUT];
        const returnBalance = false;
        console.log('waiting for '+ blocksToWait.valueOf() + ' blocks');
        
        for(i = 0;i<blocksToWait;i++)
        {
            var transaction = {from:web3.eth.accounts[5],to:web3.eth.accounts[6],gasPrice:1000000000,value: web3.toWei(0.1, "ether")};
            web3.eth.sendTransaction(transaction);
        }
        
        const channelDeposit = await web3.eth.getBalance(channel.address);
        const oldUserBalance = await web3.eth.getBalance(userAddress);
        const oldStackBalance = await web3.eth.getBalance(stackAddress);
        const oldChannelBalance = await web3.eth.getBalance(channel.address);
        const amountToBeTransferred = data[indexes.AMOUNT_OWED];

        var settleHash = await channel.settle(returnBalance, {from: stackAddress, gasPrice: 1000000});
        var gasUsed = settleHash['receipt']['cumulativeGasUsed']; 

        const newUserBalance = await web3.eth.getBalance(userAddress);
        const newChannelBalance = await web3.eth.getBalance(channel.address);

        web3.eth.getBalance(stackAddress, function (error, result) {
            if (error) {
                assert.equal(false, true, "test should have been able to get updated amount in stack address"); 
                assertRevert(error); 
            } else {
                var expectedStackBal = parseInt(oldStackBalance.valueOf()) + parseInt(amountToBeTransferred.valueOf()) - (1000000*gasUsed); 
                console.log(result); 
                console.log(expectedStackBal); 
                assert.equal(parseInt(result.valueOf()), expectedStackBal, 'The stack account value should be credited');
            }
        })            
                
        assert.equal(parseInt(newChannelBalance.valueOf()),parseInt(oldChannelBalance.valueOf()) - parseInt(amountToBeTransferred.valueOf()), 'Unspent eth should remain in the channel account');
        
        assert.equal(parseInt(newUserBalance.valueOf()),parseInt(oldUserBalance.valueOf()), 'The User address account value should remain the same');
    })    
    
>>>>>>> Stashed changes:test/STKChannelClosing.js
})


