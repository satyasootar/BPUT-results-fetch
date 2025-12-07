// Remove the jest import from @jest/globals, use global jest instead
const { describe, it, expect, beforeEach, afterEach } = require('@jest/globals');

describe('Fetcher', () => {
    let mockFetch;

    beforeEach(() => {
        mockFetch = jest.fn();
        global.fetch = mockFetch;
    });

    afterEach(() => {
        jest.clearAllMocks();
    });

    describe('fetchWithRetries', () => {
        it('should succeed on first attempt', async () => {
            mockFetch.mockResolvedValueOnce({
                ok: true,
                json: async () => ({ data: 'test' })
            });

            const fetcher = require('../src/fetcher');
            const result = await fetcher.fetchWithRetries('http://test.com', { attempts: 3 });
            expect(result).toEqual({ data: 'test' });
            expect(mockFetch).toHaveBeenCalledTimes(1);
        });

        it('should retry on network failure and succeed', async () => {
            mockFetch
                .mockRejectedValueOnce(new Error('Network error'))
                .mockResolvedValueOnce({
                    ok: true,
                    json: async () => ({ data: 'test' })
                });

            const fetcher = require('../src/fetcher');
            const result = await fetcher.fetchWithRetries('http://test.com', { attempts: 2 });
            expect(result).toEqual({ data: 'test' });
            expect(mockFetch).toHaveBeenCalledTimes(2);
        });

        it('should throw after exhausting all attempts', async () => {
            mockFetch.mockRejectedValue(new Error('Network error'));

            const fetcher = require('../src/fetcher');
            await expect(
                fetcher.fetchWithRetries('http://test.com', { attempts: 3 })
            ).rejects.toThrow('Network error');
            expect(mockFetch).toHaveBeenCalledTimes(3);
        });
    });
});