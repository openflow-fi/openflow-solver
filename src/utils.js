const { ethers } = require("ethers");

/**
 * @notice Sign and execute an order directly (without using built-in SDK methods).
 * @dev While the Openflow SDK can technically be utilized without passing private key
 * in the constructor it is not recommended. After signing and filling an order
 * the solver should notify the SDK to ensure the end user receives a real-time order
 * status update. This logic is typically handled in the SDK's `executeOrder` method,
 * however, if desired this helper utility can be used instead.
 */
module.exports = {
  async signAndExecuteOrder(sdk, order, target, executorData) {
    const transaction = await sdk.generateTransaction(
      order,
      target,
      executorData
    );
    const provider = sdk.getProvider(order.chainId);
    const wallet = new ethers.Wallet(process.env.PRIVATE_KEY, provider);
    const walletTransaction = await wallet.populateTransaction(transaction);
    const signedTransaction = await wallet.signTransaction(walletTransaction);
    const transactionHash = ethers.keccak256(signedTransaction);

    // Notify user the order is being submitted
    sdk.orderSubmitted({ order, transactionHash });

    // Submit transaction
    await wallet.sendTransaction(transaction).catch((err) => {
      log("Error sending transaction", err);
      return;
    });

    // Notify user the order is filled
    sdk.orderFilled({ order, transactionHash });
  },
};
