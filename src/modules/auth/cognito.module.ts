import { Module } from '@nestjs/common';
import { CognitoAuthService } from './cognito-auth.service';

@Module({
  providers: [CognitoAuthService],
  exports: [CognitoAuthService],
})
export class CognitoModule {}
