import os
from crhelper import CfnResource
import logging
import subprocess

logger = logging.getLogger(__name__)
helper = CfnResource(
    json_logging=False,
    log_level='DEBUG',
    boto_level='CRITICAL',
    sleep_on_delete=120,
    ssl_verify=None
)


def setup_modal_credentials():
    subprocess.run(
        ['modal', 'token', 'set']
    )


@helper.create
@helper.update
def deploy(event, context):
    logger.info(f'deploying... event: {event}, context: {context}')
    pass


@helper.delete
def stop(event, context):
    logger.info(f'deploying... event: {event}, context: {context}')
    pass


def handler(event, context):
    helper(event, context)
