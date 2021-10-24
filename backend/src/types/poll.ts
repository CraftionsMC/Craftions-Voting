import { Option } from "./option";

export interface Poll {
    name: string,
    description: string,
    choices: Option[],
    seePercentage: boolean,
    changeVote: boolean,
    end: number,
    owner: string
}
