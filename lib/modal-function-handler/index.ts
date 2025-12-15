import { ModalClient } from 'modal';
import { SecretsManagerClient, GetSecretValueCommand } from '@aws-sdk/client-secrets-manager';

const sm = new SecretsManagerClient({});

async function getModalClient(): Promise<ModalClient> {
  const secret = await sm.send(
    new GetSecretValueCommand({ SecretId: process.env.MODAL_SECRET_ARN })
  );
  const creds = JSON.parse(secret.SecretString!);

  process.env.MODAL_TOKEN_ID = creds.MODAL_TOKEN_ID;
  process.env.MODAL_TOKEN_SECRET = creds.MODAL_TOKEN_SECRET;

  return new ModalClient();
}

export const handler = async (event: unknown) => {
  const modal = await getModalClient();

  const fn = await modal.functions.fromName(
    process.env.MODAL_APP_NAME!,
    process.env.MODAL_FUNCTION_NAME!,
    { environment: process.env.MODAL_ENVIRONMENT_NAME }
  );

  const fnParams = JSON.parse(process.env.PARAMETERS!);
  const integrationPattern = process.env.MODAL_INTEGRATION_PATTERN;

  console.log(
    `Calling function "${fn.methodName}" with integration pattern "${integrationPattern}".\nEvent: ${event}\nStatic Params: ${fnParams}`
  );
  if (integrationPattern === 'remote') {
    const result = await fn.remote([event, fnParams]);
    console.log(`Modal Response: ${result}`);
    return { status: 'Success', response: result };
  } else if (integrationPattern === 'spawn') {
    const fnCall = await fn.spawn([event, fnParams]);
    console.log(`Modal Function ID: ${fnCall.functionCallId}`);
    return { status: 'Success', response: { functionCallId: fnCall.functionCallId } };
  } else {
    throw new Error(`Unsupported integration pattern: ${integrationPattern}`);
  }
};
