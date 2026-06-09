import {
  AdminAddUserToGroupCommand,
  AdminConfirmSignUpCommand,
  AdminCreateUserCommand,
  AdminSetUserPasswordCommand,
  CognitoIdentityProviderClient,
  InitiateAuthCommand,
  MessageActionType,
} from '@aws-sdk/client-cognito-identity-provider';
import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class CognitoAuthService {
  private readonly logger = new Logger(CognitoAuthService.name);
  private readonly client: CognitoIdentityProviderClient;

  constructor(private readonly config: ConfigService) {
    this.client = new CognitoIdentityProviderClient({
      region: this.config.get<string>('COGNITO_REGION', 'us-east-1'),
    });
  }

  isEnabled(): boolean {
    return (
      this.config.get<string>('COGNITO_ENABLED', 'false') === 'true' &&
      Boolean(this.userPoolId && this.clientId)
    );
  }

  private get userPoolId(): string | undefined {
    return this.config.get<string>('COGNITO_USER_POOL_ID');
  }

  private get clientId(): string | undefined {
    return this.config.get<string>('COGNITO_CLIENT_ID');
  }

  async authenticate(email: string, password: string) {
    const result = await this.client.send(
      new InitiateAuthCommand({
        AuthFlow: 'USER_PASSWORD_AUTH',
        ClientId: this.clientId,
        AuthParameters: {
          USERNAME: email,
          PASSWORD: password,
        },
      }),
    );

    return {
      idToken: result.AuthenticationResult?.IdToken,
      accessToken: result.AuthenticationResult?.AccessToken,
      refreshToken: result.AuthenticationResult?.RefreshToken,
      expiresIn: result.AuthenticationResult?.ExpiresIn,
    };
  }

  async registerUser(input: {
    email: string;
    password: string;
    name: string;
    role: string;
  }) {
    const email = input.email.trim().toLowerCase();
    const group = this.normalizeGroup(input.role);

    await this.client.send(
      new AdminCreateUserCommand({
        UserPoolId: this.userPoolId,
        Username: email,
        MessageAction: MessageActionType.SUPPRESS,
        UserAttributes: [
          { Name: 'email', Value: email },
          { Name: 'email_verified', Value: 'true' },
          { Name: 'name', Value: input.name },
          { Name: 'custom:role', Value: input.role },
        ],
        TemporaryPassword: input.password,
      }),
    );

    await this.client.send(
      new AdminSetUserPasswordCommand({
        UserPoolId: this.userPoolId,
        Username: email,
        Password: input.password,
        Permanent: true,
      }),
    );

    await this.client.send(
      new AdminConfirmSignUpCommand({
        UserPoolId: this.userPoolId,
        Username: email,
      }),
    );

    await this.client.send(
      new AdminAddUserToGroupCommand({
        UserPoolId: this.userPoolId,
        Username: email,
        GroupName: group,
      }),
    );

    this.logger.log(`Cognito user provisioned for ${email} (${group})`);
  }

  private normalizeGroup(role: string): string {
    const value = String(role || 'Student').trim();
    const allowed = new Set([
      'Student',
      'Teacher',
      'Parent',
      'SchoolAdmin',
      'SuperAdmin',
      'Admin',
    ]);
    if (allowed.has(value)) {
      return value === 'Admin' ? 'SchoolAdmin' : value;
    }
    return 'Student';
  }
}
