pragma solidity ^0.4.23;

import "./SafeMathLib.sol";

library ETHChannelLibrary
{
    using SafeMathLib for uint;

    struct ETHChannelData
    {
        address userAddress_;
        address signerAddress_;
        address recipientAddress_;
        uint256 owingRecipient;
        uint closedBlock_;
        uint closedNonce_;
    }

    event LogChannelSettled(uint blockNumber, address user);
    event CloseTest(address addr);

    modifier isSufficientBalance(uint256 amount, address channelAddress)
    {
        require(amount <= address(channelAddress).balance);
        _;
    }

    modifier channelAlreadyClosed(ETHChannelData storage data)
    {
        require(data.closedBlock_ > 0);
        _;
    }

    modifier timeoutOver(ETHChannelData storage data)
    {
        require(data.closedBlock_ + 2 < block.number);
        _;
    }

    modifier channelIsOpen(ETHChannelData storage data)
    {
        require(data.closedBlock_ == 0);
        _;
    }

    modifier callerIsChannelParticipant(ETHChannelData storage data)
    {
        require(msg.sender==data.recipientAddress_||msg.sender==data.userAddress_);
        _;
    }

    /**
    * @notice Function to close the payment channel.
    * @param data The channel specific data to work on.
    * @param _nonce The nonce of the deposit. Used for avoiding replay attacks.
    * @param _amount The amount of wei claimed to be due to the receiver.
    * @param _v Cryptographic param v derived from the signature.
    * @param _r Cryptographic param r derived from the signature.
    * @param _s Cryptographic param s derived from the signature.
    */
    function close(
        ETHChannelData storage data,
        address _channelAddress,
        uint _nonce,
        uint256 _amount,
        uint8 _v,
        bytes32 _r,
        bytes32 _s)
        public
        channelIsOpen(data)
        callerIsChannelParticipant(data)
        isSufficientBalance(_amount, _channelAddress)
    {
        address signerAddress = recoverAddressFromHashAndParameters(_nonce,_amount,_r,_s,_v);
        require((signerAddress == data.signerAddress_ && data.recipientAddress_  == msg.sender) || (signerAddress == data.recipientAddress_  && data.signerAddress_==msg.sender));
        require(signerAddress!=msg.sender);
        data.owingRecipient = _amount;
        data.closedNonce_ = _nonce;
        data.closedBlock_ = block.number;
    }

    /**
    * @notice Function to close the payment channel without a signature.
    * @param data The channel specific data to work on.
    */
    function closeWithoutSignature(ETHChannelData storage data)
        public
        channelIsOpen(data)
        callerIsChannelParticipant(data)
    {
        data.closedBlock_ = block.number;
    }

    /**
    * @notice Function to contest the closing state of the payment channel. Will be able to be called for a time period (in blocks) given by timeout after closing of the channel.
    * @param data The channel specific data to work on.
    * @param _nonce The nonce of the deposit. Used for avoiding replay attacks.
    * @param _amount The amount of wei claimed to be due to the receiver.
    * @param _v Cryptographic param v derived from the signature.
    * @param _r Cryptographic param r derived from the signature.
    * @param _s Cryptographic param s derived from the signature.
    */
    function updateClosedChannel(
        ETHChannelData storage data,
        address _channelAddress,
        uint _nonce,
        uint256 _amount,
        uint8 _v,
        bytes32 _r,
        bytes32 _s)
        public
        callerIsChannelParticipant(data)
        channelAlreadyClosed(data)
        isSufficientBalance(_amount, _channelAddress)
    {
        address signerAddress = recoverAddressFromHashAndParameters(_nonce,_amount,_r,_s,_v);
        require(signerAddress == data.signerAddress_);
        //require that the nonce of this transaction be higher than the previous closing nonce
        require(_nonce > data.closedNonce_);
        data.closedNonce_ = _nonce;
        //update the amount
        data.owingRecipient = _amount;
    }

    /**
    * @notice After the timeout of the channel after closing has passed, can be called by either participant to withdraw funds.
    * @param data The channel specific data to work on.
    */
    function settle(ETHChannelData storage data, address _channelAddress, bool _returnFunds)
        public
        channelAlreadyClosed(data)
        timeoutOver(data)
        callerIsChannelParticipant(data)
        isSufficientBalance(data.owingRecipient, _channelAddress)
    {
        uint256 returnToUserAmount = address(_channelAddress).balance.minus(data.owingRecipient);
        uint256 owedAmount = data.owingRecipient;
        data.owingRecipient = 0;
        data.closedBlock_ = 0;
        data.closedNonce_ = 0;

        if(owedAmount > 0)
        {
            address(data.recipientAddress_).transfer(owedAmount);
        }

        if(returnToUserAmount > 0 && _returnFunds)
        {
            address(data.userAddress_).transfer(returnToUserAmount);
        }

        emit LogChannelSettled(block.number, data.userAddress_);
    }

    /**
    * @notice After the timeout of the channel after closing has passed, can be called by either participant to withdraw funds.
    * @param _nonce The nonce of the deposit. Used for avoiding replay attacks.
    * @param _amount The amount of wei claimed to be due to the receiver.
    * @param r Cryptographic param v derived from the signature.
    * @param s Cryptographic param r derived from the signature.
    * @param v Cryptographic param s derived from the signature.
    */
    function recoverAddressFromHashAndParameters(uint _nonce, uint256 _amount,bytes32 r,bytes32 s,uint8 v)
        internal view
        returns (address)
    {
        bytes memory prefix = "\x19Ethereum Signed Message:\n32";
        bytes32 msgHash = keccak256(this,_nonce,_amount);
        bytes32 prefixedHash = keccak256(prefix, msgHash);
        return ecrecover(prefixedHash, uint8(v), r, s);
    }
}
