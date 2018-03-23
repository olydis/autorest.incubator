import * as message from "../messages";
import * as validation from "../validations";
import { Namespace } from "#csharp/code-dom/namespace";
import { Project } from "../project";
import { State } from "../generator";
import { Dictionary } from "#remodeler/common";
import { Schema, JsonType } from "#remodeler/code-model";
import { ModelClass } from "./class";
import { StringFormat } from "#remodeler/known-format";
import { hasProperties } from "#common/text-manipulation";
import { TypeDeclaration } from "../type-declaration";
import { getKnownFormatType } from "#remodeler/interpretations";

import { Wildcard, UntypedWildcard } from "../primitives/wildcard"
import { EnumClass } from "../support/enum";
import { ByteArray } from "../primitives/byte-array";
import { Boolean, NullableBoolean } from "../primitives/boolean";
import { Float } from "../primitives/floatingpoint";
import { ArrayOf } from "../primitives/array";
import { Integer } from "../primitives/integer";
import { Date } from "../primitives/date";
import { DateTime, DateTime1123 } from "../primitives/date-time";
import { Duration } from "../primitives/duration";
import { Uuid } from "../primitives/Uuid";
import { String, NullableString } from "../primitives/string";
import { Char } from "../primitives/char";
import { PrivateData } from "#csharp/lowlevel-generator/private-data";
import { ModelInterface } from "#csharp/lowlevel-generator/model/interface";


export class ModelsNamespace extends Namespace {

  constructor(parent: Namespace, private schemas: Dictionary<Schema>, private state: State, objectInitializer?: Partial<ModelsNamespace>) {
    super("Models", parent);
    this.apply(objectInitializer);

    // special case... hook this up before we get anywhere.
    state.project.modelsNamespace = this;

    for (const schemaName in schemas) {
      const schema = this.schemas[schemaName];
      const state = this.state.path(schemaName);

      // verify that the model isn't in a bad state
      if (validation.objectWithFormat(schema, state)) {
        continue;
      }
      this.resolveTypeDeclaration(schema, true, state);
    }
  }

  private static INVALID = <any>null;

