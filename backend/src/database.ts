import config from './config.json'
import mysql from "mysql2"
import { RowDataPacket } from "mysql2";
import { Poll } from './types/poll'

var username: string;
var password: string;
var host: string;
var port: number;
var name: string;
var table: string;

export function connect(): mysql.Connection {
    username = config.username
    password = config.password
    host = config.host
    port = config.port
    name = config.name
    table = config.table
    if (!username || !password || !host || !port || !name || !table) {
        console.log('Config file invalid')
        process.exit(-1)
    }
    return mysql.createConnection({
        host: host,
        user: username,
        password: password,
        database: name,
        port: port
    })
}

export function loadPoll(connection: mysql.Connection, id: number, callback: Function) {
    const queryString = 'SELECT * FROM ' + table + ' WHERE pollUniqueId=?'

    connection.query(
        queryString,
        [id],
        (err, result) => {
            if (err) { callback(err) }

            const row = (<RowDataPacket>result)[0];
            const resultPoll: Poll = {
                name: row.pollName,
                description: row.pollDescription,
                choices: JSON.parse(row.pollChoices),
                seePercentage: row.pollSeePercentage,
                changeVote: row.pollChangeVote,
                end: row.pollEnd,
                owner: row.pollOwner
            }
            callback(null, resultPoll);
        }
    )
}

export function createPoll(connection: mysql.Connection, poll: Poll, callback: Function) {
    const queryString = 'INSERT INTO ' + table + ' (pollName, pollDescription, pollChoices, pollSeePercentage, pollChangeVote, pollEnd, pollOwner) VALUES (?, ?, ?, ?, ?, ?, ?)'

    connection.query(
        queryString,
        [poll.name, poll.description, JSON.stringify(poll.choices), poll.seePercentage, poll.changeVote, poll.end, poll.owner],
        (err, result) => {
            if (err) { callback(err) };
            callback(null, result);
        }
    )
}

export function pollExists(connection: mysql.Connection, id: number, callback: Function) {
    const queryString = 'SELECT Count(1) FROM ' + table + ' WHERE pollUniqueId=?'
    let length = 0
    connection.query(
        queryString,
        [id],
        (err, result) => {
            if (err) { callback(err) }
            if (Array.isArray(result)) {
                length = (result[0] as RowDataPacket)['Count(1)']
            }
            callback(null, length > 0)
        }
    )
}

export function updatePoll(connection: mysql.Connection, id: number, poll: Poll, callback: Function) {
    const queryString = 'UPDATE ' + table + ' SET pollChoices=? WHERE pollUniqueId=?'

    connection.query(
        queryString,
        [JSON.stringify(poll.choices), id],
        (err, result) => {
            if (err) { callback(err) }
            callback(null, result)
        }
    )
}

export function deletePoll(connection: mysql.Connection, id: number, callback: Function) {
    const queryString = 'DELETE FROM ' + table + ' WHERE pollUniqueId=?'

    connection.query(
        queryString,
        [id],
        (err, result) => {
            if (err) { callback(err) }
            callback(null, result)
        }
    )
}