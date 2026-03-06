import * as vscode from 'vscode';
import { CompletionTracker } from './completionTracker';
import { TelemetryService } from '../services/telemetry';
import { EventType } from '../types/events';

// Mock VS Code
jest.mock('vscode');

// Mock TelemetryService
jest.mock('../services/telemetry');

describe('CompletionTracker', () => {
    let telemetryService: jest.Mocked<TelemetryService>;
    let tracker: CompletionTracker;

    beforeEach(() => {
        jest.clearAllMocks();
        telemetryService = new TelemetryService(null as any, 'test-user') as jest.Mocked<TelemetryService>;
        telemetryService.record = jest.fn();
        telemetryService.getOpenFileCount = jest.fn().mockReturnValue(1);

        tracker = new CompletionTracker(telemetryService);
    });

    describe('provideInlineCompletionItems', () => {
        it('should record COMPLETION_REQUESTED event', async () => {
            const document = {
                uri: { toString: () => 'file:///test.ts' },
                fileName: 'test.ts',
                lineAt: jest.fn(),
                getText: jest.fn(),
            } as unknown as vscode.TextDocument;

            const position = new vscode.Position(10, 5);

            const context = {
                triggerKind: 0, // Invoke
                selectedCompletionInfo: undefined
            } as unknown as vscode.InlineCompletionContext;

            const token = {} as vscode.CancellationToken;

            await tracker.provideInlineCompletionItems(document, position, context, token);

            expect(telemetryService.record).toHaveBeenCalledWith(expect.objectContaining({
                event_type: EventType.COMPLETION_REQUESTED,
                metadata: expect.objectContaining({
                    file_type: 'ts',
                    line_number: 10,
                    context_files: 1,
                    trigger_kind: 0
                })
            }));
        });
    });

    describe('onDocumentChange', () => {
        it('should record COMPLETION_ACCEPTED for multi-line insertions', () => {
            const event = {
                document: {
                    fileName: 'test.ts'
                },
                contentChanges: [
                    {
                        text: 'line1\nline2',
                        rangeLength: 0,
                        range: new vscode.Range(new vscode.Position(0,0), new vscode.Position(0,0)),
                        rangeOffset: 0
                    }
                ]
            } as unknown as vscode.TextDocumentChangeEvent;

            tracker.onDocumentChange(event);

            expect(telemetryService.record).toHaveBeenCalledWith(expect.objectContaining({
                event_type: EventType.COMPLETION_ACCEPTED,
                metadata: expect.objectContaining({
                    file_type: 'ts',
                    inserted_length: 11, // 'line1\nline2'.length
                    range_length: 0
                })
            }));
        });

        it('should record COMPLETION_ACCEPTED for long single-line insertions', () => {
             const longText = 'a'.repeat(21);
             const event = {
                document: {
                    fileName: 'test.ts'
                },
                contentChanges: [
                    {
                        text: longText,
                        rangeLength: 0,
                        range: new vscode.Range(new vscode.Position(0,0), new vscode.Position(0,0)),
                        rangeOffset: 0
                    }
                ]
            } as unknown as vscode.TextDocumentChangeEvent;

            tracker.onDocumentChange(event);

            expect(telemetryService.record).toHaveBeenCalledWith(expect.objectContaining({
                event_type: EventType.COMPLETION_ACCEPTED,
                metadata: expect.objectContaining({
                    inserted_length: 21
                })
            }));
        });

        it('should NOT record event for short single-line insertions', () => {
             const shortText = 'short';
             const event = {
                document: {
                    fileName: 'test.ts'
                },
                contentChanges: [
                    {
                        text: shortText,
                        rangeLength: 0,
                        range: new vscode.Range(new vscode.Position(0,0), new vscode.Position(0,0)),
                        rangeOffset: 0
                    }
                ]
            } as unknown as vscode.TextDocumentChangeEvent;

            tracker.onDocumentChange(event);

            expect(telemetryService.record).not.toHaveBeenCalled();
        });
    });
});
