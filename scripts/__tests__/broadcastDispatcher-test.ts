import { createBibleCommand, createBrightnessCommand, createSongCommand } from '@/scripts/displayCommand';
import { runDisplayCommandPublish } from '@/scripts/displayCommandPublish';

describe('publishDisplayCommand', () => {
    const publishers = {
        publishAws: jest.fn(async () => undefined),
        publishHymnSign: jest.fn(async () => undefined),
    };

    beforeEach(() => {
        publishers.publishAws.mockClear();
        publishers.publishHymnSign.mockClear();
    });

    it('skips AWS brightness and does not call a publisher', async () => {
        const result = await runDisplayCommandPublish(
            createBrightnessCommand(80, 40),
            { churchId: 'church-1', target: 'both' },
            publishers,
        );

        expect(result.aws).toBe('skipped');
        expect(publishers.publishAws).not.toHaveBeenCalled();
        expect(publishers.publishHymnSign).toHaveBeenCalledWith('church-1', expect.objectContaining({
            action: 'brightness',
        }));
    });

    it('skips bible commands on HymnSign', async () => {
        const result = await runDisplayCommandPublish(
            createBibleCommand('John', '3:16'),
            { churchId: 'church-1', target: 'hymnsign' },
            publishers,
        );

        expect(result.hymnSign).toBe('skipped');
        expect(result.hymnSignSkippedReason).toBe('bible');
        expect(publishers.publishHymnSign).not.toHaveBeenCalled();
    });

    it('publishes a song through the injected AWS publisher', async () => {
        const command = createSongCommand({
            number: '12',
            bookMedium: 'Gospel Hymns',
            verses: [1],
            bookColor: '#fff',
        });

        const result = await runDisplayCommandPublish(
            command,
            { churchId: 'church-1', target: 'aws' },
            publishers,
        );

        expect(result.aws).toBe('success');
        expect(publishers.publishAws).toHaveBeenCalledWith('church-1', command);
        expect(publishers.publishHymnSign).not.toHaveBeenCalled();
    });

    it('records a publisher failure without throwing', async () => {
        publishers.publishAws.mockRejectedValueOnce(new Error('offline'));

        const result = await runDisplayCommandPublish(
            createSongCommand({
                number: '12',
                bookMedium: 'Gospel Hymns',
                verses: [1],
                bookColor: '#fff',
            }),
            { churchId: 'church-1', target: 'aws' },
            publishers,
        );

        expect(result.aws).toBe('failed');
        expect(result.errors.map((error) => error.message)).toEqual(['offline']);
    });
});
