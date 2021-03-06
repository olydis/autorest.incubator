import { TypeDeclaration } from "../type-declaration";
import { fixPropertyName } from "#common/text-manipulation";
import { OneOrMoreStatements } from "#csharp/code-dom/statements/statement";

export class String implements TypeDeclaration {
  constructor(protected required: boolean, private minLength?: number, private maxLength?: number, private pattern?: string, private choices?: Array<string>) {

  }
  get implementation(): string {
    return '';
  }
  get use(): string {
    return 'string';
  }

  valueRequired(propertyName: string): string {
    return this.required ? `
if( $VALUE == null ) 
{
  $ERROR;
}`.trim() : '';
  };

  validateValue(propertyName: string): string {
    return `
${this.validateMinLength(propertyName)}
${this.validateMaxLength(propertyName)}
${this.validateRegex(propertyName)}
${this.validateEnum(propertyName)}
    `.trim();
    ;
  }


  public validatePresence(propertyName: string): string {
    return `await listener.AssertNotNull(${fixPropertyName(propertyName)},${propertyName});`.trim();
  }

  private validateMinLength(propertyName: string): string {
    if (!this.minLength) {
      return '';
    }
    return `await listener.AssertMinimumLength(${fixPropertyName(propertyName)},${propertyName},${this.minLength});`
  }
  private validateMaxLength(propertyName: string): string {
    if (!this.minLength) {
      return '';
    }
    return `await listener.AssertMaximumLength(${fixPropertyName(propertyName)},${propertyName},${this.minLength});`
  }
  private validateRegex(propertyName: string): string {
    if (!this.pattern) {
      return '';
    }
    return `await listener.AssertRegEx(${fixPropertyName(propertyName)},${propertyName},@"${this.pattern}");`
  }
  private validateEnum(propertyName: string): string {
    if (!this.choices) {
      return '';
    }
    return `await listener.AssertEnum(${fixPropertyName(propertyName)},${propertyName},${this.choices.joinWith((v) => `@"${v}"`)});`
  }
  serializationImplementation(containerName: string, propertyName: string, serializedName: string): string {
    return `${containerName}.SafeAdd( "${serializedName}", ${this.serializeInstanceToJson(propertyName)});`.trim();
  }
  jsondeserialize(propertyName: string): string {
    return `/* string json deserialize for ${propertyName} */`;
  }
  serializeInstanceToJson(instance: string): OneOrMoreStatements {
    return `Carbon.Json.JsonString.Create(${instance})`;
  }
}