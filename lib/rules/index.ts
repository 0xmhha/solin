/**
 * Rules Module
 *
 * Exports rule base classes and implementations
 */

export { AbstractRule } from './abstract-rule';
export { NoEmptyBlocksRule } from './lint/no-empty-blocks';
export { NamingConventionRule } from './lint/naming-convention';
export { VisibilityModifiersRule } from './lint/visibility-modifiers';
export { StateMutabilityRule } from './lint/state-mutability';
export { UnusedVariablesRule } from './lint/unused-variables';
export { FunctionComplexityRule } from './lint/function-complexity';
export { MagicNumbersRule } from './lint/magic-numbers';
export { RequireRevertReasonRule } from './lint/require-revert-reason';
export { ConstantImmutableRule } from './lint/constant-immutable';
export { CacheArrayLengthRule } from './lint/cache-array-length';
export { UnusedStateVariablesRule } from './lint/unused-state-variables';
export { LoopInvariantCodeRule } from './lint/loop-invariant-code';
export { TxOriginRule } from './security/tx-origin';
export { UncheckedCallsRule } from './security/unchecked-calls';
export { TimestampDependenceRule } from './security/timestamp-dependence';
export { UninitializedStateRule } from './security/uninitialized-state';
export { ArbitrarySendRule } from './security/arbitrary-send';
export { DelegatecallInLoopRule } from './security/delegatecall-in-loop';
export { ShadowingVariablesRule } from './security/shadowing-variables';
export { SelfdestructRule } from './security/selfdestruct';
export { ControlledDelegatecallRule } from './security/controlled-delegatecall';
export { WeakPrngRule } from './security/weak-prng';
export { UninitializedStorageRule } from './security/uninitialized-storage';
export { LockedEtherRule } from './security/locked-ether';
export { ReentrancyRule } from './security/reentrancy';
export { DivideBeforeMultiplyRule } from './security/divide-before-multiply';
export { MsgValueLoopRule } from './security/msg-value-loop';
export { FloatingPragmaRule } from './security/floating-pragma';
export { OutdatedCompilerRule } from './security/outdated-compiler';
export { AssertStateChangeRule } from './security/assert-state-change';
export { MissingZeroCheckRule } from './security/missing-zero-check';
export { MissingEventsRule } from './security/missing-events';
export { UnsafeCastRule } from './security/unsafe-cast';
export { ShadowingBuiltinRule } from './security/shadowing-builtin';
export { UncheckedSendRule } from './security/unchecked-send';
export { UncheckedLowlevelRule } from './security/unchecked-lowlevel';
export { CostlyLoopRule } from './security/costly-loop';
export { DeprecatedFunctionsRule } from './security/deprecated-functions';
export { AvoidSha3 } from './security/avoid-sha3';
export { AvoidThrow } from './security/avoid-throw';
export { IncorrectEqualityRule } from './security/incorrect-equality';
export { NoInlineAssembly } from './security/no-inline-assembly';
export { ReturnBombRule } from './security/return-bomb';
export { UnprotectedEtherWithdrawalRule } from './security/unprotected-ether-withdrawal';
export { VoidConstructorRule } from './security/void-constructor';
export { BooleanEqualityRule } from './lint/boolean-equality';
export { BraceStyleRule } from './lint/brace-style';
export { ContractNameCamelCaseRule } from './lint/contract-name-camelcase';
export { FunctionMaxLinesRule } from './lint/function-max-lines';
export { FunctionNameMixedcaseRule } from './lint/function-name-mixedcase';
export { GasCustomErrors } from './lint/gas-custom-errors';
export { GasIndexedEvents } from './lint/gas-indexed-events';
export { GasSmallStrings } from './lint/gas-small-strings';
export { IndentRule } from './lint/indent';
export { MaxLineLengthRule } from './lint/max-line-length';
export { NoConsoleRule } from './lint/no-console';
export { NoTrailingWhitespaceRule } from './lint/no-trailing-whitespace';
export { QuotesRule } from './lint/quotes';
export { SpaceAfterCommaRule } from './lint/space-after-comma';
export { VarNameMixedcaseRule } from './lint/var-name-mixedcase';

// NEW LINT RULES
export { ArrayDeclarationRule } from './lint/array-declaration';
export { AvoidCallValueRule } from './lint/avoid-call-value';
export { AvoidLowLevelCallsRule } from './lint/avoid-low-level-calls';
export { BracketAlignRule } from './lint/bracket-align';
export { CheckSendResultRule } from './lint/check-send-result';
export { CompilerVersionRule } from './lint/compiler-version';
export { ConstructorAboveModifiersRule } from './lint/constructor-above-modifiers';
export { CurlyOnSameLineRule } from './lint/curly-on-same-line';
export { ExplicitVisibilityRule } from './lint/explicit-visibility';
export { GasMultitoken1155 } from './lint/gas-multitoken1155';
export { ImportOnTopRule } from './lint/import-on-top';
export { ImportsOnTopRule } from './lint/imports-on-top';
export { NoComplexFallbackRule } from './lint/no-complex-fallback';
export { NoMixedDeclarationRule } from './lint/no-mixed-declaration';
export { NoPublicVarsRule } from './lint/no-public-vars';
export { NoUnusedImportsRule } from './lint/no-unused-imports';
export { OneContractPerFileRule } from './lint/one-contract-per-file';
export { OrderedImportsRule } from './lint/ordered-imports';
export { OrderingRule } from './lint/ordering';
export { PackStorageVariables } from './lint/pack-storage-variables';
export { PayableFallbackRule } from './lint/payable-fallback';
export { PreferExternalOverPublicRule } from './lint/prefer-external-over-public';
export { PrivateVarsLeadingUnderscoreRule } from './lint/private-vars-leading-underscore';
export { ReasonStringRule } from './lint/reason-string';
export { SeparateByOneLineRule } from './lint/separate-by-one-line';
export { StatementIndentRule } from './lint/statement-indent';
export { TwoLinesTopLevelRule } from './lint/two-lines-top-level';
export { UseCalldataOverMemory } from './lint/use-calldata-over-memory';

