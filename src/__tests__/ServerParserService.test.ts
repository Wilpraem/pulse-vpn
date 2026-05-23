import { describe, expect, it } from 'vitest';

import { ServerParserService } from '../services/ServerParserService';

const sourceUrl = 'https://example.com/subscription.txt';

describe('ServerParserService', () => {
  it('parses VLESS Reality URLs from the universal list format', () => {
    const parser = new ServerParserService();
    const input =
      'vless://404b057c-3b66-407e-b465-240893bc9337@51.250.88.69:51109?flow=xtls-rprx-vision&encryption=none&type=tcp&security=reality&fp=qq&sni=ads.x5.ru&pbk=-tePObR3oZwGAUOb5kqTYkNWl6rtUKl0RFuzuu06wgw&sid=50#%F0%9F%87%A9%F0%9F%87%AA%20Germany%20%E2%80%94%20%2342';

    const parsed = parser.parse(input, { sourceUrl, localCountryCode: 'RU' });

    expect(parsed.parseErrors).toHaveLength(0);
    expect(parsed.servers).toHaveLength(1);
    expect(parsed.servers[0]).toMatchObject({
      protocol: 'vless',
      host: '51.250.88.69',
      port: 51109,
      transport: 'tcp',
      security: 'reality',
      country: 'Germany',
      countryCode: 'DE',
      isForeign: true,
      sni: 'ads.x5.ru',
      shortId: '50',
    });
  });

  it('keeps parsing when a line is broken', () => {
    const parser = new ServerParserService();
    const input = [
      'broken://not-supported',
      'vless://11111111-1111-4111-8111-111111111111@91.218.230.88:443?encryption=none&type=grpc&security=reality&serviceName=grpc&sni=m.vk.com&pbk=test#%F0%9F%87%AA%F0%9F%87%AA%20Estonia%20%E2%80%94%20%23140',
    ].join('\n');

    const parsed = parser.parse(input, { sourceUrl, localCountryCode: 'RU' });

    expect(parsed.servers).toHaveLength(1);
    expect(parsed.parseErrors).toHaveLength(1);
    expect(parsed.servers[0]?.transport).toBe('grpc');
    expect(parsed.servers[0]?.countryCode).toBe('EE');
  });
});
