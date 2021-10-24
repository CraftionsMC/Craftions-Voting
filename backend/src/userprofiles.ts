import { WebClient } from '@incodelang/accounts-client'
import config from './config.json'

const host = config.rootUrl

export function init(): WebClient {
    return new WebClient(host)
}

export function checkToken(
    client: WebClient,
    user: string,
    token: string,
    onSuccess: (value: boolean) => void,
    onReject?: (reason: any) => void
) {
    client.login(user, token).then(onSuccess, onReject)
}