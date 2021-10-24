import express from 'express'
import bodyParser from 'body-parser'
import * as database from './database'
import { Poll } from './types/poll'
import { readFileSync } from 'fs'
import url from 'url'
import { ParsedUrlQuery } from 'querystring'
import config from './config.json'

const db = database.connect()
const index = config.index ?? './index.html'
const app = express()
const webpage = readFileSync(index).toString()

app.use(bodyParser.json())

function isString(value: string | string[] | undefined, falseCallback?: Function): boolean {
    if (value == undefined) {
        falseCallback?.call(null)
        return false
    }
    if (Array.isArray(value)) {
        falseCallback?.call(null)
        return false
    }
    return true
}

app.get('/vote', function (_req, res) {
    res.send(webpage)
    res.status(200)
})

app.post('/api/vote', async function (req, res) {
    const queryObject: ParsedUrlQuery = url.parse(req.url, true).query; // query strings in url
    const action = queryObject.action // action query string
    if (!isString(action, () => {
        res.status(400)
        res.send('QueryString-Error at action - Bad Request 400')
    })) return
    switch (queryObject.action) {
        case 'CREATE':

            break
        case 'VOTE':
            const $uniqueId = queryObject.id // uniqueId of poll
            const $choice = queryObject.choice // choice for the given poll

            // check uniqueId, any -> string -> number
            if (!isString($uniqueId, () => {
                res.status(400)
                res.send('QueryString-Error at id - Bad Request 400')
            })) return
            if (Number.isNaN($uniqueId)) {
                res.status(400)
                res.send('QueryString-Error at id - not an integer - Bad Request 400')
                return
            }
            const uniqueId = Number.parseInt($uniqueId as string)

            // check choice, any -> string -> number
            if (!isString($choice, () => {
                res.status(400)
                res.send('QueryString-Error at choice - Bad Request 400')
            })) return
            if (Number.isNaN($choice)) {
                res.status(400)
                res.send('QueryString-Error at choice - not an integer - Bad Request 400')
                return
            }
            const choice = Number.parseInt($choice as string)

            // check for poll, load poll, update poll
            database.pollExists(db, uniqueId, (err: any, exists: boolean) => {
                if (err) {
                    res.status(500)
                    res.send('Error whilst checking if poll exists - Internal Server Error 500')
                    return
                }
                if (!exists) {
                    res.status(404)
                    res.send('Poll not found (1) - Not Found 404')
                    return
                }
                database.loadPoll(db, uniqueId, (err: any, poll: Poll) => {
                    if (err) {
                        res.status(500)
                        res.send('Error whilst loading poll - Internal Server Error 500')
                        return
                    }
                    if (poll == null) {
                        res.status(404)
                        res.send('Poll not found (2) - Not Found 404')
                        return
                    }
                    if (poll.choices.length <= choice || choice < 0) {
                        res.status(400)
                        res.send('Invalid choice - Bad Request 400')
                        return
                    }
                    let i = 0
                    poll.choices.forEach(key => {
                        if (poll.choices[i].id == choice) {
                            poll.choices[i].votes += 1
                        }
                        i++
                    })
                    if (i == 0) {
                        res.status(404)
                        res.send('Poll not found (3) - Not Found 404')
                        return
                    }
                    database.updatePoll(db, uniqueId, poll, (err: any, result: any) => {
                        if (err) {
                            res.status(500)
                            res.send('Error whilst updating poll - Internal Server Error 500')
                        } else {
                            res.status(200)
                            res.send('Successfully voted - OK 200')
                        }
                    })
                })
            })
            break
        case 'DELETE':

            break;
        default:
            res.status(501)
            res.send('API-call not implemented - Not Implemented 501')
            return
    }
})

app.listen(80)