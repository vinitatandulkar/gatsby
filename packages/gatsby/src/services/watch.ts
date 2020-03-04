/* eslint-disable @typescript-eslint/camelcase */
import StrictEventEmitter from "strict-event-emitter-types"
import { EventEmitter } from "events"
import { IProgram } from "../commands/types"
import webpackConfig from "../utils/webpack.config"
import webpack from "webpack"
import { store, emitter } from "../redux"
import path from "path"
import appDataUtil from "../utils/app-data"
import bootstrapSchemaHotReloader from "../bootstrap/schema-hot-reloader"
import bootstrapPageReloader from "../bootstrap/page-hot-reloader"
import requiresWriter from "../bootstrap/requires-writer"
import { calculatePagesFromWebpack } from "../utils/calculate-pages-from-webpack"
import WorkerPool from "../utils/worker/pool"
import * as GraphQLRunnerNS from "../query/graphql-runner"
import JestWorker from "jest-worker"

export interface IBuildEventPayload {
  stats: webpack.Stats
  firstRun: boolean
  chunkHashes: Map<string, string>
  pages: string[]
}

export interface ICreatePagesEventPayload {
  newPages: string[]
  deletedPages: string[]
}

export interface IWatchEvents {
  buildComplete: (payload: IBuildEventPayload) => void
  invalidFile: (file: string) => void
  error: (error: Error) => void
  createPageEnd: (payload: ICreatePagesEventPayload) => void
}

type WatchEventEmitter = StrictEventEmitter<EventEmitter, IWatchEvents>

export const unstable_startWatching = async (
  program: IProgram,
  graphQLRunner: typeof GraphQLRunnerNS
): Promise<{
  eventEmitter: WatchEventEmitter
  watcher: webpack.Compiler.Watching
}> => {
  const config = await webpackConfig(
    program,
    program.directory,
    `build-javascript`,
    null
  )

  const compiler = webpack(config)

  const eventEmitter: WatchEventEmitter = new EventEmitter()

  compiler.hooks.invalid.tap(`watch-service`, file => {
    eventEmitter.emit(`invalidFile`, file)
  })

  let firstRun = true
  let prevHashMap: Map<string, string>

  const watcher = compiler.watch({}, async (err, stats) => {
    if (err) {
      eventEmitter.emit(`error`, err)
      return
    }

    const prevCompilationHash = store.getState().webpackCompilationHash

    if (stats.hash !== prevCompilationHash) {
      store.dispatch({
        type: `SET_WEBPACK_COMPILATION_HASH`,
        payload: stats.hash,
      })
      const publicDir = path.join(program.directory, `public`)
      await appDataUtil.write(publicDir, stats.hash)
    }

    if (firstRun) {
      requiresWriter.startListener()
      bootstrapSchemaHotReloader()
      bootstrapPageReloader(graphQLRunner)
    }

    const { chunkHashes, pages } = calculatePagesFromWebpack(
      stats,
      store.getState().pages,
      prevHashMap
    )

    prevHashMap = chunkHashes

    eventEmitter.emit(`buildComplete`, { firstRun, stats, chunkHashes, pages })
    firstRun = false
  })

  emitter.on(`CREATE_PAGE_END`, ({ deletedPages, newPages }) => {
    eventEmitter.emit(`createPageEnd`, { deletedPages, newPages })
  })

  return { eventEmitter, watcher }
}

export const unstable_waitUntilAllJobsAreFinished = (): Promise<void> =>
  new Promise(resolve => {
    const onEndJob = (): void => {
      if (store.getState().jobs?.active?.length === 0) {
        resolve()
        emitter.off(`END_JOB`, onEndJob)
      }
    }
    emitter.on(`END_JOB`, onEndJob)
    onEndJob()
  })

export const unstable_getWorkerPool = (): JestWorker => WorkerPool.create()
