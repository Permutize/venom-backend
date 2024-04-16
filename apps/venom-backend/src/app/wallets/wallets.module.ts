import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';

import { Wallet, WalletSchema } from './schemas/wallet.schema';
import { WalletResolver } from './wallet.resolver';
import { WalletService } from './wallet.service';

@Module({
  imports: [
    MongooseModule.forFeature([{ name: Wallet.name, schema: WalletSchema }]),
  ],
  controllers: [],
  providers: [WalletService, WalletResolver],
  exports: [],
})
export class WalletModule { }
