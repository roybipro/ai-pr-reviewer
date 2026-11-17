import {
  Controller,
  Headers,
  HttpCode,
  Inject,
  Post,
  Req,
  UnauthorizedException,
} from '@nestjs/common';
import { verifySignature } from './verify-signature';

export const WEBHOOK_SECRET = 'GITHUB_WEBHOOK_SECRET';

@Controller('webhooks')
export class WebhooksController {
  constructor(@Inject(WEBHOOK_SECRET) private readonly secret: string) {}

  @Post('github')
  @HttpCode(202)
  receive(
    @Req() req: { rawBody?: Buffer },
    @Headers('x-hub-signature-256') signature?: string,
  ): void {
    if (!req.rawBody || !verifySignature(this.secret, req.rawBody, signature)) {
      throw new UnauthorizedException();
    }
  }
}
