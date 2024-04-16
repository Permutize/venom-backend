import { Resolver, Query, Args, Mutation } from "@nestjs/graphql";
import { WalletService } from "./wallet.service";

@Resolver()
export class WalletResolver {
  constructor(private readonly walletService: WalletService) { }

  @Query(() => String)
  public async verify(@Args('walletAddress', { nullable: false }) walletAddress?: string): Promise<string> {
    return this.walletService.verify(walletAddress);
  }

  @Mutation(() => String)
  public async claim(@Args('walletAddress', { nullable: false }) walletAddress: string): Promise<string> {
    return this.walletService.claim(walletAddress);
  }
}
