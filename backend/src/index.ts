import express from 'express'
import bodyParser from 'body-parser'
import * as database from './database'
import { Poll } from './types/poll'
import { readFileSync } from 'fs'
import url from 'url'
import { ParsedUrlQuery } from 'querystring'
import config from './config.json'
import { checkToken, init } from './userprofiles'
import cors from 'cors'
import { Option } from './types/option'

// load filepaths from config
const index = config.index ?? './index.html'
const $initHome = config.initScripts.home ?? './initHome.js'
const $initStats = config.initScripts.home ?? './initStats.js'
const $initPoll = config.initScripts.home ?? './initPoll.js'
const $err400 = config.responseCodes['400'] ?? './400.html'
const $err404 = config.responseCodes['404'] ?? './404.html'
const $err500 = config.responseCodes['500'] ?? './500.html'

// read files
const webpage = readFileSync(index).toString()
const initHome = readFileSync($initHome).toString()
const initStats = readFileSync($initStats).toString()
const initPoll = readFileSync($initPoll).toString()
const err400 = readFileSync($err400).toString()
const err404 = readFileSync($err404).toString()
const err500 = readFileSync($err500).toString()

// init services
const db = database.connect()
const app = express()
const webclient = init()

app.use(bodyParser.json())
app.use(cors())

function isString(value: string | string[] | undefined, falseCallback?: Function): boolean {
    if (value === undefined) {
        falseCallback?.call(null)
        return false
    }
    if (Array.isArray(value)) {
        falseCallback?.call(null)
        return false
    }
    return true
}

// files
app.get('/files/vote/init.js', function (_req, res) {
    res.send(initHome)
    res.status(200)
})
app.get('/files/vote/stats/init.js', function (_req, res) {
    res.send(initStats)
    res.status(200)
})
app.get('/files/vote/poll/init.js', function (_req, res) {
    res.send(initPoll)
    res.status(200)
})

// websites
app.get('/vote', function (_req, res) {
    res.send(webpage.replace('%init_file%', '/files/vote/init.js'))
    res.status(200)
})
app.get('/vote/stats', function (_req, res) {
    res.send(webpage.replace('%init_file%', '/files/stats/init.js'))
    res.status(200)
})
app.get('/vote/poll/:id', function (req, res) {
    const $id = req.params.id;
    if (Number.isNaN($id)) {
        res.status(400)
        res.send(err400)
        return
    }
    const id = Number.parseInt($id)

    database.pollExists(db, id, (err: any, success: boolean) => {
        if (err) {
            res.status(500)
            res.send(err500)
            return
        }
        if (!success) {
            res.status(404)
            res.send(err404)
            return
        }
        database.loadPoll(db, id, (err: any, poll: Poll) => {
            if (err) {
                res.status(500)
                res.send(500)
                return
            }
            let choices: any[] = []
            poll.choices.forEach(key => {
                if (poll.seePercentage) {
                    choices.push({
                        id: key.id,
                        name: key.name,
                        description: key.description,
                        votes: key.votes
                    })
                } else {
                    choices.push({
                        id: key.id,
                        name: key.name,
                        description: key.description
                    })
                }
            })

            res.status(200)
            res.send(webpage.replace('%init_file%', '/files/vote/poll/init.js')
                .replace('%poll_data%', `\nconst pollData = ${JSON.stringify({
                    id: id,
                    name: poll.name,
                    description: poll.description,
                    choices: choices,
                    changeVote: poll.changeVote,
                    seePercentage: poll.seePercentage,
                    owner: poll.owner,
                    end: poll.end
                })}`))
        })
    })
})

