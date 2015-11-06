import fs from 'fs'
import path from 'path'
import _ from 'lodash'
import argv from 'minimist'
import md5F from 'md5-file'
import Promise from 'bluebird'

Promise.promisifyAll(fs)
const md5File = Promise.promisify(md5F)

const arg = argv(process.argv.slice(2))
const manifest = arg.manifest || arg.m
const format = arg.format || arg.f
const patchDir = arg.path || arg.p
const validate = arg.validate || arg.v

// stop right here if no manifest file was supplied
if (!manifest) {
  throw new Error('Specify path to manifest via --manifest|m option')
}

fs.readFileAsync(manifest, 'utf-8')
  .then(data => {
    return JSON.parse(data)
  })
  .then(json => {
    return (format) ? formatJSON(json, 'filemd5') : json
  })
  .then(json => {
    return (format) ? saveJSON(manifest, json) : json
  })
  .then(json => {
    return (validate) ? validateAllFiles(json) : json
  })
  .catch(err => {
    throw err
  })

/**
 * Filter non-unique entries and sort array
 * @param  {Array}  json     manifest data
 * @param  {String} key      key to perform unique sort on
 * @return {Array}
 */
function formatJSON (json, key) {
  if (json.constructor !== Array) {
    throw new Error('Manifest file should contain an Array of Objects')
  } else {
    return _.chain(json).unique(key).sort((a, b) => {
      return (a.start - b.start) || (a.end - b.end)
    })
  }
}

/**
 * Save JSON to file
 * @param  {String} file     path to file
 * @param  {Array}  json     manifest data
 * @param  {Number} spaces   number of spaces to indent
 * @return {Promise}
 */
function saveJSON (file, json, spaces = 2) {
  let str = JSON.stringify(json, null, spaces)
  return fs.writeFile(file, str)
}

/**
 * Validate file against given hash
 * @param  {String} fileName file name
 * @param  {String} hash     md5 hash
 * @return {Promise}
 */
function validateFile (fileName, hash) {
  let file = path.join(patchDir, fileName)

  return md5File(file)
    .then(fileHash => {
      return fileHash === hash
    })
    .catch(err => {
      throw err
    })
}

/**
 * Validate all files agains given hash
 * @param  {Array}  json     manifest data
 * @return {Promise}
 */
function validateAllFiles (json) {
  return Promise.all(json.forEach(patch => {
    return validateFile(patch.file_name, patch.filemd5)
  }))
}