  public resolveTypeDeclaration(schema: Schema | undefined, required: boolean, state: State): TypeDeclaration {
    if (!schema) {
      throw new Error("SCHEMA MISSING?")
    }
    const privateData: PrivateData = schema.details.privateData;

    // have we done this object already?
    if (privateData.typeDeclaration) {
      return privateData.typeDeclaration;
    }

    // determine if we need a new model class for the type or just a known type object
    switch (schema.type) {
      case JsonType.Object:
        // for certain, this should be a class of some sort.
        if (schema.additionalProperties && !hasProperties(schema.properties)) {
          if (schema.additionalProperties === true) {
            // the object is a wildcard for all key/object-value pairs 
            return privateData.typeDeclaration = new UntypedWildcard();
          } else {
            // the object is a wildcard for all key/<specific-type>-value pairs
            const wcSchema = this.resolveTypeDeclaration(schema.additionalProperties, false, state.path("additionalProperties"));

            return privateData.typeDeclaration = new Wildcard(wcSchema);
          }
        }

        // otherwise, if it has additionalProperties
        // it's a regular object, that has a catch-all for unspecified properties.
        // (handled in ModelClass itself)
        const mc = privateData.classImplementation || new ModelClass(this, schema, this.state);
        return privateData.typeDeclaration = <ModelInterface>privateData.interfaceImplementation;

      case JsonType.String:
        switch (schema.format) {
          case StringFormat.Base64Url:
          case StringFormat.Byte:
            // member should be byte array
            // on wire format should be base64url 
            return privateData.typeDeclaration = new ByteArray();

          case StringFormat.Binary:
            // represent as a stream 
            // wire format is stream of bytes
            throw new Error("Method not implemented.");

          case StringFormat.Char:
            // a single character
            return privateData.typeDeclaration = new Char(schema.enum.length > 0 ? schema.enum : undefined);

          case StringFormat.Date:
            return privateData.typeDeclaration = new Date();

          case StringFormat.DateTime:
            return privateData.typeDeclaration = new DateTime();

          case StringFormat.DateTimeRfc1123:
            return privateData.typeDeclaration = new DateTime1123();

          case StringFormat.Duration:
            return privateData.typeDeclaration = new Duration();

          case StringFormat.Uuid:
            return privateData.typeDeclaration = new Uuid();

          case StringFormat.Password:
          case StringFormat.None:
          case undefined:
          case null:
            if (schema.extensions["x-ms-enum"]) {
              // this value is an enum type instead of a plain string. 
              const ec = state.project.supportNamespace.findClassByName(schema.extensions["x-ms-enum"].name);
              if (ec.length > 0) {
                return privateData.typeDeclaration = <EnumClass>ec[0];
              }
              return privateData.typeDeclaration = new EnumClass(schema, state);
            }

            // just a regular old string.
            return privateData.typeDeclaration = required ? new String(schema.minLength, schema.maxLength, schema.pattern, schema.enum.length > 0 ? schema.enum : undefined) : new NullableString(schema.minLength, schema.maxLength, schema.pattern, schema.enum.length > 0 ? schema.enum : undefined);

          default:
            state.error(`Schema with type:'${schema.type} and 'format:'${schema.format}' is not recognized.`, message.DoesNotSupportEnum);
        }
        break;

      case JsonType.Boolean:
        return privateData.typeDeclaration = required ? new Boolean() : new NullableBoolean();

      case JsonType.Integer:
        return privateData.typeDeclaration = new Integer();

      case JsonType.Number:
        return privateData.typeDeclaration = new Float();

      case JsonType.Array:
        const aSchema = this.resolveTypeDeclaration(<Schema>schema.items, true, state.path("items"));
        return privateData.typeDeclaration = new ArrayOf(aSchema);

      case undefined:
        console.error(`schema 'undefined': ${schema.details.name} `);
        // "any" case
        // this can happen when a model is just an all-of something else. (sub in the other type?)
        break;

      default:
        this.state.error(`Schema is declared with invalid type '${schema.type}'`, message.UnknownJsonType);
        return ModelsNamespace.INVALID;
    }
    return ModelsNamespace.INVALID;
  }
}

