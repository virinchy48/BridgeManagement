const path = require('path')
const express = require('express')
const {
  buildCsvTemplate,
  buildWorkbookTemplate,
  getDatasets,
  importUpload,
  validateUpload,
  getUploadHistory,
  getUploadSessionById
} = require('../mass-upload')

const router = express.Router()

router.use(express.json({ limit: '70mb' }))

router.get('/datasets', (_req, res) => {
  res.json({ datasets: getDatasets() })
})

router.get('/template.xlsx', async (_req, res) => {
  try {
    const content = await buildWorkbookTemplate()
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet')
    res.setHeader('Content-Disposition', 'attachment; filename="BridgeManagement-MassUploadTemplate.xlsx"')
    res.send(content)
  } catch (error) {
    res.status(500).json({ error: { message: error.message || 'Failed to generate workbook template' } })
  }
})

router.get('/template.csv', async (req, res) => {
  try {
    const dataset = req.query.dataset
    const content = await buildCsvTemplate(dataset)
    res.setHeader('Content-Type', 'text/csv; charset=utf-8')
    res.setHeader('Content-Disposition', `attachment; filename="${dataset || 'lookup-template'}.csv"`)
    res.send(content)
  } catch (error) {
    res.status(500).json({ error: { message: error.message || 'Failed to generate CSV template' } })
  }
})

router.post('/upload', async (req, res) => {
  try {
    const { fileName, contentBase64, dataset } = req.body || {}
    if (!fileName) {
      return res.status(400).json({ error: { message: 'fileName is required' } })
    }
    if (!contentBase64) {
      return res.status(400).json({ error: { message: 'File content is empty' } })
    }

    const estimatedBytes = Math.ceil(contentBase64.length * 0.75)
    const MAX_BYTES = 50 * 1024 * 1024
    if (estimatedBytes > MAX_BYTES) {
      return res.status(400).json({ error: { message: 'File too large. Maximum 50MB allowed.' } })
    }

    const allowedTypes = ['.xlsx', '.csv', '.xls']
    const ext = path.extname(fileName || '').toLowerCase()
    if (!allowedTypes.includes(ext)) {
      return res.status(400).json({ error: { message: 'Invalid file type. Only .xlsx and .csv allowed.' } })
    }

    const buffer = Buffer.from(contentBase64, 'base64')
    const result = await importUpload({
      buffer,
      fileName,
      datasetName: dataset,
      uploadedBy: req.user?.id || 'system'
    })
    res.json(result)
  } catch (error) {
    res.status(422).json({ error: { message: error.message || 'Upload failed' } })
  }
})

router.post('/validate', async (req, res) => {
  try {
    const { fileName, contentBase64, dataset } = req.body || {}
    if (!fileName) {
      return res.status(400).json({ error: { message: 'fileName is required' } })
    }
    if (!contentBase64) {
      return res.status(400).json({ error: { message: 'File content is empty' } })
    }
    if (Math.ceil(contentBase64.length * 0.75) > 50 * 1024 * 1024) {
      return res.status(400).json({ error: { message: 'File too large. Maximum 50MB allowed.' } })
    }
    const buffer = Buffer.from(contentBase64, 'base64')
    const result = await validateUpload({
      buffer,
      fileName,
      datasetName: dataset
    })
    res.json(result)
  } catch (error) {
    res.status(422).json({ error: { message: error.message || 'Validation failed' } })
  }
})

router.get('/history', async (req, res) => {
  try {
    const sessions = await getUploadHistory(50)
    res.json({ sessions })
  } catch (err) {
    res.status(500).json({ error: { message: err.message } })
  }
})

router.get('/history/:id/report.csv', async (req, res) => {
  try {
    const session = await getUploadSessionById(req.params.id)
    if (!session) return res.status(404).json({ error: { message: 'Session not found' } })
    const rows = JSON.parse(session.warningsJson || '[]')
    const lines = ['Row,Dataset,Status,Message', ...rows.map((w, i) => `${i + 1},${session.datasetName},Warning,${String(w).replace(/,/g, ';')}`)]
    res.setHeader('Content-Type', 'text/csv')
    res.setHeader('Content-Disposition', `attachment; filename="upload-report-${req.params.id}.csv"`)
    res.send(lines.join('\n'))
  } catch (err) {
    res.status(500).json({ error: { message: err.message } })
  }
})

module.exports = router
