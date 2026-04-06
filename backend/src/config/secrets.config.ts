import {
  GetSecretValueCommand,
  SecretsManagerClient,
} from '@aws-sdk/client-secrets-manager';

export async function loadSecretsFromAws(): Promise<void> {
  if (process.env.NODE_ENV === 'development') {
    return;
  }

  const secretName = process.env.AWS_SECRET_NAME ?? 'export-manager/secrets';
  const region = process.env.AWS_REGION ?? 'eu-west-1';

  const client = new SecretsManagerClient({ region });

  const command = new GetSecretValueCommand({ SecretId: secretName });
  const response = await client.send(command);

  if (!response.SecretString) {
    throw new Error(`Secret ${secretName} has no string value`);
  }

  const secrets = JSON.parse(response.SecretString) as Record<string, string>;

  for (const [key, value] of Object.entries(secrets)) {
    process.env[key] = value;
  }
}
