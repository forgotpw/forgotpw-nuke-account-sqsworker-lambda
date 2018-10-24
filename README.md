# Nuke Account SQS Worker Lambda

Process events to completely delete a user's account.  When successful requests are submitted from the REST API to nuke an account, an SNS event is fired.  An SQS queue created in this project subscribes to these events and this worker processes these SQS messages.  All traces of password hints and chat transcript logs are permanently deleted.  A final confirmation and goodbye message will be sent ot the user via SMS text message.

The REST API Lambda called from the API Gateway route will require and validate a confirmation code, which was checked before this item was added to this SQS queue.

## Setup

Install the Serverless CLI.

```shell
# install the serverless framework
npm install serverless -g
```

## Deploy

```shell
# needed to enable proper use of aws profiles with serverless framework
export AWS_SDK_LOAD_CONFIG=1
export AWS_ENV="dev" && export PROFILE="fpw$AWS_ENV"

sls \
    deploy \
    --aws-profile $PROFILE \
    --verbose
```

## Invoke Locally

```shell
pip install iam-starter
nvm use 8.10.0
export AWS_ENV="dev" && export PROFILE="fpw$AWS_ENV"
export AWS_REGION=us-east-1

iam-starter \
    --role dev \
    --profile $PROFILE \
    --command sls invoke local \
    -f fpw-nuke-account-sqsworker \
    -p ./events/ValidNukeAccountSQSRequest.json \
    -l
```

# License

GNU General Public License v3.0

See [LICENSE](LICENSE.txt) to see the full text.
