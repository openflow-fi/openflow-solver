const { ethers } = require("ethers");

module.exports = {
  async signAndExecuteOrder(sdk, order, target, executorData) {
    console.log("Executing order", order);
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
