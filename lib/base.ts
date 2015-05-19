/// <reference path='../node_modules/typescript/bin/typescript.d.ts' />
import ts = require('typescript');
import ts2dart = require('./main');

export type ClassLike = ts.ClassDeclaration | ts.InterfaceDeclaration;

export function ident(n: ts.Node): string {
  if (n.kind === ts.SyntaxKind.Identifier) return (<ts.Identifier>n).text;
  if (n.kind === ts.SyntaxKind.QualifiedName) {
    var qname = (<ts.QualifiedName>n);
    var leftName = ident(qname.left);
    if (leftName) return leftName + '.' + ident(qname.right);
  }
  return null;
}

export class TranspilerStep {
  constructor(private transpiler: ts2dart.Transpiler) {}

  visit(n: ts.Node) { this.transpiler.visit(n); }
  emit(s: string) { this.transpiler.emit(s); }
  emitNoSpace(s: string) { this.transpiler.emitNoSpace(s); }
  reportError(n: ts.Node, message: string) { this.transpiler.reportError(n, message); }

  visitNode(n: ts.Node): boolean { throw Error('not implemented'); }

  visitEach(nodes: ts.Node[]) { nodes.forEach((n) => this.visit(n)); }

  visitEachIfPresent(nodes?: ts.Node[]) {
    if (nodes) this.visitEach(nodes);
  }

  visitList(nodes: ts.Node[], separator: string = ',') {
    for (var i = 0; i < nodes.length; i++) {
      this.visit(nodes[i]);
      if (i < nodes.length - 1) this.emit(separator);
    }
  }

  getAncestor(n: ts.Node, kind: ts.SyntaxKind): ts.Node {
    for (var parent = n; parent; parent = parent.parent) {
      if (parent.kind === kind) return parent;
    }
    return null;
  }

  hasAncestor(n: ts.Node, kind: ts.SyntaxKind): boolean { return !!this.getAncestor(n, kind); }

  hasAnnotation(decorators: ts.NodeArray<ts.Decorator>, name: string): boolean {
    if (!decorators) return false;
    return decorators.some((d) => {
      var decName = ident(d.expression);
      if (decName === name) return true;
      if (d.expression.kind !== ts.SyntaxKind.CallExpression) return false;
      var callExpr = (<ts.CallExpression>d.expression);
      decName = ident(callExpr.expression);
      return decName === name;
    });
  }

  hasFlag(n: {flags: number}, flag: ts.NodeFlags): boolean {
    return n && (n.flags & flag) !== 0 || false;
  }

  isConst(decl: ClassLike) {
    return this.hasAnnotation(decl.decorators, 'CONST') ||
           decl.members.some((m) => {
             if (m.kind !== ts.SyntaxKind.Constructor) return false;
             return this.hasAnnotation(m.decorators, 'CONST');
           });
  }

  // TODO(martinprobst): This belongs to module.ts, refactor.
  getLibraryName(): string { return this.transpiler.getLibraryName(); }

  typeChecker(): ts.TypeChecker {
    var tc = this.transpiler.getTypeChecker();
    if (!tc) throw new Error('TypeChecker requested, but none available');
    return tc;
  }

  private static TS_TO_DART_TYPENAMES: {[k: string]: string} = {
    'Promise': 'Future',
    'Observable': 'Stream',
    'ObservableController': 'StreamController',
    'Date': 'DateTime',
    'StringMap': 'Map',
    'Array': 'List',
  };

  visitTypeName(typeName: ts.EntityName) {
    if (typeName.kind !== ts.SyntaxKind.Identifier) {
      this.visit(typeName);
      return;
    }
    var identifier = ident(typeName);
    if (TranspilerStep.TS_TO_DART_TYPENAMES.hasOwnProperty(identifier)) {
      identifier = TranspilerStep.TS_TO_DART_TYPENAMES[identifier];
    }
    this.emit(identifier);
  }

  maybeVisitTypeArguments(n: {typeArguments?: ts.NodeArray<ts.TypeNode>}) {
    if (n.typeArguments) {
      this.emit('<');
      this.visitList(n.typeArguments);
      this.emit('>');
    }
  }
}
