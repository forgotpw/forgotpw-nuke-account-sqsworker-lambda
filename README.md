# Nuke Account SQS Worker Lambda

Process events to completely delete a user's account.  When successful (with a valid confirmation code) requests are submitted from the REST API to nuke an account, an SNS event is fired.  An SQS queue created in this project subscribes to these events and this worker processes these SQS messages.  All traces of password hints and chat transcript logs are permanently deleted.  A final confirmation and goodbye message will be sent ot the user via SMS text message.

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

sls \
    deploy \
    --aws-profile fpwdev \
    --awsEnv dev \
    --verbose
```

## Invoke Locally

```shell
# ensure we are matching the version of node used by lambda
nvm use 8.10.0

sls invoke local \
    -f fpw-nuke-account-sqsworker \
    -p ./events/ValidNukeAccountSQSRequest.json \
    -l
```

# License

GNU General Public License v3.0

See [LICENSE](LICENSE.txt) to see the full text.
