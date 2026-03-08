// AWS Cognito Configuration
// Replace these values with your actual AWS Cognito User Pool settings

export const cognitoConfig = {
  // Your Cognito User Pool ID (e.g., 'us-east-1_xxxxxxxxx')
  userPoolId: process.env.NEXT_PUBLIC_COGNITO_USER_POOL_ID || '',
  
  // Your Cognito App Client ID (e.g., 'xxxxxxxxxxxxxxxxxxxxxxxxxx')
  clientId: process.env.NEXT_PUBLIC_COGNITO_CLIENT_ID || '',
  
  // Your AWS Region (e.g., 'us-east-1')
  region: process.env.NEXT_PUBLIC_COGNITO_REGION || 'us-east-1',
};

// Validation helper
export function validateCognitoConfig(): boolean {
  if (!cognitoConfig.userPoolId) {
    console.warn('Missing NEXT_PUBLIC_COGNITO_USER_POOL_ID environment variable');
    return false;
  }
  if (!cognitoConfig.clientId) {
    console.warn('Missing NEXT_PUBLIC_COGNITO_CLIENT_ID environment variable');
    return false;
  }
  return true;
}
