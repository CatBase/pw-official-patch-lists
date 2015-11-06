import _ from 'lodash'
import fs from 'fs'
import argv from 'minimist'
import Promise from 'bluebird'

Promise.promisifyAll(fs)

const arg = argv(process.argv.slice(2))
const file = arg.manifest || arg.m
const format = arg.format || arg.f

// stop right here if no manifest file was supplied
if (!file) {
  throw new Error('Specify path to manifest via --manifest|m option')
}

fs.readFileAsync(file, 'utf-8')
  .then(data => {
    return JSON.parse(data)
  })
  .then(json => {
    // format json only if format flag was supplied
    return (format) ? formatJSON(json, 'filemd5') : json
  })
  .then(json => {
    return (format) ? saveJSON(file, json) : json
  })
  .catch(err => {
    throw err
  })

/**
 * Save JSON to file
 * @param  {String} file   path to file
 * @param  {Array}  json   manifest data
 * @param  {Number} spaces number of spaces to indent
 * @return {Promise}
 */
function saveJSON (file, json, spaces = 2) {
  let str = JSON.stringify(json, null, spaces)
  return fs.writeFile(file, str)
}

/**
 * Filter non-unique entries and sort array
 * @param  {Array}  json manifest data
 * @param  {String} key  key to perform unique sort on
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
