import { TelemetryService } from './telemetry';
import { SupabaseService } from './supabase';
import { EventType } from '../types/events';
import * as vscode from 'vscode';

// Mock SupabaseService
jest.mock('./supabase');
// Mock EncryptionService (implicitly used by TelemetryService)
jest.mock('./encryption', () => {
  return {
    EncryptionService: jest.fn().mockImplementation(() => {
      return {
        encrypt: jest.fn((data) => `encrypted_${data}`),
      };
    }),
  };
});

describe('TelemetryService', () => {
  let telemetryService: TelemetryService;
  let mockSupabase: jest.Mocked<SupabaseService>;
  let mockInsertEvents: jest.Mock;

  beforeEach(() => {
    // Clear mocks
    jest.clearAllMocks();
    jest.useFakeTimers();

    // Setup Supabase mock
    mockInsertEvents = jest.fn().mockResolvedValue({ error: null });
    (SupabaseService as jest.Mock).mockImplementation(() => ({
      insertEvents: mockInsertEvents,
    }));

    mockSupabase = new SupabaseService('url', 'key') as jest.Mocked<SupabaseService>;
    telemetryService = new TelemetryService(mockSupabase, 'test-user-id');
  });

  afterEach(() => {
    telemetryService.dispose();
    jest.useRealTimers();
  });

  it('should buffer events', async () => {
    await telemetryService.record({
      event_type: EventType.COMPLETION_REQUESTED,
      metadata: {},
    });

    expect(mockInsertEvents).not.toHaveBeenCalled();
  });

  it('should flush events when buffer limit is reached', async () => {
    // Limit is 50
    for (let i = 0; i < 50; i++) {
      await telemetryService.record({
        event_type: EventType.COMPLETION_REQUESTED,
        metadata: { index: i },
      });
    }

    expect(mockInsertEvents).toHaveBeenCalledTimes(1);
    expect(mockInsertEvents.mock.calls[0][0]).toHaveLength(50);
  });

  it('should flush events on interval', async () => {
    await telemetryService.record({
      event_type: EventType.COMPLETION_REQUESTED,
      metadata: {},
    });

    expect(mockInsertEvents).not.toHaveBeenCalled();

    jest.advanceTimersByTime(30000);

    expect(mockInsertEvents).toHaveBeenCalledTimes(1);
  });

  it('should encrypt sensitive prompt data', async () => {
    await telemetryService.record({
      event_type: EventType.PROMPT_SUBMITTED,
      prompt_data: 'secret code',
      metadata: {},
    });

    // Flush manually or via timer
    await telemetryService.flush();

    expect(mockInsertEvents).toHaveBeenCalled();
    const sentEvents = mockInsertEvents.mock.calls[0][0];
    expect(sentEvents[0].prompt_encrypted).toBe('encrypted_secret code');
    expect(sentEvents[0].prompt_data).toBeUndefined();
  });

  it('should get open file count from vscode workspace', () => {
    // Mock vscode workspace textDocuments
    // We need to cast to any or define the shape better in the mock
    // In our mock implementation, workspace.textDocuments is an array we can modify
    (vscode.workspace as any).textDocuments = [
        { isUntitled: false },
        { isUntitled: false },
        { isUntitled: true }
    ];

    expect(telemetryService.getOpenFileCount()).toBe(2);
  });
});
