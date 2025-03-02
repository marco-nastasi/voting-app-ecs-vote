# voting-app-ecs-vote

This repository contains the source code and a CI/CD pipeline to deploy the **vote** container from the [example-voting-app](https://github.com/dockersamples/example-voting-app) to a ECS cluster in AWS. The infrastructure needs to be deployed first, which can be found [here](https://github.com/marco-nastasi/voting-app-ecs-infra).

## Table of Contents

- [Components](#components)
- [Usage](#usage)
- [Github Actions variables and secrets](#github-actions-variables-and-secrets)
- [CI/CD Workflow steps](#cicd-workflow-steps)

## Components

There are three main components in this project:
- **"Vote" container source code and Dockerfile** to build the image. The container has been modified to expose the port 8080 instead of 80
- **"Vote" container task definition** to deploy the container in AWS ECS. There are missing fields in this file, which will be filled dinamically by the CI/CD workflow during the deployment
- **CI/CD workflow** to automate deployments

## Usage

The CI/CD workflow is located in `.github/workflows/build-push-deploy-vote.yml`. It is configured to be triggered by any of these 3 events:
- New commit to the **main** branch
- PR merged to the **main** branch
- Manual execution from Github

## Github Actions variables and secrets

### Variables:

- AWS_REGION: The region where the container will be deployed. It must be the same where the infrastructure was created
- NUMBER_OF_TASKS: The amount of "Vote" containers that will be deployed

### Secrets:

- AWS_OIDC_ROLE: The ARN of the role that will be assumed by this repository when deploying the container

## CI/CD workflow steps

- **Checkout**: This action checks-out your repository under $GITHUB_WORKSPACE, so the workflow can access it. This is an official action provided by Github
- **Configure AWS OIDC credentials**: This action authenticates to AWS using OIDC. Instead of using static credentials, Github authenticates to AWS and gets access only for one hour, assuming the role specified in the variable AWS_OIDC_ROLE. This is an official action provided by AWS
- **Login to Amazon ECR**: This action authenticates to AWS ECR for container image storage and retrieval. This is an official action provided by AWS
- **Build, tag, and push vote image to Amazon ECR**: This action will connect to AWS SSM Parameter Store and fetch mandatory parameters to be configured in the container. This data will be passed as environment variables and secrets during the deployment step.
- **Fill in the new image ID for vote in the Amazon ECS task definition**: This action will fill parameters into the task definition file `vote-task-definition.json`. This is an official action provided by AWS
- **Deploy Amazon ECS vote task definition**: This action will make the deployment of the task to the ECS service. This is an official action provided by AWS