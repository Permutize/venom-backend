import { BadRequestException, Injectable, Logger, NotFoundException } from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import { Wallet, WalletDocument } from "./schemas/wallet.schema";
import mongoose from "mongoose";
import axios from "axios";
import { Address, Contract, ProviderRpcClient } from "everscale-inpage-provider";
import {
  EverscaleStandaloneClient,
  SimpleAccountsStorage,
  SimpleKeystore, Ed25519KeyPair, Account,
  EverWalletAccount,
  WalletV3Account
} from 'everscale-standalone-client/nodejs';
import { readFileSync } from "node:fs";
import path from "node:path";

@Injectable()
export class WalletService {
  private _provider: ProviderRpcClient;
  private readonly _senderAddress: string;
  private readonly _senderKeyPair: Ed25519KeyPair;
  private readonly _endpoint = "https://gql.venom.foundation/";
  private readonly _tokenAddress: string;
  private readonly _tokenRootABI: string;
  private readonly _tokenWalletABI: string;
  private readonly _transferAmount: string;
  private readonly _noRepeats: boolean = true;

  private readonly logger = new Logger(WalletService.name);

  constructor(
    @InjectModel(Wallet.name)
    private readonly walletModel: mongoose.Model<WalletDocument>,
  ) {
    this._senderAddress = process.env.SENDER_ADDRESS;
    this._senderKeyPair = {
      publicKey: process.env.SENDER_PUBLIC_KEY,
      secretKey: process.env.SENDER_SECRET_KEY
    }
    this._tokenAddress = process.env.TOKEN_ADDRESS;
    this._tokenRootABI =
      readFileSync(path.resolve(__dirname, "assets/contracts/TokenRoot.abi.json")).toString("utf8")

    this._tokenWalletABI =
      readFileSync(path.resolve(__dirname, "assets/contracts/TokenWallet.abi.json")).toString("utf8")

    this._transferAmount = process.env.TRANSFER_AMOUNT;

    this._noRepeats = !process.env.ENABLE_REPEATS;
  }

  public async verify(walletAddress?: string): Promise<string> {
    const doc = await this.walletModel.findOne({ walletAddress, tokenAddress: this._tokenAddress });
    return doc?.transactionHash;
  }

  public async claim(recipientAddress: string): Promise<string> {
    if (this._noRepeats) {
      const doc = await this.walletModel.findOne({ walletAddress: recipientAddress, tokenAddress: this._tokenAddress });
      if (doc) {
        throw new BadRequestException('Wallet already claimed');
      }
    }

    let transactionHash: string;

    try {
      const provider = await this.getProvider();

      const contractAddress = new Address(this._tokenAddress);
      const tokenRootContract = new Contract(provider, JSON.parse(this._tokenRootABI), contractAddress);

      // const tokenWalletData = await (tokenRootContract.methods as any).walletOf({ answerId: 0, walletOwner: recipientAddress }).call();

      // const tokenWalletAddress: Address = tokenWalletData.value0;
      // this.logger.debug(tokenWalletAddress);
      // if (!tokenWalletAddress) {
      //   this.logger.debug('Token wallet not found. Creating...');
      //   /** Create first */
      //   const data = await (tokenRootContract.methods as any).deployWallet({
      //     answerId: 0,
      //     walletOwner: recipientAddress,
      //     deployWalletValue: this._transferAmount,
      //   }).send({
      //     from: this._senderAddress,
      //     amount: '300000000',
      //   });
      //   this.logger.debug('Token wallet created: ', data);
      // }
      // const tokenWalletContract = new Contract(provider, JSON.parse(this._tokenWalletABI), tokenWalletAddress);
      // const tokenWalletBalance = await (tokenWalletContract.methods as any).balance({ answerId: 0 }).call();

      // this.logger.debug(`Recipient wallet address: `, recipientAddress);
      // this.logger.debug('Recipient token wallet address: ', tokenWalletAddress.toString());
      // this.logger.debug('Recipient token wallet balance: ', tokenWalletBalance.value0);

      const senderTokenWalletData = await (tokenRootContract.methods as any).walletOf({ answerId: 0, walletOwner: this._senderAddress }).call();
      const senderTokenWalletAddress: Address = senderTokenWalletData.value0;
      const senderTokenWalletContract = new Contract(provider, JSON.parse(this._tokenWalletABI), senderTokenWalletAddress);
      const senderTokenWalletBalance = await (senderTokenWalletContract.methods as any).balance({ answerId: 0 }).call();

      this.logger.debug(`Sender wallet address: `, this._senderAddress);
      this.logger.debug('Sender token wallet address: ', senderTokenWalletAddress.toString());
      this.logger.debug('Sender token wallet balance: ', senderTokenWalletBalance.value0);

      const data = await (senderTokenWalletContract.methods as any).transfer({
        "amount": this._transferAmount,
        "recipient": recipientAddress,
        "deployWalletValue": "100000000",
        "remainingGasTo": this._senderAddress,
        "notify": true,
        "payload": "te6ccgEBAQEAAgAAAA=="
      }).send({
        from: this._senderAddress,
        amount: '300000000',
      });

      transactionHash = await this.getLastTransaction(this._senderAddress);
      this.logger.debug('Transaction hash: ', transactionHash);
      await this.saveTransaction(recipientAddress, transactionHash);
    } catch (error) {
      this.logger.error(error);
      throw new BadRequestException(`Claim failed: ${error.message}`);
    }
    return transactionHash;
  }

  public async contractAddress() {
    return this._tokenAddress;
  }

  private async getProvider(): Promise<ProviderRpcClient> {
    if (!this._provider) {

      const keystore = new SimpleKeystore({ '0': this._senderKeyPair });
      const everWalletAccount = new EverWalletAccount(new Address(this._senderAddress));
      const accountsStorage = new SimpleAccountsStorage({
        defaultAccount: everWalletAccount.address,
        entries: [everWalletAccount]
      });

      const provider = new ProviderRpcClient({
        fallback: () =>
          EverscaleStandaloneClient.create({
            // message: {
            //   timeout: 1000,
            // },
            keystore,
            accountsStorage,
            connection: {
              id: 1002,
              type: 'graphql',
              data: {
                endpoints: [this._endpoint]
              }
            }
          })
      });
      await provider.ensureInitialized();

      await provider.requestPermissions({
        permissions: ['basic'],
      });

      this._provider = provider;
    }
    return this._provider;
  }

  private async saveTransaction(walletAddress: string, transactionHash: string): Promise<void> {
    await this.walletModel.updateOne(
      { walletAddress, tokenAddress: this._tokenAddress },
      { walletAddress, transactionHash, tokenAddress: this._tokenAddress },
      { upsert: true }
    );
  }

  private async getLastTransaction(walletAddress: string): Promise<string> {
    const response = await axios.post('https://api.venomscan.com/v1/transactions/list', {
      "includeAccounts": [walletAddress],
      "txTypes": ["Ordinary"],
      "limit": 10,
      "offset": 0,
      "ordering": { "column": "time", "direction": "DESC" }
    });
    const data = response.data;
    const transaction = data.find((tx: any) => tx.methodName === 'sendTransaction');
    return transaction.hash;
  }

}
