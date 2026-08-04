import { afterEach, describe, expect, it, vi } from 'vitest';
import { dishVisionConfigured } from './llm-dish-vision-provider';

describe('llm-dish-vision-provider', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    delete process.env.AI_DISH_VISION_ENABLED;
    delete process.env.AI_SCAN_ENABLED;
    delete process.env.AI_PROVIDER;
    delete process.env.OPENAI_API_KEY;
    delete process.env.YC_AI_API_KEY;
    delete process.env.YC_FOLDER_ID;
  });

  it('is off unless AI_SCAN and AI_DISH_VISION are enabled', () => {
    process.env.AI_SCAN_ENABLED = 'true';
    process.env.OPENAI_API_KEY = 'sk-test';
    expect(dishVisionConfigured()).toBe(false);

    process.env.AI_DISH_VISION_ENABLED = 'true';
    process.env.AI_PROVIDER = 'openai';
    expect(dishVisionConfigured()).toBe(true);
  });

  it('requires YC credentials for yandex provider', () => {
    process.env.AI_SCAN_ENABLED = 'true';
    process.env.AI_DISH_VISION_ENABLED = 'true';
    process.env.AI_PROVIDER = 'yandex';
    expect(dishVisionConfigured()).toBe(false);
    process.env.YC_AI_API_KEY = 'key';
    process.env.YC_FOLDER_ID = 'folder';
    expect(dishVisionConfigured()).toBe(true);
  });
});
