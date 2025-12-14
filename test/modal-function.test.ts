import * as cdk from 'aws-cdk-lib';
import { Template, Match } from 'aws-cdk-lib/assertions';
import { ModalFunction, ModalIntegration, ModalSecret } from '../lib/index';

const defaultProps = {
  functionName: 'test_function',
  integrationPattern: ModalIntegration.Remote,
  modalConfig: {
    appName: 'test-app',
    workspaceId: 'ws-test123',
    environment: 'main',
  },
};

// Tests using default props - single Docker build, multiple assertions
describe('ModalFunction with default props', () => {
  let template: Template;
  let modalFunction: ModalFunction;

  beforeAll(() => {
    const app = new cdk.App();
    const stack = new cdk.Stack(app, 'TestStack', {
      env: { account: '123456789012', region: 'us-east-1' },
    });
    modalFunction = new ModalFunction(stack, 'TestModalFunction', defaultProps);
    template = Template.fromStack(stack);
  });

  test('creates a Lambda function with correct name and runtime', () => {
    template.hasResourceProperties('AWS::Lambda::Function', {
      FunctionName: 'test_function_remote',
      Runtime: 'python3.12',
    });
  });

  test('creates an IAM execution role', () => {
    template.hasResourceProperties('AWS::IAM::Role', {
      RoleName: 'test_function_remote_role',
      AssumeRolePolicyDocument: Match.objectLike({
        Statement: Match.arrayWith([
          Match.objectLike({
            Principal: { Service: 'lambda.amazonaws.com' },
          }),
        ]),
      }),
    });
  });

  test('creates an OIDC provider for Modal', () => {
    template.hasResourceProperties('Custom::AWSCDKOpenIdConnectProvider', {
      Url: 'https://oidc.modal.com',
      ClientIDList: ['oidc.modal.com'],
    });
  });

  test('creates a Secrets Manager secret', () => {
    template.hasResourceProperties('AWS::SecretsManager::Secret', {
      Name: 'test_function_remote-secret',
    });
  });

  test('sets Modal environment variables correctly', () => {
    template.hasResourceProperties('AWS::Lambda::Function', {
      Environment: {
        Variables: Match.objectLike({
          MODAL_APP_NAME: 'test-app',
          MODAL_ENVIRONMENT_NAME: 'main',
          MODAL_FUNCTION_NAME: 'test_function',
          MODAL_INTEGRATION_PATTERN: 'remote',
          PARAMETERS: '{}',
        }),
      },
    });
  });

  test('uses default 5 minute timeout', () => {
    template.hasResourceProperties('AWS::Lambda::Function', {
      Timeout: 300,
    });
  });

  test('configures OIDC trust with correct conditions', () => {
    template.hasResourceProperties('AWS::IAM::Role', {
      AssumeRolePolicyDocument: Match.objectLike({
        Statement: Match.arrayWith([
          Match.objectLike({
            Action: 'sts:AssumeRoleWithWebIdentity',
            Condition: {
              StringEquals: {
                'oidc.modal.com:aud': 'oidc.modal.com',
              },
              StringLike: {
                'oidc.modal.com:sub':
                  'modal:workspace_id:ws-test123:environment_name:main:app_name:test-app:function_name:test_function:*',
              },
            },
          }),
        ]),
      }),
    });
  });

  test('exposes grantPrincipal for IAM grants', () => {
    expect(modalFunction.grantPrincipal).toBeDefined();
  });

  test('exposes handler for event sources', () => {
    expect(modalFunction.handler).toBeDefined();
  });
});

// Tests requiring different configurations - separate Docker builds
describe('ModalFunction with custom props', () => {
  let template: Template;
  let modalFunction: ModalFunction;

  beforeAll(() => {
    const app = new cdk.App();
    const stack = new cdk.Stack(app, 'TestStack', {
      env: { account: '123456789012', region: 'us-east-1' },
    });
    const existingSecret = new ModalSecret(stack, 'ExistingSecret', {
      secretName: 'my-existing-secret',
    });

    modalFunction = new ModalFunction(stack, 'TestModalFunction', {
      ...defaultProps,
      integrationPattern: ModalIntegration.Spawn,
      params: { quality: 95, format: 'png' },
      lambdaTimeout: cdk.Duration.minutes(10),
      delimiter: '-custom-',
      modalConfig: {
        ...defaultProps.modalConfig,
        tokenSecret: existingSecret,
      },
    });
    template = Template.fromStack(stack);
  });

  test('sets Spawn integration pattern', () => {
    template.hasResourceProperties('AWS::Lambda::Function', {
      FunctionName: 'test_function-custom-_spawn',
      Environment: {
        Variables: Match.objectLike({
          MODAL_INTEGRATION_PATTERN: 'spawn',
        }),
      },
    });
  });

  test('sets custom parameters in environment', () => {
    template.hasResourceProperties('AWS::Lambda::Function', {
      Environment: {
        Variables: Match.objectLike({
          PARAMETERS: JSON.stringify({ quality: 95, format: 'png' }),
        }),
      },
    });
  });

  test('respects custom Lambda timeout', () => {
    template.hasResourceProperties('AWS::Lambda::Function', {
      Timeout: 600,
    });
  });

  test('respects custom delimiter in resource names', () => {
    template.hasResourceProperties('AWS::Lambda::Function', {
      FunctionName: 'test_function-custom-_spawn',
    });
  });

  test('uses provided token secret', () => {
    template.resourceCountIs('AWS::SecretsManager::Secret', 1);
    template.hasResourceProperties('AWS::SecretsManager::Secret', {
      Name: 'my-existing-secret',
    });
  });
});
