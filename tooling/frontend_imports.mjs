// Parse syntax only. This never evaluates project sources or resolves packages.
import { readFileSync } from 'node:fs';
import ts from 'typescript';

try {
  const sources = JSON.parse(readFileSync(0, 'utf8'));
  const imports = {};
  const errors = [];
  for (const [filename, source] of Object.entries(sources)) {
    const file = ts.createSourceFile(
      filename,
      source,
      ts.ScriptTarget.Latest,
      true,
      ts.getScriptKindFromFileName(filename),
    );
    for (const diagnostic of file.parseDiagnostics) {
      const position = file.getLineAndCharacterOfPosition(diagnostic.start ?? 0);
      errors.push(
        `${filename}:${position.line + 1}: ${ts.flattenDiagnosticMessageText(diagnostic.messageText, ' ')}`,
      );
    }
    const references = [];
    const add = (specifier) => {
      if (!specifier || !ts.isStringLiteralLike(specifier)) return;
      const position = file.getLineAndCharacterOfPosition(specifier.getStart(file));
      references.push([specifier.text, position.line + 1]);
    };
    const visit = (node) => {
      if (ts.isImportDeclaration(node) || ts.isExportDeclaration(node)) {
        add(node.moduleSpecifier);
      } else if (
        ts.isImportEqualsDeclaration(node) &&
        ts.isExternalModuleReference(node.moduleReference)
      ) {
        add(node.moduleReference.expression);
      } else if (ts.isImportTypeNode(node) && ts.isLiteralTypeNode(node.argument)) {
        add(node.argument.literal);
      } else if (
        ts.isCallExpression(node) &&
        (node.expression.kind === ts.SyntaxKind.ImportKeyword ||
          (ts.isIdentifier(node.expression) && node.expression.text === 'require'))
      ) {
        add(node.arguments[0]);
      }
      ts.forEachChild(node, visit);
    };
    visit(file);
    imports[filename] = references;
  }
  if (errors.length) throw new Error(errors.join('\n'));
  process.stdout.write(JSON.stringify(imports));
} catch (error) {
  process.stderr.write(`Frontend import parse failed: ${error.message}\n`);
  process.exitCode = 1;
}
