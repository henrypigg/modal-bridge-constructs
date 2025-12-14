import { ModalIntegration } from '../lib/index';

describe('ModalIntegration enum', () => {
  test('Spawn has correct value', () => {
    expect(ModalIntegration.Spawn).toBe('spawn');
  });

  test('Remote has correct value', () => {
    expect(ModalIntegration.Remote).toBe('remote');
  });
});
