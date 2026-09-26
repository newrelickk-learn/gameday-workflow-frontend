import { render } from '@testing-library/react';
import NewRelicBrowser from '@/components/NewRelicBrowser';

const mockUsePathname = jest.fn();

jest.mock('next/navigation', () => ({
  usePathname: () => mockUsePathname(),
}));

jest.mock('@/lib/utils/auth', () => ({
  getCurrentUser: () => null,
}));

jest.mock('@/lib/newrelic-browser', () => ({
  setNewRelicUserId: jest.fn(),
}));

const browserAgentConstructor = jest.fn();

jest.mock('@newrelic/browser-agent/loaders/browser-agent', () => ({
  BrowserAgent: class {
    constructor(...args: unknown[]) {
      browserAgentConstructor(...args);
    }
  },
}));

describe('NewRelicBrowser', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    jest.clearAllMocks();
    process.env = {
      ...originalEnv,
      NEXT_PUBLIC_NEW_RELIC_BROWSER_LICENSE_KEY: 'license-key',
      NEXT_PUBLIC_NEW_RELIC_BROWSER_APP_ID: 'app-id',
    };
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  it('通常のページではBrowser Agentを読み込む', async () => {
    mockUsePathname.mockReturnValue('/dashboard');

    render(<NewRelicBrowser />);

    await new Promise((resolve) => setTimeout(resolve, 0));
    expect(browserAgentConstructor).toHaveBeenCalledTimes(1);
  });

  it.each(['/score', '/score/', '/team-progress'])(
    '%s では他チームの進捗が録画されないようBrowser Agentを読み込まない',
    async (path) => {
      mockUsePathname.mockReturnValue(path);

      render(<NewRelicBrowser />);

      await new Promise((resolve) => setTimeout(resolve, 0));
      expect(browserAgentConstructor).not.toHaveBeenCalled();
    }
  );
});
