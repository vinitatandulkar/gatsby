const _ = require(`lodash`)
const { emitter, store } = require(`../redux`)
const apiRunnerNode = require(`../utils/api-runner-node`)
const { boundActionCreators } = require(`../redux/actions`)
const { deletePage, deleteComponentsDependencies } = boundActionCreators
const report = require(`gatsby-cli/lib/reporter`)

let pagesDirty = false
let graphql

const runCreatePages = async () => {
  pagesDirty = false

  const timestamp = Date.now()

  // Collect pages.
  const activity = report.activityTimer(`createPages`)
  activity.start()

  const currentPages = Array.from(store.getState().pages.values())

  await apiRunnerNode(
    `createPages`,
    {
      graphql,
      traceId: `createPages`,
      waitForCascadingActions: true,
    },
    { activity }
  )
  activity.end()

  // Delete pages that weren't updated when running createPages.
  Array.from(store.getState().pages.values()).forEach(page => {
    if (
      !page.isCreatedByStatefulCreatePages &&
      page.updatedAt < timestamp &&
      page.path !== `/404.html`
    ) {
      deleteComponentsDependencies([page.path])
      deletePage(page)
    }
  })
  const newPages = Array.from(store.getState().pages.values())
  const deletedPages = []

  const changedPages = _.differenceWith(
    newPages,
    currentPages,
    (newPage, oldPage) => {
      if (newPage.path === oldPage.path) {
        return _.isEqualWith(newPage, oldPage, (left, right, key) => {
          if (key === `updatedAt`) {
            return true
          } else {
            return undefined
          }
        })
      } else {
        return false
      }
    }
  )

  emitter.emit(`CREATE_PAGE_END`, {
    newPages: changedPages.map(page => page.path),
    deletedPages,
  })
}

module.exports = graphqlRunner => {
  graphql = graphqlRunner
  emitter.on(`CREATE_NODE`, action => {
    if (action.payload.internal.type !== `SitePage`) {
      pagesDirty = true
    }
  })
  emitter.on(`DELETE_NODE`, action => {
    if (action.payload.internal.type !== `SitePage`) {
      pagesDirty = true
      // Make a fake API call to trigger `API_RUNNING_QUEUE_EMPTY` being called.
      // We don't want to call runCreatePages here as there might be work in
      // progress. So this is a safe way to make sure runCreatePages gets called
      // at a safe time.
      apiRunnerNode(`FAKE_API_CALL`)
    }
  })

  emitter.on(`API_RUNNING_QUEUE_EMPTY`, () => {
    if (pagesDirty) {
      runCreatePages()
    }
  })
}