// API
app.post('/api/vote', function (req, res) {
    const queryObject: ParsedUrlQuery = url.parse(req.url, true).query // query strings in url
    const action = queryObject.action // action query string
    if (!isString(action, () => {
        res.status(400)
        res.send('QueryString-Error at action - Bad Request 400')
    })) return
    switch (queryObject.action) {
        case 'CREATE': {
            // 200 -> Success
            // 400 -> Invalid QueryStrings | Invalid data
            // 403 -> no Account validation
            // 500 -> Serverside error

            const $username = queryObject.username
            const $token = queryObject.token
            const $data = queryObject.data

            // check types of username and token
            if (!isString($username, () => {
                res.status(400)
                res.send('QueryString-Error at username - Bad Request 400')
            })) return
            const username = decodeURIComponent($username as string)
            if (!isString($token, () => {
                res.status(400)
                res.send('QueryString-Error at token - Bad Request 400')
            })) return
            const token = decodeURIComponent($token as string)
            if (!isString($data, () => {
                res.status(400)
                res.send('QueryString-Error at data - Bad Request 400')
            })) return
            const data = JSON.parse(decodeURIComponent($data as string))
            checkToken(webclient, username, token, (success: boolean) => {
                if (!success) {
                    res.status(403)
                    res.send('Could not verify account - Forbidden 403')
                    return
                }
                const $name = data.name
                const $description = data.description
                const $choices = data.choices
                const $seePercentage = data.seePercentage
                const $changeVote = data.changeVote
                const $time = data.time

                // check data
                if (!$name || !$description || !$choices || !$seePercentage || !$changeVote ||
                    !$time || typeof $name !== 'string' || typeof $description !== 'string' ||
                    typeof $choices !== 'object' || typeof $seePercentage !== 'boolean' ||
                    typeof $changeVote !== 'boolean' || typeof $time !== 'number' ||
                    !Array.isArray($choices) || $name.includes('<') || $name.includes('>') ||
                    $description.includes('<') || $description.includes('>')) {
                    res.status(400)
                    res.send('Invalid data - Bad Request 400')
                    return
                }

                const name = $name as string
                const description = $description as string
                const choices: Option[] = []
                const seePercentage = $seePercentage as boolean
                const changeVote = $changeVote as boolean
                let time = $time as number

                // check lengths and sizes
                if (name.length > 32) {
                    res.status(400)
                    res.send('Invalid name length - Bad Request 400')
                    return
                }
                if (description.length > 500) {
                    res.status(400)
                    res.send('Invalid description length - Bad Request 400')
                    return
                }
                if (choices.length < 2 && choices.length > 5) {
                    res.status(400)
                    res.send('Invalid choices length - Bad Request 400')
                    return
                }
                if (time < 5) {
                    time = 5
                }
                if (time > 40320) {
                    time = 40320
                }

                // create choices array
                {
                    let success = true
                    let i = 0
                    $choices.forEach(key => {
                        if (!key || typeof key !== 'object' || !key.name || typeof key.name !== 'string') {
                            res.status(400)
                            res.send('Choices not valid - Bad Request 400')
                            success = false
                            return
                        }
                        const name = key.name
                        const description = key.description ?? ''
                        const option: Option = {
                            name: name,
                            description: description,
                            votes: 0,
                            id: i
                        }
                        choices.push(option)
                        i++
                    })
                    if (!success) {
                        return
                    }
                }

                const poll: Poll = {
                    name: name,
                    description: description,
                    choices: choices,
                    seePercentage: seePercentage,
                    changeVote: changeVote,
                    owner: username,
                    end: Math.round(Date.now() / 1000) + time * 60
                }

                database.createPoll(db, poll, (err: any, result: any) => {
                    if (err) {
                        res.status(500)
                        res.send('Error whilst creating poll - Internal Server Error 500')
                        return
                    }
                    res.status(200)
                    res.send('Successfully created poll - OK 200')
                })
            }, (_reason: any) => {
                res.status(500)
                res.send('Error whilst verifying account - Internal Server Error 500')
            })
            break
        }
        case 'VOTE': {
            // 200 -> Success
            // 400 -> Invalid QueryStrings | Invalid choice
            // 404 -> Poll not found
            // 409 -> Poll already ended
            // 500 -> Serverside error

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
                    if (poll === null) {
                        res.status(404)
                        res.send('Poll not found (2) - Not Found 404')
                        return
                    }
                    if (poll.end >= Math.round(Date.now() / 1000)) {
                        res.status(403)
                        res.send('Poll allready ended - Conflict 409')
                        return
                    }
                    if (poll.choices.length <= choice || choice < 0) {
                        res.status(400)
                        res.send('Invalid choice - Bad Request 400')
                        return
                    }
                    let i = 0
                    poll.choices.forEach(key => {
                        if (poll.choices[i].id === choice) {
                            poll.choices[i].votes += 1
                        }
                        i++
                    })
                    if (i === 0) {
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
        }
        case 'DELETE': {
            // 200 -> Success
            // 400 -> Invalid QueryStrings
            // 403 -> no Account validation
            // 404 -> Poll not found
            // 500 -> Serverside error

            const $username = queryObject.username
            const $token = queryObject.token
            const $id = queryObject.id

            // check types of username and token
            if (!isString($username, () => {
                res.status(400)
                res.send('QueryString-Error at username - Bad Request 400')
            })) return
            const username = decodeURIComponent($username as string)
            if (!isString($token, () => {
                res.status(400)
                res.send('QueryString-Error at token - Bad Request 400')
            })) return
            const token = decodeURIComponent($token as string)
            if (!isString($id, () => {
                res.status(400)
                res.send('QueryString-Error at id - Bad Request 400')
            })) return
            if (Number.isNaN($id)) {
                res.status(400)
                res.send('QueryString-Error at id - Bad Request 400')
                return
            }
            const id = Number.parseInt($id as string)
            checkToken(webclient, username, token, (success: boolean) => {
                if (!success) {
                    res.status(403)
                    res.send('Could not verify account - Forbidden 403')
                    return
                }

                database.loadPoll(db, id, (err: any, poll: Poll) => {
                    if (err) {
                        res.status(500)
                        res.send('Error whilst checking permissions - Internal Server Error 500')
                        return
                    }
                    if (username !== poll.owner) {
                        res.status(403)
                        res.send('Permission denied - Forbidden 403')
                    }
                    database.deletePoll(db, id, (err: any, result: any) => {
                        if (err) {
                            res.status(500)
                            res.send('Error whilst deleting poll - Internal Server Error 500')
                            return
                        }
                    })
                })
            }, (_reason: any) => {
                res.status(500)
                res.send('Error whilst verifying account - Internal Server Error 500')
            })
            break
        }
        default: {
            res.status(501)
            res.send('API-call not implemented - Not Implemented 501')
            return
        }
    }
})

app.listen(80)