// NEW SECURITY RULES
export { ArrayLengthManipulationRule } from './security/array-length-manipulation';
export { ArrayOutOfBoundsRule } from './security/array-out-of-bounds';
export { AssemblyUsage } from './security/assembly-usage';
export { AvoidSuicide } from './security/avoid-suicide';
export { AvoidTxOrigin } from './security/avoid-tx-origin';
export { BlockTimestampRule } from './security/block-timestamp';
export { BooleanConstantRule } from './security/boolean-cst';
export { CallsInLoopRule } from './security/calls-in-loop';
export { CheckSendResult } from './security/check-send-result';
export { CodeInjectionRule } from './security/code-injection';
export { ConstantFunctionStateRule } from './security/constant-function-state';
export { ControlledArrayLengthRule } from './security/controlled-array-length';
export { CyclomaticComplexityRule } from './security/cyclomatic-complexity';
export { DeadCode } from './security/dead-code';
export { DelegatecallToUntrustedRule } from './security/delegatecall-to-untrusted';
export { DenialOfServiceRule } from './security/denial-of-service';
export { DoubleSpendRule } from './security/double-spend';
export { ERC20Interface } from './security/erc20-interface';
export { ERC721Interface } from './security/erc721-interface';
export { EventsMathRule } from './security/events-maths';
export { FrontRunningRule } from './security/front-running';
export { FunctionInitState } from './security/function-init-state';
export { IncorrectModifierRule } from './security/incorrect-modifier';
export { IntegerOverflowRule } from './security/integer-overflow';
export { LocalVariableShadowing } from './security/local-variable-shadowing';
export { LowLevelCallsRule } from './security/low-level-calls';
export { MissingConstructorRule } from './security/missing-constructor';
export { MissingInheritanceRule } from './security/missing-inheritance';
export { MissingInitializer } from './security/missing-initializer';
export { MultipleConstructorsRule } from './security/multiple-constructors';
export { MultipleInheritance } from './security/multiple-inheritance';
export { NamingConventionRule as SecurityNamingConventionRule } from './security/naming-convention';
export { OracleManipulationRule } from './security/oracle-manipulation';
export { PragmaVersion } from './security/pragma-version';
export { ProxyStorageCollisionRule } from './security/proxy-storage-collision';
export { RaceConditionRule } from './security/race-condition';
export { RedundantStatements } from './security/redundant-statements';
export { ReentrancyBenignRule } from './security/reentrancy-benign';
export { ReentrancyNoEthRule } from './security/reentrancy-no-eth';
export { RtloCharacterRule } from './security/rtlo-character';
export { SignatureMalleabilityRule } from './security/signature-malleability';
export { SimilarNames } from './security/similar-names';
export { StateChangeExternalCallRule } from './security/state-change-external-call';
export { StateVariableDefaultRule } from './security/state-variable-default';
export { StateVariableShadowing } from './security/state-variable-shadowing';
export { StorageArrayDeleteRule } from './security/storage-array-delete';
export { StorageCollisionRule } from './security/storage-collision';
export { TautologyRule } from './security/tautology';
export { TooManyDigitsRule } from './security/too-many-digits';
export { TooManyFunctionsRule } from './security/too-many-functions';
export { TypeConfusionRule } from './security/type-confusion';
export { UnaryExpressionRule } from './security/unary-expression';
export { UncheckedReturnRule } from './security/unchecked-return';
export { UninitializedLocalRule } from './security/uninitialized-local';
export { UnprotectedSelfdestructRule } from './security/unprotected-selfdestruct';
export { UnsafeExternalCallRule } from './security/unsafe-external-call';
export { UnusedReturnRule } from './security/unused-return';
export { UnusedStateRule } from './security/unused-state';
export { VariableMutationRule } from './security/variable-mutation';
export { VariableScopeRule } from './security/variable-scope';
export { VoidConstructorCallRule } from './security/void-constructor-call';
export { WriteAfterWriteRule } from './security/write-after-write';
export { WrongEqualityRule } from './security/wrong-equality';

// CUSTOM RULES
export { ProjectNamingConventionRule } from './custom/project-naming-convention';

// Developer tools
export {
  RuleTester,
  createRuleTester,
  type ValidTestCase,
  type InvalidTestCase,
  type ExpectedError,
  type TestResult,
  type RuleTesterConfig,
} from './rule-tester';

export {
  RuleGenerator,
  generateRule,
  type RuleGeneratorOptions,
  type GeneratedRule,
} from './rule-generator';
