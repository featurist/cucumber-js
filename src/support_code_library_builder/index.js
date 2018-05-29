import _ from 'lodash'
import util from 'util'
import TransformLookupBuilder from './parameter_type_registry_builder'
import {
  buildParameterType,
  buildStepDefinition,
  buildTestCaseHookDefinition,
  buildTestRunHookDefinition,
} from './build_helpers'
import { wrapDefinitions } from './finalize_helpers'

export class SupportCodeLibraryBuilder {
  constructor() {
    this.methods = {
      defineParameterType: this.defineParameterType.bind(this),
      After: this.defineTestCaseHook('afterTestCaseHookDefinitions'),
      AfterAll: this.defineTestRunHook('afterTestRunHookDefinitions'),
      Before: this.defineTestCaseHook('beforeTestCaseHookDefinitions'),
      BeforeAll: this.defineTestRunHook('beforeTestRunHookDefinitions'),
      defineStep: this.defineStep.bind(this),
      defineSupportCode: util.deprecate(fn => {
        fn(this.methods)
      }, 'cucumber: defineSupportCode is deprecated. Please require/import the individual methods instead.'),
      setDefaultTimeout: milliseconds => {
        this.options.defaultTimeout = milliseconds
      },
      setDefinitionFunctionWrapper: fn => {
        this.options.definitionFunctionWrapper = fn
      },
      setWorldConstructor: fn => {
        this.options.World = fn
      },
    }
    const defineStepWithPhase = phase => (pattern, options, code) =>
      typeof code === 'function'
        ? this.methods.defineStep(pattern, _.assign(options, { phase }), code)
        : this.methods.defineStep(pattern, { phase }, options)

    this.methods.Given = defineStepWithPhase('given')
    this.methods.When = defineStepWithPhase('when')
    this.methods.Then = defineStepWithPhase('then')
  }

  defineParameterType(options) {
    const parameterType = buildParameterType(options)
    this.options.parameterTypeRegistry.defineParameterType(parameterType)
  }

  defineStep(pattern, options, code) {
    const stepDefinition = buildStepDefinition({
      pattern,
      options,
      code,
      cwd: this.cwd,
    })
    this.options.stepDefinitions.push(stepDefinition)
  }

  defineTestCaseHook(collectionName) {
    return (options, code) => {
      const hookDefinition = buildTestCaseHookDefinition({
        options,
        code,
        cwd: this.cwd,
      })
      this.options[collectionName].push(hookDefinition)
    }
  }

  defineTestRunHook(collectionName) {
    return (options, code) => {
      const hookDefinition = buildTestRunHookDefinition({
        options,
        code,
        cwd: this.cwd,
      })
      this.options[collectionName].push(hookDefinition)
    }
  }

  finalize() {
    wrapDefinitions({
      cwd: this.cwd,
      definitionFunctionWrapper: this.options.definitionFunctionWrapper,
      definitions: _.chain([
        'afterTestCaseHook',
        'afterTestRunHook',
        'beforeTestCaseHook',
        'beforeTestRunHook',
        'step',
      ])
        .map(key => this.options[`${key}Definitions`])
        .flatten()
        .value(),
    })
    this.options.afterTestCaseHookDefinitions.reverse()
    this.options.afterTestRunHookDefinitions.reverse()
    return this.options
  }

  reset(cwd) {
    this.cwd = cwd
    this.options = _.cloneDeep({
      afterTestCaseHookDefinitions: [],
      afterTestRunHookDefinitions: [],
      beforeTestCaseHookDefinitions: [],
      beforeTestRunHookDefinitions: [],
      defaultTimeout: 5000,
      definitionFunctionWrapper: null,
      stepDefinitions: [],
      parameterTypeRegistry: TransformLookupBuilder.build(),
      World({ attach, parameters }) {
        this.attach = attach
        this.parameters = parameters
      },
    })
  }
}

export default new SupportCodeLibraryBuilder()
