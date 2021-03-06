import { OneOrMoreStatements, Statements } from "#csharp/code-dom/statements/statement";
import { indent } from "#common/text-manipulation";

export class Case extends Statements {
  constructor(private value: string, body: OneOrMoreStatements, objectInitializer?: Partial<Case>) {
    super(body);
    this.apply(objectInitializer);
  }

  protected get statementsImplementation(): string {
    return indent(super.implementation);
  }
  public get implementation(): string {
    return `
case ${this.value}:
${this.statementsImplementation}
${indent('break')};
`.trim();
  }
}

export class DefaultCase extends Case {
  constructor(body: OneOrMoreStatements, objectInitializer?: Partial<DefaultCase>) {
    super("", body);
    this.apply(objectInitializer);
  }

  public get implementation(): string {
    return `
default:
${this.statementsImplementation}
${indent('break')};
`.trim();
  }
}


export class TerminalDefaultCase extends Case {
  constructor(body: OneOrMoreStatements, objectInitializer?: Partial<TerminalDefaultCase>) {
    super("", body);
    this.apply(objectInitializer);
  }

  public get implementation(): string {
    return `
default:
${this.statementsImplementation}
`.trim();
  }
}
