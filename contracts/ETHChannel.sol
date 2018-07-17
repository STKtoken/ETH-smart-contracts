pragma solidity ^0.4.23;

import "./ETHLibrary.sol";
/**
Payment Channel between two parties that allows multiple deposits.
Once closed, there is a contest period which allows state updates.
*/
contract ETHChannel
{
    using ETHLibrary for ETHLibrary.ETHChannelData;
    /**
     * Storage variables
     */
    ETHLibrary.ETHChannelData public channelData_;

    event LogChannelOpened(address from, address to, uint blockNumber);
    event LogChannelClosed(uint blockNumber, address closer, uint256 amount);
    event LogDeposited(address depositingAddress, uint256 amount);
    event LogChannelContested(uint256 amount, address caller);
    /**
     * @dev Contract constructor
     * @param _from The user address in the contract.
     * @param _addressOfSigner The signer address in the contract.
     */
    constructor (
        address _from,
        address _addressOfSigner, 
        uint _timeout)
        public
    {
        channelData_.userAddress_ = _from;
        channelData_.signerAddress_ = _addressOfSigner;
        channelData_.recipientAddress_ = msg.sender;
        channelData_.timeout_ = _timeout; 
        emit LogChannelOpened(channelData_.userAddress_, channelData_.recipientAddress_, block.number);
    }

    /**
    * @notice Function to close the payment channel.
    * @param _nonce The nonce of the deposit. Used for avoiding replay attacks.
    * @param _amount The amount of wei claimed to be due to the receiver.
    * @param _v Cryptographic param v derived from the signature.
    * @param _r Cryptographic param r derived from the signature.
    * @param _s Cryptographic param s derived from the signature.
    */
    function close(
        bool _refundAmount,
        uint _nonce,
        uint256 _amount,
        uint8 _v,
        bytes32 _r,
        bytes32 _s)
        external
    {
        channelData_.close(address(this), _refundAmount, _nonce, _amount, _v,_r,_s);
        emit LogChannelClosed(block.number, msg.sender, _amount);
    }

    /**
    * @notice Function to close the payment channel without a signature.
    */
    function closeWithoutSignature()
        external
    {
        channelData_.closeWithoutSignature();
        emit LogChannelClosed(block.number, msg.sender, channelData_.owingRecipient);
    }

    /**
    * @notice Function to contest the closing state of the payment channel. Will be able to be called for a time period (in blocks) given by timeout after closing of the channel.
    * @param _nonce The nonce of the deposit. Used for avoiding replay attacks.
    * @param _amount The amount of wei claimed to be due to the receiver.
    * @param _v Cryptographic param v derived from the signature.
    * @param _r Cryptographic param r derived from the signature.
    * @param _s Cryptographic param s derived from the signature.
    */
    function updateClosedChannel(
        uint _nonce,
        uint _amount,
        uint8 _v,
        bytes32 _r,
        bytes32 _s)
        external
    {
        channelData_.updateClosedChannel(address(this), _nonce, _amount, _v, _r, _s);
        emit LogChannelContested(_amount, msg.sender);
    }

    /**
    * @notice After the timeout of the channel after closing has passed, can be called by either participant to withdraw funds.
    */
    function settle()
        external
    {
        channelData_.settle(address(this));
    }

    function getBalance () public view returns (uint balance)
    {
        return address(this).balance;
    }

    //Fallback function for user to send funds
    function() public payable
    {
    }

}
