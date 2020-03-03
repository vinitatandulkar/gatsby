/* eslint-disable @typescript-eslint/camelcase */
import StrictEventEmitter from "strict-event-emitter-types"
import { EventEmitter } from "events"
import { IProgram } from "../commands/types"
import webpackConfig from "../utils/webpack.config"
import webpack from "webpack"
import { store } from "../redux"
import path from "path"
import appDataUtil from "../utils/app-data"
import schemaHotReloader from "../bootstrap/schema-hot-reloader"
import requiresWriter from "../bootstrap/requires-writer"
export interface IBuildEventPayload {
  stats: webpack.Stats
  firstRun: boolean
}

export interface IWatchEvents {
  buildComplete: (payload: IBuildEventPayload) => void
  invalidFile: (file: string) => void
  error: (error: Error) => void
}

type WatchEventEmitter = StrictEventEmitter<EventEmitter, IWatchEvents>

export const unstable_startWatching = async (
  program: IProgram
): Promise<WatchEventEmitter> => {
  const config = await webpackConfig(
    program,
    program.directory,
    `build-javascript`,
    null
  )

  const compiler = webpack(config)

  const ee: WatchEventEmitter = new EventEmitter()

  compiler.hooks.invalid.tap(`watch-service`, file => {
    ee.emit(`invalidFile`, file)
  })

  let firstRun = true

  compiler.watch({}, async (err, stats) => {
    if (err) {
      ee.emit(`error`, err)
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
      schemaHotReloader()
    }

    ee.emit(`buildComplete`, { firstRun, stats })
    firstRun = false
  })

  return ee
}
