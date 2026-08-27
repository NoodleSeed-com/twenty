import { type LanguageModel } from 'ai';

import { ConfigGroupHashService } from 'src/engine/core-modules/twenty-config/services/config-group-hash.service';
import { AiModelPreferencesService } from 'src/engine/metadata-modules/ai/ai-models/services/ai-model-preferences.service';
import { AiModelRegistryService } from 'src/engine/metadata-modules/ai/ai-models/services/ai-model-registry.service';
import { ProviderConfigService } from 'src/engine/metadata-modules/ai/ai-models/services/provider-config.service';
import {
  type AiSdkProviderInstance,
  SdkProviderFactoryService,
} from 'src/engine/metadata-modules/ai/ai-models/services/sdk-provider-factory.service';
import { type AiProvidersConfig } from 'src/engine/metadata-modules/ai/ai-models/types/ai-providers-config.type';

describe('AiModelRegistryService provider isolation', () => {
  it('keeps valid providers available when a malformed provider fails to construct', () => {
    const providers: AiProvidersConfig = {
      openai: {
        npm: '@ai-sdk/openai',
        apiKey: 'test-key',
        models: [{ name: 'gpt-4o', label: 'GPT-4o' }],
      },
      vertex: {
        npm: '@ai-sdk/google-vertex',
        authType: 'role',
        models: [{ name: 'gemini-3.6-flash', label: 'Gemini 3.6 Flash' }],
      },
    };
    const openAiModel = {} as LanguageModel;
    const providerConfigService = {
      getResolvedProviders: jest.fn().mockReturnValue(providers),
    } as unknown as ProviderConfigService;
    const sdkProviderFactory = {
      clearCache: jest.fn(),
      createProvider: jest.fn((providerName: string): AiSdkProviderInstance => {
        if (providerName === 'vertex') {
          throw new Error('project is required for Google Vertex providers');
        }

        return {
          createModel: jest.fn().mockReturnValue(openAiModel),
          rawProvider: {},
          sdkPackage: '@ai-sdk/openai',
        };
      }),
    } as unknown as SdkProviderFactoryService;
    const preferencesService = {
      getRecommendedModelIds: jest.fn().mockReturnValue(new Set()),
    } as unknown as AiModelPreferencesService;
    const configGroupHashService = {
      computeHash: jest.fn().mockReturnValue('config-hash'),
    } as unknown as ConfigGroupHashService;
    const service = new AiModelRegistryService(
      providerConfigService,
      sdkProviderFactory,
      preferencesService,
      configGroupHashService,
    );

    expect(service.getAvailableModels()).toEqual([
      expect.objectContaining({
        modelId: 'openai/gpt-4o',
        model: openAiModel,
      }),
    ]);
  });
});
