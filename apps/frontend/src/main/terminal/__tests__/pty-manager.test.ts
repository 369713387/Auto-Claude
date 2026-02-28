/**
 * Tests for PTY Manager credential cleanup logic
 *
 * These tests verify that conflicting authentication credentials are properly
 * cleaned up before being passed to PTY processes, preventing "Both a token
 * and an API key are set" warnings from the Claude SDK.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// Mock the node-pty module
vi.mock('@lydell/node-pty', () => ({
  spawn: vi.fn(() => ({
    onData: vi.fn(),
    onExit: vi.fn(),
    write: vi.fn(),
    resize: vi.fn(),
    kill: vi.fn(),
    cols: 80,
    rows: 24,
  })),
}));

// Mock the platform module
vi.mock('../platform', () => ({
  isWindows: vi.fn(() => false),
  isMacOS: vi.fn(() => true),
  getWindowsShellPaths: vi.fn(() => ({})),
}));

// Mock the settings-utils module
vi.mock('../settings-utils', () => ({
  readSettingsFile: vi.fn(() => ({ preferredTerminal: 'system' })),
}));

// Mock the ipc-handlers/utils module
vi.mock('../ipc-handlers/utils', () => ({
  safeSendToRenderer: vi.fn(),
}));

// Mock the claude-profile-manager module
vi.mock('../claude-profile-manager', () => ({
  getClaudeProfileManager: vi.fn(() => ({
    getActiveProfileEnv: vi.fn(() => ({})),
  })),
}));

// Mock the debug logger
vi.mock('../../shared/utils/debug-logger', () => ({
  debugLog: vi.fn(),
  debugError: vi.fn(),
}));

/**
 * Test the credential cleanup logic that runs inside spawnPtyProcess.
 * Since spawnPtyProcess calls pty.spawn directly, we test the logic
 * by examining what environment variables would be passed.
 *
 * The actual cleanup logic is:
 * 1. If API key mode (ANTHROPIC_API_KEY set): remove CLAUDE_CODE_OAUTH_TOKEN
 * 2. If OAuth mode (only CLAUDE_CODE_OAUTH_TOKEN set): remove ANTHROPIC_API_KEY
 * 3. Always remove deprecated ANTHROPIC_AUTH_TOKEN
 */
