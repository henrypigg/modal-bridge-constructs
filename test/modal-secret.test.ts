import * as cdk from 'aws-cdk-lib';
import { Template } from 'aws-cdk-lib/assertions';
import { ModalSecret } from '../lib/index';

describe('ModalSecret', () => {
  let app: cdk.App;
  let stack: cdk.Stack;

  beforeEach(() => {
    app = new cdk.App();
    stack = new cdk.Stack(app, 'TestStack');
  });

  test('creates a secret with specified name', () => {
    new ModalSecret(stack, 'TestSecret', {
      secretName: 'my-modal-secret',
    });

    const template = Template.fromStack(stack);
    template.hasResourceProperties('AWS::SecretsManager::Secret', {
      Name: 'my-modal-secret',
    });
  });

  test('generates secret with correct template structure', () => {
    new ModalSecret(stack, 'TestSecret', {
      secretName: 'my-modal-secret',
    });

    const template = Template.fromStack(stack);
    template.hasResourceProperties('AWS::SecretsManager::Secret', {
      GenerateSecretString: {
        SecretStringTemplate: JSON.stringify({ MODAL_TOKEN_ID: 'token-id' }),
        GenerateStringKey: 'MODAL_TOKEN_SECRET',
      },
    });
  });

  test('creates secret without name when not specified', () => {
    new ModalSecret(stack, 'TestSecret', {});

    const template = Template.fromStack(stack);
    template.hasResource('AWS::SecretsManager::Secret', {});
  });
});
