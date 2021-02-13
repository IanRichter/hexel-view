```javascript
async function main() {

  // ========================
  // Variable declarations
  // ========================

  var value = true; // VariableDeclaration

  var { value } = object; // VariableDeclaration

  var [ value ] = array; // VariableDeclaration

  var value = await call();

  function test() {} // FunctionDeclaration

  function* test() {} // FunctionDeclaration



  // ========================
  // Variable adjustments
  // ========================

  value = 10; // ExpressionStatement -> AssignmentExpression

  value += 1; // ExpressionStatement -> AssignmentExpression

  value--;  // ExpressionStatement -> UpdateExpression



  // ========================
  // Output expressions
  // ========================

  context; // ExpressionStatement -> Identifier

  context.value; // ExpressionStatement -> MemberExpression



  // ========================
  // Call expressions
  // ========================

  context(); // ExpressionStatement -> CallExpression

  context.value(); // ExpressionStatement -> CallExpression

  await context(); // ExpressionStatement -> AwaitExpression



  // ========================
  // Literals
  // ========================

  ({}); // ExpressionStatement -> ObjectExpression

  []; // ExpressionStatement -> ArrayExpression

  ("strict"); // ExpressionStatement -> StringLiteral

  ``; // ExpressionStatement -> TemplateLiteral

  0; // ExpressionStatement -> NumericLiteral

  0x80; // ExpressionStatement -> NumericLiteral

  true; // ExpressionStatement -> BooleanLiteral

  null; // ExpressionStatement -> NullLiteral

  undefined; // ExpressionStatement -> Identifier

  new Test(); // ExpressionStatement -> NewExpression

  () => null;

  // ========================
  // Control flow statements
  // ========================

  if (true); // IfStatement

  while (true); // WhileStatement

  for (;;); // ForStatement

  do {} while(true); // DoWhileStatement



  // ========================
  // Other statements
  // ========================

  {}; // BlockStatement

  // EmptyStatement

}
```