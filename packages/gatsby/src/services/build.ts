/* eslint-disable @typescript-eslint/camelcase */
import build from "../commands/build"
import { PackageJson } from "../.."
import * as GraphQLRunnerExport from "../query/graphql-runner"
import apiRunnerNode from "../utils/api-runner-node"

type GraphQLRunner = typeof GraphQLRunnerExport

interface IBuildArgs {
  directory: string
  sitePackageJson: PackageJson
  prefixPaths: boolean
  noUglify: boolean
  profile: boolean
  openTracingConfigFile: string
}

export const unstable_build = (program: IBuildArgs): Promise<GraphQLRunner> =>
  build(program)

export const unstable_runOnPreBuild = (
  graphqlRunner: GraphQLRunner
): Promise<void> => apiRunnerNode(`onPreBuild`, { graphql: graphqlRunner })

export const unstable_runOnPostBuild = (
  graphqlRunner: GraphQLRunner
): Promise<void> => apiRunnerNode(`onPostBuild`, { graphql: graphqlRunner })
