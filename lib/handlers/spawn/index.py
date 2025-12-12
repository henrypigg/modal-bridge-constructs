import modal
from loguru import logger

def handler(event, context):
    logger.info(f'Spawn received event: {event}')

    return {'status': 'Success'}