const Web3 = require('web3');
const web3 = new Web3('https://mainnet.infura.io/v3/6bd98480e62e4ab199a676d19debbfca');
const axios = require('axios');
const cryptoKittiesAddress = '0x06012c8cf97BEaD5deAe237070F9587f8E7A266d';
const cryptoKittiesAbiUrl = 'https://api.etherscan.io/api?module=contract&action=getabi&address=0x06012c8cf97bead5deae237070f9587f8e7a266d';

const queryCryptoKitties = async () => {
  try {
    const cryptoKittiesAbi = await fetchContractAbi(cryptoKittiesAbiUrl);
    const contract = new web3.eth.Contract(cryptoKittiesAbi, cryptoKittiesAddress);
    const bigMommaId = await findBigMomma(contract, 6607985, 7028323)
    // getKittyDetails(contract, bigMommaId);
    // getKittyDetails(contract, 1);
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

const findBigMomma = async (contract, startingBlock, endingBlock) => {
  try {
    const totalBlocks = endingBlock - startingBlock;
    const batchesOfFiveThousand = Math.floor(totalBlocks / 5000);
    const batchedBlocks = batchesOfFiveThousand * 5000;
    const remainingBlocksAfterBatches = totalBlocks - batchedBlocks;
    const allKittyMommaBirths = new Map();
    let totalKittyBirths = 0;

    console.log(`Start Block: ${startingBlock} to End Block: ${endingBlock} => ${totalBlocks} Total Blocks`);

    console.log(`Querying blocks ${startingBlock} -> ${startingBlock + batchedBlocks - 1} in batches of 5000...`);
    // Query in batches of 5,000 blocks.
    for (let i = 0; i < batchedBlocks - 5000; i += 5000) {
      const kittyBirths = await contract.getPastEvents('Birth', {
        fromBlock: startingBlock + i,
        toBlock: startingBlock + i + 4999,
      })
      console.log(`Querying ${startingBlock + i} -> ${startingBlock + i + 4999}`)
      totalKittyBirths += countKittyBirthsFreq(kittyBirths, allKittyMommaBirths);
    }

    // Query remaining blocks.
    console.log(`Querying blocks ${startingBlock + batchedBlocks} -> ${startingBlock + batchedBlocks + remainingBlocksAfterBatches}`)

    const kittyBirths = await contract.getPastEvents('Birth', {
      fromBlock: startingBlock + batchedBlocks,
      toBlock: startingBlock + batchedBlocks + remainingBlocksAfterBatches,
    })
    totalKittyBirths += countKittyBirthsFreq(kittyBirths, allKittyMommaBirths);

    console.log(`Total births: ${totalKittyBirths}`);

    let bigMommaId;
    const allKittyMommas = [];
    for (let [kittyId, births] of Object.entries(allKittyMommaBirths)) {
      // if (!bigMommaId || births > allKittyMommaBirths[bigMommaId]) {
      //   bigMommaId = kittyId;
      // }
      allKittyMommas.push([kittyId, births])
    }
    allKittyMommas.sort((a, b) => b[1] - a[1]);
    console.log(`
      Top 5 Mommas:
      1) ID: ${allKittyMommas[0][0]}, Births: ${allKittyMommas[0][1]}
      2) ID: ${allKittyMommas[1][0]}, Births: ${allKittyMommas[1][1]}
      3) ID: ${allKittyMommas[2][0]}, Births: ${allKittyMommas[2][1]}
      4) ID: ${allKittyMommas[3][0]}, Births: ${allKittyMommas[3][1]}
      5) ID: ${allKittyMommas[4][0]}, Births: ${allKittyMommas[4][1]}
    `)
    // return bigMommaId;
  } catch (err) {
    console.error(err);
  }
};

const countKittyBirthsFreq = (kittyBirths, allKittyMommaBirths) => {
  let totalKittyBirths = 0;

  kittyBirths.forEach((birth) => {
    totalKittyBirths += 1;
    if (birth.returnValues.matronId != '0') {
      if (allKittyMommaBirths[birth.returnValues.matronId]) {
        allKittyMommaBirths[birth.returnValues.matronId] += 1;
      } else {
        allKittyMommaBirths[birth.returnValues.matronId] = 1;
      }
    }
  });
  return totalKittyBirths;
};

const getKittyDetails = (contract, kittyId) => {
  contract.methods.getKitty(kittyId).call((err, res) => {
    if (err) {
      console.error(err);
      return;
    }
    console.log(`
      Kitty's birth timestamp: ${res.birthTime} => ${new Date(res.birthTime * 1000)}
      Kitty's generation: ${res.generation}
      Kitty's genes: ${res.genes}
    `);
  });
};

queryCryptoKitties();
