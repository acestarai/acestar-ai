import { WatsonXAI } from '@ibm-cloud/watsonx-ai';
import { IamAuthenticator } from 'ibm-cloud-sdk-core';
import 'dotenv/config';

const watsonxAI = new WatsonXAI({
  version: '2024-05-31',
  serviceUrl: process.env.WATSONX_URL,
  authenticator: new IamAuthenticator({
    apikey: process.env.WATSONX_API_KEY,
  }),
});

async function test() {
  try {
    const response = await watsonxAI.generateText({
      input: 'Say hello',
      modelId: 'ibm/granite-3-8b-instruct',
      projectId: process.env.WATSONX_PROJECT_ID,
      parameters: { max_new_tokens: 50 },
    });
    console.log('✅ watsonx.ai works!', response.result);
  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

test();
