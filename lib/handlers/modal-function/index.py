import os
import json
import modal
import boto3
from loguru import logger


def get_modal_client():
    sm = boto3.client('secretsmanager')

    secret = json.loads(
        sm.get_secret_value(SecretId=os.environ['MODAL_SECRET_ARN'])['SecretString']
    )
    
    return modal.Client.from_credentials(
        token_id=secret['MODAL_TOKEN_ID'],
        token_secret=secret['MODAL_TOKEN_SECRET']
    )


def handler(event, context):
    modal_client = get_modal_client()

    function_name = os.environ['MODAL_FUNCTION_NAME']
    fn = modal.Function.from_name(
        name=function_name,
        app_name=os.environ['MODAL_APP_NAME'],
        environment_name=os.environ['MODAL_ENVIRONMENT_NAME'],
        client=modal_client
    )

    fn_params = json.loads(os.environ['PARAMETERS'])
    integration_pattern = os.environ['MODAL_INTEGRATION_PATTERN']

    if integration_pattern == 'remote':
        logger.info(f'Remote invoking function "{function_name}" with event "{event}" and parameters "{fn_params}".')
        result = fn.remote(event, fn_params)
        response = {'result': result}
    elif integration_pattern == 'spawn':
        logger.info(f'Spawning function "{function_name}" with event "{event}" and parameters "{fn_params}".')
        fn_call = fn.spawn(event, fn_params)
        response = {'function_call_id': fn_call.object_id()}
    else:
        raise ValueError(f'Unsupported Modal integration pattern: "{integration_pattern}".')

    return {'status': 'Success', 'response': response}