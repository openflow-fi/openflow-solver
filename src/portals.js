#! /usr/bin/env node
let sdk;
const { Sdk, utils: sdkUtils } = require("openflow-sdk");
const solverUtils = require("./utils");
require("dotenv").config();

const networkMapping = {
  1: "ethereum",
  250: "fantom",
  43114: "avalanche",
};

const portalsBaseUri = "https://api.portals.fi/v1/portal";

const quoteHandler = async (request) => {
  const { fromToken, toToken, fromAmount, chainId } = request;
  const slug = networkMapping[chainId];
  const quoteUrl = `${portalsBaseUri}/${slug}/estimate?sellToken=${fromToken}&buyToken=${toToken}&sellAmount=${fromAmount}&slippagePercentage=0.030&takerAddress=0x0000000000000000000000000000000000000000&validate=false`;
  const responseJson = await (await fetch(quoteUrl)).json();
  const max = 99;
  const min = 90;
  const multiplier = Math.floor(Math.random() * (max - min + 1) + min) / 100;
  const quote = {
    ...request,
    toAmount: Math.floor(responseJson.buyAmount * multiplier),
  };
  sdk.respondToQuoteRequest(quote);
};

const fillHandler = async (order) => {
  const slug = networkMapping[order.chainId];
  const {
    message: { fromToken, toToken, fromAmount },
  } = order;
  const estimateUrl = `${portalsBaseUri}/${slug}?sellToken=${fromToken}&buyToken=${toToken}&sellAmount=${fromAmount}&slippagePercentage=0.05&takerAddress=0x0000000000000000000000000000000000000000&validate=false`;
  const responseJson = await (await fetch(estimateUrl)).json();
  const {
    tx: { to: target, data: executorData },
  } = responseJson;
  await solverUtils.signAndExecuteOrder(sdk, order, target, executorData);
};

const start = async () => {
  const options = {
    websocketUrl: "ws://localhost:9080",
    quoteHandler,
    fillHandler,
  };
  sdk = new Sdk(options);
  const authPayload = sdkUtils.generateAuthenticationPayload(
    process.env.PRIVATE_KEY
  );
  await sdk.connect(authPayload);
};

start();
