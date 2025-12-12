import os
import json
import modal
import boto3
from loguru import logger

def handler(event, context):
    logger.info(f'Remote received event: {event}')
    sm = boto3.client('secretsmanager')
    logger.info(str(sm.get_secret_value(SecretId=os.environ['MODAL_SECRET_ARN'])))
    secret = json.loads(
        sm.get_secret_value(SecretId=os.environ['MODAL_SECRET_ARN'])['SecretString']
    )
    modal_client = modal.Client.from_credentials(token_id=secret['MODAL_TOKEN_ID'], token_secret=secret['MODAL_TOKEN_SECRET'])
    
    app = modal.App.lookup('demo-modal-app', client=modal_client)
    fn = modal.Function.from_name(
        app.name,
        os.environ['MODAL_FUNCTION_NAME'],
        client=modal_client
    )

    result = fn.remote(event)
    logger.info(f'received result: {result}')
        
    return {'status': 'Success'}