import { Resolver, Query, Args, Mutation } from "@nestjs/graphql";

@Resolver()
export class AppResolver {
  // eslint-disable-next-line @typescript-eslint/no-empty-function
  constructor() { }

  @Query(() => String)
  public async verify(@Args('walletAddress', { nullable: false }) walletAddress?: string): Promise<string> {
    return '0xe301628e1c2010dd7213037384898a6578903edf98db78ab414918ea748c0bd3';
  }

  @Mutation(() => String)
  public async claim(@Args('walletAddress', { nullable: false }) walletAddress: string): Promise<string> {
    return '0xe301628e1c2010dd7213037384898a6578903edf98db78ab414918ea748c0bd3';
  }
}
