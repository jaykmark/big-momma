const Web3 = require('web3');
const web3 = new Web3('https://mainnet.infura.io/v3/6bd98480e62e4ab199a676d19debbfca');
const axios = require('axios');
const CRYPTO_KITTIES_ADDRESS = '0x06012c8cf97BEaD5deAe237070F9587f8E7A266d';
const CRYPTO_KITTIES_ABI_URL = 'https://api.etherscan.io/api?module=contract&action=getabi&address=0x06012c8cf97bead5deae237070f9587f8e7a266d';

const MAX_BATCH_SIZE = 5000;

const main = async (startingBlock, endingBlock) => {
  const cryptoKittiesAbi = await fetchContractAbi(CRYPTO_KITTIES_ABI_URL);
  const cryptoKittiesContract = new web3.eth.Contract(cryptoKittiesAbi, CRYPTO_KITTIES_ADDRESS);
  const cryptoKittyBirthEvents = await queryPastEventsByType(cryptoKittiesContract, 'Birth', startingBlock, endingBlock);

  console.log(`Total births between ${startingBlock} and ${endingBlock} = ${cryptoKittyBirthEvents.length} \n`);

  const cryptoKittyBirthFreqMap = countKittyBirthsFreqById(cryptoKittyBirthEvents);
  const bigMommaId = convertFreqMapToArrayAndSortToFindBigMommaId(cryptoKittyBirthFreqMap);
  const bigMommaDetails = await getKittyDetailsById(cryptoKittiesContract, bigMommaId);

  console.log(`Big Momma Details:
  - Birth Timestamp: ${bigMommaDetails.birthTime}
  - Generation: ${bigMommaDetails.generation}
  - Genes: ${bigMommaDetails.genes}`);

  return bigMommaDetails;
};

const fetchContractAbi = async (url) => {
  try {
    const res = await axios.get(url);
    const contractAbi = JSON.parse(res.data.result);
    return contractAbi;
  } catch (err) {
    throw new Error(err);
  }
};

// Query in batches since Infura doesn't allow responses with 10,000+ events
const queryPastEventsByType = async (contract, eventType, startingBlock, endingBlock) => {
  try {
    const promises = [];
    let fromBlock = startingBlock;

    while (fromBlock < endingBlock) {
      toBlock = fromBlock + MAX_BATCH_SIZE < endingBlock ? fromBlock + MAX_BATCH_SIZE - 1 : endingBlock;
      promises.push(contract.getPastEvents(eventType, { fromBlock, toBlock }));
      fromBlock += MAX_BATCH_SIZE;
    }

    const resolvedPromises = await Promise.all(promises);
    // We get back a 2D array by batch, so we need to flatten the array before returning
    return resolvedPromises.reduce((acc, currentValue) => acc.concat(...currentValue), []);
  } catch (err) {
    throw new Error(err);
  }
};

const countKittyBirthsFreqById = (kittyBirthEvents) => {
  const kittyBirthEventsMap = new Map();

  kittyBirthEvents.forEach((birth) => {
    const { matronId } = birth.returnValues;

    if (kittyBirthEventsMap.has(matronId)) {
      const kittyBirthCount = kittyBirthEventsMap.get(matronId);
      kittyBirthEventsMap.set(matronId, kittyBirthCount + 1);
    } else {
      kittyBirthEventsMap.set(matronId, 1);
    }
  });

  return kittyBirthEventsMap;
};

const convertFreqMapToArrayAndSortToFindBigMommaId = (kittyBirthFreqMap) => {
  const kittyBirthEventsArray = Array.from(kittyBirthFreqMap).map(([kittyId, births]) => {
    return { kittyId, births };
  });

  kittyBirthEventsArray.sort((a, b) => b.births - a.births);

  console.log(`Top 5 Mommas:
    1) ID: ${kittyBirthEventsArray[0].kittyId}, Births: ${kittyBirthEventsArray[0].births}
    2) ID: ${kittyBirthEventsArray[1].kittyId}, Births: ${kittyBirthEventsArray[1].births}
    3) ID: ${kittyBirthEventsArray[2].kittyId}, Births: ${kittyBirthEventsArray[2].births}
    4) ID: ${kittyBirthEventsArray[3].kittyId}, Births: ${kittyBirthEventsArray[3].births}
    5) ID: ${kittyBirthEventsArray[4].kittyId}, Births: ${kittyBirthEventsArray[4].births}
    `);

  // Grab id of index 1 since index 0 is made up of gen0 Kitties with no matronId.
  const bigMommaId = kittyBirthEventsArray[1].kittyId;
  return bigMommaId;
};

const getKittyDetailsById = async (contract, kittyId) => {
  try {
    const res = await contract.methods.getKitty(kittyId).call();
    return res;
  } catch (err) {
    throw new Error(err);
  }
};

main(6607985, 7028323);
