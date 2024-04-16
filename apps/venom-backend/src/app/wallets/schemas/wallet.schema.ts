import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type WalletDocument = Wallet & Document;

@Schema({
  timestamps: true,
  toJSON: {
    virtuals: true,
    transform: function (doc: any, ret: any) {
      delete ret._id;
      delete ret.__v;
      return ret;
    },
  },
})
export class Wallet {
  @Prop({ required: true, type: String })
  walletAddress: string;

  @Prop({ required: true, type: String })
  transactionHash: string;

  createdAt?: Date;
  updatedAt?: Date;
}

export const WalletSchema = SchemaFactory.createForClass(Wallet).index({ walletAddress: 1 }, { unique: true });

WalletSchema.virtual('id').get(function (this: WalletDocument) {
  return this._id;
});
