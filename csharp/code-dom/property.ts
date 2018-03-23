import { TypeDeclaration } from "./type-declaration";
import { AccessModifier, highestAccess } from "#csharp/code-dom/access-modifier";
import { Expression } from "#csharp/code-dom/expression";
import { Initializer } from "#csharp/code-dom/initializer";

export class Property extends Initializer implements Expression {
  public readVisibility = AccessModifier.Public;
  public writeVisibility = AccessModifier.Public;
  public isStatic: boolean = false;

  public get visibility(): AccessModifier {
    return highestAccess(this.readVisibility, this.writeVisibility);
  }

  constructor(public name: string, public type: TypeDeclaration, objectInitializer?: Partial<Property>) {
    super();
    this.apply(objectInitializer);
  }

  protected get getter(): string {
    return this.readVisibility == this.visibility ? "get" : `${this.readVisibility} get`
  };
  protected get setter(): string {
    return this.writeVisibility == this.visibility ? "set" : `${this.writeVisibility} set`
  };

  public get declaration(): string {
    const stat = this.isStatic ? " static " : " ";
    return `${this.visibility}${stat}${this.type.use} ${this.name} { ${this.getter}; ${this.setter}; }`
  }
  public get value(): string {
    return `${this.name}`;
  }
}