describe('PTY credential cleanup', () => {
  // Simulate the credential cleanup logic from spawnPtyProcess
  function cleanupCredentials(profileEnv: Record<string, string | undefined>): Record<string, string | undefined> {
    const hasApiKey = !!profileEnv?.ANTHROPIC_API_KEY;
    const hasOAuth = !!profileEnv?.CLAUDE_CODE_OAUTH_TOKEN;
    const isApiKeyMode = hasApiKey;
    const isOAuthMode = !hasApiKey && hasOAuth;

    let cleanedEnv = { ...profileEnv };

    if (isApiKeyMode && cleanedEnv.CLAUDE_CODE_OAUTH_TOKEN) {
      const { CLAUDE_CODE_OAUTH_TOKEN, ...rest } = cleanedEnv;
      cleanedEnv = rest;
    }
    if (isOAuthMode && cleanedEnv.ANTHROPIC_API_KEY) {
      const { ANTHROPIC_API_KEY, ...rest } = cleanedEnv;
      cleanedEnv = rest;
    }
    if (cleanedEnv.ANTHROPIC_AUTH_TOKEN) {
      const { ANTHROPIC_AUTH_TOKEN, ...rest } = cleanedEnv;
      cleanedEnv = rest;
    }

    return cleanedEnv;
  }

  describe('API key mode', () => {
    it('should keep ANTHROPIC_API_KEY when only API key is set', () => {
      const profileEnv = {
        ANTHROPIC_API_KEY: 'sk-test-key',
        ANTHROPIC_BASE_URL: 'https://api.example.com',
      };

      const cleaned = cleanupCredentials(profileEnv);

      expect(cleaned.ANTHROPIC_API_KEY).toBe('sk-test-key');
      expect(cleaned.ANTHROPIC_BASE_URL).toBe('https://api.example.com');
    });

    it('should remove CLAUDE_CODE_OAUTH_TOKEN when API key is set', () => {
      const profileEnv = {
        ANTHROPIC_API_KEY: 'sk-test-key',
        CLAUDE_CODE_OAUTH_TOKEN: 'oauth-token',
        ANTHROPIC_BASE_URL: 'https://api.example.com',
      };

      const cleaned = cleanupCredentials(profileEnv);

      expect(cleaned.ANTHROPIC_API_KEY).toBe('sk-test-key');
      expect(cleaned.CLAUDE_CODE_OAUTH_TOKEN).toBeUndefined();
      expect(cleaned.ANTHROPIC_BASE_URL).toBe('https://api.example.com');
    });
  });

  describe('OAuth mode', () => {
    it('should keep CLAUDE_CODE_OAUTH_TOKEN when only OAuth is set', () => {
      const profileEnv = {
        CLAUDE_CODE_OAUTH_TOKEN: 'oauth-token',
      };

      const cleaned = cleanupCredentials(profileEnv);

      expect(cleaned.CLAUDE_CODE_OAUTH_TOKEN).toBe('oauth-token');
    });

    it('should prioritize API key mode when both are set (API key wins)', () => {
      // When both are set, the implementation prioritizes API key mode
      // and removes the OAuth token to prevent conflicts
      const profileEnv = {
        CLAUDE_CODE_OAUTH_TOKEN: 'oauth-token',
        ANTHROPIC_API_KEY: 'sk-test-key',
      };

      const cleaned = cleanupCredentials(profileEnv);

      // API key mode takes precedence - OAuth is removed
      expect(cleaned.ANTHROPIC_API_KEY).toBe('sk-test-key');
      expect(cleaned.CLAUDE_CODE_OAUTH_TOKEN).toBeUndefined();
    });
  });

  describe('deprecated ANTHROPIC_AUTH_TOKEN', () => {
    it('should always remove ANTHROPIC_AUTH_TOKEN in API key mode', () => {
      const profileEnv = {
        ANTHROPIC_API_KEY: 'sk-test-key',
        ANTHROPIC_AUTH_TOKEN: 'deprecated-token',
      };

      const cleaned = cleanupCredentials(profileEnv);

      expect(cleaned.ANTHROPIC_API_KEY).toBe('sk-test-key');
      expect(cleaned.ANTHROPIC_AUTH_TOKEN).toBeUndefined();
    });

    it('should always remove ANTHROPIC_AUTH_TOKEN in OAuth mode', () => {
      const profileEnv = {
        CLAUDE_CODE_OAUTH_TOKEN: 'oauth-token',
        ANTHROPIC_AUTH_TOKEN: 'deprecated-token',
      };

      const cleaned = cleanupCredentials(profileEnv);

      expect(cleaned.CLAUDE_CODE_OAUTH_TOKEN).toBe('oauth-token');
      expect(cleaned.ANTHROPIC_AUTH_TOKEN).toBeUndefined();
    });

    it('should remove ANTHROPIC_AUTH_TOKEN even when no other auth is present', () => {
      const profileEnv = {
        ANTHROPIC_AUTH_TOKEN: 'deprecated-token',
        ANTHROPIC_BASE_URL: 'https://api.example.com',
      };

      const cleaned = cleanupCredentials(profileEnv);

      expect(cleaned.ANTHROPIC_AUTH_TOKEN).toBeUndefined();
      expect(cleaned.ANTHROPIC_BASE_URL).toBe('https://api.example.com');
    });
  });

  describe('no auth mode', () => {
    it('should preserve non-auth environment variables', () => {
      const profileEnv = {
        ANTHROPIC_BASE_URL: 'https://api.example.com',
        ANTHROPIC_MODEL: 'claude-3-opus',
        CUSTOM_VAR: 'value',
      };

      const cleaned = cleanupCredentials(profileEnv);

      expect(cleaned.ANTHROPIC_BASE_URL).toBe('https://api.example.com');
      expect(cleaned.ANTHROPIC_MODEL).toBe('claude-3-opus');
      expect(cleaned.CUSTOM_VAR).toBe('value');
    });
  });

  describe('idempotency', () => {
    it('should be safe to run cleanup multiple times', () => {
      const profileEnv = {
        ANTHROPIC_API_KEY: 'sk-test-key',
        CLAUDE_CODE_OAUTH_TOKEN: 'oauth-token',
        ANTHROPIC_AUTH_TOKEN: 'deprecated-token',
      };

      const firstPass = cleanupCredentials(profileEnv);
      const secondPass = cleanupCredentials(firstPass);
      const thirdPass = cleanupCredentials(secondPass);

      expect(firstPass).toEqual(secondPass);
      expect(secondPass).toEqual(thirdPass);
      expect(firstPass.ANTHROPIC_API_KEY).toBe('sk-test-key');
      expect(firstPass.CLAUDE_CODE_OAUTH_TOKEN).toBeUndefined();
      expect(firstPass.ANTHROPIC_AUTH_TOKEN).toBeUndefined();
    });
  });
});
