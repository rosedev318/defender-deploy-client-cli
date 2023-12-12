import { promises as fs } from 'fs';

import { Network } from '@openzeppelin/defender-sdk-base-client';
import { DeployClient, DeployContractRequest, DeploymentResponse, SourceCodeLicense } from '@openzeppelin/defender-sdk-deploy-client';

export interface FunctionArgs {
  contractName: string;
  contractPath: string;
  network: Network;
  artifactPayload: string;
  licenseType?: string;
  constructorInputs?: string;
  verifySourceCode: boolean;
  relayerId?: string;
  salt?: string;
  createFactoryAddress?: string;
}

export async function deployContract(args: FunctionArgs) {
  console.log('deployContract', args);

  require('dotenv').config();
  const apiKey = process.env.DEFENDER_KEY as string;
  const apiSecret = process.env.DEFENDER_SECRET as string;

  if (apiKey === undefined || apiSecret === undefined) {
    throw new Error('DEFENDER_KEY and DEFENDER_SECRET must be set in environment variables.');
  }

  const client = new DeployClient({ apiKey, apiSecret });

  const buildInfoFileContents = await fs.readFile(args.artifactPayload, 'utf8');

  const deploymentRequest: DeployContractRequest = {
    contractName: args.contractName,
    contractPath: args.contractPath,
    network: args.network,
    artifactPayload: buildInfoFileContents,
    licenseType: args.licenseType as SourceCodeLicense | undefined, // TODO cast without validation but catch error from API below
    constructorInputs: undefined, // TODO take an encoded byte string as the constructor inputs
    verifySourceCode: args.verifySourceCode,
    relayerId: args.relayerId,
    salt: args.salt,
    createFactoryAddress: args.createFactoryAddress,
  };

  console.log('deploymentRequest', deploymentRequest);

  let deployment: DeploymentResponse = await client.deployContract(deploymentRequest);
  while (deployment.status !== 'completed' && deployment.status !== 'failed') {
    console.log(`Waiting for deployment id ${deployment.deploymentId} to complete...`);
    await new Promise(resolve => setTimeout(resolve, 5000));
    const deploymentId = deployment.deploymentId;
    deployment = await client.getDeployedContract(deploymentId);
  }

  switch (deployment.status) {
    case 'completed':
      console.log(`Deployment ${deployment.deploymentId} completed with address ${deployment.address}.`);
      break;
    case 'failed':
      throw new Error(`Deployment ${deployment.deploymentId} failed.`);
    default:
      throw new Error(`Deployment ${deployment.deploymentId} has unknown status ${deployment.status}.`);
  }

  if (deployment.address === undefined) {
    throw new Error(`Deployment ${deployment.deploymentId} completed but has no address.`);
  }

  return deployment.address;
}