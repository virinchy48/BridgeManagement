const cds = require('@sap/cds')
const express = require('express')

const {
  buildCsvTemplate,
  buildWorkbookTemplate,
  getDatasets,
  importUpload
} = require('./mass-upload')

cds.on('bootstrap', (app) => {
  const router = express.Router()

  router.use(express.json({ limit: '25mb' }))

  router.get('/datasets', (_req, res) => {
    res.json({ datasets: getDatasets() })
  })

  router.get('/template.xlsx', async (_req, res, next) => {
    try {
      const content = await buildWorkbookTemplate()
      res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet')
      res.setHeader('Content-Disposition', 'attachment; filename="BridgeManagement-MassUploadTemplate.xlsx"')
      res.send(content)
    } catch (error) {
      next(error)
    }
  })

  router.get('/template.csv', async (req, res, next) => {
    try {
      const dataset = req.query.dataset
      const content = await buildCsvTemplate(dataset)
      res.setHeader('Content-Type', 'text/csv; charset=utf-8')
      res.setHeader('Content-Disposition', `attachment; filename="${dataset || 'lookup-template'}.csv"`)
      res.send(content)
    } catch (error) {
      next(error)
    }
  })

  router.post('/upload', async (req, res, next) => {
    try {
      const { fileName, contentBase64, dataset } = req.body || {}
      const buffer = Buffer.from(contentBase64 || '', 'base64')
      const result = await importUpload({
        buffer,
        fileName,
        datasetName: dataset
      })
      res.json(result)
    } catch (error) {
      next(error)
    }
  })

  app.use('/mass-upload/api', router)
})

module.exports = cds.server
