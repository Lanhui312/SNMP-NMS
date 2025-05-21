// mib.js
import fs from "fs";
import path from "path";

export default function MIB(dir) {
  // Initialize a bunch of local helper functions and variables
  const initializeBuffer = function (buffer) {
    return Object.assign(buffer, {
      logit: false,
      lastChar: '',
      state: '',
      open: false,
      CurrentSymbol: '',
      nested: 0,
      isComment: false,
      isEqual: false,
      isOID: false,
      isList: false,
      isString: false,
      inComment: false,
      inGroup: 0,
      builder: '',
      ColumnIndex: 0,
      RowIndex: 0,
      PreviousRow: 0
    });
  };

  const newMIB = ({
    directory: dir || '',
    SymbolBuffer: {},
    StringBuffer: '',
    Modules: {},
    Objects: {},
    MACROS: [],
    CurrentObject: null,
    TempObject: {},
    CurrentClause: '',
    WaitFor: '',
    CharBuffer: {
      Table: {},
      ModuleName: {},
      Append(char) {
        this.builder += char;
      },
      Fill(FileName, row, column) {
        if (this.builder.length === 0) {
          return;
        }
        column = (column - this.builder.length);
        const symbol = this.builder.toString().trim();
        this.builder = "";
        if (!this.Table[FileName]) {
          this.Table[FileName] = [];
        } else if (this.PreviousRow < row) {
          this.RowIndex++;
          this.ColumnIndex = 0;
          this.PreviousRow = row;
        }
        const R = this.RowIndex;
        const C = this.ColumnIndex;

        if (!this.Table[FileName][R] || C === 0) {
          this.Table[FileName][R] = Object.defineProperty([], "line", {
            enumerable: false,
            value: row + 1
          });
        }
        this.isEqual = false;
        switch (symbol) {
          case ')':
            this.Table[FileName][R][C] = symbol;
            this.ColumnIndex++;
            this.logit = false;
            break;
          case '(':
            this.Table[FileName][R][C] = symbol;
            this.ColumnIndex++;
            this.logit = true;
            break;
          case 'DEFINITIONS':
            if (C === 0) {
              this.ModuleName[FileName] = this.Table[FileName][R - 1][C];
            } else {
              this.ModuleName[FileName] = this.Table[FileName][R][C - 1];
            }
            this.Table[FileName][R][C] = symbol;
            this.ColumnIndex++;
            break;
          case '::=':
            this.Table[FileName][R][C] = symbol;
            this.ColumnIndex++;
            this.isEqual = true;
            break;
          case '{':
            if (this.Table[FileName][R][C - 1] !== '::=') {
              this.isList = true;
            }
            this.Table[FileName][R][C] = symbol;
            this.ColumnIndex++;
            break;
          case 'NOTATION':
            if (
              this.Table[FileName][R][C - 1] === 'TYPE' ||
              this.Table[FileName][R][C - 1] === 'VALUE'
            ) {
              this.Table[FileName][R][C - 1] += ' NOTATION';
            }
            break;
          case 'OF':
            if (this.Table[FileName][R][C - 1] === 'SEQUENCE') {
              this.Table[FileName][R][C - 1] = 'SEQUENCE OF';
            }
            break;
          case 'IDENTIFIER':
            if (this.Table[FileName][R][C - 1] === 'OBJECT') {
              this.Table[FileName][R][C - 1] = 'OBJECT IDENTIFIER';
            }
            break;
          case 'STRING':
            if (this.Table[FileName][R][C - 1] === 'OCTET') {
              this.Table[FileName][R][C - 1] = 'OCTET STRING';
            }
            break;
          default:
            this.Table[FileName][R][C] = symbol;
            this.ColumnIndex++;
            break;
        }
      }
    },
    Import(FileName) {
      this.ParseModule(
        path.basename(FileName, path.extname(FileName)),
        fs.readFileSync(FileName).toString()
      );
    },
    ParseModule(FileName, Contents) {
      initializeBuffer(this.CharBuffer);

      const lines = Contents.split('\n');
      let line = '';
      let i = 0;
      while ((line = lines[i]) != null && i <= lines.length) {
        this.ParseLine(FileName, line, i);
        i++;
      }
    },
    ParseLine(FileName, line, row) {
      let len = line.length;
      if (line[len - 1] === '\r') {
        --len;
      }
      for (let i = 0; i < len; i++) {
        const char = line.charAt(i);
        this.ParseChar(FileName, char, row, i);
      }
      this.ParseChar(FileName, '\n', row, len);
    },
    ParseChar(FileName, char, row, column) {
      switch (char) {
        case '\r':
        case '\n':
          if (!this.CharBuffer.isString) {
            this.CharBuffer.Fill(FileName, row, column);
            this.CharBuffer.isComment = false;
            this.CharBuffer.inGroup = 0; //IGNORE GROUPINGS ACROSS COMMENTS
          } else if (this.CharBuffer.isString && this.CharBuffer.isComment) {
            this.CharBuffer.Append(char);
          }
          break;
        case '{':
          if (!this.CharBuffer.isComment && this.CharBuffer.isEqual) {
            this.CharBuffer.isOID = true;
          }
          // fall through
        case '[':
        case '(':
          if (!this.CharBuffer.isComment && !this.CharBuffer.isString) {
            this.CharBuffer.nested++;
            if (char === '(' || char === '{') {
              // Emit the previous token if this is the start of an outer group
              if (this.CharBuffer.nested === 1) {
                this.CharBuffer.Fill(FileName, row, column);
              }
              this.CharBuffer.inGroup++;
            }
          }
          if (
            this.CharBuffer.isComment ||
            ((this.CharBuffer.isOID || this.CharBuffer.nested > 0) &&
              (!this.CharBuffer.isList || this.CharBuffer.inGroup > 0))
          ) {
            this.CharBuffer.Append(char);
          } else {
            this.CharBuffer.Fill(FileName, row, column);
            this.CharBuffer.Append(char);
            this.CharBuffer.Fill(FileName, row, column);
          }
          break;
        case '}':
        case ']':
        case ')':
          if (!this.CharBuffer.isComment && !this.CharBuffer.isString) {
            this.CharBuffer.nested--;
            if (this.CharBuffer.nested < 0) {
              this.CharBuffer.nested = 0;
            }
            if (char === ')') {
              this.CharBuffer.inGroup--;
              if (this.CharBuffer.inGroup < 0) {
                this.CharBuffer.inGroup = 0; // ignore grouping across comments
              }
            }
          }
          if (
            this.CharBuffer.isComment ||
            ((this.CharBuffer.isOID || this.CharBuffer.nested >= 0) &&
              (!this.CharBuffer.isList || this.CharBuffer.inGroup >= 0))
          ) {
            this.CharBuffer.Append(char);
          } else {
            this.CharBuffer.Fill(FileName, row, column);
            this.CharBuffer.Append(char);
            this.CharBuffer.Fill(FileName, row, column);
          }
          if (char === '}') {
            this.CharBuffer.isOID = false;
            this.CharBuffer.isList = false;
          }
          break;
        case ',':
          if (this.CharBuffer.isComment) {
            this.CharBuffer.Append(char);
          } else {
            this.CharBuffer.Fill(FileName, row, column);
            this.CharBuffer.Append(char);
            this.CharBuffer.Fill(FileName, row, column);
          }
          break;
        case ';':
          if (this.CharBuffer.isComment) {
            this.CharBuffer.Append(char);
          } else {
            this.CharBuffer.Fill(FileName, row, column);
            this.CharBuffer.Append(char);
            this.CharBuffer.Fill(FileName, row, column);
          }
          break;
        case ' ':
        case '\t':
          if (
            this.CharBuffer.isComment ||
            ((this.CharBuffer.isOID || this.CharBuffer.nested > 0) &&
              (!this.CharBuffer.isList || this.CharBuffer.inGroup > 0))
          ) {
            this.CharBuffer.Append(char);
          } else {
            this.CharBuffer.Fill(FileName, row, column);
          }
          break;
        case '-':
          this.CharBuffer.Append(char);
          if (!this.CharBuffer.isString && this.CharBuffer.lastChar === '-') {
            this.CharBuffer.isComment = true;
            this.CharBuffer.builder = this.CharBuffer.builder.split('--')[0];
            this.CharBuffer.Fill(FileName, row, column);
            this.CharBuffer.builder = '--';
          }
          break;
        case '"':
          if (
            this.CharBuffer.isComment &&
            !this.CharBuffer.isString &&
            !this.CharBuffer.inComment
          ) {
            // 011 = COMMENT
            // IF 011 SET 101
            this.CharBuffer.isComment = true;
            this.CharBuffer.isString = false;
            this.CharBuffer.inComment = true;
          } else if (
            !this.CharBuffer.isComment &&
            !this.CharBuffer.isString &&
            !this.CharBuffer.inComment
          ) {
            // 000 = STRING
            // IF 000 SET 110
            this.CharBuffer.isComment = true;
            this.CharBuffer.isString = true;
            this.CharBuffer.inComment = false;
            this.CharBuffer.Fill(FileName, row, column); //new string
          } else if (
            this.CharBuffer.isComment &&
            this.CharBuffer.isString &&
            !this.CharBuffer.inComment
          ) {
            // 110 = END STRING
            // IF 110 SET 000
            this.CharBuffer.isComment = false;
            this.CharBuffer.isString = false;
            this.CharBuffer.inComment = false;
          } else if (
            this.CharBuffer.isComment &&
            !this.CharBuffer.isString &&
            this.CharBuffer.inComment
          ) {
            // 101 = END COMMENT
            // IF 101 SET 000
            this.CharBuffer.isComment = true;
            this.CharBuffer.isString = false;
            this.CharBuffer.inComment = false;
          }

          if (this.CharBuffer.isComment) {
            this.CharBuffer.Append(char);
          } else {
            this.CharBuffer.Append(char);
            this.CharBuffer.Fill(FileName, row, column);
          }
          break;
        default:
          this.CharBuffer.Append(char);
          break;
      }
      this.CharBuffer.lastChar = char;
    },
    Serialize() {
      const { Table } = this.CharBuffer;
      let ModuleName = '';
      for (const fileName in Table) {
        ModuleName = this.CharBuffer.ModuleName[fileName];
        this.SymbolBuffer[ModuleName] = [];
        let foundTheEnd = false;
        let lastGoodDeclaration = ['none'];
        const file = Table[fileName];
        for (let r = 0; r < file.length; r++) {
          const row = file[r];
          for (let c = 0; c < row.length; c++) {
            const symbol = row[c];
            let addSymbol = true;
            switch (symbol) {
              case 'END':
                foundTheEnd = true;
                break;
              case '::=':
                foundTheEnd = false;
                lastGoodDeclaration = row;
                break;
              default:
                if (symbol.startsWith('--')) {
                  // Remove comments
                  addSymbol = false;
                } else {
                  foundTheEnd = false;
                }
            }
            if (addSymbol) {
              this.SymbolBuffer[ModuleName].push(symbol);
            }
          }
        }
        if (!foundTheEnd) {
          // Warn that the contents are malformed
          console.warn(
            '[%s]: Incorrect formatting: no END statement found - last good declaration "%s" (line %s)',
            ModuleName,
            lastGoodDeclaration.join(' '),
            lastGoodDeclaration.line
          );
        }
      }
      this.Compile();
    },
    Compile() {
      for (const ModuleName in this.SymbolBuffer) {
        if (this.SymbolBuffer.hasOwnProperty(ModuleName)) {
          if (!this.Modules[ModuleName]) {
            this.Modules[ModuleName] = {};
          }
          const Module = this.Modules[ModuleName];
          const Symbols = this.SymbolBuffer[ModuleName];
          let ObjectContainer = Module;
          let MACROName = '';
          const unresolvedObjects = [];

          for (let i = 0; i < Symbols.length; i++) {
            switch (Symbols[i]) {
              case '::=': {
                // If an object assignment list is next, the next symbol is a '{' for the integer list
                const isObjectIdentifierAssignment = Symbols[i + 1].indexOf('{') === 0;
                // If it is a TRAP-TYPE macro (SMIv1), the next symbol is an integer
                const isTrapTypeDefinition = Number.isInteger(Number.parseInt(Symbols[i + 1]));

                if (isObjectIdentifierAssignment || isTrapTypeDefinition) {
                  // We need to see if there's a macro up above, or if it’s an OBJECT IDENTIFIER
                  let macroIndex = i - 1;
                  let found = false;
                  while (!found && macroIndex > 0) {
                    macroIndex--;
                    for (let m = 0; m < this.MACROS.length; m++) {
                      if (Symbols[macroIndex] === this.MACROS[m]) {
                        found = true;
                        break;
                      }
                    }
                  }
                  // Internal MIB node assignment is marked by an 'OBJECT IDENTIFIER' tag before the ::=
                  if (Symbols[i - 1] === 'OBJECT IDENTIFIER') {
                    ObjectContainer[Symbols[i - 2]] = {};
                    ObjectContainer[Symbols[i - 2]].ObjectName = Symbols[i - 2];
                    ObjectContainer[Symbols[i - 2]].ModuleName = ModuleName;
                    ObjectContainer[Symbols[i - 2]]['OBJECT IDENTIFIER'] = Symbols[i + 1]
                      .replace('{', '')
                      .replace('}', '')
                      .trim()
                      .replace(/\s+/, ' ');

                    if (
                      ObjectContainer[Symbols[i - 2]]['OBJECT IDENTIFIER'] === '0 0'
                    ) {
                      ObjectContainer[Symbols[i - 2]].OID = '0.0';
                      ObjectContainer[Symbols[i - 2]].NameSpace = 'null';
                    } else {
                      const { oidString, nameString, unresolvedObject } =
                        this.getOidAndNamePaths(
                          ObjectContainer[Symbols[i - 2]]['OBJECT IDENTIFIER'],
                          Symbols[i - 2],
                          ModuleName
                        );
                      ObjectContainer[Symbols[i - 2]].OID = oidString;
                      ObjectContainer[Symbols[i - 2]].NameSpace = nameString;
                      if (unresolvedObject) {
                        if (!unresolvedObjects.includes(unresolvedObject)) {
                          unresolvedObjects.push(unresolvedObject);
                        }
                      }
                    }
                  } else {
                    // Leaf MIB node assignments
                    const ObjectName = Symbols[macroIndex - 1];
                    ObjectContainer[ObjectName] = {};
                    ObjectContainer[ObjectName].ObjectName = ObjectName;
                    ObjectContainer[ObjectName].ModuleName = ModuleName;
                    ObjectContainer[ObjectName].MACRO = Symbols[macroIndex];

                    // Build MACRO object
                    const MACRO = this[Symbols[macroIndex]];
                    let c1 = macroIndex;
                    const keychain = [];
                    keychain.push('DESCRIPTION');
                    for (const notation in MACRO['TYPE NOTATION']) {
                      let key = notation;
                      if (MACRO['TYPE NOTATION'][notation] == null) {
                        key = MACRO[notation]['MACRO'].replace(/"/g, '');
                      }
                      keychain.push(key);
                    }
                    while (c1 < i - 1) {
                      c1++;
                      const key = Symbols[c1];
                      if (keychain.indexOf(key) > -1 || key === 'REVISION') {
                        let val = Symbols[c1 + 1].replace(/"/g, '');
                        if (val.indexOf('{') === 0) {
                          c1++;
                          while (Symbols[c1].indexOf('}') === -1) {
                            c1++;
                            val += Symbols[c1];
                          }
                          if (key === 'DEFVAL') {
                            // e.g. DEFVAL { 1500 }
                            val = val.replace(/^{/, '').replace(/}$/, '').trim();
                          } else {
                            // e.g. an array of enumerations
                            val = val
                              .replace('{', '')
                              .replace('}', '')
                              .split(',')
                              .map((v) => v.trim());
                          }
                        }
                        switch (key) {
                          case 'SYNTAX': {
                            switch (val) {
                              case 'BITS':
                              case 'INTEGER':
                              case 'Integer32':
                                if (Symbols[c1 + 2].indexOf('{') === 0) {
                                  // enumerations
                                  const valObj = val;
                                  val = {};
                                  val[valObj] = {};
                                  c1 += 1;
                                  let integer;
                                  let syntax;
                                  const regExp = /\(([^)]+)\)/;
                                  while (Symbols[c1].indexOf('}') === -1) {
                                    c1++;
                                    let ok = false;
                                    if (
                                      Symbols[c1].indexOf('(') === 0 &&
                                      Symbols[c1].length > 1
                                    ) {
                                      integer = regExp.exec(Symbols[c1]);
                                      syntax = Symbols[c1 - 1];
                                      ok = true;
                                    } else if (Symbols[c1].indexOf('(') > 0) {
                                      integer = regExp.exec(Symbols[c1]);
                                      syntax = Symbols[c1].split('(')[0];
                                      ok = true;
                                    }
                                    if (
                                      syntax &&
                                      syntax.indexOf('{') === 0
                                    ) {
                                      syntax = syntax.split('{')[1].trim();
                                    }
                                    if (ok) {
                                      val[valObj][integer[1]] = syntax;
                                    }
                                  }
                                } else if (Symbols[c1 + 2].indexOf('(') === 0) {
                                  // integer range
                                  const valObj = val;
                                  val = {};
                                  val[valObj] = {
                                    ranges: this.GetRanges(Symbols[c1 + 2])
                                  };
                                }
                                break;
                              case 'OCTET STRING':
                              case 'DisplayString':
                                if (
                                  Symbols[c1 + 2].replace(/ */g, '').startsWith(
                                    '(SIZE'
                                  )
                                ) {
                                  const valObj = val;
                                  val = {};
                                  val[valObj] = {
                                    sizes: this.GetRanges(Symbols[c1 + 2])
                                  };
                                }
                                break;
                              case 'SEQUENCE OF':
                                val += ` ${Symbols[c1 + 2]}`;
                                c1 += 2;
                                break;
                              default:
                                break;
                            }
                            ObjectContainer[ObjectName][key] = val;
                            break;
                          }
                          case 'DESCRIPTION':
                            if (!ObjectContainer[ObjectName][key]) {
                              ObjectContainer[ObjectName][key] = val;
                            }
                            if (!ObjectContainer[ObjectName]['REVISIONS-DESCRIPTIONS']) {
                              ObjectContainer[ObjectName]['REVISIONS-DESCRIPTIONS'] = [];
                            }
                            ObjectContainer[ObjectName]['REVISIONS-DESCRIPTIONS'].push({
                              type: 'DESCRIPTION',
                              value: val
                            });
                            break;
                          case 'REVISION':
                            if (!ObjectContainer[ObjectName]['REVISIONS-DESCRIPTIONS']) {
                              ObjectContainer[ObjectName]['REVISIONS-DESCRIPTIONS'] = [];
                            }
                            ObjectContainer[ObjectName]['REVISIONS-DESCRIPTIONS'].push({
                              type: 'REVISION',
                              value: val
                            });
                            break;
                          default:
                            ObjectContainer[ObjectName][key] = val;
                            break;
                        }
                      }
                    }
                    ObjectContainer[Symbols[macroIndex - 1]].ObjectName =
                      Symbols[macroIndex - 1];
                    ObjectContainer[Symbols[macroIndex - 1]].ModuleName = ModuleName;
                    if (isObjectIdentifierAssignment) {
                      ObjectContainer[Symbols[macroIndex - 1]][
                        'OBJECT IDENTIFIER'
                      ] = Symbols[i + 1]
                        .replace('{', '')
                        .replace('}', '')
                        .trim()
                        .replace(/\s+/, ' ');
                      if (
                        ObjectContainer[Symbols[macroIndex - 1]][
                          'OBJECT IDENTIFIER'
                        ] === '0 0'
                      ) {
                        ObjectContainer[Symbols[macroIndex - 1]].OID = '0.0';
                        ObjectContainer[Symbols[macroIndex - 1]].NameSpace = 'null';
                      } else {
                        const { oidString, nameString, unresolvedObject } =
                          this.getOidAndNamePaths(
                            ObjectContainer[Symbols[macroIndex - 1]][
                              'OBJECT IDENTIFIER'
                            ],
                            Symbols[macroIndex - 1],
                            ModuleName
                          );
                        ObjectContainer[Symbols[macroIndex - 1]].OID = oidString;
                        ObjectContainer[Symbols[macroIndex - 1]].NameSpace = nameString;
                        if (unresolvedObject) {
                          if (!unresolvedObjects.includes(unresolvedObject)) {
                            unresolvedObjects.push(unresolvedObject);
                          }
                        }
                      }
                    } else if (isTrapTypeDefinition) {
                      ObjectContainer[Symbols[macroIndex - 1]].VALUE =
                        Number.parseInt(Symbols[i + 1]);
                    }
                    // Clean up single DESCRIPTION entry
                    if (
                      ObjectContainer[Symbols[macroIndex - 1]]['REVISIONS-DESCRIPTIONS'] &&
                      ObjectContainer[Symbols[macroIndex - 1]]['REVISIONS-DESCRIPTIONS']
                        .length === 1 &&
                      ObjectContainer[Symbols[macroIndex - 1]]['REVISIONS-DESCRIPTIONS'][0]
                        .type === 'DESCRIPTION'
                    ) {
                      delete ObjectContainer[Symbols[macroIndex - 1]]['REVISIONS-DESCRIPTIONS'];
                    }
                  }
                } else {
                  // Possibly a macro definition or SMIv1 leftover
                  switch (Symbols[i - 1]) {
                    case 'DEFINITIONS':
                      break;
                    case 'OBJECT IDENTIFIER':
                      break;
                    case 'MACRO':
                      ObjectContainer = ObjectContainer[Symbols[i - 2]] = {};
                      MACROName = Symbols[i - 2];
                      break;
                    case 'VALUE NOTATION':
                    case 'TYPE NOTATION': {
                      ObjectContainer[Symbols[i - 1]] = {};
                      let j = i + 1;
                      while (
                        Symbols[j + 1] !== '::=' &&
                        Symbols[j + 1] !== 'END'
                      ) {
                        if (Symbols[j].indexOf('"') === 0) {
                          const value = Symbols[j + 1];
                          let t = j + 1;
                          if (Symbols[j + 2].indexOf('(') === 0) {
                            t = j + 2;
                          }
                          ObjectContainer[Symbols[i - 1]][
                            Symbols[j].replace(/"/g, '')
                          ] = value;
                          j = t;
                        } else {
                          ObjectContainer[Symbols[i - 1]][Symbols[j]] = null;
                          if (Symbols[j + 1].indexOf('(') === 0) {
                            ObjectContainer[Symbols[i - 1]][Symbols[j]] =
                              Symbols[j + 1];
                            j++;
                          }
                        }
                        j++;
                      }
                      // Workaround for missing fields in SMI macros
                      if (ModuleName === 'SNMPv2-SMI') {
                        ObjectContainer['TYPE NOTATION'].INDEX = 'Index';
                        ObjectContainer['TYPE NOTATION'].AUGMENTS = 'Augments';
                        ObjectContainer['TYPE NOTATION'].ACCESS = 'Access';
                      } else if (ModuleName === 'RFC-1212') {
                        ObjectContainer['TYPE NOTATION'].INDEX = 'Index';
                        ObjectContainer['TYPE NOTATION'].ACCESS = 'Access';
                      }
                      break;
                    }
                    default:
                      // New object
                      ObjectContainer[Symbols[i - 1]] = {};
                      ObjectContainer[Symbols[i - 1]].ObjectName = Symbols[i - 1];
                      ObjectContainer[Symbols[i - 1]].ModuleName = ModuleName;
                      ObjectContainer[Symbols[i - 1]].MACRO = Symbols[i + 1];
                      this.BuildObject(
                        ObjectContainer,
                        Symbols[i - 1],
                        Symbols[i + 1],
                        i,
                        Symbols
                      );
                      break;
                  }
                }
                break;
              }
              case 'END':
                if (MACROName !== '') {
                  // Store the macro on this MIB instance
                  this[MACROName] = ObjectContainer;
                  this.MACROS.push(MACROName);
                }
                // Reset container
                ObjectContainer = Module;
                MACROName = '';
                break;
              case 'IMPORTS': {
                Module.IMPORTS = {};
                let tmp = i + 1;
                const IMPORTS = [];
                while (Symbols[tmp] !== ';') {
                  if (Symbols[tmp] === 'FROM') {
                    const ImportModule = Symbols[tmp + 1];
                    if (!this.Modules[ImportModule]) {
                      console.log(
                        `${ModuleName}: Cannot find ${ImportModule} !`
                      );
                      console.log(`${ModuleName}: Cannot import `, IMPORTS);
                    }
                    Module.IMPORTS[ImportModule] = IMPORTS;
                    tmp++;
                    IMPORTS.length = 0;
                  } else if (Symbols[tmp] !== ',') {
                    IMPORTS.push(Symbols[tmp]);
                  }
                  tmp++;
                }
                break;
              }
              case 'EXPORTS':
                // SMIv1 might do EXPORTS; in SMIv2 all symbols are exported
                break;
              default:
                break;
            }
          }

          // Attempt OID/namespace reconstruction for still-unresolved objects
          if (unresolvedObjects.length > 0) {
            for (const unresolved of unresolvedObjects) {
              const obj = this.Modules[ModuleName][unresolved];
              const { oidString, nameString, unresolvedObject } =
                this.getOidAndNamePaths(
                  obj['OBJECT IDENTIFIER'],
                  unresolved,
                  ModuleName
                );
              this.Modules[ModuleName][unresolved].NameSpace = nameString;
              this.Modules[ModuleName][unresolved].OID = oidString;
              if (unresolvedObject) {
                if (obj.NameSpace) {
                  const unresolvedParent = obj.NameSpace.split('.')[1];
                  if (unresolvedParent !== obj.ObjectName) {
                    console.warn(
                      `Unable to mount node '${obj.ObjectName}', cannot resolve parent object '${unresolvedParent}'.`
                    );
                    continue;
                  }
                }
                console.warn(
                  `Unable to mount node '${obj.ObjectName}', cannot resolve object identifier '${obj['OBJECT IDENTIFIER']}'.`
                );
              }
            }
          }
        }
      }
    },
    GetRanges(mibRanges) {
      let rangesString = mibRanges
        .replace(/ */g, '')
        .replace(/\(SIZE/, '')
        .replace(/\)/, '')
        .replace(/\(/, '')
        .replace(/\)/, '');
      const rangeStrings = rangesString.split('|');
      const ranges = [];
      for (const rangeString of rangeStrings) {
        if (rangeString.includes('..')) {
          const range = rangeString.split('..');
          ranges.push({
            min: parseInt(range[0], 10),
            max: parseInt(range[1], 10)
          });
        } else {
          ranges.push({
            min: parseInt(rangeString, 10),
            max: parseInt(rangeString, 10)
          });
        }
      }
      return ranges;
    },
    BuildObject(ObjectContainer, ObjectName, macro, i, Symbols) {
      const syntaxKeyword = Symbols.indexOf('SYNTAX', i);
      const m = syntaxKeyword - i;
      const c1 = syntaxKeyword + 1;
      const SYNTAX = Symbols[c1];
      const val = Symbols[c1 + 1];

      // Normal macros
      if (this.MACROS.indexOf(macro) > -1 && m < 10) {
        if (val[0] === '{') {
          this.BuildObjectEnumeration(ObjectContainer, ObjectName, c1, SYNTAX, val, Symbols);
        } else if (val[0] === '(') {
          const key = val.startsWith('(SIZE') ? 'sizes' : 'ranges';
          ObjectContainer[ObjectName].SYNTAX = {};
          ObjectContainer[ObjectName].SYNTAX[SYNTAX] = { [key]: this.GetRanges(val) };
        } else {
          ObjectContainer[ObjectName].SYNTAX = SYNTAX;
        }
      }
      // SMIv1 INTEGER enumerations
      else if (Symbols[i + 1] === 'INTEGER') {
        let c2 = i + 1;
        const localSyntax = 'INTEGER';
        let localVal = Symbols[c2 + 1];
        if (localVal[0] === '{') {
          this.BuildObjectEnumeration(ObjectContainer, ObjectName, c2, localSyntax, localVal, Symbols);
        }
      }
    },
    BuildObjectEnumeration(ObjectContainer, ObjectName, c1, SYNTAX, val, Symbols) {
      c1++;
      while (Symbols[c1].indexOf('}') === -1) {
        c1++;
        val += Symbols[c1].trim();
      }
      const enumerations = val.replace('{', '').replace('}', '').split(',');
      ObjectContainer[ObjectName].SYNTAX = {};
      ObjectContainer[ObjectName].SYNTAX[SYNTAX] = {};
      for (let i = 0; i < enumerations.length; i++) {
        const openParenSplit = enumerations[i].split(/\s*\(\s*/);
        ObjectContainer[ObjectName].SYNTAX[SYNTAX][
          openParenSplit[1].replace(/\s*\)\s*$/, '')
        ] = openParenSplit[0].trimStart();
      }
    },
    GetSummary(callback) {
      let summary = '';
      for (const ModuleName in this.Modules) {
        if (this.Modules.hasOwnProperty(ModuleName)) {
          for (const ObjectName in this.Modules[ModuleName]) {
            if (this.Modules[ModuleName].hasOwnProperty(ObjectName)) {
              if (this.Modules[ModuleName][ObjectName].OID) {
                summary +=
                  `${this.Modules[ModuleName][ObjectName].OID} : ` +
                  `${ObjectName}\r\n`;
              }
            }
          }
        }
      }
      callback(summary);
    },
    getOidAndNamePaths(OBJECT_IDENTIFIER, ObjectName, ModuleName) {
      const entries = OBJECT_IDENTIFIER.split(/\s+/);
      const parent = entries.shift();
      const finalEntries = entries.pop();
      const nameEntries = [];
      const oidEntries = [];

      // Middle entries
      for (const entry of entries) {
        const match = entry.match(/(.*)\((.+)\)$/);
        if (match) {
          oidEntries.push(match[2]);
          nameEntries.push(match[1]);
        } else {
          oidEntries.push(entry);
          nameEntries.push(entry);
        }
      }

      // final entry
      let finalOid;
      if (finalEntries.includes('(')) {
        const oidSplit = finalEntries.match(/(.*)\((.+)\)$/);
        finalOid = oidSplit[2];
      } else {
        finalOid = finalEntries;
      }
      oidEntries.push(finalOid);
      nameEntries.push(ObjectName);

      let parentOidPrefix;
      let parentNamePrefix;
      let unresolvedObject;

      if (parent === 'iso') {
        parentOidPrefix = '1';
        parentNamePrefix = 'iso';
      } else {
        // find parent object in this module or in imported ones
        let parentObject = this.Modules[ModuleName][parent];
        if (!parentObject) {
          const importModules = Object.keys(this.Modules[ModuleName].IMPORTS || {});
          for (const importModule of importModules) {
            if (this.Modules[importModule] && this.Modules[importModule][parent]) {
              parentObject = this.Modules[importModule][parent];
              break;
            }
          }
        }
        if (!parentObject) {
          unresolvedObject = ObjectName;
          return {
            oidString: `.${oidEntries.join('.')}`,
            nameString: `.${nameEntries.join('.')}`,
            unresolvedObject
          };
        }
        if (parentObject.OID.startsWith('.')) {
          unresolvedObject = ObjectName;
        }
        parentOidPrefix = parentObject.OID;
        parentNamePrefix = parentObject.NameSpace;
      }
      return {
        oidString: `${parentOidPrefix}.${oidEntries.join('.')}`,
        nameString: `${parentNamePrefix}.${nameEntries.join('.')}`,
        unresolvedObject: unresolvedObject || undefined
      };
    }
  });

  initializeBuffer(newMIB.CharBuffer);

  return newMIB;
}
