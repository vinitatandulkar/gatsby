/* eslint-disable @typescript-eslint/camelcase */
import { Reporter } from "../.."
import {
  groupQueryIds,
  processPageQueries,
  processStaticQueries,
  calcInitialDirtyQueryIds,
} from "../query"
import createSchemaCustomization from "../utils/create-schema-customization"
import sourceNodes from "../utils/source-nodes"
import { store } from "../redux"
import { writeAll } from "../bootstrap/requires-writer"

export { extractQueries as unstable_extractQueries } from "../query/query-watcher"

export const unstable_getDirtyQueryIds = (): string[] =>
  calcInitialDirtyQueryIds(store.getState())

export const unstable_writeRequires = async (): Promise<boolean> =>
  writeAll(store.getState())

export const unstable_runQueries = async ({
  queryIds,
  reporter,
}: {
  queryIds: string[]
  reporter: Reporter
}): Promise<string[]> => {
  reporter.verbose(`PROCESSING_DATA triggered`)

  const { staticQueryIds, pageQueryIds } = groupQueryIds(queryIds)

  let activity
  if (staticQueryIds.length) {
    // How do we know which pages to rebuild when static queries have changed?
    reporter.verbose(
      `Running static queries(${staticQueryIds.length}):${JSON.stringify(
        staticQueryIds
      )}`
    )
    activity = reporter.activityTimer(`run static queries`)
    activity.start()
    await processStaticQueries(staticQueryIds, {
      activity,
      state: store.getState(),
    })
    activity.end()
  }

  if (pageQueryIds.length) {
    reporter.verbose(
      `Running page queries(${pageQueryIds.length}): ${JSON.stringify(
        pageQueryIds
      )}`
    )
    activity = reporter.activityTimer(`Run page queries`)
    activity.start()
    await processPageQueries(pageQueryIds, {
      activity,
      state: store.getState(),
    })
    activity.end()
  }

  return pageQueryIds
}

export const unstable_updateData = async (
  webhookBody?: string
): Promise<void> => {
  await createSchemaCustomization({
    refresh: true,
  })
  await sourceNodes({
    webhookBody,
  })
}
