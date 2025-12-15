import { handler } from '../../lib/modal-function-handler';

jest.mock('modal', () => ({
  ModalClient: jest.fn().mockImplementation(() => ({
    functions: {
      fromName: jest.fn().mockResolvedValue({
        remote: jest.fn().mockResolvedValue({ data: 'test' }),
        spawn: jest.fn().mockResolvedValue({ functionCallId: 'call-123' }),
      }),
    },
  })),
}));

jest.mock('@aws-sdk/client-secrets-manager', () => ({
  SecretsManagerClient: jest.fn().mockImplementation(() => ({
    send: jest.fn().mockResolvedValue({
      SecretString: JSON.stringify({
        MODAL_TOKEN_ID: 'test-id',
        MODAL_TOKEN_SECRET: 'test-secret',
      }),
    }),
  })),
  GetSecretValueCommand: jest.fn(),
}));

const defaultEnv = {
  MODAL_SECRET_ARN: 'test-arn',
  MODAL_APP_NAME: 'test-app',
  MODAL_FUNCTION_NAME: 'test-fn',
  MODAL_ENVIRONMENT_NAME: 'main',
  MODAL_INTEGRATION_PATTERN: 'remote',
  PARAMETERS: '{}',
};

describe('Modal function handler', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    Object.assign(process.env, defaultEnv);
  });

  describe('with remote integration pattern', () => {
    test('returns success status', async () => {
      const result = await handler({ input: 'test' });
      expect(result.status).toBe('Success');
    });

    test('returns result from Modal function', async () => {
      const result = await handler({ input: 'test' });
      expect(result.response).toEqual({ data: 'test' });
    });
  });

  describe('with spawn integration pattern', () => {
    beforeEach(() => {
      process.env.MODAL_INTEGRATION_PATTERN = 'spawn';
    });

    test('returns success status', async () => {
      const result = await handler({ input: 'test' });
      expect(result.status).toBe('Success');
    });

    test('returns function call id', async () => {
      const result = await handler({ input: 'test' });
      expect(result.response.functionCallId).toBe('call-123');
    });
  });

  describe('with unsupported integration pattern', () => {
    beforeEach(() => {
      process.env.MODAL_INTEGRATION_PATTERN = 'invalid';
    });

    test('throws an error', async () => {
      await expect(handler({ input: 'test' })).rejects.toThrow(
        'Unsupported integration pattern: invalid'
      );
    });
  });
});