/* 
 Note: removed validation from above -- the validation should be in a separate step before we get into the cs* extensions.

public resolveTypeDeclaration(schema: Schema | undefined, required: boolean, state: State): TypeDeclaration {
    if (!schema) {
      throw new Error("SCHEMA MISSING?")
    }
    // have we done this object already?
    if (privateData.typeDeclaration) {
      return privateData.typeDeclaration;
    }

    // determine if we need a new model class for the type or just a known type object
    switch (schema.type) {
      case JsonType.Object:
        // for certain, this should be a class of some sort.
        if (schema.additionalProperties && !hasProperties(schema.properties)) {
          if (schema.additionalProperties === true) {
            // the object is a wildcard for all key/object-value pairs
            return privateData.typeDeclaration = new UntypedWildcard();
          } else {
            // the object is a wildcard for all key/<specific-type>-value pairs
            const wcSchema = this.resolveTypeDeclaration(schema.additionalProperties, false, state.path("additionalProperties"));

            return privateData.typeDeclaration = new Wildcard(wcSchema);
          }
        }

        // otherwise, if it has additionalProperties
        // it's a regular object, that has a catch-all for unspecified properties.
        // (handled in ModelClass itself)

        const mc = privateData.classImplementation || new ModelClass(this, schema, this.state);
        privateData.typeDeclaration = privateData.interfaceInplementation;
        return privateData.typeDeclaration;

      case JsonType.String:
        switch (schema.format) {
          case StringFormat.Base64Url:
          case StringFormat.Byte:
            if (validation.schemaHasEnum(schema, state)) {
              return ModelsNamespace.INVALID;
            }
            // member should be byte array
            // on wire format should be base64url
            return privateData.typeDeclaration = new ByteArray();

          case StringFormat.Binary:
            if (validation.schemaHasEnum(schema, state)) {
              return ModelsNamespace.INVALID;
            }
            // represent as a stream
            // wire format is stream of bytes
            throw new Error("Method not implemented.");

          case StringFormat.Char:
            // a single character
            if (validation.hasXmsEnum(schema, state)) {
              return ModelsNamespace.INVALID;
            }
            return privateData.typeDeclaration = new Char(schema.enum.length > 0 ? schema.enum : undefined);

          case StringFormat.Date:
            if (validation.schemaHasEnum(schema, state)) {
              return ModelsNamespace.INVALID;
            }

            return privateData.typeDeclaration = new Date();

          case StringFormat.DateTime:
            if (validation.schemaHasEnum(schema, state)) {
              return ModelsNamespace.INVALID;
            }
            return privateData.typeDeclaration = new DateTime();

          case StringFormat.DateTimeRfc1123:
            if (validation.schemaHasEnum(schema, state)) {
              return ModelsNamespace.INVALID;
            }
            return privateData.typeDeclaration = new DateTime1123();

          case StringFormat.Duration:
            if (validation.schemaHasEnum(schema, state)) {
              return ModelsNamespace.INVALID;
            }
            return privateData.typeDeclaration = new Duration();

          case StringFormat.Uuid:
            if (validation.hasXmsEnum(schema, state)) {
              return ModelsNamespace.INVALID;
            }
            return privateData.typeDeclaration = new Uuid();

          case StringFormat.Password:
          case StringFormat.None:
          case undefined:
          case null:
            if (schema.extensions["x-ms-enum"]) {
              // this value is an enum type instead of a plain string.
              const ec = state.project.supportNamespace.findClassByName(schema.extensions["x-ms-enum"].name);
              if (ec.length > 0) {
                return privateData.typeDeclaration = <EnumClass>ec[0];
              }
              return privateData.typeDeclaration = new EnumClass(schema, state);
            }
            // just a regular old string.
            return privateData.typeDeclaration = new String(schema.minLength, schema.maxLength, schema.pattern, schema.enum.length > 0 ? schema.enum : undefined);

          default:
            state.error(`Schema with type:'${schema.type} and 'format:'${schema.format}' is not recognized.`, message.DoesNotSupportEnum);
        }
        break;

      case JsonType.Boolean:
        if (validation.hasXmsEnum(schema, state)) {
          return ModelsNamespace.INVALID;
        }
        return privateData.typeDeclaration = required ? new Boolean() : new NullableBoolean();

      case JsonType.Integer:
        if (validation.hasXmsEnum(schema, state)) {
          return ModelsNamespace.INVALID;
        }
        return privateData.typeDeclaration = new Integer();

      case JsonType.Number:
        if (validation.hasXmsEnum(schema, state)) {
          return ModelsNamespace.INVALID;
        }
        return privateData.typeDeclaration = new Float();

      case JsonType.Array:
        if (validation.hasXmsEnum(schema, state)) {
          return ModelsNamespace.INVALID;
        }
        if (validation.arrayMissingItems(schema, state)) {
          return ModelsNamespace.INVALID;
        }
        const aSchema = this.resolveTypeDeclaration(<Schema>schema.items, true, state.path("items"));
        return privateData.typeDeclaration = new ArrayOf(aSchema);

      case undefined:
        console.error(`schema 'undefined': ${schema.details.name} `);
        // "any" case
        // this can happen when a model is just an all-of something else. (sub in the other type?)
        break;

      default:
        this.state.error(`Schema is declared with invalid type '${schema.type}'`, message.UnknownJsonType);
        return ModelsNamespace.INVALID;
    }
    return ModelsNamespace.INVALID;
  }








}


  
  
 */
