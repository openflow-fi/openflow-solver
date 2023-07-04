#! /usr/bin/env node
let sdk;
require("dotenv").config();
const { Sdk } = require("openflow-sdk");
const { ethers } = require("ethers");
const dexesByChain = require("./data/dexes.json");

const uniswapV2AggregatorAbi = require("./abi/uniswapV2Aggregator.json");

const aggregatorByChain = {
  43114: "0x6542d494e67a6f3636a37F586f3A39713b2C7DCf",
};

const wNativeByChain = {
  43114: "0xB31f66AA3C1e785363F0875A1B74E27b85FD66c7",
};

let quotesById = {};

const quoteHandler = async (request) => {
  const { fromToken, toToken, fromAmount, chainId, quoteId } = request;
  const provider = sdk.getProvider(chainId);
  const uniswapV2AggregatorAddress = aggregatorByChain[chainId];
  const uniswapV2Aggregator = new ethers.Contract(
    uniswapV2AggregatorAddress,
    uniswapV2AggregatorAbi,
    provider
  );
  const dexes = dexesByChain[chainId];
  const wNative = wNativeByChain[chainId];
  dexes.forEach(async ({ router, name }) => {
    const [toAmount, path] = await uniswapV2Aggregator.getAmountOutFromRouter(
      wNative,
      router,
      fromAmount,
      fromToken,
      toToken
    );
    const toAmountScaled = ((toAmount * 995n) / 1000n).toString();
    const quote = {
      ...request,
      toAmount: toAmountScaled,
      protocol: name,
    };
    if (toAmount > 0) {
      if (!quotesById[quoteId]) {
        quotesById[quoteId] = {};
      }
      quotesById[quoteId][toAmountScaled] = { router, path };
      sdk.respondToQuoteRequest(quote);
    }
  });
};

const fillHandler = async (order) => {
  const {
    chainId,
    message: { fromAmount, toAmount, fromToken, toToken },
    quoteId,
  } = order;
  const provider = sdk.getProvider(chainId);
  const uniswapV2AggregatorAddress = aggregatorByChain[chainId];
  const uniswapV2Aggregator = new ethers.Contract(
    uniswapV2AggregatorAddress,
    uniswapV2AggregatorAbi,
    provider
  );

  const { router, path } = quotesById[quoteId][toAmount];
  const executorData = uniswapV2Aggregator.interface.encodeFunctionData(
    "executeOrder(address,address[],uint256,uint256)",
    [router, path, fromAmount, toAmount]
  );
  await sdk.executeOrder(order, uniswapV2AggregatorAddress, executorData);
};

const start = async () => {
  const options = {
    websocketUrl: process.env.WEBSOCKET_URL,
    privateKey: process.env.PRIVATE_KEY,
    quoteHandler,
    fillHandler,
  };
  sdk = new Sdk(options);
  await sdk.connect();
};

start();
