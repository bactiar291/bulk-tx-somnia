const { ethers } = require("ethers");
const fs = require("fs");
const readline = require("readline");
const ora = require("ora");
const chalk = require("chalk");
const cliProgress = require("cli-progress");

const config = JSON.parse(fs.readFileSync("config.json", "utf8"));
const pk = fs.readFileSync("pk.txt", "utf8").trim();
const provider = new ethers.JsonRpcProvider(config.rpc);
const wallet = new ethers.Wallet(pk, provider);

const erc20Abi = [
  "function transfer(address to, uint256 amount) external returns (bool)",
  "function decimals() view returns (uint8)",
  "function balanceOf(address owner) view returns (uint256)"
];

const sleep = (ms) => new Promise((res) => setTimeout(res, ms));

function ask(question) {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });
  return new Promise((resolve) => rl.question(question, (ans) => {
    rl.close();
    resolve(ans);
  }));
}

(async () => {
  try {
    console.log(chalk.blue.bold("\n🚀 BULKING TRANSFER TOKEN ERC-20 TANPA DESIMAL"));

    const targetInput = await ask("🎯 Masukkan TOTAL TOKEN yang ingin dikirim (misal: 1000): ");
    const targetAmountUser = parseInt(targetInput.trim());

    if (isNaN(targetAmountUser) || targetAmountUser <= 0) {
      console.log(chalk.red("❌ Jumlah tidak valid. Harus angka lebih dari 0."));
      return;
    }

    const caList = fs.readFileSync("ca.txt", "utf8").trim().split("\n").filter(Boolean);
    if (caList.length === 0) {
      console.log(chalk.red("❌ File ca.txt kosong atau tidak ditemukan."));
      return;
    }

    for (const ca of caList) {
      const token = new ethers.Contract(ca, erc20Abi, wallet);
      const decimals = await token.decimals();
      const targetAmount = ethers.parseUnits(targetAmountUser.toString(), decimals);
      const balance = await token.balanceOf(wallet.address);

      if (balance < targetAmount) {
        console.log(chalk.yellow(`⚠️  Token ${ca} dilewati: balance tidak cukup (${ethers.formatUnits(balance, decimals)} < ${targetAm;
        continue;
      }

      let sentAmount = ethers.parseUnits("0", decimals);
      const outputFile = `generated-${ca}.txt`;
      fs.writeFileSync(outputFile, "");

      console.log(chalk.cyan.bold(`\n💸 Mulai transfer untuk token ${ca}`));

      const bar = new cliProgress.SingleBar({
        format: "Progress |{bar}| {percentage}% || {value}/{total} tokens",
        barCompleteChar: "\u2588",
        barIncompleteChar: "\u2591",
        hideCursor: true,
      }, cliProgress.Presets.shades_classic);

      bar.start(Number(ethers.formatUnits(targetAmount, decimals)), 0);

      while (sentAmount < targetAmount) {
        const newWallet = ethers.Wallet.createRandom();
        const address = newWallet.address;
        fs.appendFileSync(outputFile, `${address}\n`);

        const randomWhole = Math.floor(Math.random() * (242 - 98 + 1)) + 98;
        let amountToSend = ethers.parseUnits(randomWhole.toString(), decimals);

        const remaining = targetAmount - sentAmount;
        if (amountToSend > remaining) amountToSend = remaining;

        const spinner = ora(`🚚 Transfer ${ethers.formatUnits(amountToSend, decimals)} ke ${address}`).start();
        const tx = await token.transfer(address, amountToSend);
        await tx.wait();
        spinner.succeed(`✅ TX sukses ke ${address} (${ethers.formatUnits(amountToSend, decimals)})`);
        console.log(chalk.green(`🔗 TX Hash: ${tx.hash}`));

        sentAmount += amountToSend;
        bar.update(Number(ethers.formatUnits(sentAmount, decimals)));
        await sleep(3000);
      }

      bar.stop();
      console.log(chalk.green.bold(`📦 Transfer selesai untuk token ${ca}. Alamat disimpan di '${outputFile}'\n`));
    }

    console.log(chalk.green.bold("✅ Semua transfer token selesai!\n"));
  } catch (err) {
    console.error(chalk.red("❌ Error:"), err.message);
  }
})();
