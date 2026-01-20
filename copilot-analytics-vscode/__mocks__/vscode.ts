export const workspace = {
  textDocuments: [],
  getConfiguration: jest.fn(() => ({
      get: jest.fn(),
  })),
  onDidChangeTextDocument: jest.fn(),
};

export const window = {
    showInformationMessage: jest.fn(),
    onDidChangeActiveTextEditor: jest.fn(),
};

export const commands = {
    registerCommand: jest.fn(),
};

export class Uri {
    static file(path: string) { return new Uri(path); }
    static parse(path: string) { return new Uri(path); }
    constructor(public path: string) {}
    toString() { return this.path; }
}

export class Position {
    constructor(public line: number, public character: number) {}
}

export class Range {
    constructor(public start: Position, public end: Position) {}
}

export class EventEmitter {
    event = jest.fn();
    fire = jest.fn();
}

export enum ExtensionKind {
    UI = 1,
    Workspace = 2
}
