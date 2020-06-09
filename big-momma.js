const Web3 = require('web3');
const web3 = new Web3('https://mainnet.infura.io/v3/6bd98480e62e4ab199a676d19debbfca');
const axios = require('axios');
const cryptoKittiesAddress = '0x06012c8cf97BEaD5deAe237070F9587f8E7A266d';
const cryptoKittiesAbiUrl = 'https://api.etherscan.io/api?module=contract&action=getabi&address=0x06012c8cf97bead5deae237070f9587f8e7a266d';

const main = async (startingBlock, endingBlock) => {
  try {
    const cryptoKittiesAbi = await fetchContractAbi(cryptoKittiesAbiUrl);
    const cryptoKittiesContract = new web3.eth.Contract(cryptoKittiesAbi, cryptoKittiesAddress);
    const cryptoKittyBirthEvents = await queryPastEventsByType(cryptoKittiesContract, 'Birth', startingBlock, endingBlock);
    console.log(`Total Births: ${cryptoKittyBirthEvents.length}`);
    const cryptoKittyBirthFreqMap = countKittyBirthsFreqById(cryptoKittyBirthEvents);
    const bigMommaId = convertFreqMapToArrayAndFindBigMommaId(cryptoKittyBirthFreqMap);
    const bigMommaDetails = await getKittyDetailsById(cryptoKittiesContract, bigMommaId);
    console.log("bigMommaDetails: ", bigMommaDetails);
    return bigMommaDetails;
  } catch (err) {
    console.error(err);
  }
};

const fetchContractAbi = async (url) => {
  try {
    const res = await axios.get(url);
    const contractAbi = JSON.parse(res.data.result);
    return contractAbi;
  } catch (err) {
    console.error(err);
  }
};

// Query in batches of max 5000 blocks.
const queryPastEventsByType = async (contract, eventType, startingBlock, endingBlock) => {
  console.log(`Start Block: ${startingBlock} to End Block: ${endingBlock}`);
  const promises = [];
  let cursor = startingBlock;

  while (cursor < endingBlock) {
    batchEnd = cursor + 5000 < endingBlock ? cursor + 4999 : endingBlock;
    promises.push(contract.getPastEvents(eventType, {
      fromBlock: cursor,
      toBlock: batchEnd,
    }));
    cursor += 5000;
  }
  const resolvedPromises = await Promise.all(promises);
  return resolvedPromises.reduce((acc, currentValue) => acc.concat(...currentValue), []);
};

const countKittyBirthsFreqById = kittyBirthEvents => {
  let countKittyBirths = 0;
  const kittyBirthEventsMap = {};

  kittyBirthEvents.forEach(birth => {
    countKittyBirths += 1;
    if (birth.returnValues.matronId !== '0') {
      // Store frequency of births by kittyID in map
      if (kittyBirthEventsMap[birth.returnValues.matronId]) {
        kittyBirthEventsMap[birth.returnValues.matronId] += 1;
      } else {
        kittyBirthEventsMap[birth.returnValues.matronId] = 1;
      }
    }
  });

  return kittyBirthEventsMap;
};

const convertFreqMapToArrayAndFindBigMommaId = (kittyBirthFreqMap) => {
  const kittyBirthEventsArray = [];

  for (let [kittyId, births] of Object.entries(kittyBirthFreqMap)) {
    kittyBirthEventsArray.push([kittyId, births]);
  }

  kittyBirthEventsArray.sort((a, b) => b[1] - a[1]);

  console.log(`
    Top 3 Mommas:
    1) ID: ${kittyBirthEventsArray[0][0]}, Births: ${kittyBirthEventsArray[0][1]}
    2) ID: ${kittyBirthEventsArray[1][0]}, Births: ${kittyBirthEventsArray[1][1]}
    3) ID: ${kittyBirthEventsArray[2][0]}, Births: ${kittyBirthEventsArray[2][1]}`);

  const bigMommaId = kittyBirthEventsArray[0][0];
  return bigMommaId;
};

const getKittyDetailsById = async (contract, kittyId) => {
  const res = await contract.methods.getKitty(kittyId).call();
  return res;
};

main(6607985, 7028323);
