/* eslint-disable @typescript-eslint/camelcase */
import build from "../commands/build"
import { PackageJson, Reporter } from "../.."
import * as GraphQLRunnerExport from "../query/graphql-runner"
import apiRunnerNode from "../utils/api-runner-node"
import { buildHTML } from "../commands/build-html"
import { BuildHTMLStage, IProgram } from "../commands/types"
import Worker from "jest-worker"

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

interface IBuildHTMLProps {
  pagePaths: string[]
  program: IProgram
  reporter: Reporter
  workerPool: Worker
}

export const unstable_buildHTML = async ({
  pagePaths,
  program,
  reporter,
  workerPool,
}: IBuildHTMLProps): Promise<void> => {
  reporter.verbose(
    `running build pages (${pagePaths.length}):${JSON.stringify(pagePaths)}`
  )
  const activity = reporter.activityTimer(`Building static HTML for pages`)
  activity.start()

  try {
    await buildHTML({
      program,
      activity,
      workerPool,
      pagePaths,
      stage: BuildHTMLStage.BuildHTML,
    })
  } catch (err) {
    let id = `95313` // Building static HTML failed
    if (err.message === `ReferenceError: window is not defined`) {
      id = `95312` // Variable not available during SSR
    }

    reporter.panic({
      id,
      error: err,
      context: {
        errorPath: err.context?.path,
        ref: `window`,
      },
    })
  }
  activity.end()
}
